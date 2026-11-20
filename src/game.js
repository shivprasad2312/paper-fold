import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Stage } from './stage.js';
import { isOccluded } from './framing.js';
import { buildLevelView } from './levelView.js';
import { ALL_LEVELS } from './levels.js';
import { ACTS } from './acts.js';
import { getDailyLevel } from './daily.js';
import { parseLevel, DIRS, checkRoll, key, shortestRoute, canPushBlock, ROLL_TIME, ORB_KILL_RADIUS, rescueTile, FREEZE_TIME, clingTarget, windTarget, WIND_PERIOD } from './rules.js';
import { glowTexture, disposeTree } from './textures.js';

// Vivid cube colour per level, like EDGE's recolouring between stages.
const CUBE_COLORS = [0xff5ad9, 0x5be07c, 0x5b8cff, 0xff9f3d, 0xffd14d, 0xb07cff, 0x7dffce, 0xff6a5e, 0x4fd8ff, 0xff8a4f, 0xff4f8e, 0xc8ff5e, 0xffd14d, 0xff5e3a];
const DAILY_COLOR = 0xffd14d;
const DROP_TIME = 0.11;
const HALF = 0.5;
const ORB_KILL_HEIGHT = 1.0;
/** Mini-cube mesh scale on a shrink pad (Phase B, ADR-034). */
const MINI_SCALE = 0.55;

const easeInOut = (t) => t * t * (3 - 2 * t);

export class Game {
  constructor(canvas) {
    this.stage = new Stage(canvas);
    this.listeners = new Map();

    this.state = 'idle'; // idle | playing | dead | won
    this.paused = false;
    this.elapsed = 0;
    this.freezeLeft = 0; // seconds of sentinel freeze remaining (M3 wave-1)
    this.levelIndex = 0;
    this.level = null;
    this.view = null;
    this.rideRef = null; // { i, k } of the shuttle platform carrying the cube

    this.queue = [];
    this.camQuadrant = 0; // which 90° seat the camera is on (see setCamQuadrant)
    this.shardsCollected = 0;
    this.totalShards = 0;
    this.moves = 0;
    this.par = 0;
    this.rescuePos = null; // mid-path bench tile (or null — short/complex level)
    this.rescueUsed = false; // one rescue per attempt
    this.rescuedRun = false; // this attempt used one → no time/ghost recorded
    this.rescueOffered = false;
    this.rescueEnabled = true; // main.js syncs from the save (settings)

    // ADR-046: reduced motion. A presentation switch — see src/motion.js for
    // what it may and may not touch (the roll's DURATION is gameplay).
    this.reduceMotion = false;

    // new mechanics
    this.blocks = new Map(); // key -> {x, z}
    this.nudgeLeft = 0;
    this.maxNudges = 0;
    this.hasKey = false;
    this.gateLocked = false;
    this.windTimer = WIND_PERIOD;
    this._pistonFired = new Map(); // piston id -> cycle already shoved (ADR-035)
    this.moveLog = []; // {t, x, z, h} — replayed as the ghost of a best run
    this.ghost = null; // {log, mesh, idx}
    this.ghostMesh = null;
    this.dailyDate = null;

    this.buildCube();
    this.clock = new THREE.Clock();
    this.lastTime = 0;

    this.stage.resize();
    window.addEventListener('resize', () => this.stage.resize());

    this.fpsSamples = [];
    this._loop = this._loop.bind(this);
    this.stage.renderer.setAnimationLoop(this._loop);
  }

  on(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(fn);
    return this;
  }

  emit(name, payload) {
    for (const fn of this.listeners.get(name) || []) fn(payload);
  }

  // ---------------------------------------------------------------- cube ---
  buildCube() {
    const geo = new RoundedBoxGeometry(0.93, 0.93, 0.93, 4, 0.09);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff5ad9,
      roughness: 0.34,
      metalness: 0.1,
      emissive: new THREE.Color(0xff5ad9).multiplyScalar(0.12),
      emissiveIntensity: 1,
    });
    this.cubeMat = mat;
    this.cubeMesh = new THREE.Mesh(geo, mat);
    this.cubeMesh.castShadow = true;

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.99, 0.99, 0.99), 30),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    this.cubeMesh.add(edges);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(1.7);
    this.cubeMesh.add(glow);
    this.cubeGlow = glow;

    this.cubeMesh.visible = false;
    this.stage.scene.add(this.cubeMesh);

    // Phase G (ADR-045): a follow camera can put a tower between the player
    // and the cube. The ghost is the same geometry drawn with depth testing
    // off — the cube stays visible THROUGH the slab, so the player never
    // loses the thing they are steering. One extra draw call, off by default.
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x9ff6ff,
      transparent: true,
      opacity: 0.34,
      depthTest: false,
      depthWrite: false,
    });
    this.cubeGhost = new THREE.Mesh(geo, ghostMat);
    this.cubeGhost.renderOrder = 999;
    this.cubeGhost.visible = false;
    this.cubeGhost.matrixAutoUpdate = false;
    this.stage.scene.add(this.cubeGhost);
  }

  /**
   * ADR-046: apply the reduced-motion presentation mode. The stage owns the
   * camera side of it; the view owns the world's idle animation; this class
   * owns the cube's own flourishes. Durations are NEVER touched.
   */
  setReducedMotion(on) {
    this.reduceMotion = !!on;
    this.stage.setReducedMotion(this.reduceMotion);
    if (this.view) this.view.setReducedMotion(this.reduceMotion);
  }

  /** The one easing the cube's animations use (linear under reduced motion). */
  ease(t) {
    return this.reduceMotion ? t : easeInOut(t);
  }

  // --------------------------------------------------------------- level ---
  load(index, { keepState = false } = {}) {
    this.levelIndex = Math.max(0, Math.min(ALL_LEVELS.length - 1, index));
    const def = ALL_LEVELS[this.levelIndex];
    return this._loadDef(def, { index: this.levelIndex });
  }

  /** The daily challenge: a fresh level generated from the date, verified solvable. */
  loadDaily(dateStr) {
    const { def, par } = getDailyLevel(dateStr);
    this.levelIndex = -1;
    return this._loadDef(def, { daily: dateStr, par });
  }

  _loadDef(def, { index = -1, daily = null, par = null } = {}) {
    this.level = parseLevel(def);
    this.def = def;
    this.dailyDate = daily;

    // per-act palette (M2.5): the act's hue tints the world and the slabs.
    // The daily challenge plays in the neutral world.
    const act =
      !daily && typeof def.id === 'number'
        ? ACTS.find((a) => def.id >= a.start && def.id <= a.end)
        : null;
    this.actHue = act ? act.hue : null;

    if (this.view) {
      this.stage.scene.remove(this.view.group);
      this.view.dispose();
    }
    this.view = buildLevelView(this.level, this.actHue);
    this.view.setReducedMotion(this.reduceMotion); // a new level inherits the mode
    this.stage.scene.add(this.view.group);
    this.stage.setTheme(this.stage.theme, this.actHue);

    // recolor the cube for this level
    const c = typeof def.id === 'number' ? CUBE_COLORS[(def.id - 1) % CUBE_COLORS.length] : DAILY_COLOR;
    this.cubeMat.color.set(c);
    this.cubeMat.emissive.set(c).multiplyScalar(0.12);
    this.cubeGlow.material.color.set(c);

    this.stage.fitLevel(this.view.bounds.min, this.view.bounds.max);
    this.stage.setFocus(this.level.start.x, this.level.start.z);

    this.par = Math.max(1, par != null ? par : shortestRoute(this.level));
    this.rescuePos = rescueTile(this.level);
    this.rescueUsed = false;
    this.rescuedRun = false;
    this.rescueOffered = false;
    this.maxNudges = this.level.nudge;
    this.deaths = 0; // per run: cleared by a new level or a restart, never by a respawn
    this.resetRunState();

    this.emit('level', {
      index,
      def,
      level: this.level,
      shards: this.totalShards,
      par: this.par,
      daily,
    });
    return def;
  }

  placeCubeAtStart() {
    const s = this.level.start;
    this.mini = !!this.level.startMini; // size is run state (ADR-034)
    this.sizeCur = this.mini ? MINI_SCALE : 1;
    this.cube = {
      x: s.x,
      z: s.z,
      h: s.h,
      anim: null,
      quat: new THREE.Quaternion(),
    };
    this.cubeMesh.visible = true;
    this.cubeMesh.position.set(s.x, s.h + 0.5, s.z);
    this.cubeMesh.quaternion.identity();
    this.cubeMesh.rotation.set(0, 0, 0);
    this.cubeMesh.scale.setScalar(0.001);
    this.spawnScale = 0;
  }

  restart() {
    if (!this.level) return;
    this.deaths = 0;
    this.resetRunState();
    this.emit('restart', { index: this.levelIndex });
  }

  /** Reset everything a run owns: timers, shards, moves, and the new mechanics. */
  resetRunState() {
    this.rideRef = null; // no shuttle ride survives a reset
    this.view.reset();
    this.totalShards = this.level.shards.length;
    this.shardsCollected = 0;
    this.freezeLeft = 0;
    this.elapsed = 0;
    this.moves = 0;
    this.queue.length = 0;
    this.deadTimer = 0;
    this.winTimer = 0;
    this.blocks = new Map(this.level.blocks.map((b) => [key(b.x, b.z), { x: b.x, z: b.z, heavy: !!b.heavy }]));
    this.nudgeLeft = this.maxNudges;
    this.hasKey = false;
    this.gateLocked = !!this.level.gateKey;
    this.windTimer = WIND_PERIOD;
    this.view.setGoalLocked(this.gateLocked);
    this.moveLog = [{ t: 0, x: this.level.start.x, z: this.level.start.z, h: this.level.start.h, mini: !!this.level.startMini }];
    this.lastDeathCause = null;
    this.rescueUsed = false;
    this.rescuedRun = false;
    this.rescueOffered = false;
    if (this.ghost) this.ghost.idx = 0;
    this.view.setSteps(0);
    this.placeCubeAtStart();
    this.state = 'playing';
    this.paused = false;
  }

  setPaused(p) {
    this.paused = p;
  }

  // --------------------------------------------------------------- input ---
  /**
   * The camera can orbit to four 90° seats. Controls stay screen-relative —
   * "up" always means *up on screen* — so a screen direction is translated to
   * the world direction the camera currently faces. (See Stage.stepCamera.)
   */
  setCamQuadrant(q) {
    this.camQuadrant = ((q % 4) + 4) % 4;
  }

  input(dirName) {
    if (!DIRS[dirName]) return;
    if (this.state !== 'playing' || this.paused) return;
    const order = ['up', 'right', 'down', 'left'];
    const world = order[(order.indexOf(dirName) - (this.camQuadrant || 0) + 8) % 4];
    if (this.cube.anim) {
      if (this.queue.length < 2 && this.queue[this.queue.length - 1] !== world) {
        this.queue.push(world);
      }
      return;
    }
    this.doMove(world);
  }

  tileAt(x, z) {
    return this.level.tiles.get(key(x, z));
  }

  isSolid(x, z) {
    const t = this.tileAt(x, z);
    if (!t) return null;
    if (this.view.isBroken(x, z)) return null;
    // A sliding bridge only holds while it is up — the view is the clock.
    if (this.level.sliderTiles.has(key(x, z)) && !this.view.sliderUp(x, z)) return null;
    // A pulsing gap only holds while its phantom slab is sealed in.
    if (this.level.pulseTiles.has(key(x, z)) && !this.view.pulseUp(x, z)) return null;
    // A turntable arm (Phase B, ADR-036) only holds while the bar joins
    // its bank pair; the pivot always holds.
    if (t.turntable && !t.turntablePivot && !this.view.turntableSolidAt(x, z)) return null;
    // A shuttle dock only holds while its platform dwells there.
    if (t.shuttle && !this.view.shuttleDocked(x, z)) return null;
    // A lift dock (Phase B, ADR-033) only holds while its platform dwells
    // at an end, and then at that dwell's height.
    if (t.lift) {
      const h = this.view.liftDockHeight(x, z);
      if (h === null) return null;
      const lt = { ...t, h };
      delete lt.lift;
      return lt;
    }
    return t;
  }

  doMove(dirName) {
    const d = DIRS[dirName];
    const from = this.cube;
    const toX = from.x + d.dx;
    const toZ = from.z + d.dz;

    // --- telekinesis: a block cube in the way can be shoved, not rolled into -
    const blockHere = this.blocks.get(key(toX, toZ));
    if (blockHere) {
      const occupied = new Set(this.blocks.keys());
      if (this.nudgeLeft > 0 && canPushBlock(this.level, blockHere, d.dx, d.dz, occupied)) {
        const destKey = key(toX + d.dx, toZ + d.dz);
        this.blocks.delete(key(toX, toZ));
        blockHere.x += d.dx;
        blockHere.z += d.dz;
        this.blocks.set(destKey, blockHere);
        this.nudgeLeft--;
        this.view.pushBlockVisual(toX, toZ, d.dx, d.dz);
        this.cube.anim = {
          type: 'push',
          t: 0,
          dur: blockHere.heavy ? 0.34 : 0.22, // a heavy block grinds, not slides
          dx: d.dx,
          dz: d.dz,
          startPos: this.cubeMesh.position.clone(),
        };
        this.emit('push', { left: this.nudgeLeft, total: this.maxNudges });
        return;
      }
      // Out of charges, or the block cannot slide — it reads as a wall.
      this.cube.anim = {
        type: 'bump',
        t: 0,
        dur: 0.2,
        dx: d.dx,
        dz: d.dz,
        startPos: this.cubeMesh.position.clone(),
      };
      this.emit('bump');
      return;
    }

    // a spring pad: this press launches over the next slabs instead of rolling
    if (from.spring) {
      this.launchOrFall(d);
      return;
    }

    const to = this.isSolid(toX, toZ);
    const check = checkRoll(this.level, from, to, this.mini);

    // A piston arm holding its strike cell (Phase B, ADR-035) refuses
    // entry: the press reads as a bump. Rolling IN while the arm is
    // retracted stays legal — the shove law below owns what happens
    // when it fires with the cube aboard.
    if (to && this.level.pistonCells.has(key(toX, toZ)) && this.view.pistonExtendedAt(toX, toZ)) {
      this.cube.anim = {
        type: 'bump',
        t: 0,
        dur: 0.2,
        dx: d.dx,
        dz: d.dz,
        startPos: this.cubeMesh.position.clone(),
      };
      this.emit('bump');
      return;
    }

    if (!check.ok && check.kind === 'blocked') {
      this.cube.anim = {
        type: 'bump',
        t: 0,
        dur: 0.2,
        dx: d.dx,
        dz: d.dz,
        startPos: this.cubeMesh.position.clone(),
      };
      this.emit('bump');
      return;
    }

    // CLINGING (Phase B, ADR-037): a press into a declared grip crevice
    // catches the far face and lands on it — the only press that spans
    // void by hand. A block parked on the far bank occupies the handhold,
    // so that press reads as a bump instead.
    if (!check.ok && check.kind === 'void') {
      const clingTo = clingTarget(this.level, from, d);
      if (clingTo && !this.blocks.has(key(clingTo.x, clingTo.z))) {
        this.startCling(d, clingTo);
        return;
      }
    }

    if (!check.ok && check.kind === 'void') {
      this.cube.anim = {
        type: 'fall',
        t: 0,
        dx: d.dx,
        dz: d.dz,
        startPos: this.cubeMesh.position.clone(),
        fromQuat: this.cubeMesh.quaternion.clone(),
        spin: new THREE.Vector3(d.dz, 0, -d.dx),
      };
      this.emit('fall');
      return;
    }

    // A legal roll.
    const axis = new THREE.Vector3(d.dz, 0, -d.dx).normalize();
    const pivot = new THREE.Vector3(from.x + d.dx * HALF, from.h, from.z + d.dz * HALF);
    const startPos = new THREE.Vector3(from.x, from.h + HALF, from.z);
    this.cube.anim = {
      type: 'roll',
      t: 0,
      dur: ROLL_TIME,
      axis,
      pivot,
      startPos,
      fromQuat: this.cubeMesh.quaternion.clone(),
      dx: d.dx,
      dz: d.dz,
      target: to,
      drop: Math.max(0, from.h - to.h),
      fromX: from.x,
      fromZ: from.z,
      fromH: from.h,
    };
    this.emit('move');
  }

  /**
   * Clinging (Phase B, ADR-037): roll off the ledge, fall into the grip
   * crevice, catch the far face and hang a beat, then mantle onto it. The
   * press crosses the crevice and lands on the far bank — one action, one
   * landing, exactly what the resolver proof priced.
   */
  startCling(d, target) {
    this.cube.anim = {
      type: 'cling',
      t: 0,
      dur: 0.62,
      dx: d.dx,
      dz: d.dz,
      axis: new THREE.Vector3(d.dz, 0, -d.dx).normalize(),
      from: { x: this.cube.x, z: this.cube.z, h: this.cube.h },
      crevice: { x: this.cube.x + d.dx, z: this.cube.z + d.dz },
      target,
      startPos: this.cubeMesh.position.clone(),
      fromQuat: this.cubeMesh.quaternion.clone(),
    };
    this.emit('move');
  }

  // -------------------------------------------------------------- update ---
  _loop() {
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.05);

    // If the device is struggling, shed quality in stages: shadows, then bloom.
    if (this.fpsSamples.length < 180 && raw > 0) {
      this.fpsSamples.push(raw);
      const avgOf = (n) => {
        const tail = this.fpsSamples.slice(-n);
        return tail.reduce((a, b) => a + b, 0) / tail.length;
      };
      if (this.fpsSamples.length === 90) {
        this.fps = 1 / avgOf(90);
        if (this.fps < 42) this.stage.reduceQuality();
      } else if (this.fpsSamples.length === 180) {
        if (avgOf(90) > 1 / 38) this.stage.reduceQuality();
      }
    }
    const time = this.clock.elapsedTime;
    this.update(dt, time);
    this.stage.update(dt);
    this.stage.render();
  }

  /**
   * Draw the cube through level geometry when a slab hides it (ADR-045).
   * A ray test against the level's own height map: no extra render passes,
   * and it is exactly as correct as the collision map the game already
   * trusts. A whole-board camera sees over most walls, but a tower can still
   * hide the cube from a low seat — the ghost is drawn only when the cube is
   * genuinely behind geometry, so it can never be mistaken for the cube.
   */
  updateGhost() {
    if (!this.cubeGhost) return;
    const visible = this.level && this.state !== 'won' && this.cubeMesh.visible;
    if (!visible) {
      this.cubeGhost.visible = false;
      return;
    }
    const p = this.cubeMesh.position;
    const hidden = isOccluded({
      from: p,
      to: this.stage.camera.position,
      heightAt: (x, z) => {
        const t = this.level.tiles.get(`${x},${z}`);
        return t ? t.h : -Infinity;
      },
    });
    this.cubeGhost.visible = hidden;
    if (hidden) {
      this.cubeGhost.position.copy(p);
      this.cubeGhost.scale.copy(this.cubeMesh.scale);
      this.cubeGhost.quaternion.copy(this.cubeMesh.quaternion);
      this.cubeGhost.updateMatrix();
    }
  }

  update(dt, time) {
    if (!this.level) return;

    if (this.paused) return;

    // mini-cube size (Phase B, ADR-034): ease the mesh between full and
    // MINI_SCALE; the spawn pop composes multiplicatively on top
    const sizeTarget = this.mini ? MINI_SCALE : 1;
    if (this.sizeCur === undefined) this.sizeCur = sizeTarget;
    this.sizeCur += (sizeTarget - this.sizeCur) * Math.min(1, dt * 7);
    if (Math.abs(sizeTarget - this.sizeCur) < 0.002) this.sizeCur = sizeTarget;
    // intro pop
    if (this.spawnScale !== undefined && this.spawnScale < 1) {
      this.spawnScale = Math.min(1, this.spawnScale + dt * 5);
      const s = this.ease(this.spawnScale);
      this.cubeMesh.scale.setScalar((0.35 + 0.65 * s) * this.sizeCur);
    } else if (this.state !== 'won') {
      this.cubeMesh.scale.setScalar(this.sizeCur);
    }

    if (this.state === 'playing') this.elapsed += dt;

    this.updateCube(dt, time);
    // the shrunken mesh stays glued to its slab: drop it by the height
    // the scale took away (kill tests compensate this back — ADR-034)
    if (this.sizeCur < 0.999) this.cubeMesh.position.y -= (1 - this.sizeCur) * HALF;
    this.view.update(dt, time, this.cubeMesh.position);
    this.updateShuttleCarry(time);
    this.updateLiftCarry();

    // the camera leans gently toward the cube — the only camera movement
    // there is; the whole board stays framed (no panning, no zooming)
    const cp = this.cubeMesh.position;
    this.stage.setFocus(cp.x, cp.z);
    this.updateGhost();

    // drifting glow on the cube (still under reduced motion — a breathing
    // halo is decoration, and the halo is large)
    const pulse = this.reduceMotion ? 1.7 : 1.7 + Math.sin(time * 3.4) * 0.35;
    this.cubeGlow.scale.setScalar(pulse);

    if (this.state === 'playing') {
      // the freeze burns in real seconds, anims and all
      if (this.freezeLeft > 0) {
        this.freezeLeft = Math.max(0, this.freezeLeft - dt);
        if (this.freezeLeft === 0) this.view.setFrozen(false);
      }
      this.checkPickups();
      this.checkOrbs();
      this.checkBrokenGround();
      this.checkSunkGround();
      this.checkWheels();
      this.updateWind(dt);
      this.updatePistons();
      this.updateGhost(dt);
    }

    if (this.state === 'dead') {
      this.deadTimer += dt;
      // A rescue offer stretches the 1 s instant-restart into a 6 s
      // choice window — do nothing and the normal restart happens anyway.
      if (this.deadTimer > (this.rescueOffered ? 6.0 : 1.0)) {
        this.rescueOffered = false;
        this.respawn();
      }
    }

    if (this.state === 'won') {
      this.winTimer += dt;
      if (this.reduceMotion) {
        // ADR-046: the celebration is a spin, a rise and a 2.2 Hz glow
        // strobe — the most aggressive motion in the game and the only one
        // that flashes. Reduced motion keeps the cube still and lets the
        // win panel carry the news; the level has already been recorded.
        this.cubeMesh.scale.setScalar(this.sizeCur ?? 1);
        this.cubeGlow.material.opacity = 0.45;
      } else {
        this.cubeMesh.rotation.y += dt * 1.2;
        this.cubeMesh.position.y += dt * 0.35;
        const k = Math.min(1, this.winTimer * 0.75);
        this.cubeMesh.scale.setScalar(Math.max(0.05, 1 - k * 0.9) * (this.sizeCur ?? 1));
        this.cubeGlow.material.opacity = 0.45 + Math.sin(time * 14) * 0.2;
      }
    }
  }

  updateCube(dt, time) {
    const a = this.cube.anim;
    const mesh = this.cubeMesh;

    if (!a) {
      // keep the cube glued to its slab (parallax-free)
      const tile = this.tileAt(this.cube.x, this.cube.z);
      if (tile) mesh.position.set(tile.x, tile.h + HALF, tile.z);
      return;
    }

    if (a.type === 'roll') {
      a.t = Math.min(1, a.t + dt / a.dur);
      // EVERY move is a real tumble over the leading bottom edge: the cube
      // pivots on the tile it is leaving and lands square on the next one.
      // It never slides flat between tiles — that read as a "boat" rather
      // than a dice roll, and the roll is the game's whole language.
      const e = this.ease(a.t);
      const q = new THREE.Quaternion().setFromAxisAngle(a.axis, e * Math.PI * 0.5);
      const rel = a.startPos.clone().sub(a.pivot).applyQuaternion(q);
      mesh.position.copy(a.pivot).add(rel);
      mesh.quaternion.copy(q).multiply(a.fromQuat);

      if (a.t >= 1) {
        // land exactly on the new tile
        this.cube.x = a.target.x;
        this.cube.z = a.target.z;
        this.cube.h = a.target.h;
        this.cube.quat.copy(mesh.quaternion);
        if (a.drop > 0) {
          a.type = 'drop';
          a.t = 0;
          a.dur = DROP_TIME;
          a.fromY = (a.target.h + a.drop) + HALF;
          a.toY = a.target.h + HALF;
          mesh.position.set(a.target.x, a.fromY, a.target.z);
        } else {
          this.finishMove(a.target, a, a.free === true);
        }
      }
    } else if (a.type === 'drop') {
      a.t = Math.min(1, a.t + dt / a.dur);
      const p = a.t * a.t;
      mesh.position.set(a.target.x, a.fromY + (a.toY - a.fromY) * p, a.target.z);
      if (a.t >= 1) this.finishMove(a.target, a, a.free === true);
    } else if (a.type === 'launch') {
      // a spring flight: an arcing hop in the press direction
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = this.ease(a.t);
      const y = a.from.h + HALF + (a.target.h - a.from.h) * e + Math.sin(e * Math.PI) * 0.45;
      mesh.position.set(a.from.x + (a.target.x - a.from.x) * e, y, a.from.z + (a.target.z - a.from.z) * e);
      mesh.rotation.z = 0;
      if (a.t >= 1) {
        this.cube.x = a.target.x;
        this.cube.z = a.target.z;
        this.cube.h = a.target.h;
        mesh.quaternion.copy(this.cube.quat);
        this.finishMove(a.target, a, false);
      }
    } else if (a.type === 'bump') {
      a.t = Math.min(1, a.t + dt / a.dur);
      const k = Math.sin(a.t * Math.PI) * 0.14;
      mesh.position.set(a.startPos.x + a.dx * k, a.startPos.y, a.startPos.z + a.dz * k);
      if (a.t >= 1) {
        mesh.position.copy(a.startPos);
        this.cube.anim = null;
        this.pumpQueue();
      }
    } else if (a.type === 'push') {
      // The cube leans into the block and shoves — a firmer bump.
      a.t = Math.min(1, a.t + dt / a.dur);
      const k = Math.sin(a.t * Math.PI) * 0.24;
      mesh.position.set(a.startPos.x + a.dx * k, a.startPos.y, a.startPos.z + a.dz * k);
      if (a.t >= 1) {
        mesh.position.copy(a.startPos);
        this.cube.anim = null;
        this.emit('pushDone'); // the shove landed — a held input may continue
        this.pumpQueue();
      }
    } else if (a.type === 'cling') {
      // CLINGING (Phase B, ADR-037): off the ledge → hang on the far face
      // → mantle up. Three beats in one press; the cube's logical tile
      // only changes at the very end, so every rule keeps reading the
      // takeoff tile until the landing is real.
      a.t = Math.min(1, a.t + dt / a.dur);
      const p = a.t;
      // the hang holds the cube JUST under the far lip, pressed against
      // the face: from any camera seat the grip reads as a hang, not as a
      // cube standing on the shelf (a lip-level pose hides it behind the
      // bank at a high camera)
      const hangY = a.target.h - 0.52;
      if (p < 0.5) {
        const e = this.ease(p / 0.5);
        mesh.position.set(
          a.from.x + (a.crevice.x - a.from.x) * e,
          a.from.h + HALF + (hangY - (a.from.h + HALF)) * e * e + Math.sin(e * Math.PI) * 0.16,
          a.from.z + (a.crevice.z - a.from.z) * e,
        );
        mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(a.axis, e * Math.PI * 0.5)).multiply(a.fromQuat);
      } else if (p < 0.72) {
        // the hang beat: pressed against the FAR face (the one being
        // caught), a breath of sway — centred in the gap the cube would
        // read as floating in mid-air
        const e = (p - 0.5) / 0.22;
        mesh.position.set(
          a.crevice.x + a.dx * 0.40,
          hangY + Math.sin(e * Math.PI) * 0.05,
          a.crevice.z + a.dz * 0.40,
        );
        mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(a.axis, Math.PI * 0.5)).multiply(a.fromQuat);
      } else {
        // the mantle: pull up onto the far bank
        const e = this.ease((p - 0.72) / 0.28);
        mesh.position.set(
          a.crevice.x + a.dx * 0.5 * e,
          hangY + (a.target.h + HALF - hangY) * e,
          a.crevice.z + a.dz * 0.5 * e,
        );
        mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(a.axis, (0.5 + e * 0.5) * Math.PI)).multiply(a.fromQuat);
      }
      if (p >= 1) {
        this.cube.x = a.target.x;
        this.cube.z = a.target.z;
        this.cube.h = a.target.h;
        this.cube.quat.copy(mesh.quaternion);
        this.finishMove(a.target, null, false);
      }
    } else if (a.type === 'drift') {
      // The breeze carries the cube a tile — a soft hop, no roll, no count.
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = this.ease(a.t);
      const y = Math.max(a.fromH, a.target.h) + HALF + Math.sin(e * Math.PI) * 0.14;
      mesh.position.set(a.fromX + (a.target.x - a.fromX) * e, y, a.fromZ + (a.target.z - a.fromZ) * e);
      mesh.rotation.z = Math.sin(e * Math.PI) * 0.08 * Math.sign(a.dx - a.dz || 1);
      if (a.t >= 1) {
        mesh.rotation.z = 0;
        this.finishDrift(a.target);
      }
    } else if (a.type === 'reject') {
      // The locked gate refuses: the cube rolls itself back the way it came.
      a.t = Math.min(1, a.t + dt / a.dur);
      // the refusal is a roll that never completes: the cube tips toward the
      // sealed gate and settles back onto its own tile
      const e = this.ease(a.t);
      const q = new THREE.Quaternion().setFromAxisAngle(a.axis, (1 - e) * Math.PI * 0.5);
      const rel = a.startPos.clone().sub(a.pivot).applyQuaternion(q);
      mesh.position.copy(a.pivot).add(rel);
      mesh.quaternion.copy(q).multiply(a.fromQuat);
      if (a.t >= 1) {
        this.cube.x = a.from.x;
        this.cube.z = a.from.z;
        this.cube.h = a.from.h;
        mesh.position.set(a.from.x, a.from.h + HALF, a.from.z);
        this.cube.anim = null;
        this.pumpQueue();
      }
    } else if (a.type === 'fall') {
      a.t += dt;
      const x = a.startPos.x + a.dx * Math.min(1.6, a.t * 1.1);
      const z = a.startPos.z + a.dz * Math.min(1.6, a.t * 1.1);
      const y = a.startPos.y - 9.0 * a.t * a.t;
      mesh.position.set(x, y, z);
      if (!this.reduceMotion) {
        // ADR-046: the fall is the death feedback and stays; the tumble on
        // the way down is decoration and does not
        const q = new THREE.Quaternion().setFromAxisAngle(a.spin, a.t * 4.2);
        mesh.quaternion.copy(q).multiply(a.fromQuat);
      }
      if (a.t > 0.32 && this.state === 'playing') this.die('void');
    }
  }

  /** Where does a spring launched from `from` tile in direction d land,
   *  flying over void up to 3 tiles (height change up to 3)? */
  springLanding(from, d) {
    let px = from.x;
    let pz = from.z;
    for (let k = 1; k <= 3; k++) {
      const cand = this.tileAt(px + d.dx, pz + d.dz);
      px += d.dx;
      pz += d.dz;
      if (!cand) continue;
      if (cand.lift) continue; // a launch never lands on a lift: it flies the shaft over
      if (cand.low && !this.mini) continue; // nor into a low tunnel at full size (ADR-034)
      if (this.view.isBroken(cand.x, cand.z)) continue; // a crater is not a floor
      const dh = cand.h - from.h;
      if (dh > 3 || dh < -3) return null;
      return cand;
    }
    return null;
  }

  /** A press that should fire the spring (from the cube's current tile). */
  launchOrFall(d) {
    const from = this.cube;
    const land = this.springLanding(from, d);
    if (!land) {
      this.cube.anim = {
        type: 'fall',
        t: 0,
        dx: d.dx,
        dz: d.dz,
        startPos: this.cubeMesh.position.clone(),
        fromQuat: this.cubeMesh.quaternion.clone(),
        spin: new THREE.Vector3(d.dz, 0, -d.dx),
      };
      this.emit('fall');
      return;
    }
    const dist = Math.abs(land.x - from.x) + Math.abs(land.z - from.z);
    this.cube.anim = {
      type: 'launch',
      t: 0,
      dur: 0.18 + 0.08 * dist,
      from: { x: from.x, z: from.z, h: from.h },
      target: land,
      dx: d.dx,
      dz: d.dz,
    };
  }

  /**
   * ICE / SPRING follow-through: the same press carries the cube on.
   * Called from finishMove on every landing; starts at most one animation.
   */
  autoContinue(target, rollAnim) {
    if (this.state !== 'playing') return;
    if (!rollAnim || rollAnim.dx === undefined) return;
    const d = { dx: rollAnim.dx, dz: rollAnim.dz };
    if (target.spring) {
      this.launchOrFall(d);
      return;
    }
    if (target.ice) {
      const next = this.tileAt(target.x + d.dx, target.z + d.dz);
      if (next && checkRoll(this.level, target, next, this.mini).ok) {
        const axis = new THREE.Vector3(d.dz, 0, -d.dx).normalize();
        const pivot = new THREE.Vector3(target.x + d.dx * HALF, target.h, target.z + d.dz * HALF);
        const startPos = new THREE.Vector3(target.x, target.h + HALF, target.z);
        this.cube.anim = {
          type: 'roll',
          t: 0,
          dur: ROLL_TIME,
          axis,
          pivot,
          startPos,
          fromQuat: this.cubeMesh.quaternion.clone(),
          dx: d.dx,
          dz: d.dz,
          target: next,
          drop: Math.max(0, target.h - next.h),
          fromX: target.x,
          fromZ: target.z,
          fromH: target.h,
          free: true, // the slide is the same press
        };
      }
      // otherwise the slide simply stops here
      return;
    }
    if (target.conveyor) {
      // CONVEYOR (M3 wave-1): the belt imposes its own direction — the
      // carried roll is free (same press), and its dx/dz become the travel
      // direction for any follow-through after it (mirrors resolveRoll).
      const bd = target.conveyor;
      const next = this.tileAt(target.x + bd.dx, target.z + bd.dz);
      if (next && checkRoll(this.level, target, next, this.mini).ok) {
        const axis = new THREE.Vector3(bd.dz, 0, -bd.dx).normalize();
        const pivot = new THREE.Vector3(target.x + bd.dx * HALF, target.h, target.z + bd.dz * HALF);
        const startPos = new THREE.Vector3(target.x, target.h + HALF, target.z);
        this.cube.anim = {
          type: 'roll',
          t: 0,
          dur: ROLL_TIME,
          axis,
          pivot,
          startPos,
          fromQuat: this.cubeMesh.quaternion.clone(),
          dx: bd.dx,
          dz: bd.dz,
          target: next,
          drop: Math.max(0, target.h - next.h),
          fromX: target.x,
          fromZ: target.z,
          fromH: target.h,
          free: true, // the belt ride is the same press
        };
      }
      // otherwise the belt pushes against a wall/edge: the cube stays
    }
  }

  finishMove(target, rollAnim = null, free = false) {
    this.cube.anim = null;
    this.cubeMesh.position.set(target.x, target.h + HALF, target.z);
    this.cube.quat.copy(this.cubeMesh.quaternion);

    if (!free) {
      this.moves++;
      this.view.setSteps(this.moves);
    }

    // The gate: sealed until the key shard is in your pocket.
    if (target.x === this.level.goal.x && target.z === this.level.goal.z && this.gateLocked) {
      this.moves--;
      this.view.setSteps(this.moves);
      if (rollAnim && rollAnim.type === 'roll' && rollAnim.drop === 0) {
        this.cube.anim = {
          type: 'reject',
          t: 0,
          dur: ROLL_TIME * 1.35,
          axis: rollAnim.axis,
          pivot: rollAnim.pivot,
          startPos: rollAnim.startPos,
          fromQuat: rollAnim.fromQuat,
          from: { x: rollAnim.fromX, z: rollAnim.fromZ, h: rollAnim.fromH },
        };
      } else {
        // rare edge (a drop onto a sealed gate): just set back down
        if (rollAnim) {
          this.cube.x = rollAnim.fromX;
          this.cube.z = rollAnim.fromZ;
          this.cube.h = rollAnim.fromH;
          this.cubeMesh.position.set(rollAnim.fromX, rollAnim.fromH + HALF, rollAnim.fromZ);
        }
      }
      this.emit('gateLocked');
      return;
    }

    if (target.crumble) this.view.breakAt(target.x, target.z);
    if (target.timed) this.view.armTimed(target.x, target.z);
    this.applyPad(target);
    this.moveLog.push({ t: this.elapsed, x: target.x, z: target.z, h: target.h, mini: this.mini });
    this.emit('land', target);

    if (target.x === this.level.goal.x && target.z === this.level.goal.z) {
      this.win();
      return;
    }
    this.autoContinue(target, rollAnim);
    // A queued press only applies once the auto-continue chain (ice slide /
    // spring launch) has fully settled — pumping mid-launch would fire the
    // press from the spring pad itself and drop the cube in the pit.
    if (!this.cube.anim) this.pumpQueue();
  }

  /**
   * Size pads (Phase B, ADR-034): landing on a pad flips the cube's size
   * — permanently until the opposite pad. The mesh eases to the new scale
   * in update(); every roll law in this file prices `this.mini`.
   */
  applyPad(target) {
    if (target.shrink && !this.mini) {
      this.mini = true;
      this.emit('shrink', target);
    } else if (target.grow && this.mini) {
      this.mini = false;
      this.emit('grow', target);
    }
  }

  /** A breeze nudge: moves a tile without counting as a step. */
  finishDrift(target) {
    this.cube.anim = null;
    this.cube.x = target.x;
    this.cube.z = target.z;
    this.cube.h = target.h;
    this.cubeMesh.position.set(target.x, target.h + HALF, target.z);
    this.cubeMesh.quaternion.copy(this.cube.quat);
    if (target.crumble) this.view.breakAt(target.x, target.z);
    if (target.timed) this.view.armTimed(target.x, target.z);
    this.applyPad(target);
    this.moveLog.push({ t: this.elapsed, x: target.x, z: target.z, h: target.h, mini: this.mini });
    this.emit('drift', target);
    // the breeze can carry the cube home: drift lands are wins just like
    // rolls (ADR-039 found this missing — a drifted cube stood on the goal
    // and the level never completed)
    if (target.x === this.level.goal.x && target.z === this.level.goal.z) {
      this.win();
      return;
    }
    this.pumpQueue();
  }

  pumpQueue() {
    if (this.queue.length && this.state === 'playing') {
      const next = this.queue.shift();
      this.doMove(next);
    }
  }

  /**
   * Shuttle carry: a cube at rest on the moving platform rides it across;
   * a cube left on a dock the platform is leaving falls with the gap.
   * When a drive ends, the cube snaps onto the dock it arrived at.
   */
  updateShuttleCarry(time) {
    if (this.state !== 'playing') return;
    // a deliberate roll ends any ride (the cube stepped off or was
    // launched); respawn/rescue clear the lock in their reset paths
    if (this.cube.anim) {
      this.rideRef = null;
      return;
    }
    // Every physical platform (a twin shuttle runs two, half a cycle
    // apart) is a candidate; the NEAREST claim wins the boarding grab.
    // Once carried, though, the ride is LOCKED to that one platform
    // (this.rideRef): when twins pass each other mid-route both are
    // within grab range of the cube, and a nearest-wins flip at the
    // meeting point would carry the cube back the way it came.
    let ride = null; // { sh, p, d, i, k } — a moving platform carrying the cube
    let settle = null; // { sh, dx, dz, d } — a docked platform under it
    for (let i = 0; i < this.level.shuttles.length; i++) {
      const sh = this.level.shuttles[i];
      const atA = this.cube.x === sh.a[0] && this.cube.z === sh.a[1];
      const atB = this.cube.x === sh.b[0] && this.cube.z === sh.b[1];
      const count = sh.twin ? 2 : 1;
      for (let k = 0; k < count; k++) {
        if (this.rideRef && (this.rideRef.i !== i || this.rideRef.k !== k)) continue;
        const p = this.view.shuttlePos(i, k);
        if (p.moving) {
          // GRAB: the cube stands on a dock while the platform drives — it
          // boards immediately. TRACK: the cube's mesh rides the platform
          // (distance-based, never tile-based: at low frame rates the
          // platform's rounded tile jumps a tile per frame).
          const onPlatform =
            Math.abs(this.cubeMesh.position.x - p.x) < 0.9 &&
            Math.abs(this.cubeMesh.position.z - p.z) < 0.9;
          if (atA || atB || onPlatform) {
            const d = Math.hypot(this.cubeMesh.position.x - p.x, this.cubeMesh.position.z - p.z);
            if (!ride || d < ride.d) ride = { sh, p, d, i, k };
          }
        } else if (p.docked) {
          // a drive just ended: settle the cube onto the dock
          const [dx, dz] = p.docked === 'a' ? sh.a : sh.b;
          if (
            Math.abs(this.cubeMesh.position.x - dx) < 1 &&
            Math.abs(this.cubeMesh.position.z - dz) < 1
          ) {
            const d = Math.hypot(this.cubeMesh.position.x - dx, this.cubeMesh.position.z - dz);
            if (!settle || d < settle.d) settle = { sh, dx, dz, d };
          }
        }
      }
    }
    if (ride && (!settle || ride.d <= settle.d)) {
      const { sh, p } = ride;
      this.cube.x = Math.round(p.x);
      this.cube.z = Math.round(p.z);
      this.cube.h = sh.h;
      this.cubeMesh.position.set(p.x, sh.h + HALF, p.z);
      this.rideRef = { i: ride.i, k: ride.k };
    } else if (settle) {
      this.cube.x = settle.dx;
      this.cube.z = settle.dz;
      this.cube.h = settle.sh.h;
      this.cubeMesh.position.set(settle.dx, settle.sh.h + HALF, settle.dz);
      this.rideRef = null;
      this.checkPickups();
    }
  }

  /**
   * Lift carry (Phase B, ADR-033): the cube rests on the platform in its
   * own cell — riding it changes only the cube's height. cube.h tracks
   * the platform's true height every frame, so a press off the shaft is
   * priced against the height the cube actually floats at (stepping off
   * mid-ride is legal exactly when the roll law says it is, as with a
   * shuttle's drive).
   */
  updateLiftCarry() {
    if (this.state !== 'playing' || this.cube.anim) return;
    if (!this.level.liftDocks.has(key(this.cube.x, this.cube.z))) return;
    const i = this.level.lifts.findIndex((lf) => lf.at[0] === this.cube.x && lf.at[1] === this.cube.z);
    if (i < 0) return;
    const h = this.view.liftHeightAt(i);
    this.cube.h = h;
    this.cubeMesh.position.set(this.cube.x, h + HALF, this.cube.z);
  }

  checkPickups() {
    for (const s of this.view.shards) {
      if (s.collected) continue;
      const p = this.cubeMesh.position;
      const dx = p.x - s.holder.position.x;
      const dz = p.z - s.holder.position.z;
      const dy = p.y - s.holder.position.y;
      if (dx * dx + dz * dz < 0.42 && Math.abs(dy) < 0.9) {
        this.view.collectShard(s);
        this.shardsCollected++;
        this.stage.shake(0.08);
        this.emit('shard', { collected: this.shardsCollected, total: this.totalShards });
      }
    }

    // freeze shards: every sentinel locks up for FREEZE_TIME
    for (const f of this.view.freezes || []) {
      if (f.collected) continue;
      const p = this.cubeMesh.position;
      const dx = p.x - f.holder.position.x;
      const dz = p.z - f.holder.position.z;
      const dy = p.y - f.holder.position.y;
      if (dx * dx + dz * dz < 0.42 && Math.abs(dy) < 0.9) {
        this.view.collectFreeze(f);
        this.freezeLeft = FREEZE_TIME; // re-grabbing refreshes the freeze
        this.view.setFrozen(true);
        this.stage.shake(0.08);
        this.emit('freeze', { left: FREEZE_TIME });
      }
    }

    // the gate key: a bigger, more important pickup
    const gk = this.level.gateKey;
    if (gk && !this.hasKey) {
      const kx = this.cube.x - gk.x;
      const kz = this.cube.z - gk.z;
      if (kx * kx + kz * kz < 1.05) {
        this.view.collectGateKey();
        this.hasKey = true;
        this.gateLocked = false;
        this.view.setGoalLocked(false);
        this.stage.shake(0.1);
        this.emit('key');
        if (this.level.boss) {
          // the arena answers the key: wave-2 sentinels wake and every
          // patrol speeds up (M3 bosses, ADR-029)
          this.view.beginPhase();
          this.stage.shake(0.22);
          this.emit('bossphase');
        }
      }
    }
  }

  checkOrbs() {
    if (this.freezeLeft > 0) return; // frozen sentinels are inert (M3 wave-1)
    const p = this.cubeMesh.position;
    // sentinel kills are size-blind (the fairness proofs are pure x/z
    // geometry): price the cube at its logical centre, undoing the mini
    // mesh's floor-glue drop (ADR-034)
    const py = p.y + (1 - (this.sizeCur ?? 1)) * HALF;
    for (const o of this.view.orbs) {
      if (o.awake === false) continue; // a sleeping proximity sentinel is inert
      const dx = p.x - o.holder.position.x;
      const dz = p.z - o.holder.position.z;
      const dy = py - o.holder.position.y;
      if (dx * dx + dz * dz < ORB_KILL_RADIUS * ORB_KILL_RADIUS && Math.abs(dy) < ORB_KILL_HEIGHT) {
        this.die('sentinel');
        return;
      }
    }
  }

  checkBrokenGround() {
    if (this.cube.anim) return;
    if (this.view.isBroken(this.cube.x, this.cube.z)) {
      // the slab vanished underneath: drop the cube into the dark
      this.cube.anim = {
        type: 'fall',
        t: 0,
        dx: 0,
        dz: 0,
        startPos: this.cubeMesh.position.clone(),
        fromQuat: this.cubeMesh.quaternion.clone(),
        spin: new THREE.Vector3(0.6, 0, 0.4),
      };
      this.die('crumble');
    }
  }

  checkSunkGround() {
    if (this.cube.anim) return;
    const k = key(this.cube.x, this.cube.z);
    if (this.level.pulseTiles.has(k) && !this.view.pulseUp(this.cube.x, this.cube.z)) {
      // the phantom slab blinked out underneath the cube
      this.cube.anim = {
        type: 'fall',
        t: 0,
        dx: 0,
        dz: 0,
        startPos: this.cubeMesh.position.clone(),
        fromQuat: this.cubeMesh.quaternion.clone(),
        spin: new THREE.Vector3(0.5, 0, 0.45),
      };
      this.emit('sliderFell');
      this.die('pulse');
      return;
    }
    if (this.level.sliderTiles.has(k) && !this.view.sliderUp(this.cube.x, this.cube.z)) {
      // the bridge let go underneath the cube
      this.cube.anim = {
        type: 'fall',
        t: 0,
        dx: 0,
        dz: 0,
        startPos: this.cubeMesh.position.clone(),
        fromQuat: this.cubeMesh.quaternion.clone(),
        spin: new THREE.Vector3(0.4, 0, 0.5),
      };
      this.emit('sliderFell');
      this.die('slider');
      return;
    }
    if (this.level.turntableCells.has(k) && !this.view.turntableSolidAt(this.cube.x, this.cube.z)) {
      // the bar swept away underneath the cube (Phase B, ADR-036)
      this.cube.anim = {
        type: 'fall',
        t: 0,
        dx: 0,
        dz: 0,
        startPos: this.cubeMesh.position.clone(),
        fromQuat: this.cubeMesh.quaternion.clone(),
        spin: new THREE.Vector3(0.45, 0, 0.4),
      };
      this.emit('sliderFell');
      this.die('turntable');
    }
  }

  /**
   * The wheel (ADR-050): a two-armed capstan turning over a pit.
   *
   * A MINI cube rolls under the arms untouched — that is the mechanic's
   * promise, and the safe route every proof guarantees. A full-size cube
   * standing on a ring tile when an arm sweeps over it is caught and flung
   * off the rim. The check is settled-only (no `anim`): the 243 ms tumble is
   * the player's committed action, and killing mid-roll would punish a move
   * the player could not see resolved — so the arm catches you standing in
   * its path, which is the read the hazard telegraphs.
   *
   * The fall's direction is the arm's TANGENT at that ring tile, so the cube
   * is visibly dragged around with the bar before it drops, not simply
   * dropped in place.
   */
  checkWheels() {
    if (!this.level.wheels.length) return;
    if (this.mini) return;            // small enough to pass beneath the arms
    if (this.cube.anim) return;       // only a settled cube is caught
    const w = this.level.wheelCells.get(key(this.cube.x, this.cube.z));
    if (!w) return;
    if (!this.view.wheelSweptAt(this.cube.x, this.cube.z)) return;
    // flung along the arm's TANGENT — the cube is dragged around the rim,
    // not simply dropped straight down
    const dx = this.cube.x - w.at[0];
    const dz = this.cube.z - w.at[1];
    this.cube.anim = {
      type: 'fall',
      t: 0,
      dx: -dz * 0.9,
      dz: dx * 0.9,
      startPos: this.cubeMesh.position.clone(),
      fromQuat: this.cubeMesh.quaternion.clone(),
      spin: new THREE.Vector3(-dz * 1.4, 0.4, dx * 1.4),
    };
    this.emit('wheelDrag', { x: this.cube.x, z: this.cube.z });
    this.die('wheel');
  }

  /**
   * Piston pushers (Phase B, ADR-035): the shove. When the arm fires and
   * the cube rests on the strike cell, the cube is carried one tile along
   * the push axis IF that shove is legal under the same law a breeze
   * obeys (solid landing, no door breach, no climb, no deep drop) — a
   * legal shove reuses the drift machinery, move log and all, so ghosts
   * replay it faithfully. An illegal shove STALLS: the arm holds flat
   * against the cube and nothing happens. Pistons displace; they never
   * crush and never shove the cube into the void.
   */
  updatePistons() {
    if (!this.level.pistons.length) return;
    if (this.state !== 'playing' || this.cube.anim || this.cube.ridingShuttle || this.cube.ridingLift) return;
    const c = this.cube;
    const pn = this.level.pistonCells.get(key(c.x, c.z));
    if (!pn) return;
    const cycle = this.view.pistonCycle(c.x, c.z);
    if (this._pistonFired.get(pn.id) === cycle) return; // one shove per extension
    if (!this.view.pistonExtendedAt(c.x, c.z)) return;
    this._pistonFired.set(pn.id, cycle);
    const fromTile = this.tileAt(c.x, c.z);
    const tx = c.x + pn.dx;
    const tz = c.z + pn.dz;
    const toTile = this.tileAt(tx, tz);
    if (!fromTile || !toTile) return; // shoved toward the void: the arm stalls
    const solid = this.isSolid(tx, tz);
    if (!solid) return;
    if (!checkRoll(this.level, fromTile, solid, this.mini).ok) return;
    this.cube.anim = {
      type: 'drift',
      t: 0,
      dur: 0.24,
      dx: pn.dx,
      dz: pn.dz,
      fromX: c.x,
      fromZ: c.z,
      fromH: fromTile.h,
      target: toTile,
      startPos: this.cubeMesh.position.clone(),
    };
    this.emit('pistonShove');
  }

  updateWind(dt) {
    if (!this.level.wind) return;
    if (this.cube.anim || this.state !== 'playing') {
      this.windTimer = WIND_PERIOD;
      return;
    }
    this.windTimer -= dt;
    if (this.windTimer > 0) return;
    this.windTimer = WIND_PERIOD;
    // ONE law (ADR-039): the breeze is priced by rules.windTarget, the
    // same predicate the wind-lock audit walks — the live game only adds
    // the clock (a dock/bridge/lift that is solid right now). A second
    // inline copy is how a mechanic drifts out of proof.
    const fromTile = this.tileAt(this.cube.x, this.cube.z);
    if (!fromTile) return;
    const toTile = windTarget(this.level, fromTile, {
      solid: (x, z) => this.isSolid(x, z),
      mini: this.mini,
    });
    if (!toTile) return;
    // a SEALED gate refuses a landing just as it refuses a press: the
    // breeze slides the cube along the gate, it does not score it. (Only
    // a keyed goal is sealed — an open goal is a win, see finishDrift.)
    if (this.level.gateKey && !this.hasKey && toTile.x === this.level.goal.x && toTile.z === this.level.goal.z) return;
    const w = this.level.wind;
    this.cube.anim = {
      type: 'drift',
      t: 0,
      dur: 0.24,
      dx: w.x,
      dz: w.z,
      fromX: this.cube.x,
      fromZ: this.cube.z,
      fromH: fromTile.h,
      target: toTile,
      startPos: this.cubeMesh.position.clone(),
    };
    this.emit('windNudge');
  }

  // ---------------------------------------------------------------- state ---
  die(cause = 'unknown') {
    if (this.state !== 'playing') return;
    this.deaths = (this.deaths || 0) + 1; // the FLAWLESS seal's only witness
    this.state = 'dead';
    this.deadTimer = 0;
    this.queue.length = 0;
    this.lastDeathCause = cause;
    // Mid-path second chance: died past halfway, bench exists, unused, enabled
    this.rescueOffered = !!(
      this.rescueEnabled && this.rescuePos && !this.rescueUsed &&
      this.moves * 2 > this.par
    );
    this.stage.shake(0.5);
    this.emit('death', { index: this.levelIndex, cause });
  }

  /** Accept the mid-path rescue: re-place the cube on the bench tile with
   *  the run's commitments intact (moves, elapsed, shards, broken crumbles,
   *  pushed blocks, key) and only the sentinels reset to their start phase.
   *  A rescued clear wins, but its time and route are not recorded. */
  acceptRescue() {
    if (this.state !== 'dead' || !this.rescueOffered) return;
    const t = this.rescuePos;
    this.rescueOffered = false;
    this.rescueUsed = true;
    this.rescuedRun = true;
    this.rideRef = null;
    this.freezeLeft = 0;
    this.view.setFrozen(false);
    this.view.resetOrbs();
    this.queue.length = 0;
    this.deadTimer = 0;
    this.cube = {
      x: t.x,
      z: t.z,
      h: t.h,
      anim: null,
      quat: new THREE.Quaternion(),
    };
    this.mini = false; // the bench re-places the cube at full size (ADR-034)
    this.sizeCur = 1;
    this.cubeMesh.visible = true;
    this.cubeMesh.position.set(t.x, t.h + HALF, t.z);
    this.cubeMesh.quaternion.identity();
    this.cubeMesh.rotation.set(0, 0, 0);
    this.cubeMesh.scale.setScalar(0.001);
    this.spawnScale = 0;
    this.state = 'playing';
    this.emit('rescue', { x: t.x, z: t.z, moves: this.moves });
  }

  respawn() {
    this.resetRunState();
    this.emit('respawn', { index: this.levelIndex });
  }

  win() {
    if (this.state === 'won') return;
    this.state = 'won';
    this.winTimer = 0;
    this.queue.length = 0;
    this.stage.shake(0.12);
    this.emit('win', {
      index: this.levelIndex,
      name: this.def.name,
      time: this.elapsed,
      shards: this.shardsCollected,
      total: this.totalShards,
      perfect: this.shardsCollected >= this.totalShards,
      moves: this.moves,
      par: this.par,
      parClear: this.moves <= this.par,
      deaths: this.deaths || 0,
      rescued: this.rescuedRun,
      hasKey: this.hasKey,
      nudgesUsed: this.maxNudges - this.nudgeLeft,
      daily: this.dailyDate,
    });
  }

  // ---------------------------------------------------------------- ghost ---
  /**
   * Arm a ghost replay: `log` is a list of {t, x, z, h} moments from a past
   * (best) run. It replays alongside the cube, on the same clock, and simply
   * lingers on the final tile once its run is done.
   */
  setGhost(log) {
    if (this.ghostMesh) {
      this.stage.scene.remove(this.ghostMesh);
      this.ghostMesh.geometry.dispose();
      this.ghostMesh.material.dispose();
      this.ghostMesh = null;
    }
    this.ghost = null;
    if (!log || log.length < 2) return;
    const geo = new THREE.BoxGeometry(0.86, 0.86, 0.86);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xdfe9ff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.stage.scene.add(mesh);
    this.ghostMesh = mesh;
    this.ghost = { log, mesh, idx: 0 };
    this._placeGhost(0);
  }

  _placeGhost(t) {
    const g = this.ghost;
    if (!g) return;
    const { log, mesh } = g;
    if (t >= log[log.length - 1].t) {
      const last = log[log.length - 1];
      mesh.position.set(last.x, last.h + HALF, last.z);
      mesh.scale.setScalar(last.mini ? MINI_SCALE : 1); // ghost replays size too (ADR-034)
      if (last.mini) mesh.position.y -= (1 - MINI_SCALE) * HALF;
      mesh.material.opacity = Math.max(0.06, 0.2 - (t - last.t) * 0.02);
      return;
    }
    while (g.idx < log.length - 2 && log[g.idx + 1].t > t) g.idx--;
    while (g.idx < log.length - 2 && log[g.idx + 1].t <= t) g.idx++;
    const a = log[g.idx];
    const b = log[g.idx + 1];
    const span = Math.max(1e-4, b.t - a.t);
    const f = this.ease(Math.min(1, Math.max(0, (t - a.t) / span)));
    mesh.position.set(
      a.x + (b.x - a.x) * f,
      a.h + (b.h - a.h) * f + HALF,
      a.z + (b.z - a.z) * f,
    );
    const ghostMini = f < 0.5 ? a.mini : b.mini;
    mesh.scale.setScalar(ghostMini ? MINI_SCALE : 1);
    if (ghostMini) mesh.position.y -= (1 - MINI_SCALE) * HALF;
    mesh.material.opacity = 0.2;
  }

  updateGhost(dt) {
    if (!this.ghost) return;
    if (this.state === 'playing') this._placeGhost(this.elapsed);
  }

  /** The recorded route of the current run, ready to be stored as a ghost. */
  getMoveLog() {
    return this.moveLog;
  }

  get playing() {
    return this.state === 'playing' && !this.paused;
  }
}

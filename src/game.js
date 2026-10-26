import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Stage } from './stage.js';
import { buildLevelView } from './levelView.js';
import { LEVELS } from './levels.js';
import { getDailyLevel } from './daily.js';
import { parseLevel, DIRS, checkRoll, key, shortestRoute, canPushBlock, MAX_DROP } from './rules.js';
import { glowTexture, disposeTree } from './textures.js';

const ROLL_TIME = 0.17;
// Vivid cube colour per level, like EDGE's recolouring between stages.
const CUBE_COLORS = [0xff5ad9, 0x5be07c, 0x5b8cff, 0xff9f3d, 0xffd14d, 0xb07cff, 0x7dffce, 0xff6a5e, 0x4fd8ff, 0xff8a4f, 0xff4f8e, 0xc8ff5e, 0xffd14d, 0xff5e3a];
const DAILY_COLOR = 0xffd14d;
const DROP_TIME = 0.11;
const HALF = 0.5;
const ORB_KILL_RADIUS = 0.62;
const ORB_KILL_HEIGHT = 1.0;
const WIND_PERIOD = 0.62; // seconds between breeze nudges

const easeInOut = (t) => t * t * (3 - 2 * t);

export class Game {
  constructor(canvas) {
    this.stage = new Stage(canvas);
    this.listeners = new Map();

    this.state = 'idle'; // idle | playing | dead | won
    this.paused = false;
    this.elapsed = 0;
    this.levelIndex = 0;
    this.level = null;
    this.view = null;

    this.queue = [];
    this.camQuadrant = 0; // which 90° seat the camera is on (see setCamQuadrant)
    this.shardsCollected = 0;
    this.totalShards = 0;
    this.moves = 0;
    this.par = 0;

    // new mechanics
    this.blocks = new Map(); // key -> {x, z}
    this.nudgeLeft = 0;
    this.maxNudges = 0;
    this.hasKey = false;
    this.gateLocked = false;
    this.windTimer = WIND_PERIOD;
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
  }

  // --------------------------------------------------------------- level ---
  load(index, { keepState = false } = {}) {
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    const def = LEVELS[this.levelIndex];
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

    if (this.view) {
      this.stage.scene.remove(this.view.group);
      this.view.dispose();
    }
    this.view = buildLevelView(this.level);
    this.stage.scene.add(this.view.group);

    // recolor the cube for this level
    const c = typeof def.id === 'number' ? CUBE_COLORS[(def.id - 1) % CUBE_COLORS.length] : DAILY_COLOR;
    this.cubeMat.color.set(c);
    this.cubeMat.emissive.set(c).multiplyScalar(0.12);
    this.cubeGlow.material.color.set(c);

    this.stage.fitLevel(this.view.bounds.min, this.view.bounds.max);
    this.stage.setFocus(this.level.start.x, this.level.start.z);

    this.par = Math.max(1, par != null ? par : shortestRoute(this.level));
    this.maxNudges = this.level.nudge;
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
    this.resetRunState();
    this.emit('restart', { index: this.levelIndex });
  }

  /** Reset everything a run owns: timers, shards, moves, and the new mechanics. */
  resetRunState() {
    this.view.reset();
    this.totalShards = this.level.shards.length;
    this.shardsCollected = 0;
    this.elapsed = 0;
    this.moves = 0;
    this.queue.length = 0;
    this.deadTimer = 0;
    this.winTimer = 0;
    this.blocks = new Map(this.level.blocks.map((b) => [key(b.x, b.z), { x: b.x, z: b.z }]));
    this.nudgeLeft = this.maxNudges;
    this.hasKey = false;
    this.gateLocked = !!this.level.gateKey;
    this.windTimer = WIND_PERIOD;
    this.view.setGoalLocked(this.gateLocked);
    this.moveLog = [{ t: 0, x: this.level.start.x, z: this.level.start.z, h: this.level.start.h }];
    this.lastDeathCause = null;
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
      if (this.nudgeLeft > 0 && canPushBlock(this.level, blockHere.x, blockHere.z, d.dx, d.dz)) {
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
          dur: 0.22,
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

    const to = this.isSolid(toX, toZ);
    const check = checkRoll(this.level, from, to);

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

  update(dt, time) {
    if (!this.level) return;

    if (this.paused) return;

    // intro pop
    if (this.spawnScale !== undefined && this.spawnScale < 1) {
      this.spawnScale = Math.min(1, this.spawnScale + dt * 5);
      const s = easeInOut(this.spawnScale);
      this.cubeMesh.scale.setScalar(0.35 + 0.65 * s);
    }

    if (this.state === 'playing') this.elapsed += dt;

    this.updateCube(dt, time);
    this.view.update(dt, time, this.cubeMesh.position);

    // camera follows the cube gently
    this.stage.setFocus(this.cubeMesh.position.x, this.cubeMesh.position.z);

    // drifting glow on the cube
    const pulse = 1.7 + Math.sin(time * 3.4) * 0.35;
    this.cubeGlow.scale.setScalar(pulse);

    if (this.state === 'playing') {
      this.checkPickups();
      this.checkOrbs();
      this.checkBrokenGround();
      this.checkSunkGround();
      this.updateWind(dt);
      this.updateGhost(dt);
    }

    if (this.state === 'dead') {
      this.deadTimer += dt;
      if (this.deadTimer > 1.0) this.respawn();
    }

    if (this.state === 'won') {
      this.winTimer += dt;
      this.cubeMesh.rotation.y += dt * 1.2;
      this.cubeMesh.position.y += dt * 0.35;
      const k = Math.min(1, this.winTimer * 0.75);
      this.cubeMesh.scale.setScalar(Math.max(0.05, 1 - k * 0.9));
      this.cubeGlow.material.opacity = 0.45 + Math.sin(time * 14) * 0.2;
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
      const e = easeInOut(a.t);
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
          this.finishMove(a.target, a);
        }
      }
    } else if (a.type === 'drop') {
      a.t = Math.min(1, a.t + dt / a.dur);
      const p = a.t * a.t;
      mesh.position.set(a.target.x, a.fromY + (a.toY - a.fromY) * p, a.target.z);
      if (a.t >= 1) this.finishMove(a.target, a);
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
    } else if (a.type === 'drift') {
      // The breeze carries the cube a tile — a soft hop, no roll, no count.
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = easeInOut(a.t);
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
      const e = easeInOut(a.t);
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
      const q = new THREE.Quaternion().setFromAxisAngle(a.spin, a.t * 4.2);
      mesh.quaternion.copy(q).multiply(a.fromQuat);
      if (a.t > 0.32 && this.state === 'playing') this.die('void');
    }
  }

  finishMove(target, rollAnim = null) {
    this.cube.anim = null;
    this.cubeMesh.position.set(target.x, target.h + HALF, target.z);
    this.cube.quat.copy(this.cubeMesh.quaternion);

    this.moves++;
    this.view.setSteps(this.moves);

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
    this.moveLog.push({ t: this.elapsed, x: target.x, z: target.z, h: target.h });
    this.emit('land', target);

    if (target.x === this.level.goal.x && target.z === this.level.goal.z) {
      this.win();
      return;
    }
    this.pumpQueue();
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
    this.moveLog.push({ t: this.elapsed, x: target.x, z: target.z, h: target.h });
    this.emit('drift', target);
    this.pumpQueue();
  }

  pumpQueue() {
    if (this.queue.length && this.state === 'playing') {
      const next = this.queue.shift();
      this.doMove(next);
    }
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
      }
    }
  }

  checkOrbs() {
    const p = this.cubeMesh.position;
    for (const o of this.view.orbs) {
      const dx = p.x - o.holder.position.x;
      const dz = p.z - o.holder.position.z;
      const dy = p.y - o.holder.position.y;
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
    }
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
    const w = this.level.wind;
    const fromTile = this.tileAt(this.cube.x, this.cube.z);
    const toTile = this.tileAt(this.cube.x + w.x, this.cube.z + w.z);
    if (!fromTile || !toTile) return;
    if (!this.isSolid(this.cube.x + w.x, this.cube.z + w.z)) return;
    // the breeze carries, it does not lift: same height or a small fall only
    const dh = toTile.h - fromTile.h;
    if (dh > 0 || dh < -MAX_DROP) return;
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
    this.state = 'dead';
    this.deadTimer = 0;
    this.queue.length = 0;
    this.lastDeathCause = cause;
    this.stage.shake(0.5);
    this.emit('death', { index: this.levelIndex, cause });
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
      mesh.material.opacity = Math.max(0.06, 0.2 - (t - last.t) * 0.02);
      return;
    }
    while (g.idx < log.length - 2 && log[g.idx + 1].t > t) g.idx--;
    while (g.idx < log.length - 2 && log[g.idx + 1].t <= t) g.idx++;
    const a = log[g.idx];
    const b = log[g.idx + 1];
    const span = Math.max(1e-4, b.t - a.t);
    const f = easeInOut(Math.min(1, Math.max(0, (t - a.t) / span)));
    mesh.position.set(
      a.x + (b.x - a.x) * f,
      a.h + (b.h - a.h) * f + HALF,
      a.z + (b.z - a.z) * f,
    );
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

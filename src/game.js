import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Stage } from './stage.js';
import { buildLevelView } from './levelView.js';
import { LEVELS } from './levels.js';
import { parseLevel, DIRS, checkRoll, key } from './rules.js';
import { glowTexture, disposeTree } from './textures.js';

const ROLL_TIME = 0.17;
// Vivid cube colour per level, like EDGE's recolouring between stages.
const CUBE_COLORS = [0xff5ad9, 0x5be07c, 0x5b8cff, 0xff9f3d, 0xffd14d, 0xb07cff, 0x7dffce, 0xff6a5e, 0x4fd8ff, 0xff8a4f, 0xff4f8e, 0xc8ff5e];
const DROP_TIME = 0.11;
const HALF = 0.5;
const ORB_KILL_RADIUS = 0.62;
const ORB_KILL_HEIGHT = 1.0;

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
    this.shardsCollected = 0;
    this.totalShards = 0;

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
    this.level = parseLevel(def);
    this.def = def;

    if (this.view) {
      this.stage.scene.remove(this.view.group);
      this.view.dispose();
    }
    this.view = buildLevelView(this.level);
    this.stage.scene.add(this.view.group);

    // recolor the cube for this level
    const c = CUBE_COLORS[(def.id - 1) % CUBE_COLORS.length];
    this.cubeMat.color.set(c);
    this.cubeMat.emissive.set(c).multiplyScalar(0.12);
    this.cubeGlow.material.color.set(c);

    this.stage.fitLevel(this.view.bounds.min, this.view.bounds.max);
    this.stage.setFocus(this.level.start.x, this.level.start.z);

    this.totalShards = this.level.shards.length;
    this.shardsCollected = 0;
    this.elapsed = 0;
    this.queue.length = 0;
    this.deadTimer = 0;
    this.winTimer = 0;

    this.placeCubeAtStart();
    this.state = 'playing';
    this.paused = false;

    this.emit('level', {
      index: this.levelIndex,
      def,
      level: this.level,
      shards: this.totalShards,
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
    this.view.reset();
    this.totalShards = this.level.shards.length;
    this.shardsCollected = 0;
    this.elapsed = 0;
    this.queue.length = 0;
    this.deadTimer = 0;
    this.winTimer = 0;
    this.placeCubeAtStart();
    this.state = 'playing';
    this.paused = false;
    this.emit('restart', { index: this.levelIndex });
  }

  setPaused(p) {
    this.paused = p;
  }

  // --------------------------------------------------------------- input ---
  input(dirName) {
    if (!DIRS[dirName]) return;
    if (this.state !== 'playing' || this.paused) return;
    if (this.cube.anim) {
      if (this.queue.length < 2 && this.queue[this.queue.length - 1] !== dirName) {
        this.queue.push(dirName);
      }
      return;
    }
    this.doMove(dirName);
  }

  tileAt(x, z) {
    return this.level.tiles.get(key(x, z));
  }

  isSolid(x, z) {
    const t = this.tileAt(x, z);
    if (!t) return null;
    if (this.view.isBroken(x, z)) return null;
    return t;
  }

  doMove(dirName) {
    const d = DIRS[dirName];
    const from = this.cube;
    const to = this.isSolid(from.x + d.dx, from.z + d.dz);
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
      landed: 0,
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
          this.finishMove(a.target);
        }
      }
    } else if (a.type === 'drop') {
      a.t = Math.min(1, a.t + dt / a.dur);
      const p = a.t * a.t;
      mesh.position.set(a.target.x, a.fromY + (a.toY - a.fromY) * p, a.target.z);
      if (a.t >= 1) this.finishMove(a.target);
    } else if (a.type === 'bump') {
      a.t = Math.min(1, a.t + dt / a.dur);
      const k = Math.sin(a.t * Math.PI) * 0.14;
      mesh.position.set(a.startPos.x + a.dx * k, a.startPos.y, a.startPos.z + a.dz * k);
      if (a.t >= 1) {
        mesh.position.copy(a.startPos);
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
      if (a.t > 0.32 && this.state === 'playing') this.die();
    }
  }

  finishMove(target) {
    this.cube.anim = null;
    this.cubeMesh.position.set(target.x, target.h + HALF, target.z);
    this.cube.quat.copy(this.cubeMesh.quaternion);

    if (target.crumble) this.view.breakAt(target.x, target.z);
    this.emit('land', target);

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
  }

  checkOrbs() {
    const p = this.cubeMesh.position;
    for (const o of this.view.orbs) {
      const dx = p.x - o.holder.position.x;
      const dz = p.z - o.holder.position.z;
      const dy = p.y - o.holder.position.y;
      if (dx * dx + dz * dz < ORB_KILL_RADIUS * ORB_KILL_RADIUS && Math.abs(dy) < ORB_KILL_HEIGHT) {
        this.die();
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
      this.die();
    }
  }

  // ---------------------------------------------------------------- state ---
  die() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.deadTimer = 0;
    this.queue.length = 0;
    this.stage.shake(0.5);
    this.emit('death', { index: this.levelIndex });
  }

  respawn() {
    this.view.reset();
    this.shardsCollected = 0;
    this.placeCubeAtStart();
    this.state = 'playing';
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
    });
  }

  get playing() {
    return this.state === 'playing' && !this.paused;
  }
}

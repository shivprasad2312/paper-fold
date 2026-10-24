import Matter from 'matter-js';
import { FRUITS, SPAWN_WEIGHTS, MERGE_SCORES } from './fruits.js';
import { clamp, mulberry32 } from './utils.js';

const { Engine, World, Bodies, Body, Composite, Events, Sleeping } = Matter;

export const WORLD = {
  width: 368,
  height: 580,
  wall: 40,
  ceil: -620,
  spawnY: 46,
  dangerLine: 118,
};

const DROP_COOLDOWN = 240;
const MERGE_TWEEN = 110;
const COMBO_WINDOW = 850;
const DANGER_GRACE = 950;
const DANGER_TIME = 1150;
const MAX_SPEED = 16;

export function pickSpawnTier(random = Math.random) {
  const total = SPAWN_WEIGHTS.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < SPAWN_WEIGHTS.length; i++) {
    roll -= SPAWN_WEIGHTS[i];
    if (roll <= 0) return i;
  }
  return 0;
}

export class Game {
  constructor() {
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.15 },
      enableSleeping: true,
    });
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 6;
    this.engine.constraintIterations = 3;
    this.world = this.engine.world;
    this.fruits = [];
    this.pending = [];
    this.effects = [];
    this.listeners = {};

    this.score = 0;
    this.best = readBest();
    this.merges = 0;
    this.topTier = 0;
    this.combo = 0;
    this.lastMergeAt = -9999;
    this.over = false;
    this.overAt = 0;
    this.lastDropAt = -9999;
    this.started = false;
    this.now = 0;
    this.random = Math.random;
    this.nextTier = pickSpawnTier(this.random);
    this.time = 0;

    this.buildStatic();
    this.bindCollisions();
    this.newGame();
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
    return this;
  }

  emit(event, payload) {
    (this.listeners[event] || []).forEach((fn) => fn(payload));
  }

  buildStatic() {
    const { width, height, wall, ceil } = WORLD;
    const opts = {
      isStatic: true,
      friction: 0.4,
      restitution: 0,
      label: 'wall',
    };
    this.statics = [
      Bodies.rectangle(-wall / 2, (ceil + height + 300) / 2, wall, height - ceil + 300, opts),
      Bodies.rectangle(width + wall / 2, (ceil + height + 300) / 2, wall, height - ceil + 300, opts),
      Bodies.rectangle(width / 2, height + wall / 2, width + wall * 2, wall, opts),
      Bodies.rectangle(width / 2, ceil - wall / 2, width + wall * 2, wall * 4, opts),
    ];
    Composite.add(this.world, this.statics);
  }

  bindCollisions() {
    Events.on(this.engine, 'collisionStart', (event) => {
      if (this.over) return;
      for (const pair of event.pairs) {
        const fa = this.findFruit(pair.bodyA);
        const fb = this.findFruit(pair.bodyB);
        if (fa && fb) this.tryMerge(fa, fb);
      }
    });
  }

  findFruit(body) {
    return this.fruits.find((f) => f.body === body);
  }

  newGame({ seed = null } = {}) {
    // Seeded runs make the weekly puzzle use the same drop sequence for everyone.
    this.random = seed === null ? Math.random : mulberry32(seed >>> 0);
    // Remove any fruit bodies, keep the static jar.
    for (const fruit of this.fruits) World.remove(this.world, fruit.body);
    this.fruits = [];
    this.pending = [];
    this.effects = [];
    this.score = 0;
    this.merges = 0;
    this.topTier = 0;
    this.combo = 0;
    this.lastMergeAt = -9999;
    this.over = false;
    this.overAt = 0;
    this.lastDropAt = -9999;
    this.nextTier = pickSpawnTier(this.random);
    this.started = false;
    this.emit('reset');
    this.emit('score', { score: 0, best: this.best, delta: 0 });
  }

  start() {
    this.started = true;
  }

  /** Horizontal aim is clamped so the fruit always fits between the walls. */
  clampAim(x, tier) {
    const r = FRUITS[tier].r;
    return clamp(x, r + 4, WORLD.width - r - 4);
  }

  canDrop() {
    return !this.over && this.now - this.lastDropAt >= DROP_COOLDOWN;
  }

  drop(x, now = this.now) {
    if (!this.canDrop()) return null;
    const tier = this.nextTier;
    const fruit = FRUITS[tier];
    const cx = this.clampAim(x, tier);
    const body = Bodies.circle(cx, WORLD.spawnY, fruit.r, {
      label: 'fruit',
      restitution: 0.06,
      friction: 0.42,
      frictionStatic: 0.6,
      frictionAir: 0.004,
      density: 0.0011,
      slop: 0.02,
      sleepThreshold: 55,
    });
    Body.setVelocity(body, { x: 0, y: 2 });
    Composite.add(this.world, body);

    const record = {
      body,
      tier,
      bornAt: now,
      merged: false,
      dangerSince: 0,
      spawn: 1,
      id: body.id,
    };
    this.fruits.push(record);
    this.nextTier = pickSpawnTier(this.random);
    this.lastDropAt = now;
    this.started = true;
    this.emit('drop', { tier, x: cx });
    this.emit('next', this.nextTier);
    return record;
  }

  tryMerge(fa, fb) {
    if (fa.merged || fb.merged) return;
    if (fa.tier !== fb.tier) return;
    if (fa.tier >= FRUITS.length - 1) return; // two watermelons just sit there

    fa.merged = true;
    fb.merged = true;
    const tier = fa.tier + 1;
    const x = (fa.body.position.x + fb.body.position.x) / 2;
    const y = (fa.body.position.y + fb.body.position.y) / 2;
    const vx = (fa.body.velocity.x + fb.body.velocity.x) / 2;
    const vy = (fa.body.velocity.y + fb.body.velocity.y) / 2;

    // Remove both physics bodies immediately. The short pending sprite below is
    // presentation only; leaving these bodies in Matter would make invisible,
    // unrendered fruit continue to block the pile.
    this.removeFruit(fa);
    this.removeFruit(fb);
    this.pending.push({ x, y, vx, vy, tier, t: 0, dur: MERGE_TWEEN });

    this.combo = this.now - this.lastMergeAt <= COMBO_WINDOW ? this.combo + 1 : 1;
    this.lastMergeAt = this.now;
    const multiplier = Math.min(this.combo, 8);
    const points = MERGE_SCORES[tier] * multiplier;
    this.score += points;
    this.merges += 1;
    this.topTier = Math.max(this.topTier, tier);

    if (tier === FRUITS.length - 1) this.best = Math.max(this.best, this.score);
    if (this.score > this.best) {
      this.best = this.score;
      writeBest(this.best);
    }

    this.emit('score', {
      score: this.score,
      best: this.best,
      delta: points,
    });
    this.emit('merge', {
      tier,
      x,
      y,
      points,
      combo: this.combo,
      radius: FRUITS[tier].r,
    });
  }

  removeFruit(record, removeBody = true) {
    if (removeBody) World.remove(this.world, record.body);
    this.fruits = this.fruits.filter((f) => f !== record);
  }

  finalizeMerge(item) {
    const fruit = FRUITS[item.tier];
    const body = Bodies.circle(item.x, item.y, fruit.r, {
      label: 'fruit',
      restitution: 0.04,
      friction: 0.42,
      frictionStatic: 0.6,
      frictionAir: 0.004,
      density: 0.0011,
      slop: 0.02,
      sleepThreshold: 55,
    });
    const speed = Math.hypot(item.vx, item.vy);
    const scale = speed > MAX_SPEED ? MAX_SPEED / speed : 1;
    Body.setVelocity(body, { x: item.vx * scale, y: item.vy * scale });
    Composite.add(this.world, body);
    this.fruits.push({
      body,
      tier: item.tier,
      bornAt: this.now,
      merged: false,
      dangerSince: 0,
      spawn: 0,
      id: body.id,
      pop: 1,
    });
    this.emit('pop', { tier: item.tier, x: item.x, y: item.y });
  }

  update(dtMs) {
    const dt = clamp(dtMs, 1, 33.4);
    this.now += dt;
    this.time = this.now;

    // advance merge hand-offs
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const item = this.pending[i];
      item.t += dt;
      if (item.t >= item.dur) {
        this.pending.splice(i, 1);
        this.finalizeMerge(item);
      }
    }

    for (const fruit of this.fruits) {
      if (fruit.pop > 0) fruit.pop = Math.max(0, fruit.pop - dt / 150);
    }

    // effects (ripples / confetti) are pure presentation
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.t += dt;
      if (fx.t >= fx.dur) this.effects.splice(i, 1);
    }

    // Matter wants small, even steps; split long frames instead of overshooting.
    const steps = Math.max(1, Math.ceil(dt / 16.6));
    const slice = dt / steps;
    for (let i = 0; i < steps; i++) Engine.update(this.engine, slice);

    if (this.combo && this.now - this.lastMergeAt > COMBO_WINDOW) this.combo = 0;

    this.checkDanger();
    this.checkEscape();
  }

  checkDanger() {
    if (this.over) return;
    let maxAbove = 0;
    for (const fruit of this.fruits) {
      const top = fruit.body.position.y - FRUITS[fruit.tier].r;
      const calm =
        fruit.body.speed < 1.6 && Math.abs(fruit.body.angularSpeed) < 0.25;
      const mature = this.now - fruit.bornAt > DANGER_GRACE;
      if (top < WORLD.dangerLine && calm && mature && !fruit.merged) {
        if (!fruit.dangerSince) fruit.dangerSince = this.now;
        maxAbove = Math.max(maxAbove, this.now - fruit.dangerSince);
      } else {
        fruit.dangerSince = 0;
      }
    }
    if (maxAbove > DANGER_TIME) this.gameOver();
  }

  checkEscape() {
    if (this.over) return;
    for (const fruit of this.fruits) {
      const { x, y } = fruit.body.position;
      if (y > WORLD.height + 240 || x < -140 || x > WORLD.width + 140) {
        this.removeFruit(fruit);
        this.gameOver();
        return;
      }
    }
  }

  dangerLevel() {
    if (this.over) return 0;
    let level = 0;
    for (const fruit of this.fruits) {
      const top = fruit.body.position.y - FRUITS[fruit.tier].r;
      if (top < WORLD.dangerLine) {
        const nearness = clamp((WORLD.dangerLine - top) / 90, 0, 1);
        const calm = fruit.body.speed < 4 ? 1 : 0.55;
        level = Math.max(level, nearness * calm);
      }
    }
    return level;
  }

  gameOver() {
    if (this.over) return;
    this.over = true;
    this.overAt = this.now;
    const newBest = this.score >= this.best && this.score > 0;
    if (this.score > this.best) this.best = this.score;
    writeBest(this.best);
    this.emit('gameover', {
      score: this.score,
      best: this.best,
      newBest,
      merges: this.merges,
      topTier: this.topTier,
    });
  }

  sleepingFruitCount() {
    return this.fruits.filter((f) => Sleeping.isSleeping(f.body)).length;
  }

  totalFruitCount() {
    return this.fruits.length + this.pending.length;
  }
}

function readBest() {
  try {
    return Number(localStorage.getItem('paperfold.best') || 0) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    localStorage.setItem('paperfold.best', String(value));
  } catch {
    /* ignore */
  }
}

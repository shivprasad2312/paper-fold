// DOM smoke test: bundles the real entry point and runs it inside jsdom with a
// native canvas shim, then pokes the UI the way a player would.
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
  runScripts: 'outside-only',
});
const { window } = dom;

// ── canvas shim ────────────────────────────────────────────────────────────
// jsdom has no 2D context; back every <canvas> with a real napi-rs canvas.
const backing = new WeakMap();
const dims = new WeakMap();

function realFor(el) {
  let real = backing.get(el);
  if (!real) {
    const d = dims.get(el) || { w: 300, h: 150 };
    real = createCanvas(d.w, d.h);
    backing.set(el, real);
  }
  return real;
}

Object.defineProperty(window.HTMLCanvasElement.prototype, 'width', {
  get() {
    const real = backing.get(this);
    if (real) return real.width;
    return (dims.get(this) || { w: 300 }).w;
  },
  set(v) {
    const d = dims.get(this) || {};
    d.w = Number(v);
    dims.set(this, d);
    const real = backing.get(this);
    if (real) real.width = Number(v);
  },
});
Object.defineProperty(window.HTMLCanvasElement.prototype, 'height', {
  get() {
    const real = backing.get(this);
    if (real) return real.height;
    return (dims.get(this) || { h: 150 }).h;
  },
  set(v) {
    const d = dims.get(this) || {};
    d.h = Number(v);
    dims.set(this, d);
    const real = backing.get(this);
    if (real) real.height = Number(v);
  },
});
window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type !== '2d') return null;
  return realFor(this).getContext('2d');
};
window.devicePixelRatio = 2;

// Offscreen canvas creation (sprites) returns a real napi canvas so that
// drawImage() accepts it.
const origCreate = window.document.createElement.bind(window.document);
window.document.createElement = (tag, opts) => {
  if (tag === 'canvas') return createCanvas(300, 150);
  return origCreate(tag, opts);
};

window.HTMLElement.prototype.getBoundingClientRect = function () {
  return { width: 430, height: 860, left: 0, top: 0, right: 430, bottom: 860, x: 0, y: 0 };
};
window.devicePixelRatio = 2;

window.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
window.AudioContext = class {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {};
  }
  createDynamicsCompressor() {
    return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} };
  }
  createGain() {
    return {
      gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} },
      connect() {},
    };
  }
  createOscillator() {
    return { type: 'sine', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createBufferSource() {
    return { buffer: null, connect() {}, start() {}, stop() {} };
  }
  createBiquadFilter() {
    return { type: 'lowpass', frequency: { value: 0 }, Q: { value: 0 }, connect() {} };
  }
  createBuffer(channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  resume() {}
};

// ── bundle and run ─────────────────────────────────────────────────────────
const outfile = '.tmp-main.bundle.js';
await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  outfile,
  loader: { '.css': 'empty' },
  define: { 'import.meta.env.DEV': 'true' },
  target: 'es2020',
  logLevel: 'error',
});
const code = fs.readFileSync(outfile, 'utf8');

const errors = [];
window.addEventListener('error', (e) => errors.push('window error: ' + e.message));
let rafQueue = [];
window.requestAnimationFrame = (cb) => {
  rafQueue.push(cb);
  return rafQueue.length;
};
window.cancelAnimationFrame = () => {};

try {
  window.eval(code);
} catch (err) {
  errors.push('eval failed: ' + err.stack);
}

function tick(frames = 20) {
  for (let i = 0; i < frames; i++) {
    const q = rafQueue;
    rafQueue = [];
    q.forEach((cb) => {
      try {
        cb(performance.now());
      } catch (e) {
        errors.push('raf error: ' + e.message);
      }
    });
  }
}

tick(12);

const doc = window.document;
const overlay = doc.getElementById('overlay');
const card = doc.getElementById('card');
console.log('overlay open after boot:', overlay.classList.contains('is-open'));
console.log('first-run tutorial:', card.querySelector('.tutorial-title')?.textContent);
if (!card.querySelector('.tutorial-title')) throw new Error('first-run tutorial did not open');
const hook = window.__paperfold;

function screenAction(action) {
  const button = card.querySelector(`[data-action="${action}"]`);
  if (!button) throw new Error(`missing screen action: ${action}`);
  button.click();
  tick(3);
}

for (let step = 1; step < 4; step++) {
  if (!card.querySelector('.tutorial-copy')) throw new Error(`tutorial step ${step} missing`);
  screenAction('tutorial-next');
}
screenAction('tutorial-next');
console.log('tutorial completed and saved:', hook.progress.tutorialSeen);
if (!hook.progress.tutorialSeen || !card.querySelector('[data-action="play"]')) throw new Error('tutorial completion did not return home');
screenAction('tutorial');
screenAction('tutorial-skip');
console.log('tutorial skip returns home:', !!card.querySelector('[data-action="play"]'));

screenAction('levels');
console.log('levels screen nodes:', card.querySelectorAll('.level-node').length);
if (card.querySelectorAll('.level-node').length !== 12 || !card.querySelector('.level-goal-mini')) throw new Error('level goal nodes did not render');
screenAction('home');
hook.progress.unlockedTier = 10;
screenAction('neighborhood');
console.log('neighborhood theme:', card.querySelector('.habitat-stage')?.dataset.theme);
if (!card.querySelector('.habitat-tabs') || !card.querySelector('.decor-list') || !card.querySelector('.habitat-wish')) throw new Error('neighborhood or habitat wish did not render');
hook.progress.coins += 300;
hook.showNeighborhood();
card.querySelector('[data-action="buy-decor"]').click();
tick(3);
console.log('pal reaction bubble:', card.querySelector('.scene-bubble')?.textContent);
if (!hook.progress.habitatDecor?.includes('cloud:cloud-cottage') || !card.querySelector('.scene-bubble') || !hook.renderer.habitatScene.decor.includes('cloud-cottage')) throw new Error('decoration purchase did not trigger a pal reaction or enter the game backdrop');
card.querySelector('[data-action="buy-decor"]:not(:disabled)').click();
tick(3);
const starsBeforeWish = hook.progress.stars;
card.querySelector('[data-action="claim-habitat"]:not(:disabled)').click();
tick(3);
console.log('habitat wish reward:', hook.progress.stars - starsBeforeWish);
if (!hook.progress.habitatObjectives?.includes('cloud') || hook.progress.stars !== starsBeforeWish + 1) throw new Error('habitat wish did not award its reward');
hook.showNeighborhood('forest');
if (!card.querySelector('.habitat-wish')?.textContent.includes('firefly picnic') || hook.renderer.habitatScene.key !== 'forest') throw new Error('Forest Nook wish or game backdrop missing');
hook.showNeighborhood('moon');
if (!card.querySelector('.habitat-wish')?.textContent.includes('dream nest') || hook.renderer.habitatScene.key !== 'moon') throw new Error('Moonlit Den wish or game backdrop missing');
screenAction('home');
screenAction('collection');
card.querySelector('[data-action="buddy"][data-tier="0"]').click();
tick(3);
console.log('passport personality:', card.querySelector('.passport-personality')?.textContent);
if (!card.querySelector('.passport-stats') || !card.querySelector('[data-action="visit-habitat"]')) throw new Error('pal passport did not render');
screenAction('collection');
console.log('collection milestone cards:', card.querySelectorAll('.milestone-card').length);
const milestoneCoins = hook.progress.coins;
card.querySelector('[data-milestone="meet-three"]').click();
tick(3);
console.log('collection milestone claimed:', hook.progress.collectionMilestones?.includes('meet-three'));
if (!hook.progress.collectionMilestones?.includes('meet-three') || hook.progress.coins !== milestoneCoins + 45) throw new Error('collection discovery milestone reward missing');
const setRewardCoins = hook.progress.coins;
card.querySelector('[data-milestone="cloud-set"]').click();
tick(3);
if (!hook.progress.collectionMilestones?.includes('cloud-set') || hook.progress.coins !== setRewardCoins + 80) throw new Error('habitat collection set reward missing');
screenAction('home');
screenAction('weekly');
if (!card.querySelector('.weekly-goal') || !card.querySelector('.weekly-refresh')) throw new Error('weekly puzzle did not render');
card.querySelector('[data-action="start-weekly"]').click();
tick(3);
const weekly = hook.activeWeekly;
function satisfyWeeklyGoal() {
  const goal = hook.activeWeekly.goal;
  if (goal.type === 'score') hook.game.score = goal.target;
  if (goal.type === 'create') hook.goalRun.created = goal.count;
  if (goal.type === 'combo') hook.goalRun.bestCombo = goal.target;
  if (goal.type === 'reach') hook.game.topTier = goal.tier;
  hook.checkActiveGoal();
  tick(3);
}
satisfyWeeklyGoal();
console.log('weekly first clear:', card.querySelector('.result-ribbon')?.textContent.trim());
if (!hook.progress.weeklyCompleted?.includes(weekly.key)) throw new Error('weekly clear was not saved');
const firstClearCoins = hook.progress.coins;
const firstClearStars = hook.progress.stars;
card.querySelector('[data-action="weekly-again"]').click();
tick(3);
if (hook.activeWeekly.seed !== weekly.seed) throw new Error('weekly replay changed the seed');
satisfyWeeklyGoal();
console.log('weekly replay:', card.querySelector('.result-ribbon')?.textContent.trim());
if (hook.progress.coins !== firstClearCoins || hook.progress.stars !== firstClearStars) throw new Error('weekly replay repeated first-clear rewards');
screenAction('home');
screenAction('puzzle-packs');
console.log('curated puzzle cards:', card.querySelectorAll('.puzzle-pack').length);
if (card.querySelectorAll('.puzzle-pack').length !== 3) throw new Error('puzzle pack list did not render all curated puzzles');
card.querySelector('[data-action="start-puzzle"][data-puzzle="cloud-hop"]').click();
tick(3);
const firstPuzzle = hook.activePuzzle;
if (!firstPuzzle || hook.game.dropLimit !== firstPuzzle.dropLimit || hook.game.fruits.length !== firstPuzzle.startingBoard.length) throw new Error('puzzle starting board or drop limit was not applied');
hook.game.topTier = firstPuzzle.goal.tier;
hook.checkActiveGoal();
tick(3);
console.log('puzzle pack first clear:', card.querySelector('.result-ribbon')?.textContent.trim());
if (!hook.progress.puzzlesCompleted?.includes('cloud-hop')) throw new Error('puzzle clear did not save');
const firstPuzzleCoins = hook.progress.coins;
card.querySelector('[data-action="puzzle-again"]').click();
tick(3);
hook.game.topTier = firstPuzzle.goal.tier;
hook.checkActiveGoal();
tick(3);
if (hook.progress.coins !== firstPuzzleCoins) throw new Error('puzzle replay repeated its first-clear reward');
screenAction('puzzle-packs');
card.querySelector('[data-action="start-puzzle"][data-puzzle="forest-friends"]').click();
tick(3);
hook.goalRun.created = 1;
hook.checkActiveGoal();
tick(3);
if (!hook.progress.puzzlesCompleted.includes('forest-friends')) throw new Error('create-goal puzzle did not clear');
screenAction('puzzle-packs');
card.querySelector('[data-action="start-puzzle"][data-puzzle="moonlight-combo"]').click();
tick(3);
hook.goalRun.bestCombo = 2;
hook.checkActiveGoal();
tick(3);
if (!hook.progress.puzzlesCompleted.includes('moonlight-combo')) throw new Error('combo-goal puzzle did not clear');
screenAction('home');
screenAction('collection');
console.log('collection pals:', card.querySelectorAll('.pal-card').length, 'painted minis:', card.querySelectorAll('canvas.mini').length);
screenAction('home');
screenAction('rewards');
console.log('daily reward days:', card.querySelectorAll('.reward-day').length);
screenAction('claim');
console.log('daily coins saved:', window.__paperfold.progress.coins);
screenAction('home');
screenAction('settings');
const hapticBefore = card.querySelector('[data-action="haptic-setting"]').getAttribute('aria-pressed');
screenAction('haptic-setting');
console.log('settings toggle works:', hapticBefore !== card.querySelector('[data-action="haptic-setting"]').getAttribute('aria-pressed'));
screenAction('home');

// click Play
card.querySelector('[data-action="play"]').click();
tick(5);
console.log('overlay hidden after play:', !overlay.classList.contains('is-open'));

// simulate pointer drop on the canvas
const canvasEl = doc.getElementById('board');
function pointer(type, x) {
  const ev = new window.Event(type, { bubbles: true, cancelable: true });
  ev.clientX = x;
  ev.clientY = 400;
  ev.pointerId = 1;
  canvasEl.dispatchEvent(ev);
}
pointer('pointerdown', 200);
pointer('pointerup', 200);
tick(10);

// keyboard drop + arrows
['ArrowLeft', 'ArrowRight', ' ', ' '].forEach((key) => {
  const ev = new window.KeyboardEvent('keydown', { key, bubbles: true });
  window.dispatchEvent(ev);
  tick(6);
});
tick(60);
console.log('sound button html set:', doc.getElementById('btn-sound').innerHTML.includes('svg'));

// restart button
doc.getElementById('btn-restart').click();
tick(5);
// help button
doc.getElementById('btn-help').click();
tick(3);
console.log('pause screen opened:', overlay.classList.contains('is-open'), card.querySelector('.page-head h2')?.textContent.trim());

// mute toggle
doc.getElementById('btn-sound').click();
tick(2);
console.log('muted class:', doc.getElementById('btn-sound').classList.contains('is-muted'));

// ── game over via the dev hook ───────────────────────────────────────────
console.log('dev hook present:', !!hook);
hook.game.score = 4820;
hook.game.merges = 37;
hook.game.topTier = 8;
hook.game.gameOver();
await new Promise((r) => setTimeout(r, 1000));
tick(4);
console.log('game over overlay:', overlay.classList.contains('is-open'));
console.log('buttons:', [...card.querySelectorAll('[data-action]')].map((b) => b.dataset.action));
console.log('score title:', card.querySelector('.result-title')?.textContent.trim());
console.log('stats:', [...card.querySelectorAll('.stats b')].map((b) => b.textContent));
console.log('biggest:', card.querySelector('.biggest')?.textContent.trim());
console.log('new best ribbon:', card.querySelector('.result-ribbon')?.textContent.trim());

card.querySelector('[data-action="restart"]').click();
tick(10);
console.log('restarted & overlay hidden:', !overlay.classList.contains('is-open'), 'score reset:', hook.game.score === 0);
hook.game.score = 120;
hook.checkActiveGoal();
tick(4);
console.log('level complete popup:', card.querySelector('.result-ribbon')?.textContent.trim());
card.querySelector('[data-action="next-level"]').click();
tick(6);
console.log('next level starts:', hook.state === 'playing', 'unlocked level:', hook.progress.unlocked);
screenAction('home');
screenAction('levels');
card.querySelector('[data-action="level"][data-level="1"]').click();
tick(4);
const starsAfterFirstClear = hook.progress.stars;
hook.game.score = 120;
hook.game.topTier = 0;
hook.checkActiveGoal();
tick(3);
console.log('same-star replay reward:', card.querySelector('.reward-pills')?.textContent.trim());
if (hook.progress.stars !== starsAfterFirstClear || !card.querySelector('.reward-pills')?.textContent.includes('+0')) throw new Error('replaying a level repeated its star reward');
screenAction('home');
screenAction('levels');
card.querySelector('[data-action="level"][data-level="1"]').click();
tick(4);
hook.game.score = 120;
hook.game.topTier = 2;
hook.checkActiveGoal();
tick(3);
console.log('improved-star replay total:', hook.progress.stars);
if (hook.progress.stars !== starsAfterFirstClear + 1) throw new Error('level replay did not grant only the improved stars');

console.log('ERRORS:', errors.length ? errors : 'none');
fs.unlinkSync(outfile);

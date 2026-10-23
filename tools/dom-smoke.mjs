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
console.log('card has play button:', !!card.querySelector('[data-action="play"]'));
console.log('mini canvases painted:', card.querySelectorAll('canvas.mini').length);
console.log('title text:', card.querySelector('h1')?.textContent.trim());

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
console.log('help opened intro/resume:', overlay.classList.contains('is-open'), card.querySelector('[data-action="play"]')?.textContent.trim());

// mute toggle
doc.getElementById('btn-sound').click();
tick(2);
console.log('muted class:', doc.getElementById('btn-sound').classList.contains('is-muted'));

// ── game over via the dev hook ───────────────────────────────────────────
const hook = window.__paperfold;
console.log('dev hook present:', !!hook);
hook.game.score = 4820;
hook.game.merges = 37;
hook.game.topTier = 8;
hook.game.gameOver();
await new Promise((r) => setTimeout(r, 1000));
tick(4);
console.log('game over overlay:', overlay.classList.contains('is-open'));
console.log('buttons:', [...card.querySelectorAll('[data-action]')].map((b) => b.dataset.action));
console.log('score title:', card.querySelector('.title')?.textContent.trim());
console.log('stats:', [...card.querySelectorAll('.stats b')].map((b) => b.textContent));
console.log('biggest:', card.querySelector('.biggest strong')?.textContent);
console.log('new best badge:', !!card.querySelector('.badge'));

card.querySelector('[data-action="restart"]').click();
tick(10);
console.log('restarted & overlay hidden:', !overlay.classList.contains('is-open'), 'score reset:', hook.game.score === 0);

console.log('ERRORS:', errors.length ? errors : 'none');
fs.unlinkSync(outfile);

import './styles.css';
import { Game, WORLD } from './game.js';
import { Renderer } from './renderer.js';
import { Sfx } from './audio.js';
import { FRUITS } from './fruits.js';
import { makeFruitSprite } from './art.js';
import { clamp } from './utils.js';

const canvas = document.getElementById('board');
const overlay = document.getElementById('overlay');
const card = document.getElementById('card');
const soundBtn = document.getElementById('btn-sound');
const restartBtn = document.getElementById('btn-restart');
const helpBtn = document.getElementById('btn-help');
const toastEl = document.getElementById('toast');
const hintEl = document.querySelector('.hint');

const game = new Game();
const renderer = new Renderer(canvas, game);
const sfx = new Sfx();

const ICON_SOUND_ON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ICON_SOUND_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

let state = 'intro'; // intro | playing | paused | over
let pointerDown = false;
let overTimer = 0;
let last = performance.now();
let spriteCache = null;

syncSoundButton();

// ── game events ─────────────────────────────────────────────────────────────
function buzz(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

game.on('merge', ({ tier, x, y, points, combo }) => {
  game.effects.push({
    kind: 'merge',
    tier,
    x,
    y,
    points,
    combo,
    t: 0,
    dur: 640,
    seed: Math.floor(Math.random() * 1e6),
  });
  sfx.merge(tier, combo);
  renderer.bump(2 + tier * 0.55);
  if (tier >= 5) buzz(tier >= 8 ? [16, 26, 34] : 14);
  flashHint(tier, combo);
  if (tier === FRUITS.length - 1) {
    // the last fruit in the chain — a proper moment
    game.effects.push({
      kind: 'confetti',
      x: WORLD.width / 2,
      y: 0,
      t: 0,
      dur: 2200,
      seed: Math.floor(Math.random() * 1e6),
    });
    setTimeout(() => sfx.win(), 220);
    showToast('Watermelon! Nothing folds higher.');
  }
});

game.on('drop', () => {
  sfx.unlock();
  sfx.drop();
});

game.on('gameover', (payload) => {
  state = 'over';
  sfx.gameOver();
  buzz([28, 60, 28]);
  game.effects.push({
    kind: 'confetti',
    x: WORLD.width / 2,
    y: 0,
    t: 0,
    dur: 2400,
    seed: Math.floor(Math.random() * 1e6),
  });
  if (payload.newBest) setTimeout(() => sfx.newBest(), 650);
  clearTimeout(overTimer);
  overTimer = setTimeout(() => showGameOver(payload), 900);
});

// ── overlay screens ─────────────────────────────────────────────────────────
function setOverlay(html, { dim = true } = {}) {
  card.innerHTML = html;
  overlay.classList.toggle('is-dim', dim);
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideOverlay() {
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
}

function fruitStrip(tiers = FRUITS.map((_, i) => i)) {
  return `<div class="ladder">${tiers
    .map((tier) => `<span class="ladder-item" title="${FRUITS[tier].name}">${miniFruit(tier)}</span>`)
    .join('')}</div>`;
}

function miniFruit(tier, size = 32) {
  return `<canvas class="mini" data-tier="${tier}" width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px"></canvas>`;
}

function paintMinis(root) {
  root.querySelectorAll('canvas.mini').forEach((el) => {
    const tier = Number(el.dataset.tier);
    const sprite = getSprites()[tier];
    const ctx = el.getContext('2d');
    const scale = el.width / sprite.size;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(sprite.canvas, 0, 0, sprite.size * scale, sprite.size * scale);
  });
}

function getSprites() {
  if (!spriteCache) spriteCache = FRUITS.map((f) => makeFruitSprite(f, 2));
  return spriteCache;
}

function showIntro({ resume = false } = {}) {
  const best = Math.max(game.best, 0);
  setOverlay(`
    <div class="tape"></div>
    <p class="eyebrow">A paper-craft fruit merge</p>
    <h1 class="title">Paper<span>Fold</span></h1>
    ${fruitStrip([0, 2, 4, 6, 8, 10])}
    <p class="lede">Drop fruit into the jar. Two of a kind fold into the next. Keep the pile under the limit line.</p>
    <button class="btn btn-primary" data-action="play">${resume ? 'Resume' : 'Play'}</button>
    <p class="tiny">Best <b>${formatScore(best)}</b>${resume ? '' : ' &nbsp;·&nbsp; sound on'}</p>
    <div class="tips">
      <span><kbd>←</kbd><kbd>→</kbd> aim</span>
      <span><kbd>space</kbd> drop</span>
      <span><kbd>M</kbd> mute</span>
    </div>
  `);
  paintMinis(card);
  if (!resume) state = 'intro';
}

function showGameOver(payload) {
  const { score, best, newBest, merges, topTier } = payload;
  const top = FRUITS[Math.min(topTier, FRUITS.length - 1)];
  setOverlay(`
    <div class="tape"></div>
    ${newBest ? '<span class="badge">New best!</span>' : ''}
    <p class="eyebrow">${newBest ? 'A record fold' : 'The jar is full'}</p>
    <h1 class="title title-sm">${formatScore(score)}</h1>
    <p class="lede lede-tight">points</p>
    <div class="biggest">
      ${miniFruit(Math.min(topTier, FRUITS.length - 1), 54)}
      <div>
        <span class="eyebrow">Biggest</span>
        <strong>${top.name}</strong>
      </div>
    </div>
    <div class="stats">
      <div><b>${merges}</b><span>merges</span></div>
      <div><b>${formatScore(best)}</b><span>best</span></div>
    </div>
    <button class="btn btn-primary" data-action="restart">Fold again</button>
    <button class="btn btn-ghost" data-action="share">Share score</button>
  `);
  paintMinis(card);
}

function formatScore(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function play() {
  sfx.unlock();
  sfx.click();
  hideOverlay();
  state = 'playing';
  game.start();
}

function pause() {
  state = 'paused';
}

function restart() {
  clearTimeout(overTimer);
  game.newGame();
  hintHold = 0;
  setHint(HINT_DEFAULT);
  sfx.unlock();
  sfx.click();
  hideOverlay();
  state = 'playing';
  game.start();
}

const HINT_DEFAULT = 'fold two of a kind';
let hintHold = 0;

function setHint(text, tone = '') {
  if (!hintEl) return;
  hintEl.textContent = text;
  hintEl.dataset.tone = tone;
}

function flashHint(tier, combo) {
  const fruit = FRUITS[Math.min(tier, FRUITS.length - 1)];
  if (combo >= 3) setHint(`combo x${Math.min(combo, 8)}!`, 'hot');
  else if (tier >= 9) setHint(`${fruit.name} — huge!`, 'hot');
  hintHold = 1500;
}

function updateHint(dt) {
  if (hintHold > 0) {
    hintHold -= dt;
    return;
  }
  const danger = game.dangerLevel();
  if (state === 'playing' && danger > 0.42) setHint('mind the limit line', 'warn');
  else setHint(HINT_DEFAULT);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  setTimeout(() => toastEl.classList.remove('is-visible'), 1800);
}

async function shareScore() {
  const text = `I folded ${formatScore(game.score)} points in Paper Fold — a paper-craft fruit merge game.`;
  const url = location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Paper Fold', text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    showToast('Score copied!');
  } catch {
    showToast('Could not share — but nice score!');
  }
}

// ── input ───────────────────────────────────────────────────────────────────
function updateAim(event) {
  const rect = canvas.getBoundingClientRect();
  const px = clamp(event.clientX - rect.left, 0, rect.width);
  const { x } = renderer.toWorld(px, 0);
  renderer.setAim(x);
}

canvas.addEventListener('pointerdown', (event) => {
  if (state !== 'playing') return;
  sfx.unlock();
  pointerDown = true;
  canvas.setPointerCapture?.(event.pointerId);
  updateAim(event);
  renderer.setShowAim(true);
});

canvas.addEventListener('pointermove', (event) => {
  if (state !== 'playing') return;
  updateAim(event);
  renderer.setShowAim(true);
});

canvas.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  pointerDown = false;
  if (state !== 'playing') return;
  updateAim(event);
  if (game.canDrop()) game.drop(renderer.aim);
  else sfx.click();
});

canvas.addEventListener('pointercancel', () => {
  pointerDown = false;
});

canvas.addEventListener('pointerleave', () => {
  if (!pointerDown) renderer.setShowAim(false);
});

window.addEventListener('keydown', (event) => {
  const key = event.key;
  if (key === 'm' || key === 'M') {
    toggleSound();
    return;
  }
  if (key === 'r' || key === 'R') {
    if (state !== 'intro') restart();
    return;
  }
  if (state !== 'playing') {
    if ((key === 'Enter' || key === ' ') && state !== 'playing') {
      const target = overlay.querySelector('[data-action="play"]');
      if (target) {
        event.preventDefault();
        play();
      } else {
        const again = overlay.querySelector('[data-action="restart"]');
        if (again) {
          event.preventDefault();
          restart();
        }
      }
    }
    return;
  }
  const step = event.shiftKey ? 4 : 12;
  if (key === 'ArrowLeft') {
    event.preventDefault();
    renderer.setAim(game.clampAim(renderer.aim - step, game.nextTier));
    renderer.setShowAim(true);
  } else if (key === 'ArrowRight') {
    event.preventDefault();
    renderer.setAim(game.clampAim(renderer.aim + step, game.nextTier));
    renderer.setShowAim(true);
  } else if (key === ' ' || key === 'ArrowDown' || key === 'Enter') {
    event.preventDefault();
    if (game.canDrop()) game.drop(renderer.aim);
  }
});

overlay.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'play') {
    if (state === 'intro') {
      game.newGame();
      play();
    } else if (state === 'over') {
      restart();
    } else {
      play();
    }
  } else if (action === 'restart') {
    restart();
  } else if (action === 'share') {
    sfx.click();
    shareScore();
  } else if (action === 'help') {
    sfx.click();
    showIntro({ resume: state === 'playing' });
  }
});

// ── chrome buttons ──────────────────────────────────────────────────────────
function syncSoundButton() {
  soundBtn.innerHTML = sfx.muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
  soundBtn.classList.toggle('is-muted', sfx.muted);
  soundBtn.setAttribute('aria-label', sfx.muted ? 'Unmute sound' : 'Mute sound');
  soundBtn.setAttribute('aria-pressed', String(sfx.muted));
}

function toggleSound() {
  sfx.unlock();
  sfx.toggleMuted();
  syncSoundButton();
  if (!sfx.muted) sfx.click();
  showToast(sfx.muted ? 'Sound off' : 'Sound on');
}

soundBtn.addEventListener('click', toggleSound);

restartBtn.addEventListener('click', restart);

helpBtn.addEventListener('click', () => {
  sfx.unlock();
  sfx.click();
  if (state === 'playing') {
    pause();
    showIntro({ resume: true });
  } else if (state === 'intro' || state === 'over') {
    showIntro();
  } else {
    showIntro({ resume: true });
  }
});

// ── resize / loop ───────────────────────────────────────────────────────────
let resizeRaf = 0;
function scheduleResize() {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => renderer.resize());
}

window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 120));
if (window.ResizeObserver) {
  new ResizeObserver(scheduleResize).observe(canvas);
}

function frame(now) {
  const dt = Math.min(48, now - last);
  last = now;
  if (state === 'paused') {
    renderer.render(dt * 0.25);
  } else {
    game.update(dt);
    renderer.render(dt);
  }
  updateHint(dt);
  requestAnimationFrame(frame);
}

// A tiny dash of starting fruit so the intro isn't an empty page.
function seedIntro() {
  game.newGame();
  game.nextTier = 0;
  renderer.setAim(WORLD.width * 0.5);
  renderer.setShowAim(false);
}

seedIntro();
showIntro();

// Dev-only handle for debugging in the console. Stripped from production builds.
if (import.meta.env?.DEV) {
  window.__paperfold = { game, renderer, sfx };
}
requestAnimationFrame((t) => {
  last = t;
  frame(t);
});

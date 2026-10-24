import { Game } from './game.js';
import { LEVELS } from './levels.js';
import { AudioEngine } from './audio.js';
import { loadSave, writeSave, recordWin, fmtTime } from './save.js';

const $ = (id) => document.getElementById(id);

const canvas = $('scene');
const game = new Game(canvas);
const audio = new AudioEngine();
let save = loadSave();

const el = {
  hud: $('hud'),
  index: $('hud-index'),
  name: $('hud-name'),
  timer: $('hud-timer'),
  shardCount: $('hud-shard-count'),
  shards: $('hud-shards'),
  mini: $('minimap'),
  winSteps: $('win-steps'),
  hint: $('hint'),
  menu: $('menu'),
  levels: $('levels'),
  grid: $('level-grid'),
  win: $('win'),
  winTitle: $('win-title'),
  winEyebrow: $('win-eyebrow'),
  winTime: $('win-time'),
  winShards: $('win-shards'),
  winBest: $('win-best'),
  next: $('btn-next'),
  pause: $('pause'),
  pad: $('pad'),
  flash: $('flash'),
  soundBtn: $('btn-sound'),
};

const isTouch = window.matchMedia('(pointer: coarse)').matches;

let hintTimer = null;
let hintDismissed = false;

// ---------------------------------------------------------------- helpers ---
const show = (node) => node.classList.remove('hidden');
const hide = (node) => node.classList.add('hidden');

const FLASH = {
  death: 'radial-gradient(circle at 50% 50%, rgba(255,70,110,0.42), rgba(90,0,25,0.62))',
  gold: 'radial-gradient(circle at 50% 50%, rgba(255,209,102,0.26), rgba(60,40,0,0.1))',
  load: 'radial-gradient(circle at 50% 50%, rgba(120,220,255,0.2), rgba(2,6,16,0.55))',
};

function flash(kind = 'death') {
  el.flash.style.background = FLASH[kind] || FLASH.death;
  el.flash.classList.add('on');
  setTimeout(() => el.flash.classList.remove('on'), 90);
}

function showHint(text, duration = 5200) {
  clearTimeout(hintTimer);
  el.hint.textContent = text;
  el.hint.classList.remove('hidden');
  hintDismissed = false;
  hintTimer = setTimeout(() => hide(el.hint), duration);
}

function hideHint() {
  if (hintDismissed) return;
  hintDismissed = true;
  clearTimeout(hintTimer);
  el.hint.classList.add('hidden');
}

function updateShardHud() {
  const total = game.totalShards || 0;
  el.shardCount.textContent = `${game.shardsCollected}/${total}`;
  el.shards.style.opacity = total === 0 ? '0.4' : '1';
}

function updateTimerHud() {
  if (game.state === 'playing' || game.state === 'won') {
    el.timer.textContent = fmtTime(game.elapsed);
  }
}

const miniCtx = el.mini.getContext('2d');
function drawMinimap() {
  const lvl = game.level;
  const view = game.view;
  if (!lvl || !view) return;
  const ctx = miniCtx;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const t of lvl.tiles.values()) {
    if (t.x < minX) minX = t.x;
    if (t.x > maxX) maxX = t.x;
    if (t.z < minZ) minZ = t.z;
    if (t.z > maxZ) maxZ = t.z;
  }
  const pad = 0.6;
  minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;
  const cell = Math.min(W / (maxX - minX), H / (maxZ - minZ));
  const ox = (W - cell * (maxX - minX)) / 2;
  const oy = (H - cell * (maxZ - minZ)) / 2;
  const px = (x) => ox + (x - minX) * cell;
  const pz = (z) => oy + (z - minZ) * cell;
  const s = cell * 0.9;

  for (const t of lvl.tiles.values()) {
    if (t.crumble) ctx.fillStyle = 'rgba(206,150,80,0.95)';
    else ctx.fillStyle = `hsl(212 22% ${42 + t.h * 9}%)`;
    ctx.fillRect(px(t.x) - s / 2, pz(t.z) - s / 2, s, s);
  }
  ctx.fillStyle = '#ffd15a';
  ctx.beginPath();
  ctx.arc(px(lvl.goal.x), pz(lvl.goal.z), s * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff9d2e';
  for (const sh of view.shards) {
    if (sh.collected) continue;
    ctx.fillRect(px(sh.x) - 2.4, pz(sh.z) - 2.4, 4.8, 4.8);
  }
  ctx.fillStyle = '#ff3f74';
  for (const o of view.orbs) {
    ctx.beginPath();
    ctx.arc(px(o.holder.position.x), pz(o.holder.position.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const cx = game.cubeMesh.position.x;
  const cz = game.cubeMesh.position.z;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px(cx) - s * 0.32, pz(cz) - s * 0.32, s * 0.64, s * 0.64);
}

function tickUI() {
  updateTimerHud();
  if (!el.hud.classList.contains('hidden')) drawMinimap();
  requestAnimationFrame(tickUI);
}

function unlockAudio() {
  audio.init();
  if (save.sound) audio.startMusic(game.levelIndex);
}

// ------------------------------------------------------------- level flow ---
function startLevel(index, { animate = true } = {}) {
  index = Math.max(0, Math.min(LEVELS.length - 1, index));
  unlockAudio();
  audio.setLevel(index);

  hide(el.menu);
  hide(el.levels);
  hide(el.win);
  hide(el.pause);

  const def = game.load(index);
  game.setPaused(false);

  el.index.textContent = String(def.id).padStart(2, '0');
  el.name.textContent = def.name;
  el.timer.textContent = fmtTime(0);
  updateShardHud();
  show(el.hud);
  if (isTouch) show(el.pad);

  save.lastLevel = index + 1;
  writeSave(save);

  const hintText = isTouch && def.id === 1 ? 'Swipe anywhere, or tap the pad, to roll' : def.hint;
  if (hintText) showHint(hintText);
  if (animate) flash('load');
}

function openMenu() {
  hide(el.hud);
  hide(el.pad);
  hide(el.win);
  hide(el.pause);
  hide(el.levels);
  hideHint();
  show(el.menu);
  game.load(Math.max(0, Math.min(LEVELS.length - 1, (save.lastLevel || 1) - 1)));
  game.setPaused(true);
  audio.stopMusic();
}

function openLevels() {
  hide(el.menu);
  hide(el.win);
  hide(el.pause);
  hide(el.hud);
  show(el.levels);
  game.setPaused(true);
  renderLevelGrid();
}

function renderLevelGrid() {
  el.grid.innerHTML = '';
  LEVELS.forEach((def, i) => {
    const locked = def.id > save.unlocked;
    const best = save.best[def.id];
    const card = document.createElement('button');
    card.className = 'level-card' + (locked ? ' locked' : '') + (def.id === save.lastLevel ? ' current' : '');
    if (locked) card.disabled = true;
    const totalShards = (def.shards || []).length;
    const got = best ? best.shards : 0;
    card.innerHTML = `
      <span class="num">${String(def.id).padStart(2, '0')}</span>
      ${best ? `<span class="best">${fmtTime(best.time)}</span>` : ''}
      <span class="lname">${def.name}</span>
      <span class="dots">${Array.from({ length: totalShards }, (_, d) =>
        `<i class="dot${d < got ? ' on' : ''}"></i>`).join('')}</span>
    `;
    if (!locked) {
      card.addEventListener('click', () => {
        audio.sfx('ui');
        startLevel(i);
      });
    }
    el.grid.appendChild(card);
  });
}

function pauseGame() {
  if (game.state !== 'playing' || game.paused) return;
  game.setPaused(true);
  show(el.pause);
  hide(el.pad);
  hideHint();
}

function resumeGame() {
  if (game.state !== 'playing') return;
  hide(el.pause);
  game.setPaused(false);
  if (isTouch) show(el.pad);
}

function togglePause() {
  if (game.paused) resumeGame();
  else pauseGame();
}

function restartLevel() {
  hide(el.pause);
  hide(el.win);
  game.restart();
  game.setPaused(false);
  show(el.hud);
  if (isTouch) show(el.pad);
  updateShardHud();
  el.timer.textContent = fmtTime(0);
  if (game.def && game.def.hint) showHint(game.def.hint, 3200);
  audio.sfx('ui');
}

function nextLevel() {
  const next = game.levelIndex + 1;
  if (next < LEVELS.length) startLevel(next);
  else openLevels();
}

// ------------------------------------------------------------------ input ---
const KEYMAP = {
  arrowup: 'up', w: 'up',
  arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
};

function handleInput(dir) {
  if (!game.playing) return;
  unlockAudio();
  hideHint();
  game.input(dir);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (KEYMAP[k]) {
    e.preventDefault();
    handleInput(KEYMAP[k]);
    return;
  }
  if (k === 'r') {
    e.preventDefault();
    if (game.state === 'playing' || game.state === 'dead') restartLevel();
  } else if (k === 'm') {
    toggleSound();
  } else if (k === 'escape') {
    if (!el.win.classList.contains('hidden')) return;
    if (!el.levels.classList.contains('hidden')) {
      openMenu();
      return;
    }
    if (game.state === 'playing') togglePause();
  } else if (k === 'enter') {
    if (!el.win.classList.contains('hidden')) nextLevel();
    else if (!el.menu.classList.contains('hidden')) startLevel(Math.max(0, (save.lastLevel || 1) - 1));
  }
});

// swipe
let pointerStart = null;
canvas.addEventListener('pointerdown', (e) => {
  pointerStart = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
});
canvas.addEventListener('pointerup', (e) => {
  if (!pointerStart || e.pointerId !== pointerStart.id) return;
  const dx = e.clientX - pointerStart.x;
  const dy = e.clientY - pointerStart.y;
  const dist = Math.hypot(dx, dy);
  pointerStart = null;
  if (dist < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) handleInput(dx > 0 ? 'right' : 'left');
  else handleInput(dy > 0 ? 'down' : 'up');
});
canvas.addEventListener('pointercancel', () => {
  pointerStart = null;
});

// on-screen pad
for (const btn of el.pad.querySelectorAll('.pad-btn')) {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleInput(btn.dataset.dir);
  });
}

// ------------------------------------------------------------------ audio ---
function toggleSound() {
  save.sound = !save.sound;
  audio.setEnabled(save.sound);
  if (save.sound) {
    unlockAudio();
    audio.startMusic(game.levelIndex);
  }
  writeSave(save);
  el.soundBtn.classList.toggle('muted', !save.sound);
  el.soundBtn.textContent = save.sound ? '\u266A' : '\u266A';
  audio.sfx('ui');
}

// ------------------------------------------------------------------ wiring --
$('btn-play').addEventListener('click', () => {
  audio.sfx('ui');
  startLevel(Math.max(0, Math.min(LEVELS.length - 1, (save.lastLevel || 1) - 1)));
});
$('btn-levels').addEventListener('click', () => {
  audio.sfx('ui');
  openLevels();
});
$('btn-levels-back').addEventListener('click', () => {
  audio.sfx('ui');
  openMenu();
});
$('btn-pause').addEventListener('click', () => {
  audio.sfx('ui');
  pauseGame();
});
$('btn-restart').addEventListener('click', () => {
  restartLevel();
});
$('btn-sound').addEventListener('click', toggleSound);
$('btn-resume').addEventListener('click', () => {
  audio.sfx('ui');
  resumeGame();
});
$('btn-pause-restart').addEventListener('click', restartLevel);
$('btn-pause-levels').addEventListener('click', () => {
  audio.sfx('ui');
  openLevels();
});
$('btn-pause-menu').addEventListener('click', () => {
  audio.sfx('ui');
  openMenu();
});
$('btn-next').addEventListener('click', () => {
  audio.sfx('ui');
  nextLevel();
});
$('btn-replay').addEventListener('click', () => {
  audio.sfx('ui');
  restartLevel();
});
$('btn-win-levels').addEventListener('click', () => {
  audio.sfx('ui');
  openLevels();
});

// ------------------------------------------------------------- game events --
game.on('move', () => {
  audio.sfx('roll', { pitch: 0.9 + Math.random() * 0.25 });
  hideHint();
});

game.on('land', () => {
  audio.sfx('land');
});

game.on('bump', () => {
  audio.sfx('bump');
  game.stage.shake(0.06);
});

game.on('fall', () => {
  audio.sfx('roll', { pitch: 0.6 });
});

game.on('shard', ({ collected, total }) => {
  updateShardHud();
  audio.sfx('shard');
  flash('gold');
  if (collected === total && total > 0) showHint('All shards — now find the gate', 2200);
});

game.on('death', () => {
  audio.sfx('death');
  flash('death');
  showHint('Down you go. Try again.', 1600);
  el.timer.textContent = fmtTime(game.elapsed);
});

game.on('respawn', () => {
  updateShardHud();
});

game.on('win', (res) => {
  save = recordWin(save, game.def.id, res.time, res.shards, res.moves);
  audio.sfx('win', { transpose: game.levelIndex * 2 });

  el.winTitle.textContent = res.name;
  el.winEyebrow.textContent = res.perfect && res.parClear
    ? 'perfect par clear'
    : res.perfect
      ? 'perfect clear'
      : res.parClear
        ? 'par clear'
        : 'level clear';
  el.winTime.textContent = fmtTime(res.time);
  el.winShards.textContent = `${res.shards}/${res.total}`;
  el.winSteps.textContent = res.moves === res.par ? `${res.moves} (par)` : `${res.moves} / par ${res.par}`;
  const best = save.best[game.def.id];
  el.winBest.textContent = fmtTime(best.time);
  el.next.style.display = game.levelIndex + 1 < LEVELS.length ? '' : 'none';
  el.next.textContent = game.levelIndex + 1 < LEVELS.length ? 'Next level' : 'Levels';

  setTimeout(() => {
    hide(el.pad);
    hideHint();
    show(el.win);
  }, 900);
});

game.on('level', ({ def }) => {
  el.index.textContent = String(def.id).padStart(2, '0');
  el.name.textContent = def.name;
});

// --------------------------------------------------------------- lifecycle --
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing' && !game.paused) pauseGame();
});

document.addEventListener('pointerdown', () => unlockAudio(), { once: true });
document.addEventListener('keydown', () => unlockAudio(), { once: true });

window.addEventListener('resize', () => game.stage.resize());

// ------------------------------------------------------------------ boot ----
el.soundBtn.classList.toggle('muted', !save.sound);
document.body.classList.toggle('touch', isTouch);

game.load(Math.max(0, Math.min(LEVELS.length - 1, (save.lastLevel || 1) - 1)));
game.setPaused(true);
updateShardHud();
tickUI();

// handy for debugging from the console
window.__kubik = { game, startLevel, openLevels, save };

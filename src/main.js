import { Game } from './game.js';
import { LEVELS } from './levels.js';
import { AudioEngine } from './audio.js';
import { loadSave, writeSave, recordWin, recordGhost, recordDaily, medalFor, fmtTime } from './save.js';

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
  hudMech: $('hud-mech'),
  winSteps: $('win-steps'),
  winMedal: $('win-medal'),
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
  btnTheme: $('btn-theme'),
  btnThemeMenu: $('btn-theme-menu'),
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- theme ----
// Two worlds, one engine: the same slabs and shadows, different light.
const MOON_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M20.6 14.6A8.8 8.8 0 0 1 9.4 3.4a9 9 0 1 0 11.2 11.2Z"/></svg>';
const SUN_ICON =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="4.2"/>' +
  '<g stroke="currentColor" stroke-width="1.9" stroke-linecap="round">' +
  '<line x1="12" y1="1.6" x2="12" y2="4.4"/><line x1="12" y1="19.6" x2="12" y2="22.4"/>' +
  '<line x1="1.6" y1="12" x2="4.4" y2="12"/><line x1="19.6" y1="12" x2="22.4" y2="12"/>' +
  '<line x1="4.6" y1="4.6" x2="6.6" y2="6.6"/><line x1="17.4" y1="17.4" x2="19.4" y2="19.4"/>' +
  '<line x1="4.6" y1="19.4" x2="6.6" y2="17.4"/><line x1="17.4" y1="6.6" x2="19.4" y2="4.6"/>' +
  '</g></svg>';

function applyTheme(t) {
  save.theme = t;
  document.body.classList.toggle('light', t === 'light');
  game.stage.setTheme(t);
  el.btnTheme.innerHTML = t === 'light' ? SUN_ICON : MOON_ICON;
  el.btnThemeMenu.textContent = `Theme: ${t === 'light' ? 'Light' : 'Dark'}`;
  writeSave(save);
}

function toggleTheme() {
  audio.sfx('ui');
  applyTheme(save.theme === 'light' ? 'dark' : 'light');
}

const isTouch = window.matchMedia('(pointer: coarse)').matches;

let hintTimer = null;
let hintDismissed = false;
let winShowTimer = null; // the win panel pops 900ms after clearing — cancel if the player leaves first

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

  // theme-aware palette: the minimap panel is light in the light world
  const C = document.body.classList.contains('light')
    ? {
        crumble: 'rgba(186,116,32,0.95)',
        tile: (h) => `hsl(214 32% ${72 - h * 7}%)`,
        goal: '#e8930c',
        shard: '#d9720f',
        orb: '#e02456',
        bridge: 'rgba(47,108,255,0.95)',
        block: '#525c72',
        key: '#c47d08',
        player: '#18213a',
      }
    : {
        crumble: 'rgba(206,150,80,0.95)',
        tile: (h) => `hsl(212 22% ${42 + h * 9}%)`,
        goal: '#ffd15a',
        shard: '#ff9d2e',
        orb: '#ff3f74',
        bridge: 'rgba(140,190,255,0.9)',
        block: '#2b2f3a',
        key: '#ffd15a',
        player: '#ffffff',
      };

  for (const t of lvl.tiles.values()) {
    ctx.fillStyle = t.crumble ? C.crumble : C.tile(t.h);
    ctx.fillRect(px(t.x) - s / 2, pz(t.z) - s / 2, s, s);
  }
  ctx.fillStyle = C.goal;
  ctx.beginPath();
  ctx.arc(px(lvl.goal.x), pz(lvl.goal.z), s * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.shard;
  for (const sh of view.shards) {
    if (sh.collected) continue;
    ctx.fillRect(px(sh.x) - 2.4, pz(sh.z) - 2.4, 4.8, 4.8);
  }
  ctx.fillStyle = C.orb;
  for (const o of view.orbs) {
    ctx.beginPath();
    ctx.arc(px(o.holder.position.x), pz(o.holder.position.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // sliding bridges (dashed outline)
  ctx.strokeStyle = C.bridge;
  ctx.lineWidth = 1;
  for (const sl of view.sliders) {
    const { tile } = sl;
    ctx.strokeRect(px(tile.x) - s / 2, pz(tile.z) - s / 2, s, s);
  }
  // obstacle blocks
  ctx.fillStyle = C.block;
  for (const b of view.blocks.values()) {
    ctx.fillRect(px(b.x) - s * 0.3, pz(b.z) - s * 0.3, s * 0.6, s * 0.6);
  }
  // the gate key
  const gk = lvl.gateKey;
  if (gk && !game.hasKey) {
    ctx.fillStyle = C.key;
    ctx.beginPath();
    ctx.arc(px(gk.x), pz(gk.z), 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const cx = game.cubeMesh.position.x;
  const cz = game.cubeMesh.position.z;
  ctx.fillStyle = C.player;
  ctx.fillRect(px(cx) - s * 0.32, pz(cz) - s * 0.32, s * 0.64, s * 0.64);
}

// Mechanic chips in the HUD: telekinesis, gate key, wind, bridges.
function updateMechanicHud() {
  const lvl = game.level;
  const chips = [];
  if (game.maxNudges > 0) {
    chips.push(`<span class="chip chip-nudge${game.nudgeLeft === 0 ? ' empty' : ''}" title="Telekinesis — press against a dark cube to push it">PUSH ${game.nudgeLeft}</span>`);
  }
  if (lvl && lvl.gateKey) {
    chips.push(`<span class="chip chip-key${game.hasKey ? ' on' : ''}" title="Gate key">${game.hasKey ? 'KEY ✓' : 'LOCKED'}</span>`);
  }
  if (lvl && lvl.wind) chips.push(`<span class="chip chip-wind" title="Wind">WIND</span>`);
  if (lvl && lvl.sliders && lvl.sliders.length) chips.push(`<span class="chip chip-bridge" title="Sliding bridges">BRIDGE</span>`);
  el.hudMech.innerHTML = chips.join('');
  el.hudMech.classList.toggle('hidden', chips.length === 0);
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
function armGhost(id) {
  const g = save.ghosts[id];
  game.setGhost(g && g.log ? g.log : null);
}

function startLevel(index, { animate = true } = {}) {
  index = Math.max(0, Math.min(LEVELS.length - 1, index));
  unlockAudio();
  audio.setLevel(index);
  clearTimeout(winShowTimer);

  hide(el.menu);
  hide(el.levels);
  hide(el.win);
  hide(el.pause);

  const def = game.load(index);
  game.setPaused(false);
  armGhost(def.id);

  el.index.textContent = String(def.id).padStart(2, '0');
  el.name.textContent = def.name;
  el.timer.textContent = fmtTime(0);
  updateShardHud();
  updateMechanicHud();
  show(el.hud);
  if (isTouch) show(el.pad);

  save.lastLevel = index + 1;
  writeSave(save);

  const hintText = isTouch && def.id === 1 ? 'Swipe anywhere, or tap the pad, to roll' : def.hint;
  if (hintText) showHint(hintText);
  if (animate) flash('load');
}

/** The daily challenge: seeded by today's date, verified solvable, same for everyone. */
function startDaily() {
  unlockAudio();
  audio.setLevel(13);
  clearTimeout(winShowTimer);

  hide(el.menu);
  hide(el.levels);
  hide(el.win);
  hide(el.pause);

  const dateStr = todayStr();
  const def = game.loadDaily(dateStr);
  game.setPaused(false);
  armGhost(`daily:${dateStr}`);

  el.index.textContent = 'DAILY';
  el.name.textContent = `${def.name} · ${dateStr.slice(5)}`;
  el.timer.textContent = fmtTime(0);
  updateShardHud();
  updateMechanicHud();
  show(el.hud);
  if (isTouch) show(el.pad);

  const prev = save.daily[dateStr];
  const hintText = prev
    ? `Yesterday's you set ${fmtTime(prev.time)} — beat it.`
    : 'A fresh layout, generated for today. Same for everyone, always solvable.';
  showHint(hintText, 6000);
  flash('load');
}

function openMenu() {
  clearTimeout(winShowTimer);
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
  clearTimeout(winShowTimer);
  hide(el.menu);
  hide(el.win);
  hide(el.pause);
  hide(el.hud);
  show(el.levels);
  game.setPaused(true);
  renderLevelGrid();
}

function medalBadge(medal) {
  if (!medal || medal === 'none') return '';
  return `<span class="medal medal-${medal}" title="${medal} medal">${medal[0].toUpperCase()}</span>`;
}

function renderLevelGrid() {
  el.grid.innerHTML = '';

  // Daily challenge card, pinned to the top of the select screen.
  const dateStr = todayStr();
  const dailyPrev = save.daily[dateStr];
  const dailyCard = document.createElement('button');
  dailyCard.className = 'level-card daily-card';
  dailyCard.innerHTML = `
    <span class="num">DAILY</span>
    ${medalBadge(dailyPrev?.medal)}
    ${dailyPrev ? `<span class="best">${fmtTime(dailyPrev.time)}</span>` : ''}
    <span class="lname">Daily Challenge</span>
    <span class="ldesc">${dateStr.slice(5)} · fresh each day</span>
  `;
  dailyCard.addEventListener('click', () => {
    audio.sfx('ui');
    startDaily();
  });
  el.grid.appendChild(dailyCard);

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
      ${medalBadge(best?.medal)}
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

function currentRunId() {
  return game.dailyDate ? `daily:${game.dailyDate}` : game.def.id;
}

function restartLevel() {
  hide(el.pause);
  hide(el.win);
  game.restart();
  armGhost(currentRunId());
  game.setPaused(false);
  show(el.hud);
  if (isTouch) show(el.pad);
  updateShardHud();
  el.timer.textContent = fmtTime(0);
  if (game.def && game.def.hint) showHint(game.def.hint, 3200);
  audio.sfx('ui');
}

function nextLevel() {
  if (game.levelIndex === -1) {
    openLevels(); // a daily run ends back in the select
    return;
  }
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
$('btn-daily').addEventListener('click', () => {
  audio.sfx('ui');
  startDaily();
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
el.btnTheme.addEventListener('click', toggleTheme);
el.btnThemeMenu.addEventListener('click', toggleTheme);
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

game.on('push', ({ left }) => {
  audio.sfx('push');
  game.stage.shake(0.1);
  updateMechanicHud();
  if (left === 0) showHint('No more pushes left', 1800);
});

game.on('windNudge', () => {
  audio.sfx('windNudge');
});

game.on('key', () => {
  audio.sfx('key');
  flash('gold');
  updateMechanicHud();
  showHint('The gate is open', 2200);
});

game.on('gateLocked', () => {
  audio.sfx('gateLocked');
  game.stage.shake(0.12);
  showHint('Sealed — find the key first', 2200);
});

game.on('sliderFell', () => {
  audio.sfx('sliderFell');
});

game.on('death', () => {
  audio.sfx('death');
  flash('death');
  showHint('Down you go. Try again.', 1600);
  el.timer.textContent = fmtTime(game.elapsed);
});

game.on('respawn', () => {
  updateShardHud();
  armGhost(currentRunId()); // every life races the saved best again
});

game.on('win', (res) => {
  const isDaily = !!res.daily;
  const id = isDaily ? `daily:${res.daily}` : game.def.id;
  const medal = medalFor(res);
  const log = game.getMoveLog();

  if (isDaily) {
    save = recordDaily(save, res.daily, res);
  } else {
    save = recordWin(save, game.def.id, res.time, res.shards, res.moves, { par: res.par, total: res.total });
  }
  save = recordGhost(save, id, res.time, log); // next run races this one

  audio.sfx('win', { transpose: Math.max(0, game.levelIndex) * 2 });
  if (medal !== 'none') setTimeout(() => audio.sfx('medal', { tier: medal }), 420);

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
  const best = isDaily ? save.daily[res.daily] : save.best[game.def.id];
  el.winBest.textContent = best ? fmtTime(best.time) : '—';

  el.winMedal.textContent = medal === 'none' ? '' : medal.toUpperCase();
  el.winMedal.className = 'win-medal' + (medal !== 'none' ? ` medal-${medal}` : ' hidden');

  el.next.style.display = isDaily || game.levelIndex + 1 >= LEVELS.length ? 'none' : '';
  el.next.textContent = 'Next level';

  clearTimeout(winShowTimer);
  winShowTimer = setTimeout(() => {
    hide(el.pad);
    hideHint();
    show(el.win);
  }, 900);
});

game.on('level', ({ def }) => {
  el.index.textContent = String(def.id).padStart(2, '0');
  el.name.textContent = def.name;
  updateMechanicHud();
});

// --------------------------------------------------------------- lifecycle --
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing' && !game.paused) pauseGame();
});

document.addEventListener('pointerdown', () => unlockAudio(), { once: true });
document.addEventListener('keydown', () => unlockAudio(), { once: true });

window.addEventListener('resize', () => game.stage.resize());

// ------------------------------------------------------------------ boot ----
applyTheme(save.theme); // before the first frame: no theme flash
el.soundBtn.classList.toggle('muted', !save.sound);
document.body.classList.toggle('touch', isTouch);

game.load(Math.max(0, Math.min(LEVELS.length - 1, (save.lastLevel || 1) - 1)));
armGhost(game.def.id);
game.setPaused(true);
updateShardHud();
updateMechanicHud();
tickUI();

// handy for debugging from the console
window.__kubik = { game, startLevel, startDaily, restartLevel, openLevels, openMenu, save };

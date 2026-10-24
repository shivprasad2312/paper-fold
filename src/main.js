import './styles.css';
import { Game, WORLD } from './game.js';
import { Renderer } from './renderer.js';
import { Sfx } from './audio.js';
import { FRUITS } from './fruits.js';
import { makeFruitSprite } from './art.js';
import { clamp } from './utils.js';
import { HABITATS, LEVELS, PAL_PROFILES, goalMet, goalProgress, goalText, weekKey, weeklyChallenge } from './content.js';

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
const DAILY = [
  { coins: 50, icon: '🪙' },
  { stars: 1, icon: '⭐' },
  { coins: 100, icon: '🪙' },
  { buddy: 1, icon: '🎁' },
  { coins: 200, icon: '🪙' },
  { stars: 3, icon: '🌟' },
  { coins: 500, icon: '👑' },
];
let state = 'intro'; // intro | playing | paused | over
let currentLevel = 1;
let runMode = 'level'; // level | weekly
let activeWeekly = null;
let goalRun = { created: 0, bestCombo: 0 };
let selectedHabitat = 'cloud';
let levelCompleteShown = false;
let pointerDown = false;
let overTimer = 0;
let last = performance.now();
let spriteCache = null;
let hintHold = 0;
let haptics = true;
try { haptics = localStorage.getItem('fluffy.haptics') !== 'off'; } catch { /* storage is optional */ }

function readProgress() {
  const fallback = { coins: 0, stars: 0, unlocked: 1, unlockedTier: 0, levelStars: {}, lastDaily: '', streak: 0, habitatDecor: [], palMerges: {}, discoveredAt: {}, weeklyCompleted: [], weeklyBests: {} };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem('fluffy.progress') || '{}') };
  } catch {
    return fallback;
  }
}
let progress = readProgress();
function saveProgress() {
  try { localStorage.setItem('fluffy.progress', JSON.stringify(progress)); } catch { /* private mode */ }
}
function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function previousDay(key) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}
function formatScore(n) { return Number(n || 0).toLocaleString('en-US'); }
function buzz(pattern) {
  if (!haptics) return;
  try { navigator.vibrate?.(pattern); } catch { /* optional */ }
}

function syncSoundButton() {
  soundBtn.innerHTML = sfx.muted ? ICON_SOUND_OFF : ICON_SOUND_ON;
  soundBtn.classList.toggle('is-muted', sfx.muted);
  soundBtn.setAttribute('aria-label', sfx.muted ? 'Unmute sound' : 'Mute sound');
  soundBtn.setAttribute('aria-pressed', String(sfx.muted));
}
syncSoundButton();

// ── game events ─────────────────────────────────────────────────────────
game.on('merge', ({ tier, x, y, points, combo }) => {
  goalRun.bestCombo = Math.max(goalRun.bestCombo, combo);
  if (runMode === 'level' && LEVELS[currentLevel - 1]?.goal.type === 'create' && LEVELS[currentLevel - 1].goal.tier === tier) goalRun.created++;
  if (runMode === 'weekly' && activeWeekly?.goal.type === 'create' && activeWeekly.goal.tier === tier) goalRun.created++;
  progress.palMerges ||= {};
  progress.discoveredAt ||= {};
  progress.palMerges[tier] = (progress.palMerges[tier] || 0) + 1;
  if (!progress.discoveredAt[tier]) progress.discoveredAt[tier] = runMode === 'weekly' ? 'Weekly Puzzle' : `Level ${currentLevel}`;
  game.effects.push({ kind: 'merge', tier, x, y, points, combo, t: 0, dur: 640, seed: Math.floor(Math.random() * 1e6) });
  sfx.merge(tier, combo);
  renderer.bump(2 + tier * 0.55);
  if (tier >= 5) buzz(tier >= 8 ? [16, 26, 34] : 14);
  const pal = FRUITS[Math.min(tier, FRUITS.length - 1)];
  setHint(combo >= 3 ? `fluffy combo ×${Math.min(combo, 8)}!` : `${pal.name} is growing!`, 'hot');
  hintHold = 1500;
  const previousUnlockedTier = progress.unlockedTier;
  const justDiscovered = tier > previousUnlockedTier;
  progress.unlockedTier = Math.max(progress.unlockedTier, tier);
  saveProgress();
  const newlyOpenHabitat = HABITATS.find((habitat) => habitat.unlockTier > previousUnlockedTier && habitat.unlockTier <= tier);
  if (newlyOpenHabitat) showToast(`${newlyOpenHabitat.name} is ready to explore!`);
  else if (justDiscovered && tier < FRUITS.length - 1) showToast(`${pal.name} joined your Pal Pouch!`);
  checkActiveGoal();
  if (tier === FRUITS.length - 1) {
    game.effects.push({ kind: 'confetti', x: WORLD.width / 2, y: 0, t: 0, dur: 2200, seed: Math.floor(Math.random() * 1e6) });
    setTimeout(() => sfx.win(), 220);
    showToast('You found Starlight! The fluffiest pal!');
  }
});
game.on('drop', () => { sfx.unlock(); sfx.drop(); });
game.on('score', () => checkActiveGoal());
game.on('gameover', (payload) => {
  if (state === 'over') return;
  state = 'over';
  if (runMode === 'weekly' && activeWeekly) {
    progress.weeklyBests ||= {};
    progress.weeklyBests[activeWeekly.key] = Math.max(progress.weeklyBests[activeWeekly.key] || 0, payload.score);
    saveProgress();
  }
  sfx.gameOver();
  buzz([28, 60, 28]);
  game.effects.push({ kind: 'confetti', x: WORLD.width / 2, y: 0, t: 0, dur: 1800, seed: Math.floor(Math.random() * 1e6) });
  if (payload.newBest) setTimeout(() => sfx.newBest(), 650);
  clearTimeout(overTimer);
  overTimer = setTimeout(() => showGameOver(payload), 600);
});

function setOverlay(html, { screen = 'modal', dim = true } = {}) {
  card.className = `card screen-card ${screen}-card`;
  card.innerHTML = html;
  overlay.dataset.screen = screen;
  overlay.classList.toggle('is-dim', dim);
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  paintMinis(card);
}
function hideOverlay() {
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
}
function getSprites() {
  if (!spriteCache) spriteCache = FRUITS.map((pal) => makeFruitSprite(pal, 2));
  return spriteCache;
}
function miniFruit(tier, size = 36) {
  return `<canvas class="mini" data-tier="${tier}" width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px"></canvas>`;
}
function paintMinis(root) {
  root.querySelectorAll('canvas.mini').forEach((el) => {
    const sprite = getSprites()[Number(el.dataset.tier)];
    const ctx = el.getContext('2d');
    const scale = el.width / sprite.size;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(sprite.canvas, 0, 0, sprite.size * scale, sprite.size * scale);
  });
}
function wallet() {
  return `<div class="wallet"><span>🪙 <b>${formatScore(progress.coins)}</b></span><span>⭐ <b>${progress.stars}</b></span><button data-action="rewards" aria-label="Daily rewards">＋</button></div>`;
}
function pageHead(title, subtitle = '', backAction = 'home') {
  return `<div class="page-head"><button class="back-btn" data-action="${backAction}" aria-label="Back">‹</button><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${wallet()}</div>`;
}

function showHome() {
  currentLevel = Math.min(progress.unlocked, 12);
  state = 'intro';
  setHint('pick a pal and make a big merge');
  const dayClaimed = progress.lastDaily === todayKey();
  setOverlay(`
    <div class="home-top"><div class="brand-mark"><span class="brand-paw">✿</span><div><strong>Fluffy</strong><b>Merge!</b></div></div>${wallet()}</div>
    <div class="home-hero"><span class="sparkle sparkle-a">✦</span><span class="sparkle sparkle-b">✧</span><div class="hero-orbit"></div><img class="hero-bunny" src="/fluffy-bunny.png" alt="A soft fluffy bunny pal"/><div class="speech-bubble">Hi, friend! <span>♡</span></div></div>
    <div class="home-copy"><p class="eyebrow">A pocket full of pals</p><h1>Fluffy <em>Merge</em></h1><p>Two little buddies become one big cuddle.</p></div>
    <button class="btn btn-primary btn-play" data-action="play">Play level ${currentLevel}<span>▶</span></button>
    <div class="home-shortcuts"><button class="shortcut" data-action="levels"><span>🗺️</span>Levels</button><button class="shortcut" data-action="neighborhood"><span>🏡</span>Neighborhood</button><button class="shortcut" data-action="collection"><span>📖</span>Pal Passport</button><button class="shortcut" data-action="weekly"><span>🧩</span>Weekly Puzzle</button><button class="shortcut" data-action="rewards"><span>${dayClaimed ? '🎀' : '🎁'}</span>Daily gift${dayClaimed ? ' ✓' : ''}</button><button class="shortcut" data-action="settings"><span>⚙️</span>Settings</button></div>
    <div class="home-foot"><span>BEST FLUFF SCORE</span><b>${formatScore(game.best)}</b><span>·</span><span>12 cuddle levels</span></div>
  `, { screen: 'home' });
}
function showLevels() {
  const nodes = LEVELS.map((level) => {
    const unlocked = level.number <= progress.unlocked;
    const cleared = level.number < progress.unlocked;
    const earnedStars = Math.min(3, progress.levelStars?.[level.number] || (cleared ? 1 : 0));
    const starsText = `${'★'.repeat(earnedStars)}${'☆'.repeat(3 - earnedStars)}`;
    return `<button class="level-node ${unlocked ? 'unlocked' : 'locked'} ${cleared ? 'cleared' : ''}" data-action="level" data-level="${level.number}" ${unlocked ? '' : 'aria-disabled="true"'}><span class="node-icon">${unlocked ? (cleared ? '✓' : level.number) : '🔒'}</span><b>Level ${level.number}</b><small>${level.name}</small><small class="level-goal-mini">${goalText(level.goal)}</small><span class="node-stars">${starsText}</span></button>`;
  }).join('');
  setOverlay(`${pageHead('Cuddle Trail', 'Choose your next little adventure')}<div class="level-progress"><span>PAL POWER</span><b>${Math.min(progress.unlocked, 12)} / 12</b><div><i style="width:${Math.min(100, (progress.unlocked / 12) * 100)}%"></i></div></div><div class="levels-grid">${nodes}</div><p class="screen-note">Clear a level to unlock the next cozy stop!</p>`, { screen: 'levels' });
}
function showCollection() {
  const pals = FRUITS.map((pal, i) => {
    const found = i <= progress.unlockedTier;
    return `<button class="pal-card ${found ? '' : 'not-found'}" data-action="buddy" data-tier="${i}"><span class="pal-art">${miniFruit(i, 56)}</span><b>${found ? pal.name : '???'}</b><small>${found ? (i === 10 ? 'Legendary pal' : `Cuddle level ${i + 1}`) : 'Keep merging to find me'}</small>${found ? '<span class="found-tag">FOUND</span>' : '<span class="lock-tag">🔒</span>'}</button>`;
  }).join('');
  setOverlay(`${pageHead('Pal Pouch', `${progress.unlockedTier + 1} of ${FRUITS.length} pals discovered`)}<div class="collection-grid">${pals}</div><p class="screen-note">Every pal has its own fluffy look. Merge to meet them all!</p>`, { screen: 'collection' });
}
function habitatByKey(key) { return HABITATS.find((habitat) => habitat.key === key) || HABITATS[0]; }
function isHabitatOpen(habitat) { return progress.unlockedTier >= habitat.unlockTier; }
function decorationKey(habitatKey, decorId) { return `${habitatKey}:${decorId}`; }
function showNeighborhood(key = selectedHabitat) {
  selectedHabitat = key;
  const habitat = habitatByKey(key);
  if (!isHabitatOpen(habitat)) {
    showToast(`Meet ${FRUITS[habitat.unlockTier].name} to open ${habitat.name}!`);
    return;
  }
  const tabs = HABITATS.map((item) => {
    const open = isHabitatOpen(item);
    return `<button class="habitat-tab ${item.key === key ? 'active' : ''} ${open ? '' : 'locked'}" data-action="habitat-select" data-habitat="${item.key}">${item.emoji}<small>${open ? item.name : `🔒 ${item.name}`}</small></button>`;
  }).join('');
  const residents = habitat.residents.filter((tier) => tier <= progress.unlockedTier).slice(0, 4);
  const owned = (progress.habitatDecor || []).filter((id) => id.startsWith(`${key}:`));
  const decorIcons = owned.map((ownedId) => {
    const id = ownedId.split(':')[1];
    return habitat.decor.find((item) => item.id === id)?.emoji || '';
  }).filter(Boolean);
  const decor = habitat.decor.map((item) => {
    const ownedItem = owned.includes(decorationKey(key, item.id));
    const balance = item.currency === 'stars' ? progress.stars : progress.coins;
    return `<article class="decor-card ${ownedItem ? 'owned' : ''}"><span class="decor-icon">${item.emoji}</span><div><b>${item.name}</b><small>${ownedItem ? 'Placed in your habitat' : `${item.price} ${item.currency}`}</small></div><button data-action="buy-decor" data-habitat="${key}" data-decor="${item.id}" ${ownedItem || balance < item.price ? 'disabled' : ''}>${ownedItem ? 'Placed ✓' : balance < item.price ? 'Keep playing' : `Add ${item.currency === 'stars' ? '⭐' : '🪙'} ${item.price}`}</button></article>`;
  }).join('');
  setOverlay(`${pageHead('Pal Neighborhood', 'Earn coins and stars to make it cozy')}<div class="habitat-tabs">${tabs}</div><div class="habitat-intro"><h3>${habitat.emoji} ${habitat.name}</h3><p>${habitat.subtitle}</p></div><div class="habitat-stage" data-theme="${key}"><span class="scene-cloud scene-cloud-a">☁️</span><span class="scene-cloud scene-cloud-b">☁️</span><span class="scene-sun">${key === 'moon' ? '🌙' : '☀️'}</span><div class="scene-decor">${decorIcons.length ? decorIcons.map((icon) => `<span>${icon}</span>`).join('') : '<span class="empty-scene">✨ &nbsp; Your cozy touches go here &nbsp; ✨</span>'}</div><div class="scene-residents">${residents.map((tier) => `<div class="scene-pal" title="${FRUITS[tier].name}">${miniFruit(tier, 54)}</div>`).join('')}</div><div class="scene-ground"></div></div><div class="habitat-meter"><span>COZY LEVEL</span><b>${owned.length} / ${habitat.decor.length} touches</b><div><i style="width:${Math.round((owned.length / habitat.decor.length) * 100)}%"></i></div></div><div class="decor-heading"><h3>Make it yours</h3><span>Coins & stars from play</span></div><div class="decor-list">${decor}</div><p class="screen-note">No timers, no pressure—decorate whenever you like.</p>`, { screen: 'habitat' });
}
function buyDecoration(habitatKey, decorId) {
  const habitat = habitatByKey(habitatKey);
  const item = habitat.decor.find((decorItem) => decorItem.id === decorId);
  if (!item || !isHabitatOpen(habitat)) return;
  progress.habitatDecor ||= [];
  const key = decorationKey(habitatKey, decorId);
  if (progress.habitatDecor.includes(key)) return showToast('That cozy touch is already placed!');
  const field = item.currency;
  if (progress[field] < item.price) return showToast(`Play levels to earn more ${item.currency}!`);
  progress[field] -= item.price;
  progress.habitatDecor.push(key);
  saveProgress();
  sfx.unlock(); sfx.click(); buzz(12);
  showNeighborhood(habitatKey);
  showToast(`${item.name} added to ${habitat.name}!`);
}
function showPassport(tier) {
  const pal = FRUITS[tier];
  if (!pal || tier > progress.unlockedTier) return showToast(`Merge pals to meet ${pal?.name || 'this buddy'}!`);
  const profile = PAL_PROFILES[tier];
  const habitat = habitatByKey(profile.habitat);
  const made = progress.palMerges?.[tier] || 0;
  const met = progress.discoveredAt?.[tier] || 'Your first Pal Pouch entry';
  setOverlay(`${pageHead('Pal Passport', 'A little story for every friend', 'collection')}<div class="passport-card"><div class="passport-art">${miniFruit(tier, 116)}</div><span class="passport-stamp">🐾 PAL #${String(tier + 1).padStart(2, '0')}</span><h3>${pal.name}</h3><p class="passport-personality">${profile.personality}</p><div class="passport-fact">“${profile.fact}”</div><div class="passport-stats"><div><small>HOME</small><b>${habitat.emoji} ${habitat.name}</b></div><div><small>MADE</small><b>${made || (tier === 0 ? 1 : 0)} time${made === 1 || (tier === 0 && made === 0) ? '' : 's'}</b></div><div><small>FIRST MET</small><b>${met}</b></div></div><button class="btn btn-primary" data-action="visit-habitat" data-habitat="${habitat.key}">Visit ${habitat.name}</button><button class="btn btn-quiet" data-action="collection">Back to Pal Pouch</button></div>`, { screen: 'passport' });
}

function showWeekly() {
  const challenge = weeklyChallenge();
  const cleared = (progress.weeklyCompleted || []).includes(challenge.key);
  const best = progress.weeklyBests?.[challenge.key] || 0;
  setOverlay(`${pageHead('Weekly Puzzle', 'One shared seed for everyone')}<div class="weekly-card"><div class="weekly-badge">🧩 THIS WEEK’S COZY CHALLENGE</div><div class="weekly-hero">${miniFruit((challenge.seed >>> 4) % 5, 84)}<span>✨</span>${miniFruit((challenge.seed >>> 9) % 5, 84)}</div><h3>${challenge.name}</h3><p class="weekly-goal">${goalText(challenge.goal)}</p><div class="weekly-details"><span>🎲 Same pal-drop order for everyone</span><span>🔁 Retry as often as you like</span><span>🏅 ${cleared ? 'Puzzle cleared!' : 'First clear earns 100 coins + 2 stars'}</span>${best ? `<span>🌟 Your best this week: ${formatScore(best)}</span>` : ''}</div><button class="btn btn-primary" data-action="start-weekly">${cleared ? 'Play again (practice)' : 'Start weekly puzzle'}</button><small class="weekly-refresh">New puzzle each Monday · no streaks to lose</small></div>`, { screen: 'weekly' });
}
function startWeekly() {
  runMode = 'weekly';
  activeWeekly = weeklyChallenge();
  currentLevel = Math.min(progress.unlocked, 12);
  goalRun = { created: 0, bestCombo: 0 };
  levelCompleteShown = false;
  clearTimeout(overTimer);
  game.newGame({ seed: activeWeekly.seed });
  sfx.unlock(); sfx.click();
  hideOverlay();
  state = 'playing';
  game.start();
  setHint(`Weekly Puzzle · ${goalText(activeWeekly.goal)}`);
  showToast('Same weekly puzzle for everyone!');
}
function completeWeekly() {
  if (levelCompleteShown || !activeWeekly) return;
  levelCompleteShown = true;
  state = 'over';
  game.over = true;
  const firstClear = !(progress.weeklyCompleted || []).includes(activeWeekly.key);
  progress.weeklyCompleted ||= [];
  progress.weeklyBests ||= {};
  progress.weeklyBests[activeWeekly.key] = Math.max(progress.weeklyBests[activeWeekly.key] || 0, game.score);
  if (firstClear) {
    progress.weeklyCompleted.push(activeWeekly.key);
    progress.coins += 100;
    progress.stars += 2;
  }
  saveProgress();
  sfx.win(); buzz([12, 24, 18]);
  game.effects.push({ kind: 'confetti', x: WORLD.width / 2, y: 0, t: 0, dur: 2200, seed: Math.floor(Math.random() * 1e6) });
  setOverlay(`<div class="result-ribbon">${firstClear ? 'WEEKLY PUZZLE CLEAR!' : 'PRACTICE COMPLETE!'}</div><div class="result-pal">${miniFruit(Math.min(game.topTier, FRUITS.length - 1), 112)}</div><h2 class="result-title">Puzzle pal!<small>${activeWeekly.name}</small></h2><p class="weekly-goal">${goalText(activeWeekly.goal)}</p><div class="reward-pills"><span>🪙 <b>${firstClear ? '+100' : '+0'}</b></span><span>⭐ <b>${firstClear ? '+2' : '+0'}</b></span></div><button class="btn btn-primary" data-action="weekly-again">Practice again</button><button class="btn btn-quiet" data-action="weekly-screen">Weekly puzzle</button><button class="btn btn-quiet" data-action="home">Home</button>`, { screen: 'result' });
}

function rewardLabel(reward) {
  if (reward.coins) return `${reward.coins} coins`;
  if (reward.stars) return `${reward.stars} ${reward.stars === 1 ? 'star' : 'stars'}`;
  return 'A surprise pal';
}
function showRewards() {
  const today = todayKey();
  const claimed = progress.lastDaily === today;
  const day = claimed ? Math.max(1, progress.streak) : progress.lastDaily === previousDay(today) ? (progress.streak % 7) + 1 : 1;
  const days = DAILY.map((reward, i) => `<div class="reward-day ${i + 1 === day ? 'today' : ''} ${i + 1 < day || (claimed && i + 1 === day) ? 'collected' : ''}"><small>DAY ${i + 1}</small><span>${reward.icon}</span><b>${rewardLabel(reward)}</b>${i + 1 < day || (claimed && i + 1 === day) ? '<i>✓</i>' : ''}</div>`).join('');
  setOverlay(`${pageHead('Daily snuggles', 'A tiny treat for every visit')}<div class="reward-streak"><span>🐾</span><strong>${claimed ? 'You collected today!' : `Day ${day} gift is ready!`}</strong><small>${progress.streak} day${progress.streak === 1 ? '' : 's'} in a row</small></div><div class="reward-grid">${days}</div><button class="btn btn-primary" data-action="claim" ${claimed ? 'disabled' : ''}>${claimed ? 'Come back tomorrow ♡' : `Collect ${rewardLabel(DAILY[day - 1])}`}</button><button class="btn btn-quiet" data-action="home">Back to home</button>`, { screen: 'rewards' });
}
function claimReward() {
  const today = todayKey();
  if (progress.lastDaily === today) return showToast('Your next gift is waiting tomorrow!');
  const day = progress.lastDaily === previousDay(today) ? (progress.streak % 7) + 1 : 1;
  const gift = DAILY[day - 1];
  progress.coins += gift.coins || 0;
  progress.stars += gift.stars || 0;
  progress.lastDaily = today;
  progress.streak = day;
  if (gift.buddy) progress.unlockedTier = Math.max(progress.unlockedTier, gift.buddy);
  saveProgress();
  sfx.unlock(); sfx.click(); buzz(18);
  showRewards();
  showToast(`${gift.icon} ${rewardLabel(gift)} collected!`);
}
function showSettings() {
  setOverlay(`${pageHead('Cozy settings', 'Make the game yours')}<div class="settings-list"><div class="setting-row"><span><b>Sound effects</b><small>Little pops and happy notes</small></span><button class="toggle ${sfx.muted ? '' : 'on'}" data-action="sound-setting" aria-pressed="${!sfx.muted}"><i></i></button></div><div class="setting-row"><span><b>Gentle buzz</b><small>Feel big merges on your device</small></span><button class="toggle ${haptics ? 'on' : ''}" data-action="haptic-setting" aria-pressed="${haptics}"><i></i></button></div><div class="setting-row"><span><b>Best score</b><small>${formatScore(game.best)} points</small></span><span class="setting-medal">🏆</span></div></div><button class="btn btn-quiet" data-action="home">Back to home</button>`, { screen: 'settings' });
}
function showHelp(resume = false) {
  setOverlay(`${pageHead('How to play', 'Easy peasy, fluffy squeezy')}<div class="help-hero">${miniFruit(game.nextTier, 78)}<span>⬇</span></div><div class="help-steps"><div><b>1</b><p>Move your pal left or right.</p></div><div><b>2</b><p>Tap to drop them into the cuddle pile.</p></div><div><b>3</b><p>Two matching pals merge into a bigger buddy!</p></div><div><b>4</b><p>Keep the pile below the pink cloud line.</p></div></div><button class="btn btn-primary" data-action="${resume ? 'resume' : 'play'}">${resume ? 'Back to cuddles' : 'Let’s play!'}</button><button class="btn btn-quiet" data-action="home">Home</button>`, { screen: 'help' });
}
function showPaused() {
  setOverlay(`${pageHead('Taking a breather?', 'Your pals are waiting')}<div class="pause-pal">${miniFruit(game.nextTier, 100)}<span>zzz...</span></div><button class="btn btn-primary" data-action="resume">Keep playing</button><button class="btn btn-secondary" data-action="levels">Change level</button><button class="btn btn-quiet" data-action="home">Save & go home</button>`, { screen: 'pause' });
}
function activeGoal() {
  return runMode === 'weekly' ? activeWeekly?.goal : LEVELS[currentLevel - 1]?.goal;
}
function checkActiveGoal() {
  if (state !== 'playing' || levelCompleteShown) return;
  const goal = activeGoal();
  if (!goal || !goalMet(goal, goalRun, game.score, game.topTier)) return;
  if (runMode === 'weekly') completeWeekly();
  else completeLevel();
}
function currentGoalLabel() {
  const goal = activeGoal();
  if (!goal) return '';
  return goalProgress(goal, goalRun, game.score, game.topTier);
}

function showGameOver(payload) {
  const top = FRUITS[Math.min(payload.topTier, FRUITS.length - 1)];
  const earned = Math.max(5, Math.floor(payload.score / 20));
  progress.coins += earned;
  saveProgress();
  setOverlay(`<div class="result-ribbon">${payload.newBest ? 'NEW BEST!' : 'SO MANY CUDDLES!'}</div><div class="result-pal">${miniFruit(Math.min(payload.topTier, FRUITS.length - 1), 112)}</div><p class="eyebrow">The pile got too snuggly</p><h2 class="result-title">${formatScore(payload.score)}<small>fluff points</small></h2><div class="result-reward">🪙 <b>+${earned}</b> cuddle coins</div><div class="biggest">Your biggest pal: <b>${top.name}</b></div><div class="stats"><div><b>${payload.merges}</b><span>merges</span></div><div><b>${formatScore(payload.best)}</b><span>best</span></div></div><button class="btn btn-primary" data-action="restart">Try again</button><button class="btn btn-secondary" data-action="share">Share my score</button><button class="btn btn-quiet" data-action="home">Home</button>`, { screen: 'result' });
}
function completeLevel() {
  if (levelCompleteShown) return;
  levelCompleteShown = true;
  state = 'over';
  game.over = true;
  const level = LEVELS[currentLevel - 1];
  const coins = 30 + currentLevel * 12;
  const stars = 1 + Number(game.topTier >= 2) + Number(game.topTier >= 4);
  progress.coins += coins;
  progress.levelStars ||= {};
  const previousStars = progress.levelStars[currentLevel] || 0;
  const newStars = Math.max(0, stars - previousStars);
  progress.stars += newStars;
  progress.levelStars[currentLevel] = Math.max(previousStars, stars);
  progress.unlocked = Math.max(progress.unlocked, Math.min(12, currentLevel + 1));
  saveProgress();
  sfx.win(); buzz([12, 24, 18]);
  game.effects.push({ kind: 'confetti', x: WORLD.width / 2, y: 0, t: 0, dur: 2200, seed: Math.floor(Math.random() * 1e6) });
  setOverlay(`<div class="result-ribbon">LEVEL ${currentLevel} COMPLETE!</div><div class="result-pal">${miniFruit(Math.min(game.topTier, FRUITS.length - 1), 120)}</div><h2 class="result-title">Paw-some!<small>${level.name}</small></h2><div class="star-rating">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><div class="reward-pills"><span>🪙 <b>+${coins}</b></span><span>⭐ <b>+${newStars}</b></span></div><button class="btn btn-primary" data-action="next-level">${currentLevel < 12 ? 'Next level' : 'Play again'} <span>→</span></button><button class="btn btn-quiet" data-action="home">Home</button>`, { screen: 'result' });
}
function startLevel(level = currentLevel) {
  runMode = 'level';
  activeWeekly = null;
  currentLevel = clamp(Number(level), 1, progress.unlocked);
  goalRun = { created: 0, bestCombo: 0 };
  levelCompleteShown = false;
  clearTimeout(overTimer);
  game.newGame();
  sfx.unlock(); sfx.click();
  hideOverlay();
  state = 'playing';
  game.start();
  setHint(`${LEVELS[currentLevel - 1].name} · ${goalText(LEVELS[currentLevel - 1].goal)}`);
  showToast(`Level ${currentLevel}: ${LEVELS[currentLevel - 1].name}`);
}
function restart() { if (runMode === 'weekly') startWeekly(); else startLevel(currentLevel); }
function home() {
  state = 'intro';
  game.over = true;
  showHome();
}
function setHint(text, tone = '') {
  if (!hintEl) return;
  hintEl.textContent = text;
  hintEl.dataset.tone = tone;
}
function updateHint(dt) {
  if (hintHold > 0) { hintHold -= dt; return; }
  if (state === 'playing') {
    const label = runMode === 'weekly' ? 'Weekly Puzzle' : LEVELS[currentLevel - 1].name;
    setHint(`${label} · ${currentGoalLabel()}`, game.dangerLevel() > 0.42 ? 'warn' : '');
  }
}
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  setTimeout(() => toastEl.classList.remove('is-visible'), 2000);
}
async function shareScore() {
  const text = `I scored ${formatScore(game.score)} fluffy points in Fluffy Merge!`;
  try {
    if (navigator.share) await navigator.share({ title: 'Fluffy Merge', text, url: location.href });
    else { await navigator.clipboard.writeText(`${text} ${location.href}`); showToast('Score copied!'); }
  } catch { showToast('Nice score, fluffy friend!'); }
}

// ── pointer + keyboard controls ────────────────────────────────────────
function updateAim(event) {
  const rect = canvas.getBoundingClientRect();
  const px = clamp(event.clientX - rect.left, 0, rect.width);
  renderer.setAim(renderer.toWorld(px, 0).x);
}
canvas.addEventListener('pointerdown', (event) => {
  if (state !== 'playing') return;
  sfx.unlock(); pointerDown = true;
  canvas.setPointerCapture?.(event.pointerId);
  updateAim(event); renderer.setShowAim(true);
});
canvas.addEventListener('pointermove', (event) => {
  if (state !== 'playing') return;
  updateAim(event); renderer.setShowAim(true);
});
canvas.addEventListener('pointerup', (event) => {
  if (!pointerDown) return;
  pointerDown = false;
  if (state !== 'playing') return;
  updateAim(event);
  if (game.canDrop()) game.drop(renderer.aim); else sfx.click();
});
canvas.addEventListener('pointercancel', () => { pointerDown = false; });
canvas.addEventListener('pointerleave', () => { if (!pointerDown) renderer.setShowAim(false); });
window.addEventListener('keydown', (event) => {
  const key = event.key;
  if (key.toLowerCase() === 'm') { toggleSound(); return; }
  if (key.toLowerCase() === 'r' && state !== 'intro') { restart(); return; }
  if (state !== 'playing') {
    if (key === 'Enter' || key === ' ') {
      const action = overlay.querySelector('[data-action="play"], [data-action="resume"], [data-action="restart"]');
      if (action) { event.preventDefault(); action.click(); }
    }
    return;
  }
  const step = event.shiftKey ? 4 : 12;
  if (key === 'ArrowLeft') { event.preventDefault(); renderer.setAim(game.clampAim(renderer.aim - step, game.nextTier)); renderer.setShowAim(true); }
  else if (key === 'ArrowRight') { event.preventDefault(); renderer.setAim(game.clampAim(renderer.aim + step, game.nextTier)); renderer.setShowAim(true); }
  else if (key === ' ' || key === 'ArrowDown' || key === 'Enter') { event.preventDefault(); if (game.canDrop()) game.drop(renderer.aim); }
});

// Delegated screen controls make every panel work on touch and desktop.
overlay.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'play') startLevel(currentLevel);
  else if (action === 'resume') { hideOverlay(); state = 'playing'; game.start(); }
  else if (action === 'restart') restart();
  else if (action === 'home') home();
  else if (action === 'levels') showLevels();
  else if (action === 'collection') showCollection();
  else if (action === 'neighborhood') showNeighborhood();
  else if (action === 'habitat-select') showNeighborhood(button.dataset.habitat);
  else if (action === 'buy-decor') buyDecoration(button.dataset.habitat, button.dataset.decor);
  else if (action === 'visit-habitat') showNeighborhood(button.dataset.habitat);
  else if (action === 'weekly') showWeekly();
  else if (action === 'start-weekly' || action === 'weekly-again') startWeekly();
  else if (action === 'weekly-screen') showWeekly();
  else if (action === 'rewards') showRewards();
  else if (action === 'settings') showSettings();
  else if (action === 'help') showHelp(state === 'playing');
  else if (action === 'level') {
    const level = Number(button.dataset.level);
    if (level <= progress.unlocked) startLevel(level); else showToast('Clear the level before this one to unlock it!');
  } else if (action === 'claim') claimReward();
  else if (action === 'sound-setting') { toggleSound(); showSettings(); }
  else if (action === 'haptic-setting') { haptics = !haptics; try { localStorage.setItem('fluffy.haptics', haptics ? 'on' : 'off'); } catch { /* optional */ } showSettings(); }
  else if (action === 'next-level') startLevel(Math.min(currentLevel + 1, 12));
  else if (action === 'share') shareScore();
  else if (action === 'buddy') showPassport(Number(button.dataset.tier));
});

function toggleSound() {
  sfx.unlock(); sfx.toggleMuted(); syncSoundButton();
  if (!sfx.muted) sfx.click();
  showToast(sfx.muted ? 'Sound off' : 'Sound on');
}
soundBtn.addEventListener('click', toggleSound);
restartBtn.addEventListener('click', restart);
helpBtn.addEventListener('click', () => {
  sfx.unlock(); sfx.click();
  if (state === 'playing') { state = 'paused'; showPaused(); }
  else if (state === 'paused') showPaused();
  else showHelp(false);
});

let resizeRaf = 0;
function scheduleResize() { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(() => renderer.resize()); }
window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 120));
if (window.ResizeObserver) new ResizeObserver(scheduleResize).observe(canvas);
function frame(now) {
  const dt = Math.min(48, now - last); last = now;
  if (state === 'paused' || state === 'intro') renderer.render(dt * 0.25);
  else { game.update(dt); renderer.render(dt); }
  updateHint(dt);
  requestAnimationFrame(frame);
}

// Handy dev handle for inspecting save data and screen flow.
if (import.meta.env?.DEV) window.__paperfold = { game, renderer, sfx, get progress() { return progress; }, get state() { return state; }, get runMode() { return runMode; }, get goalRun() { return goalRun; }, get activeWeekly() { return activeWeekly; }, showHome, showLevels, showRewards, showCollection, showSettings, showNeighborhood, showWeekly, checkActiveGoal };
showHome();
requestAnimationFrame((t) => { last = t; frame(t); });

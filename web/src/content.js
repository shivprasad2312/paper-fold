import { FRUITS } from './fruits.js';

export const LEVELS = [
  { number: 1, name: 'First Fluff', goal: { type: 'score', target: 120 } },
  { number: 2, name: 'Bouncy Buddies', goal: { type: 'create', tier: 1, count: 3 } },
  { number: 3, name: 'Puddle Party', goal: { type: 'combo', target: 3 } },
  { number: 4, name: 'Paw Parade', goal: { type: 'reach', tier: 3 } },
  { number: 5, name: 'Cloud Nine', goal: { type: 'score', target: 466 } },
  { number: 6, name: 'Starry Paws', goal: { type: 'create', tier: 2, count: 2 } },
  { number: 7, name: 'Cozy Camp', goal: { type: 'combo', target: 4 } },
  { number: 8, name: 'Dreamy Den', goal: { type: 'reach', tier: 4 } },
  { number: 9, name: 'Big Snuggle', goal: { type: 'score', target: 811 } },
  { number: 10, name: 'Moonlight Mix', goal: { type: 'create', tier: 3, count: 2 } },
  { number: 11, name: 'Super Snuggle', goal: { type: 'reach', tier: 6 } },
  { number: 12, name: 'Fluff Forever', goal: { type: 'score', target: 1070 } },
];

export const HABITATS = [
  {
    key: 'cloud', name: 'Cloud Island', emoji: '☁️', subtitle: 'A floaty home above the clouds', unlockTier: 0,
    residents: [0, 1, 3, 10], objective: { title: 'Light the cloud path', description: 'Place a Cloud Cottage and a Star Lantern so the pals can find their way home.', decorIds: ['cloud-cottage', 'star-lantern'], reward: { stars: 1 } }, decor: [
      { id: 'cloud-cottage', name: 'Cloud Cottage', emoji: '🏠', price: 90, currency: 'coins' },
      { id: 'star-lantern', name: 'Star Lantern', emoji: '🏮', price: 140, currency: 'coins' },
      { id: 'rainbow-bridge', name: 'Rainbow Bridge', emoji: '🌈', price: 2, currency: 'stars' },
      { id: 'blossom-garden', name: 'Blossom Garden', emoji: '🌷', price: 240, currency: 'coins' },
    ],
  },
  {
    key: 'forest', name: 'Forest Nook', emoji: '🌿', subtitle: 'A leafy hideaway for woodland pals', unlockTier: 2,
    residents: [2, 6, 7, 9], objective: { title: 'Make a firefly picnic', description: 'Set out a Mushroom Home and Firefly Lights for the woodland pals.', decorIds: ['mushroom-home', 'firefly-lights'], reward: { coins: 70 } }, decor: [
      { id: 'mushroom-home', name: 'Mushroom Home', emoji: '🍄', price: 140, currency: 'coins' },
      { id: 'firefly-lights', name: 'Firefly Lights', emoji: '✨', price: 2, currency: 'stars' },
      { id: 'berry-bush', name: 'Berry Bush', emoji: '🫐', price: 200, currency: 'coins' },
      { id: 'treehouse', name: 'Treehouse', emoji: '🛖', price: 4, currency: 'stars' },
    ],
  },
  {
    key: 'moon', name: 'Moonlit Den', emoji: '🌙', subtitle: 'A sleepy nook beneath the stars', unlockTier: 5,
    residents: [4, 5, 8], objective: { title: 'Build a dream nest', description: 'Add a Pillow Nest and Dream Lamp to make bedtime extra cozy.', decorIds: ['pillow-nest', 'dream-lamp'], reward: { stars: 1 } }, decor: [
      { id: 'moon-window', name: 'Moon Window', emoji: '🌙', price: 180, currency: 'coins' },
      { id: 'pillow-nest', name: 'Pillow Nest', emoji: '🛏️', price: 2, currency: 'stars' },
      { id: 'dream-lamp', name: 'Dream Lamp', emoji: '💡', price: 240, currency: 'coins' },
      { id: 'comet-chime', name: 'Comet Chime', emoji: '☄️', price: 4, currency: 'stars' },
    ],
  },
];

export const PAL_PROFILES = [
  { habitat: 'cloud', personality: 'Curious cloud-hopper', fact: 'Bunbun collects the softest cloud fluff for nap pillows.' },
  { habitat: 'cloud', personality: 'A sunny little chatterbox', fact: 'Peep greets every sunrise with a tiny happy hop.' },
  { habitat: 'forest', personality: 'A gentle snack sharer', fact: 'Momo always saves one berry for a friend.' },
  { habitat: 'cloud', personality: 'A brave little explorer', fact: 'Puddle thinks every puddle is a tiny ocean.' },
  { habitat: 'moon', personality: 'A playful daydreamer', fact: 'Poppy chases moonbeams across the floor.' },
  { habitat: 'moon', personality: 'A thoughtful night owl', fact: 'Twickle can spot the first star every evening.' },
  { habitat: 'forest', personality: 'A speedy helper', fact: 'Foxy knows every shortcut through the woods.' },
  { habitat: 'forest', personality: 'A calm cuddle expert', fact: 'Panda gives the coziest forest hugs.' },
  { habitat: 'moon', personality: 'A soft-spoken singer', fact: 'Lamby hums sleepy tunes to the moon.' },
  { habitat: 'forest', personality: 'A tiny garden guardian', fact: 'Sprout helps every little plant grow.' },
  { habitat: 'cloud', personality: 'A generous star keeper', fact: 'Starlight shares wishes with every new friend.' },
];

export const WEEKLY_GOALS = [
  { type: 'score', target: 500 },
  { type: 'combo', target: 4 },
  { type: 'create', tier: 2, count: 2 },
  { type: 'reach', tier: 4 },
];

export const PUZZLE_PACKS = [
  {
    id: 'cloud-hop', name: 'Cloud Hop', subtitle: 'A little lift for Bunbun', unlockTier: 0,
    goal: { type: 'reach', tier: 2 }, dropLimit: 5, seed: 20411,
    startingBoard: [{ tier: 0, x: 92, y: 525 }, { tier: 1, x: 276, y: 525 }],
    spawnSequence: [0, 1, 0, 1, 0],
  },
  {
    id: 'forest-friends', name: 'Forest Friends', subtitle: 'Help two woodland pals meet', unlockTier: 2,
    goal: { type: 'create', tier: 2, count: 1 }, dropLimit: 5, seed: 20412,
    startingBoard: [{ tier: 1, x: 88, y: 525 }, { tier: 0, x: 184, y: 525 }, { tier: 1, x: 280, y: 525 }],
    spawnSequence: [1, 1, 1, 1, 1],
  },
  {
    id: 'moonlight-combo', name: 'Moonlight Combo', subtitle: 'A sleepy chain of fluffy folds', unlockTier: 5,
    goal: { type: 'combo', target: 2 }, dropLimit: 6, seed: 20413,
    startingBoard: [{ tier: 0, x: 76, y: 525 }, { tier: 0, x: 292, y: 525 }, { tier: 1, x: 184, y: 478 }],
    spawnSequence: [0, 0, 1, 1, 1, 1],
  },
];

export const COLLECTION_MILESTONES = [
  { id: 'meet-three', title: 'First Friend Circle', description: 'Discover 3 different pals', type: 'discover', target: 3, reward: { coins: 45 } },
  { id: 'meet-six', title: 'Cozy Crew', description: 'Discover 6 different pals', type: 'discover', target: 6, reward: { stars: 1 } },
  { id: 'cloud-set', title: 'Cloud Island Set', description: 'Meet every Cloud Island resident', type: 'habitat', habitat: 'cloud', reward: { coins: 80 } },
  { id: 'forest-set', title: 'Forest Nook Set', description: 'Meet every Forest Nook resident', type: 'habitat', habitat: 'forest', reward: { stars: 1 } },
  { id: 'moon-set', title: 'Moonlit Den Set', description: 'Meet every Moonlit Den resident', type: 'habitat', habitat: 'moon', reward: { stars: 1 } },
  { id: 'meet-all', title: 'Paw-some Collection', description: 'Discover all 11 pals', type: 'discover', target: FRUITS.length, reward: { stars: 2 } },
];

export function goalText(goal) {
  if (goal.type === 'score') return `Score ${goal.target} fluff points`;
  if (goal.type === 'create') return `Make ${goal.count} ${FRUITS[goal.tier].name}${goal.count === 1 ? '' : 's'}`;
  if (goal.type === 'combo') return `Get a ×${goal.target} merge combo`;
  if (goal.type === 'reach') return `Merge up to ${FRUITS[goal.tier].name}`;
  return 'Keep the pals below the cloud line';
}

export function goalProgress(goal, run, score, topTier) {
  if (goal.type === 'score') return `${Math.min(score, goal.target)} / ${goal.target} points`;
  if (goal.type === 'create') return `${Math.min(run.created, goal.count)} / ${goal.count} ${FRUITS[goal.tier].name}s`;
  if (goal.type === 'combo') return `Best combo ×${Math.min(run.bestCombo, goal.target)} / ×${goal.target}`;
  if (goal.type === 'reach') return `Best pal: ${FRUITS[Math.min(topTier, FRUITS.length - 1)].name}`;
  return goalText(goal);
}

export function goalMet(goal, run, score, topTier) {
  if (goal.type === 'score') return score >= goal.target;
  if (goal.type === 'create') return run.created >= goal.count;
  if (goal.type === 'combo') return run.bestCombo >= goal.target;
  if (goal.type === 'reach') return topTier >= goal.tier;
  return false;
}

export function weekKey(date = new Date()) {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - offset);
  return monday.toISOString().slice(0, 10);
}

function hash(value) {
  let h = 2166136261;
  for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function weeklyChallenge(date = new Date()) {
  const key = weekKey(date);
  const seed = hash(`fluffy-neighborhood-${key}`);
  const goal = WEEKLY_GOALS[seed % WEEKLY_GOALS.length];
  return { key, seed, goal, name: ['Cloud-Hop Cup', 'Cozy Combo Club', 'Buddy Builder', 'Big Pal Picnic'][seed % WEEKLY_GOALS.length] };
}

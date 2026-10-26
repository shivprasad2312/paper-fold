// ---------------------------------------------------------------------------
// KUBIK — level data
//
// Maps are ASCII. Each row is a Z slice (row 0 = far side / goal end).
// Each column is X. A digit is the height of a slab's top surface.
// '.' is empty space (a fall).
//
// Movement rule: you may roll onto a neighbouring slab that is at most
// MAX_DROP lower (a fall) or at most MAX_CLIMB higher (a step up). So you can
// explore in all four directions — you just can't leap up a tall wall.
// ---------------------------------------------------------------------------

import { CAMPAIGN } from './campaign.js';

// Levels 1–13: hand-made, each teaching one mechanic.
const HAND = [
  {
    id: 1,
    name: 'First Light',
    hint: 'Roll to the gate — arrows, WASD or swipe',
    map: [
      '..000..',
      '..000..',
      '..000..',
    ],
    start: [3, 2],
    goal: [3, 0],
    shards: [[3, 1], [2, 2]],
  },
  {
    id: 2,
    name: 'Step Down',
    hint: 'You can fall 2 — but only climb 1',
    map: [
      '..000..',
      '..111..',
      '..333..',
    ],
    start: [3, 2],
    goal: [3, 0],
    shards: [[2, 1], [4, 1]],
  },
  {
    id: 3,
    name: 'Switchback',
    hint: 'Follow the terraces down',
    map: [
      '.......',
      '.......',
      '.......',
      '.00000.',
      '.11111.',
      '.22222.',
      '.33333.',
    ],
    start: [5, 6],
    goal: [1, 3],
    shards: [[1, 6], [5, 5], [3, 3]],
  },
  {
    id: 4,
    name: 'Twin Bridges',
    hint: 'Two dark cubes guard the bridgeheads — push one aside, then cross',
    map: [
      '..00000..',
      '..00000..',
      '..11111..',
      '..11.11..',
      '..22222..',
      '...222...',
    ],
    start: [4, 5],
    goal: [4, 0],
    shards: [[2, 2], [6, 2], [4, 1]],
    // The lower deck is walled in: the only way across the gap is through one
    // of the two bridgeheads — and a dark cube sits on each. Pushing one aside
    // (telekinesis, 2 charges) opens the crossing.
    blocks: [[3, 4], [5, 4]],
    nudge: 2,
  },
  {
    id: 5,
    name: 'Paper Bridge',
    hint: 'Cracked slabs fall shortly after you land',
    map: [
      '..00000..',
      '..00000..',
      '..11111..',
      '..11111..',
      '..22222..',
      '..22222..',
    ],
    start: [4, 5],
    goal: [4, 0],
    shards: [[2, 2], [6, 2], [4, 3]],
    crumble: [[3, 3], [4, 3], [5, 3]],
  },
  {
    id: 6,
    name: 'Sentinel',
    hint: 'The red orb kills. Wait for your moment.',
    map: [
      '..00000..',
      '..00000..',
      '..11111..',
      '..11111..',
      '..22222..',
      '..22222..',
    ],
    start: [4, 5],
    goal: [4, 0],
    shards: [[2, 2], [6, 1], [4, 3]],
    orbs: [
      { path: [[2, 3], [6, 3]], speed: 1.7 },
    ],
  },
  {
    id: 7,
    name: 'Weave',
    hint: 'Two sentinels, one crossing',
    map: [
      '..00000..',
      '..00000..',
      '..11111..',
      '..11111..',
      '..11111..',
      '..22222..',
    ],
    start: [4, 5],
    goal: [4, 0],
    shards: [[2, 3], [6, 3], [4, 2]],
    orbs: [
      { path: [[2, 3], [6, 3]], speed: 2.1 },
      { path: [[6, 2], [2, 2]], speed: 1.5, phase: 0.5 },
    ],
    // A single charge to shove the dark cube if you want a shortcut — or just
    // go around the far side like everyone else.
    blocks: [[5, 3]],
    nudge: 1,
  },
  {
    id: 8,
    name: 'Cascade',
    hint: 'Long way down',
    map: [
      '...000...',
      '..0000...',
      '...1111..',
      '..1111...',
      '...2222..',
      '..33333..',
      '...3333..',
    ],
    start: [4, 6],
    goal: [3, 0],
    shards: [[3, 5], [5, 3], [3, 2], [5, 1]],
    // A steady breeze drags the cube toward the upper-left. Lean into it —
    // and watch the wind streaks on the slabs.
    wind: { x: -1, z: -1 },
  },
  {
    id: 9,
    name: 'Fault Line',
    hint: 'Cracked ground under a moving blade',
    map: [
      '.....1111',
      '.....1111',
      '.22222...',
      '.22222...',
      '.3333333.',
      '.3333333.',
    ],
    start: [1, 5],
    goal: [6, 0],
    shards: [[1, 4], [4, 3], [7, 1], [6, 1]],
    crumble: [[3, 4], [4, 4]],
    // The sweep starts at the far end so the spawn tile is safe — a sentinel
    // must never occupy the player's starting slab.
    orbs: [
      { path: [[7, 5], [1, 5]], speed: 1.9 },
    ],
  },
  {
    id: 10,
    name: 'Spiral',
    hint: 'The way in is the way round',
    map: [
      '2222222',
      '2.....2',
      '2.111.2',
      '2110112',
      '2.111.2',
      '2.....2',
      '3333332',
    ],
    start: [1, 6],
    goal: [3, 3],
    shards: [[3, 6], [3, 0], [1, 3], [3, 2]],
  },
  {
    id: 11,
    name: 'Gauntlet',
    hint: 'Keep moving — the ground will not wait',
    map: [
      '....00000',
      '....00000',
      '....11111',
      '....11111',
      '.22222...',
      '.22222...',
      '.3333333.',
      '.3333333.',
    ],
    start: [1, 7],
    goal: [7, 0],
    shards: [[4, 5], [2, 4], [6, 2], [7, 1]],
    crumble: [[3, 4], [3, 5]],
    orbs: [
      { path: [[1, 6], [7, 6]], speed: 2.3 },
      { path: [[5, 2], [8, 2]], speed: 1.5, phase: 0.4 },
    ],
  },
  {
    id: 12,
    name: 'The Fold',
    hint: 'Everything you have learned',
    map: [
      '..00000..',
      '..00000..',
      '..0...0..',
      '.1111111.',
      '.1111111.',
      '.22...22.',
      '.22...22.',
      '.3333333.',
    ],
    start: [1, 7],
    goal: [4, 0],
    shards: [[2, 6], [6, 6], [4, 4], [2, 3], [4, 1]],
    crumble: [[3, 4], [4, 4], [5, 4]],
    orbs: [
      { path: [[1, 3], [7, 3]], speed: 2.0 },
      { path: [[1, 4], [7, 4]], speed: 1.5, phase: 0.4 },
    ],
    // The gate stays sealed until you touch the golden key on the east deck —
    // it sits off the west-side route, so you must break detour for it.
    key: [6, 4],
  },
  {
    id: 13,
    name: 'Boss: The Folded Keep',
    hint: 'Sentinels, collapsing ground and a living bridge — all at once',
    map: [
      '...00000...',
      '...00000...',
      '...00000...',
      '..1111111..',
      '..1111111..',
      '..2222222..',
      '..2222222..',
      '..2222222..',
      '..3333333..',
      '..3333333..',
    ],
    start: [5, 9],
    goal: [5, 0],
    shards: [
      [2, 8],
      [8, 8],
      [3, 5],
      [7, 4],
      [5, 1],
    ],
    // Three patrols; none of them occupies the spawn or the goal.
    orbs: [
      { path: [[2, 8], [8, 8]], speed: 2.4, color: 0xd34a4a },
      { path: [[8, 5], [2, 5]], speed: 1.7, color: 0xe0a53c, phase: 0.35 },
      { path: [[3, 2], [7, 2]], speed: 2.6, color: 0xd34a4a, phase: 0.6 },
    ],
    // The mid deck crumbles as you cross, and the top deck's middle is
    // cracked too — so the three ways over the upper gap each have their
    // own price: a fast sprint or a timed wait on a sliding pier.
    crumble: [[4, 4], [6, 4], [4, 5], [6, 5], [5, 2], [5, 1]],
    sliders: [
      { tiles: [[4, 2], [4, 1], [4, 0]], period: 3.6 },
      { tiles: [[6, 2], [6, 1], [6, 0]], period: 3.6, phase: 0.5 },
    ],
  },
];

// Levels 14–50: generated by scripts/gen-campaign.mjs (seeded routes, each
// candidate rejected until the full verifier proves it solvable).
export const LEVELS = [...HAND, ...CAMPAIGN];

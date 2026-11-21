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
import { CAMPAIGN2 } from './campaign2.js';
import { VAULT } from './vault.js';

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
    name: 'Stone Bridge',
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
    // the cracked row spans the whole bridge (ADR-051): at three slabs
    // wide the player simply walked around it on the sound stone
    crumble: [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3]],
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
      '.......2.',
      '.......3.',
      '.3333333.',
      '.3333333.',
    ],
    start: [1, 5],
    goal: [6, 0],
    shards: [[1, 4], [5, 4], [7, 1], [6, 1]],
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
    name: 'The Turn',
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
    name: 'Boss: The Broken Keep',
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


// ---------------------------------------------------------------------------
// THE WHEEL — act 10 (ADR-050)
//
// Two hand-built boards that take the generated slots at 192 and 196. The
// campaign is full at 200 and the wheel needed a teaching board and a twist,
// so the two thinnest-generated levels in the act were re-authored rather
// than the counts moved: same 20 levels, same ids, same 26x26 boards, same
// act-10 par band. Every other mechanic those slots carried (sentinels,
// timed slabs, ice, doors) still appears elsewhere in the act.
//
// Both boards are a U: a south corridor, an east turn and a middle corridor.
// The wheel sits in the south corridor and BLOCKS it — the pit is the middle
// row, and the two rows beside it are ring tiles, so there is no way past
// without stepping into the sweep. That is the law of the mechanic: shrink
// and duck under, or dare the gap between the arms.
//
//   · L192 The Turning — one wheel, one shrink pad before it, room to learn
//     that the small cube passes and the full one does not.
//   · L196 Beneath the Rim — the twist: a low tunnel keeps you small through
//     a second wheel up on the plateau, so the grow pad is the reward for a
//     whole silent run rather than the end of one crossing.
// ---------------------------------------------------------------------------
const WHEEL_SHOWCASE = [
  {
    id: 192,
    name: 'The Turning',
    hint: 'The arms hang one mini-height up — shrink, and slip underneath',
    map: [
      '..........................',
      '..........................',
      '..........................',
      '..1111111111111111111111..',
      '..111.111.111.111.111.11..',
      '..1111111111111111111111..',
      '..111.111.111.111.111.11..',
      '..111.111.111.111.111.11..',
      '..1111111111111111111111..',
      '............1.............',
      '............1.............',
      '..0000000000000000000000..',
      '..0000000000000000000000..',
      '..0000000000000000000000..',
      '.....................000..',
      '.....................000..',
      '....1111........1111.000..',
      '....1.11........1.11.000..',
      '....1.11........1.11.000..',
      '....1111........1111.000..',
      '.....................000..',
      '..0000000000000000000000..',
      '..0000000000.00000000000..',
      '..0000000000000000000000..',
      '..........................',
      '..........................',
    ],
    start: [3, 22],
    goal: [3, 12],
    shards: [
      [4, 22],
      [22, 12],
      [12, 3],
    ],
    // The pit is the middle row of the south corridor, so both rows beside
    // it are ring tiles: the corridor is gated, not decorated.
    wheels: [{ at: [12, 22], period: 6.0, phase: 0 }],
    shrink: [[8, 22]],
    grow: [[16, 22]],
  },
  {
    id: 196,
    name: 'Beneath the Rim',
    hint: 'Stay small: a tunnel and a second wheel stand between you and the top',
    map: [
      '..........................',
      '..........................',
      '..........................',
      '..1111111111111111111111..',
      '..11111111111.111.111.11..',
      '..111.111111111111111111..',
      '..111111.1111.111.111.11..',
      '..11111111111.111.111.11..',
      '..1111111111111111111111..',
      '............1.............',
      '............1.............',
      '..0000000000000000000000..',
      '..0000000000000000000000..',
      '..0000000000000000000000..',
      '.....................000..',
      '.....................000..',
      '....1111........1111.000..',
      '....1.11........1.11.000..',
      '....1.11........1.11.000..',
      '....1111........1111.000..',
      '.....................000..',
      '..0000000000000000000000..',
      '..0000000000.00000000000..',
      '..0000000000000000000000..',
      '..........................',
      '..........................',
    ],
    start: [3, 22],
    goal: [3, 4],
    shards: [
      [4, 22],
      [22, 12],
      [12, 3],
    ],
    wheels: [
      { at: [12, 22], period: 5.2, phase: 0 },
      { at: [8, 6], period: 4.4, phase: 0.35 },
    ],
    shrink: [[8, 22]],
    low: [[14, 12], [15, 12]],
    grow: [[11, 6]],
    // a hatch in the plateau, held shut by its plate: the door ratchet needs
    // act 10 to keep the mechanic, and this is its quietest possible home
    doors: [{ at: [5, 5], plate: [5, 6] }],
  },
];

// Levels 14–50: generated by scripts/gen-campaign.mjs (seeded routes, each
// candidate rejected until the full verifier proves it solvable).
// Levels 51–200: generated by scripts/gen-campaign2.mjs (archetype layouts,
// the shared hazard stage, the full verifier, a uniqueness gate and a
// curation score — ADR-015). Both are static, version-controlled data.
//
// The wheel showcase takes the 192 and 196 slots; the generated boards they
// replace are filtered out here (never edited in place — the generated files
// stay exactly what the generator produced, ADR-004).
const WHEEL_IDS = new Set(WHEEL_SHOWCASE.map((d) => d.id));
export const LEVELS = [
  ...HAND,
  ...CAMPAIGN,
  ...CAMPAIGN2.filter((d) => !WHEEL_IDS.has(d.id)),
  ...WHEEL_SHOWCASE,
].sort((a, b) => a.id - b.id);

// The Vault (Phase E, ADR-043): ten bonus rooms outside the campaign. Kept in
// its own export — the campaign's counts, acts, density ratchet and experience
// audit all speak about 1–200, and they must keep speaking about exactly that.
// `ALL_LEVELS` is the PLAY order (campaign then Vault) for index-based loading.
export const VAULT_LEVELS = VAULT;
export const ALL_LEVELS = [...LEVELS, ...VAULT];

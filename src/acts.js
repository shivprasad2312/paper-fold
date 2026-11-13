// ---------------------------------------------------------------------------
// KUBIK — campaign acts (10 × 20 levels, ADR-015)
//
// An act is the campaign's presentation + difficulty unit: a name, a tagline,
// a theme hue for the level-select, a difficulty budget window, and (for
// generated acts) the archetype pool the generator may draw from. Levels
// 1–50 already exist (hand-made intro + first generator); acts 1–3 cover
// them, and 51–200 are generated under the budgets below.
//
// The difficulty curve is monotonic across all 200: map size plateaus at
// 18 (EDGE-scale, ADR-013) after act 3, and everything after is density —
// par, sentinel count, crumble, forced mechanics, keys. Act-end levels
// (every 20th) carry a boss budget: the act-end spike the curve is built on.
// ---------------------------------------------------------------------------

export const ACTS = [
  {
    id: 1, name: 'First Fall', tag: 'learn to fall', hue: 190,
    start: 1, end: 20,
    // existing hand-made + early generated content; no generator budget
  },
  {
    id: 2, name: 'The Long Way', tag: 'distance is a mechanic', hue: 175,
    start: 21, end: 40,
  },
  {
    id: 3, name: 'Below the Summit', tag: 'the summit was only a ledge', hue: 160,
    start: 41, end: 60,
    gen: {
      W: 16, par: [19, 34], orbs: [1, 2], crumble: [1, 3], speed: [1.6, 2.2],
      shards: [4, 4], fill: [4, 8], keyP: 0.1,
      mech: { ice: 0.6, spring: 0.5, shuttle: 0.5 },
      // orientation rotation (M2.5 variety pass): the act plays as a
      // DESCENT — start at the top of the frame, goal at the bottom
      // (mirrored after the proof; all rules are mirror-symmetric)
      flip: 'z',
      // no switchback, staircase or long-drop (ADR-019): at this act's
      // par band [19,34] the long-route archetypes are unbuildable under
      // the press-schedule band — their short variants miss the par band
      // (par ~15), their par-fitting variants all fail the timing gate
      // (660 candidates per slot, 2026-11-09). The five short-geometry
      // archetypes below all prove within 60 attempts at every probed
      // slot.
      arch: ['descent', 'crossroads', 'twin-bridge', 'lattice', 'split-merge'],
      names: [
        'The Ledge Below', 'Under the Spire', 'The Old Ladder', 'Hollow Peak',
        'The Drop Deck', 'Windlass', 'The Second Summit', 'Grave of the Flag',
        'The Long Rung', 'Below the Cloudline',
      ],
      hint: 'The summit was only a ledge — keep going down',
    },
  },
  {
    id: 4, name: 'Hollow Country', tag: 'the ground starts to disappear', hue: 265,
    start: 61, end: 80,
    gen: {
      W: 16, par: [22, 38], orbs: [1, 3], crumble: [1, 3], speed: [1.6, 2.3],
      shards: [4, 4], fill: [4, 8], keyP: 0.1,
      mech: { ice: 0.6, spring: 0.6, shuttle: 0.6 },
      // orientation rotation (M2.5): the act plays RIGHT → LEFT — the
      // start sits on the east edge (mirrored after the proof)
      flip: 'x',
      // no long-route archetypes (ADR-019): on this act's W16 maps with
      // par floor 22 the switchback, staircase, long-drop and canyon
      // are unbuildable under the press-schedule band (probed at L61,
      // 2026-11-09) — all their candidates miss the par band or fail
      // the timing gate
      arch: ['descent', 'twin-bridge', 'lattice', 'split-merge', 'bridge-chain', 'crossroads'],
      names: [
        'Pothole March', 'The Missing Row', 'Sieve Field', 'The Hollows',
        'Crumble Court', 'The Gap Year', 'Underfloor', 'The Lost Stair',
        'Hole in the World', 'The Quiet Pit', 'Rimlight', 'The Drowned Path',
        'False Floor', 'The Weighed Step', 'The Unpaved', 'Hollowing',
        'The Great Absence', 'Thin Ice Country', 'The Letdown', 'The Last Solid',
      ],
      hint: 'Count what is missing before you step',
    },
  },
  {
    id: 5, name: 'Crosshatch', tag: 'nothing straight is safe', hue: 330,
    start: 81, end: 100,
    gen: {
      W: 18, par: [24, 40], orbs: [2, 3], crumble: [2, 3], speed: [1.7, 2.3],
      shards: [4, 4], fill: [4, 8], keyP: 0.12,
      mech: { ice: 0.6, spring: 0.6, shuttle: 0.6 },
      // orientation rotation (M2.5): the act plays as a descent — start
      // at the top of the frame (mirrored after the proof)
      flip: 'z',
      // no long-route archetypes (ADR-019): switchback/canyon/long-drop
      // cap at par ~23 on W18 — below this act's floor of 24 (probed
      // at L81, 2026-11-09)
      arch: ['lattice', 'gauntlet', 'aperture', 'ring', 'split-merge', 'undertow'],
      names: [
        'The Hatch', 'Crossfire II', 'The Latticework', 'Overweave',
        'The Criss', 'Tension Lines', 'The Bind', 'Interlace',
        'The Woven Dark', 'Crosscut', 'The Lacing', 'Taut',
        'The Intersect', 'Struck Through', 'The Hatching', 'The Weft',
        'Crosshatched', 'The Warp', 'The Selvedge', 'The Binding',
      ],
      hint: 'Every line crosses another — time them all',
    },
  },
  {
    id: 6, name: 'Glasswork', tag: 'one press, no second', hue: 190,
    start: 101, end: 120,
    gen: {
      W: 18, par: [26, 42], orbs: [2, 3], crumble: [2, 3], speed: [1.7, 2.3],
      shards: [4, 4], fill: [4, 8], keyP: 0.12,
      // the ice act: every level gets at least one ice tile (force), extra
      // carves are probabilistic (M2.5: identity mechanics are forced, not
      // left to best-effort luck)
      force: { ice: 1 },
      mech: { ice: 0.6, spring: 0.5, shuttle: 0.5 },
      // no long-route archetypes (ADR-019): switchback/long-drop/canyon
      // cap at par ~23 — below this act's floor of 26 (probed 2026-11-09)
      arch: ['ice-river', 'undertow', 'spring-field', 'twin-falls', 'lattice', 'gauntlet'],
      names: [
        'Frostline', 'The Slip', 'Glacier Walk', 'The Sheen',
        'Slipstream', 'The Glide', 'Frosthollow', 'The White Rush',
        'Skatefield', 'The Cold Slide', 'Glaze', 'The Ice Room',
        'Underglaze', 'The Runover', 'Frostbite Alley', 'The Mirror Lake',
        'Glacial Vein', 'The Thin White', 'Slipcase', 'The Last Thaw',
      ],
      hint: 'Ice does not brake — plan the slide, not the stop',
    },
  },
  {
    id: 7, name: 'Slow Current', tag: 'the bridges move; you wait', hue: 205,
    start: 121, end: 140,
    gen: {
      W: 18, par: [28, 44], orbs: [2, 3], crumble: [2, 3], speed: [1.7, 2.3],
      shards: [4, 4], fill: [4, 8], keyP: 0.15,
      // the shuttle act: every level carries a ride (M2.5). A slot whose
      // geometry never admits a shuttle carve fails the act — that is the
      // act's identity, so it is not relaxed.
      force: { shuttle: 1 },
      mech: { ice: 0.4, spring: 0.4, shuttle: 0.5 },
      // orientation rotation (M2.5): the act plays RIGHT → LEFT — the
      // crossing runs westbound (mirrored after the proof)
      flip: 'x',
      // no switchback (ADR-019): caps at par ~23 — below the floor of 28
      arch: ['shuttle-span', 'undertow', 'twin-bridge', 'bridge-chain', 'ring', 'aperture'],
      names: [
        'The Ferry', 'Crossing Time', 'The Slow Boat', 'Ropewalk',
        'The Passage', 'Tidegate', 'The Drift', 'Over the Water',
        'The Crossing', 'Bridgemind', 'The Wait', 'Sluice',
        'The Running Bridge', 'Current Set', 'The Span', 'Loosemooring',
        'The Turnaround', 'Fairway', 'The Dockside', 'High Crossing',
      ],
      hint: 'The platform keeps time — you keep your nerve',
    },
  },
  {
    id: 8, name: 'Darkwater', tag: 'pay for the way out', hue: 230,
    start: 141, end: 160,
    gen: {
      W: 18, par: [30, 46], orbs: [2, 3], crumble: [2, 3], speed: [1.7, 2.4],
      shards: [4, 4], fill: [6, 10], keyP: 0.45, // the key act: gates everywhere
      mech: { ice: 0.5, spring: 0.5, shuttle: 0.6 },
      // orientation rotation (M2.5): the act plays as a descent — start
      // at the top of the frame (mirrored after the proof)
      flip: 'z',
      // no switchback (ADR-019): caps at par ~23 — below the floor of 30
      arch: ['key-detour', 'vault', 'shuttle-span', 'gauntlet', 'twin-falls', 'meridian', 'aperture'],
      names: [
        'The Toll', 'Lockbox', 'The Sealed Door', 'Keyhole',
        'The Ransom', 'Deadlock', 'The Warded Gate', 'The Fee',
        'Lockpick Alley', 'The Vault Door', 'The Combination', 'Iron Seal',
        'The Pledge', 'Custody', 'The Gatehouse', 'The Safehouse',
        'The Deposit', 'Bastion Gate', 'The Last Key', 'The Sealed Deep',
      ],
      hint: 'The gate stays shut until you pay for it',
    },
  },
  {
    id: 9, name: 'The Pressure', tag: 'everything at once', hue: 0,
    start: 161, end: 180,
    gen: {
      W: 18, par: [32, 48], orbs: [2, 3], crumble: [2, 4], speed: [1.7, 2.4],
      shards: [4, 4], fill: [6, 10], keyP: 0.3,
      mech: { ice: 0.6, spring: 0.6, shuttle: 0.7 },
      // orientation rotation (M2.5): the act plays RIGHT → LEFT (mirrored
      // after the proof)
      flip: 'x',
      // no switchback (ADR-019): caps at par ~23 — below the floor of 32
      arch: ['gauntlet', 'undertow', 'twin-falls', 'shuttle-span', 'aperture', 'meridian'],
      names: [
        'Full Tide', 'The Squeeze', 'Overload', 'The Crunch',
        'Breaking Strain', 'The Load', 'Bottleneck', 'The Jam',
        'Compression', 'The Wedge', 'All Hands', 'The Grind',
        'Over the Edge', 'The Pileup', 'Strainpoint', 'The Wall of It',
        'Crammed', 'The Bottleneck', 'The Pincer', 'Maximum Pressure',
      ],
      hint: 'Everything you have learned, at once, faster',
    },
  },
  {
    id: 10, name: 'The Last Ascent', tag: 'one more chance, then the top', hue: 45,
    start: 181, end: 200,
    gen: {
      W: 18, par: [34, 50], orbs: [2, 3], crumble: [3, 4], speed: [1.7, 2.4],
      shards: [4, 4], fill: [6, 10], keyP: 0.35,
      // sparse band: the finale's long par + dense crumble means fewer
      // candidates prove (the vault slot in particular needs >300 attempts
      // under the final model — par 39, 3 sentinels, key, at ≤450). The
      // generator reads this as the attempt budget for the act's slots.
      attempts: 450,
      mech: { ice: 0.7, spring: 0.7, shuttle: 0.8 },
      arch: ['undertow', 'twin-falls', 'shuttle-span', 'gauntlet', 'vault', 'ring', 'meridian'],
      names: [
        'The Last Rung', 'Over the Line', 'The Breakline Crossed', 'Unmaking',
        'The Final Weave', 'Loose Ends', 'The Last Push', 'The Seams',
        'The Unwinding', 'Edge of the World', 'The Last Seam', 'The Quiet Part',
        'The Final Angle', 'Overturned', 'The Last Step', 'The Ascent Complete',
        'Beyond the Line', 'The Spire Reclimbed', 'The Long Way Up', 'Apex: The Broken Spire',
      ],
      hint: 'The whole game, wound into one fall',
    },
  },
];

/** The act object for a level id (null outside 1–200). */
export function actForId(id) {
  return ACTS.find((a) => id >= a.start && id <= a.end) || null;
}

/** Act-end levels carry the boss budget (the act-end spike). */
export function isActEnd(id) {
  return id % 20 === 0;
}

// ---------------------------------------------------------------------------
// KUBIK — campaign acts (10 × 20 levels, ADR-015)
//
// An act is the campaign's presentation + difficulty unit: a name, a tagline,
// a theme hue for the level-select, a difficulty budget window, and (for
// generated acts) the archetype pool the generator may draw from. Levels
// 1–50 already exist (hand-made intro + first generator); acts 1–3 cover
// them, and 51–200 are generated under the budgets below.
//
// The difficulty curve is monotonic across all 200. Two budgets drive it:
// SIZE (Phase G, ADR-045) and density (par, sentinels, crumble, mechanics,
// keys). Size was the missing half for a long time: from act 3 on the board
// sat at 16–20 with ~15% of it filled, which is a ribbon, not a place. Now
// every act grows the frame AND fills it (`mass`), so a level is a piece of
// architecture you travel through rather than a line you follow. Acts 1–2
// stay intimate on purpose — onboarding is about reading a small puzzle.
// Act-end levels (every 20th) carry a boss budget: the act-end spike.
// ---------------------------------------------------------------------------

// RELIEF POOLS (`gen.relief`). The pacing law puts a breathing slot at every
// sixth level (ADR-045), and a breathing slot is a promise about the LEVEL'S
// LENGTH — so it also has to constrain the shape. A tower route measures ~82
// rolls at 26×26 and can never land under the band's bottom third; picking it
// would silently break the sawtooth. Each pool is cut against the audit's own
// relief line (lo + ⅓ band) from the measured table in
// `scripts/site-mass-probe.mjs`: act 9 keeps lattice 33 / split-merge 35 /
// plaza 42 under 45.3, act 10 keeps plaza 42 / twin-bridge 43 / aperture 50
// under 52. An archetype measured ABOVE the line is not a candidate however
// short it feels — aperture at 26×26 measures 50, which is why acts 9 and 10
// do not share a pool. `tests/unit/scale.test.mjs` fails if a pool ever
// lists an archetype that cannot make the line.
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
      W: 20, par: [22, 36], orbs: [1, 2], crumble: [1, 3], speed: [1.6, 2.2],
      shards: [4, 4], fill: [4, 8], keyP: 0.1,
      // Phase G (ADR-045): the site-mass law — target solid fraction, the
      // 2x2-group floor that makes a board read as platforms not corridors,
      // and the pillar ceiling. Measured: mass at these settings takes a
      // ribbon archetype from ~12% to ~30–40% fill at par ±2.
      mass: { fill: 0.3, blocks: 45, heightMax: 3, sites: 70 },
      mech: { ice: 0.6, spring: 0.5, shuttle: 0.5 },
      // orientation rotation (M2.5 variety pass): the act plays as a
      // DESCENT — start at the top of the frame, goal at the bottom
      // (mirrored after the proof; all rules are mirror-symmetric)
      flip: 'z',
      // no switchback, staircase or long-drop (ADR-019): the long-route
      // archetypes are unbuildable under the press-schedule band — their
      // short variants miss the par band, their par-fitting variants fail
      // the timing gate (660 candidates per slot, 2026-11-09; re-measured
      // at 20×20 in Phase G — descent survives, the loops do not). The
      // short-geometry archetypes below all prove within 60 attempts.
      // breathing-slot pool — see the note above the ACTS table
      relief: ['lattice', 'fork', 'split-merge'],
      arch: ['descent', 'crossroads', 'twin-bridge', 'lattice', 'split-merge', 'fork', 'plaza'],
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
      W: 22, par: [24, 40], orbs: [1, 3], crumble: [1, 3], speed: [1.6, 2.3],
      shards: [4, 4], fill: [4, 8], keyP: 0.1,
      mass: { fill: 0.32, blocks: 55, heightMax: 3, sites: 80 },
      mech: { ice: 0.6, spring: 0.6, shuttle: 0.6 },
      // orientation rotation (M2.5): the act plays RIGHT → LEFT — the
      // start sits on the east edge (mirrored after the proof)
      flip: 'x',
      // Phase G pool at 22×22 (measured): the hollow country is built on
      // boards that can carry gaps and terraces — descent, the twin-bridge
      // crossing, the ladder families, and the first ice river.
      // breathing-slot pool — see the note above the ACTS table
      relief: ['lattice', 'fork', 'crossroads'],
      arch: ['twin-bridge', 'lattice', 'split-merge', 'crossroads', 'fork', 'plaza', 'ice-river'],
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
      W: 24, par: [26, 46], orbs: [2, 3], crumble: [2, 3], speed: [1.7, 2.3],
      shards: [4, 4], fill: [4, 8], keyP: 0.12,
      mass: { fill: 0.34, blocks: 70, heightMax: 3, widen: 3, isles: 4 },
      mech: { ice: 0.6, spring: 0.6, shuttle: 0.6 },
      // orientation rotation (M2.5): the act plays as a descent — start
      // at the top of the frame (mirrored after the proof)
      flip: 'z',
      // Phase G pool, measured at 24×24 with the site-mass stage on. These
      // are the archetypes mass cannot dissolve (every candidate keeps its
      // route within 2 rolls — `site-mass probe`): twin-bridge 40,
      // crossroads 29, bridge-chain 48, aperture 48, meridian 60, lattice 26.
      // The loop archetypes (ring, gauntlet, spiral) and the span builders
      // (shuttle-span, spring-field) collapse 2–40 rolls when their own void
      // is filled, so they are not in a mass act's pool — mass is the act's
      // promise, and a level that cannot carry it is a different level.
      // breathing-slot pool — see the note above the ACTS table
      relief: ['lattice', 'fork', 'crossroads'],
      arch: ['twin-bridge', 'lattice', 'split-merge', 'crossroads', 'fork', 'plaza', 'aperture'],
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
      W: 24, par: [28, 50], orbs: [2, 3], crumble: [2, 3], speed: [1.7, 2.3],
      shards: [4, 4], fill: [4, 8], keyP: 0.12,
      mass: { fill: 0.36, blocks: 80, heightMax: 4, widen: 3, isles: 4 },
      // the ice act: every level gets at least one ice tile (force), extra
      // carves are probabilistic (M2.5: identity mechanics are forced, not
      // left to best-effort luck)
      force: { ice: 1 },
      mech: { ice: 0.6, spring: 0.5, shuttle: 0.5, timed: 0.5, freeze: 0.35, heavy: 0.3, blocks: 0.25, pulse: 0.3, proximity: 0.3, twin: 0.3 },
      // Phase G pool at 26×26: the ice act keeps ice-river + spring-field
      // (its identity) and adds the big places; aperture (par 51) is still
      // over this act's ceiling and joins in act 7.
      // breathing-slot pool — see the note above the ACTS table
      relief: ['lattice', 'fork', 'crossroads'],
      arch: ['ice-river', 'plaza', 'twin-bridge', 'crossroads', 'split-merge', 'fork', 'lattice', 'aperture', 'bridge-chain'],
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
      W: 26, par: [30, 60], orbs: [2, 3], crumble: [2, 3], speed: [1.7, 2.3],
      shards: [4, 4], fill: [4, 8], keyP: 0.15,
      mass: { fill: 0.36, blocks: 85, heightMax: 4, widen: 3, isles: 4 },
      // the shuttle act: every level carries a ride (M2.5). A slot whose
      // geometry never admits a shuttle carve fails the act — that is the
      // act's identity, so it is not relaxed.
      force: { shuttle: 1 },
      mech: { ice: 0.4, spring: 0.4, shuttle: 0.5, timed: 0.45, freeze: 0.35, heavy: 0.3, blocks: 0.25, pulse: 0.3, proximity: 0.3, twin: 0.3, lift: 0.3, shrink: 0.3, piston: 0.3, turntable: 0.3, cling: 0.3, slider: 0.3, wind: 0.15 },
      // orientation rotation (M2.5): the act plays RIGHT → LEFT — the
      // crossing runs westbound (mirrored after the proof)
      flip: 'x',
      // Phase G pool at 26×26. The shuttle act keeps its ride archetypes
      // (shuttle-span/undertow are its identity) even where their natural
      // par sits under the floor: `force.shuttle` extends them, and the
      // verifier prices the result. aperture (51) enters its band here.
      // breathing-slot pool — see the note above the ACTS table
      relief: ['crossroads', 'fork', 'lattice', 'split-merge'],
      arch: ['shuttle-span', 'twin-bridge', 'bridge-chain', 'aperture', 'plaza', 'split-merge', 'crossroads', 'fork', 'ice-river', 'lattice'],
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
      W: 26, par: [32, 64], orbs: [2, 3], crumble: [2, 3], speed: [1.7, 2.4],
      shards: [4, 4], fill: [6, 10], keyP: 0.45, // the key act: gates everywhere
      mass: { fill: 0.38, blocks: 90, heightMax: 4, widen: 3, isles: 4 },
      mech: { ice: 0.5, spring: 0.5, shuttle: 0.6, door: 0.4, timed: 0.4, freeze: 0.4, heavy: 0.35, blocks: 0.3, pulse: 0.35, proximity: 0.35, twin: 0.35, lift: 0.35, shrink: 0.35, piston: 0.35, turntable: 0.35, cling: 0.3, slider: 0.3, wind: 0.15 },
      // orientation rotation (M2.5): the act plays as a descent — start
      // at the top of the frame (mirrored after the proof)
      flip: 'z',
      // Phase G: key-detour and vault are SMALL-ROOM builders (their par is
      // ~W, so they cap near 27 at this size) — at EDGE scale the key stops
      // being its own floor plan and becomes a layer on a place: keyP 0.45
      // puts a gate on nearly half of an act of big boards. The builders
      // stay in the act-3/4 pools where their size is the point.
      // breathing-slot pool — see the note above the ACTS table
      relief: ['crossroads', 'fork', 'lattice', 'split-merge'],
      arch: ['plaza', 'twin-bridge', 'aperture', 'bridge-chain', 'citadel', 'split-merge', 'crossroads', 'fork', 'ice-river', 'lattice', 'twin-falls', 'boss-arena'],
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
      W: 26, par: [34, 68], orbs: [2, 3], crumble: [2, 4], speed: [1.7, 2.4],
      shards: [4, 4], fill: [6, 10], keyP: 0.3,
      mass: { fill: 0.4, blocks: 95, heightMax: 4, widen: 3, isles: 5 },
      mech: { ice: 0.6, spring: 0.6, shuttle: 0.7, conveyor: 0.5, door: 0.45, timed: 0.5, freeze: 0.45, heavy: 0.4, blocks: 0.35, pulse: 0.4, proximity: 0.4, twin: 0.4, lift: 0.35, shrink: 0.35, piston: 0.35, turntable: 0.35, cling: 0.35, slider: 0.35, wind: 0.15 },
      // orientation rotation (M2.5): the act plays RIGHT → LEFT (mirrored
      // after the proof)
      flip: 'x',
      // Phase G pool at 30×30 (measured): ribbons all clear the floor here,
      // composites (citadel 77, tower 102) do not fit this band — they are
      // reserved for the finale act where the ceiling is 72.
      // breathing-slot pool — see the note above the ACTS table
      relief: ['lattice', 'split-merge', 'plaza'],
      arch: ['plaza', 'split-merge', 'aperture', 'bridge-chain', 'twin-bridge', 'meridian', 'citadel', 'boss-arena', 'twin-falls', 'lattice'],
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
      W: 26, par: [36, 84], orbs: [2, 3], crumble: [3, 4], speed: [1.7, 2.4],
      shards: [4, 4], fill: [6, 10], keyP: 0.35,
      mass: { fill: 0.42, blocks: 100, heightMax: 5, widen: 3, isles: 5 },
      // sparse band: the finale's long par + dense crumble means fewer
      // candidates prove (the vault slot in particular needs >300 attempts
      // under the final model — par 39, 3 sentinels, key, at ≤450). The
      // generator reads this as the attempt budget for the act's slots.
      attempts: 450,
      mech: { ice: 0.7, spring: 0.7, shuttle: 0.8, conveyor: 0.6, door: 0.5, timed: 0.55, freeze: 0.5, heavy: 0.45, blocks: 0.35, pulse: 0.45, proximity: 0.45, twin: 0.45, lift: 0.35, shrink: 0.35, piston: 0.35, turntable: 0.35, cling: 0.35, slider: 0.35, wind: 0.15 },
      // Phase G finale pool: the two composites (tower, citadel) and plaza
      // are the EDGE-scale set pieces this act is built around; the rest
      // keeps variety between them. underwow/ring are deliberately out —
      // the finale never repeats the shortest device.
      // breathing-slot pool — see the note above the ACTS table
      relief: ['plaza', 'twin-bridge', 'aperture'],
      arch: ['plaza', 'meridian', 'citadel', 'tower', 'boss-arena', 'twin-falls', 'aperture', 'bridge-chain', 'twin-bridge'],
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

/**
 * The act's designed PAR CURVE (Phase G, ADR-045).
 *
 * Before this, the generator ranked candidates by hazard variety and let the
 * par land wherever the band allowed; with EDGE-scale bands (act 10 is 36–84)
 * that produced adjacent levels 30 rolls apart — a cliff the curation audit
 * caught (L152→L153: 64→33). Pacing is a design decision, so it is drawn: a
 * sawtooth of six — five rising steps, then a relief step back to the bottom
 * of the band. Every step is ≤ 15% of the band, which keeps adjacent jumps
 * inside the audit's allowance by construction, and every sixth level IS the
 * breathing slot the research pass asked for (relief every ~6). Bosses take
 * the act ceiling; the level before a boss is a dip, so the boss lands as a
 * spike rather than a continuation.
 */
export function reliefSlot(id, act) {
  if (!act || !act.gen || isActEnd(id)) return false;
  const first = Math.max(act.start, 51);
  const i = id - first;
  if (i < 0) return false;
  // the sawtooth's sixth rung, and the dip that runs up to a boss
  return i % 6 === 5 || (id + 1) % 20 === 0;
}

export function parTarget(id, act) {
  const g = act && act.gen;
  if (!g) return null;
  const [lo, hi] = g.par;
  if (isActEnd(id)) return hi;
  const span = hi - lo;
  const first = Math.max(act.start, 51);
  const i = id - first;
  if (i < 0) return lo + Math.round(span * 0.4);
  // relief the level before an act-end boss: the spike needs a run-up
  if ((id + 1) % 20 === 0) return lo + Math.round(span * 0.25);
  const phase = i % 6;
  const ramp = [0.18, 0.32, 0.46, 0.58, 0.68, 0.22][phase];
  return lo + Math.round(span * ramp);
}

/**
 * How far one level's par may sit from its neighbour's inside an act.
 *
 * One number, two users: the generator refuses to SETTLE on a candidate that
 * breaks it, and the curation audit FAILS a catalogue that breaks it. The
 * allowance is the act's own declared bandwidth (Phase G widened the bands to
 * 22–36 … 36–84), with a floor of 16 for the tight early acts.
 */
export function parJumpAllowance(act) {
  const g = act && act.gen;
  if (!g) return 16;
  return Math.max(16, Math.round((g.par[1] - g.par[0]) * 0.7));
}

/**
 * Teaching / testing / twisting slots per mechanic (Phase C, ADR-031…039).
 *
 * These were landed one at a time through `KUBIK_FORCE_MECH=<id>=<mech>` and
 * the generator had no memory of them — so a regeneration (Phase G, ADR-045)
 * silently dropped door 14→9, conveyor 14→13, shrink 3→1, piston 3→2,
 * turntable 3→2, cling 3→1 and wind 3→1, and the density ratchet caught it.
 * A mechanic that only exists because someone remembered to run an env var is
 * not shipped content; the slots are data now, and every regeneration
 * re-creates them.
 *
 * Eight slots moved by one or two numbers when the sawtooth arrived (Phase G,
 * ADR-045): L92→93, L98→97, L112→111, L126→127, L152→151, L158→157,
 * L186→185, L192→190. A teaching slot is a CLIMBING slot — it introduces a
 * mechanic the player has to learn, in a room long enough to learn it in — and
 * the breathing slots are the opposite promise. They cannot be the same level.
 */
export const MECH_SLOTS = {
  // two slots added 2026-11-20 (Phase G regeneration dropped the census to 12
  // against the ratchet's 14; the floor was NOT lowered — the catalogue grew
  // the mechanic instead). Neither id is a relief slot, and both acts already
  // carry doors, so the carve is at home.
  door: [93, 97, 111, 133, 151, 170, 177, 196],
  conveyor: [110, 128, 157, 190],
  shrink: [127, 161, 193],
  piston: [137, 169, 187],
  turntable: [129, 164, 189],
  cling: [176, 185, 191],
  wind: [148, 167, 184],
};

/** The act object for a level id (null outside 1–200). */
export function actForId(id) {
  return ACTS.find((a) => id >= a.start && id <= a.end) || null;
}

/** Act-end levels carry the boss budget (the act-end spike). */
export function isActEnd(id) {
  return id % 20 === 0;
}

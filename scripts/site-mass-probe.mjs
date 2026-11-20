// ---------------------------------------------------------------------------
// KUBIK — site-mass probe (Phase G, ADR-045)
//
// The Phase G act budgets are not taste; they are the outcome of this probe.
// For every archetype at a given board size it measures, with the site-mass
// stage ON and the hazards OFF:
//
//   bare par    — the archetype's own route length
//   dressed par — the route length after mass
//   Δ           — whether mass dissolved the design (negative = shorter)
//   fill        — walkable fraction of the board
//   inner       — share of walkable tiles with four walkable neighbours
//   blocks      — 2×2 walkable groups (wide platform, not corridor)
//   accepted    — how many draws met the stage's contract (fill ≥ 24%,
//                 the act's 2×2 floor, route kept, route shortened ≤ 2)
//
// The pools in src/acts.js are chosen from these tables: an archetype enters
// a mass act only when mass leaves its route alone at that size.
//
//   node scripts/site-mass-probe.mjs [--sizes 20,22,24,26] [--n 16] [--fill 0.36]
// ---------------------------------------------------------------------------
import { parseLevel, shortestRoute } from '../src/rules.js';
import { ARCHETYPES } from './archetypes.mjs';
import { applySiteMass, countBlocks, countInner, solidCount, layoutDef } from './sitemass.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const SIZES = arg('sizes', '20,22,24,26').split(',').map(Number);
const N = Number(arg('n', 16));
const FILL = Number(arg('fill', 0.36));

const LIST = [
  'descent', 'switchback', 'twin-bridge', 'spiral', 'lattice', 'split-merge',
  'ring', 'key-detour', 'vault', 'shuttle-span', 'spring-field', 'ice-river',
  'gauntlet', 'bridge-chain', 'staircase', 'crossroads', 'aperture',
  'twin-falls', 'fork', 'long-drop', 'meridian', 'undertow', 'canyon',
  'plaza', 'tower', 'citadel', 'boss-arena',
];

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const median = (a) => {
  if (!a.length) return NaN;
  const b = [...a].sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)];
};
const pct = (v) => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : '—');

console.log(`site-mass probe — ${N} draws per archetype, mass fill target ${pct(FILL)}\n`);
for (const W of SIZES) {
  const b = {
    W, H: W, par: [6, 400], orbs: [0, 0], crumble: [0, 0], speed: [1, 2],
    shards: [4, 4], fill: [4, 8], keyP: 0,
  };
  const mass = { fill: FILL, blocks: 0, heightMax: 3, widen: 3, isles: 4 };
  console.log(`### ${W}×${W}`);
  console.log('| archetype | bare par | dressed par | Δ | fill | inner | 2×2 | accepted |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const name of LIST) {
    const bare = [];
    const dressed = [];
    const fills = [];
    const inner = [];
    const blocks = [];
    let accepted = 0;
    let built = 0;
    for (let i = 0; i < N; i++) {
      const rand = rng(0x2f + i * 104729 + W * 37);
      let layout = null;
      try {
        layout = ARCHETYPES[name](rand, b);
      } catch {
        layout = null;
      }
      if (!layout) continue;
      built++;
      const p0 = shortestRoute(parseLevel(layoutDef(layout)));
      const m = applySiteMass(layout, rand, { ...b, mass });
      if (!m) continue;
      const p1 = shortestRoute(parseLevel(layoutDef(m)));
      if (!(p1 > 0)) continue;
      accepted++;
      bare.push(p0);
      dressed.push(p1);
      const solid = solidCount(m.map);
      fills.push(solid / (W * W));
      inner.push(countInner(m.map) / Math.max(1, solid));
      blocks.push(countBlocks(m.map));
    }
    if (!accepted) {
      console.log(`| ${name} | — | — | — | — | — | — | 0/${Math.max(1, built)} |`);
      continue;
    }
    const delta = median(dressed) - median(bare);
    console.log(
      `| ${name} | ${median(bare)} | ${median(dressed)} | ${delta > 0 ? '+' : ''}${delta} | `
      + `${pct(median(fills))} | ${pct(median(inner))} | ${median(blocks)} | ${accepted}/${built} |`,
    );
  }
  console.log('');
}

// ─────────────────────────────────────────────────────────────
// Generates 100 difficulty-graded levels across board shapes and
// emits BOTH the TS data (src/game/levels.data.ts) and the Dart
// data (flutter_app/lib/game/levels.data.dart), guaranteeing
// parity between the web and Flutter games.
//
// Every puzzle is produced by a random walk from a verified
// non-crossing solution, so it is always solvable, and the
// generator re-checks solvability through the same hint policy
// the games use before accepting a seed.
// ─────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { ShapeKind, sampleSlots, Pt } from '../src/game/shapes';
import {
  Slots,
  applyMove,
  countCrossings,
  findHint,
  isSolved,
} from '../src/game/engine-core';

// ── tuning ───────────────────────────────────────────────────

interface TierSpec {
  name: string;
  ropes: number;
  total: number;
  minCross: number;
  shapes: ShapeKind[];
}

const TIERS: TierSpec[] = [
  { name: 'First Knots', ropes: 3, total: 8, minCross: 2, shapes: ['circle', 'oval', 'square'] },
  { name: 'Loose Threads', ropes: 4, total: 10, minCross: 3, shapes: ['circle', 'square', 'triangle', 'diamond'] },
  { name: 'Loom Rings', ropes: 5, total: 12, minCross: 4, shapes: ['oval', 'pentagon', 'hexagon', 'roundedSquare'] },
  { name: 'Star Spindle', ropes: 5, total: 14, minCross: 5, shapes: ['star5', 'circle', 'diamond', 'hexagon'] },
  { name: 'Heartstrings', ropes: 6, total: 14, minCross: 6, shapes: ['heart', 'roundedSquare', 'pentagon', 'oval'] },
  { name: 'Arrow Weave', ropes: 7, total: 16, minCross: 7, shapes: ['arrow', 'star5', 'triangle', 'plus'] },
  { name: 'Cross Stitch', ropes: 8, total: 18, minCross: 8, shapes: ['plus', 'star6', 'heart', 'square'] },
  { name: 'Grand Tangle', ropes: 8, total: 20, minCross: 9, shapes: ['star6', 'arrow', 'hexagon', 'diamond'] },
  { name: 'Master Loom', ropes: 9, total: 22, minCross: 10, shapes: ['heart', 'star5', 'plus', 'pentagon'] },
  { name: "Weaver's Nightmare", ropes: 10, total: 24, minCross: 12, shapes: ['star6', 'arrow', 'plus', 'heart'] },
];

const CREAM = '#f1e9dc';
const ACCENTS = ['#e8c33a', '#93a58c', '#c98a5e', '#7d98b5', '#b58fb0', '#d47a8a', '#6fb0a5'];

const PER_TIER = 10;

// ── deterministic RNG ────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── non-crossing matching on arbitrary point sets ────────────

/**
 * Non-crossing matching for exactly `ropeCount` ropes. Slots are ordered by
 * angle around the centroid and adjacent ones are paired; the remaining
 * slots stay empty. Adjacent-in-angular-order chords never cross.
 */
function nonCrossingPairs(points: Pt[], ropeCount: number): [number, number][] {
  const order = points
    .map((p, i) => ({ i, a: Math.atan2(p.y, p.x) }))
    .sort((u, v) => u.a - v.a)
    .map((o) => o.i);
  const used = order.slice(0, ropeCount * 2);
  const pairs: [number, number][] = [];
  for (let k = 0; k < used.length; k += 2) pairs.push([used[k], used[k + 1]]);
  return pairs;
}

function pairsAreClean(pairs: [number, number][], points: Pt[]): boolean {
  const slots: Slots = new Array(points.length).fill(null);
  pairs.forEach(([a, b], id) => {
    slots[a] = id;
    slots[b] = id;
  });
  return countCrossings(slots, pairs.length, points) === 0;
}

// ── scramble ─────────────────────────────────────────────────

function scramble(
  slots: Slots,
  ropeCount: number,
  points: Pt[],
  walkLen: number,
  rand: () => number,
): Slots {
  const s = slots.slice();
  for (let k = 0; k < walkLen; k++) {
    const occupied = s.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
    const empty = s.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);

    // 65% of the time pick a move that maximizes crossings among candidates,
    // otherwise drift randomly — produces tangled but reachable layouts.
    if (rand() < 0.65) {
      let best: { from: number; to: number; score: number } | null = null;
      for (let c = 0; c < 8; c++) {
        const from = occupied[Math.floor(rand() * occupied.length)];
        const to = empty[Math.floor(rand() * empty.length)];
        const score = countCrossings(applyMove(s, from, to), ropeCount, points);
        if (!best || score > best.score) best = { from, to, score };
      }
      if (best) {
        s[best.to] = s[best.from];
        s[best.from] = null;
        continue;
      }
    }
    const from = occupied[Math.floor(rand() * occupied.length)];
    const to = empty[Math.floor(rand() * empty.length)];
    s[to] = s[from];
    s[from] = null;
  }
  return s;
}

/** Mirror of the in-game hint policy, used to validate solvability. */
function solveWithHints(start: Slots, ropeCount: number, points: Pt[], cap = 300) {
  let s = start;
  let steps = 0;
  while (!isSolved(s, ropeCount, points) && steps < cap) {
    const h = findHint(s, ropeCount, points, 4, 15000);
    if (!h) break;
    s = applyMove(s, h.from, h.to);
    steps++;
  }
  return { solved: isSolved(s, ropeCount, points), steps };
}

function paletteFor(ropeCount: number, rand: () => number): string[] {
  const palette: string[] = [];
  for (let i = 0; i < ropeCount; i++) {
    if (i === 1 && ropeCount >= 3) {
      palette.push('#e8c33a'); // signature yellow cord
    } else if (rand() < 0.42) {
      palette.push(ACCENTS[Math.floor(rand() * ACCENTS.length)]);
    } else {
      palette.push(CREAM);
    }
  }
  return palette;
}

// ── generate ─────────────────────────────────────────────────

interface Generated {
  id: number;
  name: string;
  tier: number;
  shape: ShapeKind;
  total: number;
  pairs: [number, number][];
  palette: string[];
  par: number;
  start: Slots;
  crossings: number;
  solveSteps: number;
}

function generate(): Generated[] {
  const out: Generated[] = [];
  let id = 0;

  for (let tierIdx = 0; tierIdx < TIERS.length; tierIdx++) {
    const tier = TIERS[tierIdx];
    for (let n = 0; n < PER_TIER; n++) {
      const shape = tier.shapes[n % tier.shapes.length];
      const points = sampleSlots(shape, tier.total);
      const ropeCount = tier.ropes;

      let pairs = nonCrossingPairs(points, ropeCount);
      if (!pairsAreClean(pairs, points)) {
        // fallback: adjacent perimeter pairs are always non-crossing
        pairs = [];
        for (let k = 0; k < ropeCount * 2; k += 2) pairs.push([k, k + 1]);
      }

      const walkLen = ropeCount * 9 + tierIdx * 12 + 14;
      let accepted: Generated | null = null;

      for (let seed = 1; seed <= 400 && !accepted; seed++) {
        const rand = mulberry32(id * 100003 + seed * 7919 + 17);
        const solved: Slots = new Array(tier.total).fill(null);
        pairs.forEach(([a, b], rid) => {
          solved[a] = rid;
          solved[b] = rid;
        });

        const start = scramble(solved, ropeCount, points, walkLen, rand);
        const crossings = countCrossings(start, ropeCount, points);
        if (crossings < tier.minCross) continue;

        const check = solveWithHints(start, ropeCount, points);
        if (!check.solved) continue;

        const par = Math.max(6, Math.round(check.steps * 1.25) + tierIdx);
        accepted = {
          id,
          name: `${tier.name} ${n + 1}`,
          tier: tierIdx,
          shape,
          total: tier.total,
          pairs,
          palette: paletteFor(ropeCount, rand),
          par,
          start,
          crossings,
          solveSteps: check.steps,
        };
      }

      if (!accepted) throw new Error(`failed to generate tier ${tierIdx} level ${n}`);
      out.push(accepted);
      id++;
    }
  }
  return out;
}

// ── emit ─────────────────────────────────────────────────────

function tsLiteralSlots(s: Slots) {
  return `[${s.map((v) => (v === null ? 'null' : v)).join(', ')}]`;
}

function emitTs(levels: Generated[]) {
  const lines = [
    '// AUTO-GENERATED by scripts/gen-levels-v2.ts — do not edit by hand.',
    "import { ShapeKind } from './shapes';",
    '',
    'export interface LevelData {',
    '  id: number;',
    '  name: string;',
    '  tier: number;',
    '  shape: ShapeKind;',
    '  total: number;',
    '  pairs: [number, number][];',
    '  palette: string[];',
    '  par: number;',
    '  start: (number | null)[];',
    '}',
    '',
    'export const LEVEL_DATA: LevelData[] = [',
  ];
  for (const l of levels) {
    lines.push('  {');
    lines.push(`    id: ${l.id}, name: ${JSON.stringify(l.name)}, tier: ${l.tier}, shape: ${JSON.stringify(l.shape)}, total: ${l.total},`);
    lines.push(`    pairs: [${l.pairs.map(([a, b]) => `[${a}, ${b}]`).join(', ')}],`);
    lines.push(`    palette: [${l.palette.map((c) => JSON.stringify(c)).join(', ')}],`);
    lines.push(`    par: ${l.par},`);
    lines.push(`    start: ${tsLiteralSlots(l.start)},`);
    lines.push('  },');
  }
  lines.push('];');
  writeFileSync('src/game/levels.data.ts', lines.join('\n'));
}

function dartLiteralSlots(s: Slots) {
  return `<int?>[${s.map((v) => (v === null ? 'null' : v)).join(', ')}]`;
}

function emitDart(levels: Generated[]) {
  const lines = [
    '// AUTO-GENERATED by scripts/gen-levels-v2.ts — do not edit by hand.',
    "import 'dart:ui';",
    '',
    "import 'shapes.dart';",
    '',
    'class LevelData {',
    '  const LevelData({',
    '    required this.id,',
    '    required this.name,',
    '    required this.tier,',
    '    required this.shape,',
    '    required this.total,',
    '    required this.pairs,',
    '    required this.palette,',
    '    required this.par,',
    '    required this.start,',
    '  });',
    '',
    '  final int id;',
    '  final String name;',
    '  final int tier;',
    '  final ShapeKind shape;',
    '  final int total;',
    '  final List<List<int>> pairs;',
    '  final List<Color> palette;',
    '  final int par;',
    '  final List<int?> start;',
    '}',
    '',
    'final List<LevelData> kLevelData = <LevelData>[',
  ];
  for (const l of levels) {
    const colors = l.palette
      .map((c) => {
        const n = parseInt(c.slice(1), 16);
        return `Color(0xFF${n.toString(16).padStart(6, '0').toUpperCase()})`;
      })
      .join(', ');
    lines.push('  LevelData(');
    lines.push(`    id: ${l.id}, name: ${JSON.stringify(l.name).replaceAll('"', "'")}, tier: ${l.tier},`);
    lines.push(`    shape: ShapeKind.${l.shape}, total: ${l.total},`);
    lines.push(`    pairs: <List<int>>[${l.pairs.map(([a, b]) => `<int>[${a}, ${b}]`).join(', ')}],`);
    lines.push(`    palette: <Color>[${colors}],`);
    lines.push(`    par: ${l.par},`);
    lines.push(`    start: ${dartLiteralSlots(l.start)},`);
    lines.push('  ),');
  }
  lines.push('];');
  writeFileSync('flutter_app/lib/game/levels.data.dart', lines.join('\n'));
}

// ── run ──────────────────────────────────────────────────────

const levels = generate();
emitTs(levels);
emitDart(levels);

console.log(`generated ${levels.length} levels`);
for (let t = 0; t < TIERS.length; t++) {
  const slice = levels.filter((l) => l.tier === t);
  const cross = slice.map((l) => l.crossings);
  const solves = slice.map((l) => l.solveSteps);
  const shapes = new Set(slice.map((l) => l.shape));
  console.log(
    `T${t + 1} ${TIERS[t].name.padEnd(18)} ropes=${TIERS[t].ropes} slots=${TIERS[t].total} ` +
      `cross[${Math.min(...cross)}-${Math.max(...cross)}] solve[${Math.min(...solves)}-${Math.max(...solves)}] ` +
      `shapes=${[...shapes].join(',')}`,
  );
}

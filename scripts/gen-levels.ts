// Offline level curator: finds BFS-verified scrambled layouts and prints them.
import { LEVELS, Slots, applyMove, countCrossings, isSolved } from '../src/game/engine';

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

function solvedSlots(idx: number): Slots {
  const def = LEVELS[idx];
  const s: Slots = new Array(def.total).fill(null);
  def.pairs.forEach(([a, b], id) => {
    s[a] = id;
    s[b] = id;
  });
  return s;
}

function randomWalk(idx: number, steps: number, seed: number): Slots {
  const def = LEVELS[idx];
  const rand = mulberry32(seed);
  const s = solvedSlots(idx);
  for (let k = 0; k < steps; k++) {
    const occ = s.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
    const emp = s.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
    const from = occ[Math.floor(rand() * occ.length)];
    const to = emp[Math.floor(rand() * emp.length)];
    s[to] = s[from];
    s[from] = null;
  }
  return s;
}

const key = (s: Slots) => s.map((v) => (v === null ? '_' : v)).join(',');

/** Layer BFS; returns solved depth if <= cap, otherwise cap+1. */
function depthWithin(start: Slots, idx: number, cap: number): number {
  const def = LEVELS[idx];
  const rc = def.pairs.length;
  let frontier = [start];
  const seen = new Set<string>([key(start)]);
  for (let d = 0; d <= cap; d++) {
    for (const s of frontier) {
      if (isSolved(s, rc, def.total)) return d;
    }
    if (d === cap) break;
    const next: Slots[] = [];
    for (const s of frontier) {
      const emp = s.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
      const occ = s.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
      for (const from of occ) {
        for (const to of emp) {
          const c = applyMove(s, from, to);
          const k = key(c);
          if (!seen.has(k)) {
            seen.add(k);
            next.push(c);
          }
        }
      }
    }
    frontier = next;
  }
  return cap + 1;
}

const targets = [
  { minCross: 2, minDepth: 2 },
  { minCross: 3, minDepth: 2 },
  { minCross: 4, minDepth: 3 },
  { minCross: 6, minDepth: 3 },
  { minCross: 8, minDepth: 4 },
];

const results: { idx: number; seed: number; crossings: number; depth: number; slots: Slots }[] = [];

for (let idx = 0; idx < LEVELS.length; idx++) {
  const t = targets[idx];
  const def = LEVELS[idx];
  let chosen: (typeof results)[number] | null = null;

  for (let seed = 1; seed < 20000 && !chosen; seed++) {
    const walkLen = def.pegs * (10 + (seed % 9));
    const s = randomWalk(idx, walkLen, seed * 31 + 7);
    const c = countCrossings(s, def.pairs.length, def.total);
    if (c < t.minCross) continue;
    const depth = depthWithin(s, idx, t.minDepth);
    if (depth >= t.minDepth) {
      chosen = { idx, seed, crossings: c, depth: Math.min(depth, t.minDepth + 1), slots: s };
    }
  }

  if (!chosen) throw new Error(`no layout found for level ${idx + 1}`);
  results.push(chosen);
  console.log(
    `L${idx + 1}: seed=${chosen.seed} crossings=${chosen.crossings} depth>=${t.minDepth} (got ${chosen.depth})`,
  );
}

console.log('\nPaste into engine.ts:');
console.log('export const CURATED_STARTS: Slots[] = [');
for (const r of results) {
  console.log(`  [${r.slots.map((v) => (v === null ? 'null' : v)).join(', ')}],`);
}
console.log('];');

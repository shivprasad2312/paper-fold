// ─────────────────────────────────────────────────────────────
// Rope Untangle — puzzle engine (pure logic, no DOM)
// ─────────────────────────────────────────────────────────────

export type Slots = (number | null)[]; // slot -> ropeId (or null = empty hole)

export interface RopeDef {
  a: number;
  b: number;
  color: string;
}

export interface LevelDef {
  name: string;
  pegs: number; // occupied slots
  total: number; // total slots around the ring
  pairs: [number, number][]; // non-crossing "solved" matching
  palette: string[]; // one color per rope
  par: number;
}

export interface Level {
  def: LevelDef;
  ropes: RopeDef[];
  start: Slots; // scrambled starting position
}

export interface Pt {
  x: number;
  y: number;
}

// ── levels ───────────────────────────────────────────────────

const CREAM = '#f1e9dc';
const YELLOW = '#e8c33a';
const SAGE = '#93a58c';
const TERRACOTTA = '#c98a5e';
const BLUE = '#7d98b5';
const LAVENDER = '#b58fb0';

export const LEVELS: LevelDef[] = [
  {
    name: 'First Knot',
    pegs: 6,
    total: 8,
    pairs: [
      [0, 1],
      [2, 5],
      [3, 4],
    ],
    palette: [CREAM, YELLOW, CREAM],
    par: 7,
  },
  {
    name: 'Loose Threads',
    pegs: 8,
    total: 10,
    pairs: [
      [0, 1],
      [2, 7],
      [3, 4],
      [5, 6],
    ],
    palette: [CREAM, CREAM, YELLOW, CREAM],
    par: 9,
  },
  {
    name: 'Tangled Web',
    pegs: 10,
    total: 12,
    pairs: [
      [0, 9],
      [1, 2],
      [3, 8],
      [4, 5],
      [6, 7],
    ],
    palette: [CREAM, CREAM, YELLOW, SAGE, CREAM],
    par: 12,
  },
  {
    name: 'Spindle Ring',
    pegs: 12,
    total: 14,
    pairs: [
      [0, 1],
      [2, 11],
      [3, 4],
      [5, 10],
      [6, 7],
      [8, 9],
    ],
    palette: [CREAM, TERRACOTTA, CREAM, YELLOW, CREAM, SAGE],
    par: 15,
  },
  {
    name: "Weaver's Nightmare",
    pegs: 14,
    total: 16,
    pairs: [
      [0, 13],
      [1, 2],
      [3, 12],
      [4, 5],
      [6, 11],
      [7, 8],
      [9, 10],
    ],
    palette: [CREAM, CREAM, BLUE, CREAM, YELLOW, LAVENDER, CREAM],
    par: 19,
  },
];

/**
 * Curated starting layouts (generated offline, see scripts/gen-levels.ts).
 * Crossing counts / BFS-verified minimum solution depths:
 * L1: 2 crossings, depth 2 · L2: 4 / 2 · L3: 6 / 3 · L4: 6 / 3 · L5: 8 / 4
 */
export const CURATED_STARTS: Slots[] = [
  [1, 2, null, null, 0, 1, 0, 2],
  [1, 0, 2, 3, 0, null, 2, null, 1, 3],
  [1, 3, 0, 4, null, 2, 1, null, 4, 2, 3, 0],
  [2, 1, 5, 0, 2, 5, 1, 4, null, 3, 4, null, 3, 0],
  [null, 2, 3, 1, 6, 2, 1, 6, 5, 3, 0, 4, 5, 0, 4, null],
];

// ── geometry ─────────────────────────────────────────────────

export function slotPos(i: number, total: number): Pt {
  const ang = -Math.PI / 2 + (i / total) * Math.PI * 2;
  return { x: Math.cos(ang), y: Math.sin(ang) };
}

function orient(p: Pt, q: Pt, r: Pt): number {
  const v = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  return Math.abs(v) < 1e-12 ? 0 : v > 0 ? 1 : 2;
}

function onSegment(p: Pt, q: Pt, r: Pt): boolean {
  return (
    q.x <= Math.max(p.x, r.x) + 1e-12 &&
    q.x >= Math.min(p.x, r.x) - 1e-12 &&
    q.y <= Math.max(p.y, r.y) + 1e-12 &&
    q.y >= Math.min(p.y, r.y) - 1e-12
  );
}

function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const o1 = orient(p1, p2, p3);
  const o2 = orient(p1, p2, p4);
  const o3 = orient(p3, p4, p1);
  const o4 = orient(p3, p4, p2);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;
  return false;
}

// ── crossings ────────────────────────────────────────────────

export function ropeEndpoints(ropeId: number, slots: Slots): [number, number] | null {
  const found: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === ropeId) found.push(i);
  }
  return found.length === 2 ? [found[0], found[1]] : null;
}

export function countCrossings(slots: Slots, ropeCount: number, total: number): number {
  const ends: [Pt, Pt][] = [];
  for (let r = 0; r < ropeCount; r++) {
    const ep = ropeEndpoints(r, slots);
    if (!ep) continue;
    ends.push([slotPos(ep[0], total), slotPos(ep[1], total)]);
  }
  let n = 0;
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      if (segmentsCross(ends[i][0], ends[i][1], ends[j][0], ends[j][1])) n++;
    }
  }
  return n;
}

export function isSolved(slots: Slots, ropeCount: number, total: number): boolean {
  return countCrossings(slots, ropeCount, total) === 0;
}

// ── level construction ───────────────────────────────────────

export function buildLevel(index: number): Level {
  const def = LEVELS[index];
  const ropes: RopeDef[] = def.pairs.map(([a, b], i) => ({
    a,
    b,
    color: def.palette[i],
  }));
  const start = CURATED_STARTS[index].slice();
  return { def, ropes, start };
}

// ── moves ────────────────────────────────────────────────────

export function applyMove(slots: Slots, from: number, to: number): Slots {
  if (slots[from] === null || slots[to] !== null) return slots;
  const next = slots.slice();
  next[to] = next[from];
  next[from] = null;
  return next;
}

export interface Hint {
  from: number;
  to: number;
}

const slotKey = (s: Slots) => s.map((v) => (v === null ? '_' : v)).join(',');

/**
 * Finds a helpful move via breadth-first search: the first step of the shortest
 * path toward a state with fewer crossings (often the fully solved state), so it
 * escapes local minima where no single move immediately helps. Falls back to the
 * best greedy move if the search budget is exhausted. Never returns null while a
 * legal move exists.
 */
export function findHint(
  slots: Slots,
  ropeCount: number,
  total: number,
  maxDepth = 4,
  nodeCap = 20000,
): Hint | null {
  const current = countCrossings(slots, ropeCount, total);
  if (current === 0) return null;

  const empty = slots.map((s, i) => (s === null ? i : -1)).filter((i) => i >= 0);
  const occupied = slots.map((s, i) => (s !== null ? i : -1)).filter((i) => i >= 0);
  if (!empty.length || !occupied.length) return null;

  const rootKey = slotKey(slots);
  const parents = new Map<string, { prev: string; move: Hint }>();
  parents.set(rootKey, { prev: '', move: { from: -1, to: -1 } });

  let frontier: Slots[] = [slots];
  let targetKey: string | null = null;

  for (let depth = 0; depth < maxDepth && !targetKey; depth++) {
    const next: Slots[] = [];
    for (const s of frontier) {
      if (depth > 0 && countCrossings(s, ropeCount, total) < current) {
        targetKey = slotKey(s);
        break;
      }
      for (const from of occupied) {
        if (s[from] === null) continue;
        for (const to of empty) {
          if (s[to] !== null) continue;
          const child = applyMove(s, from, to);
          const k = slotKey(child);
          if (!parents.has(k)) {
            parents.set(k, { prev: slotKey(s), move: { from, to } });
            next.push(child);
          }
        }
      }
      if (parents.size > nodeCap) break;
    }
    frontier = next;
    if (parents.size > nodeCap || !frontier.length) break;
  }

  if (targetKey) {
    // walk the parent chain back to the first move from the root
    let key = targetKey;
    let node = parents.get(key)!;
    while (node.prev !== rootKey) {
      key = node.prev;
      node = parents.get(key)!;
    }
    return node.move;
  }

  // fallback: single legal move that minimizes crossings
  let best: Hint | null = null;
  let bestScore = current;
  for (const from of occupied) {
    for (const to of empty) {
      const score = countCrossings(applyMove(slots, from, to), ropeCount, total);
      if (score <= bestScore) {
        bestScore = score;
        best = { from, to };
      }
    }
  }
  return best;
}

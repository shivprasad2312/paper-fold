// ─────────────────────────────────────────────────────────────
// Pure puzzle logic — no level data, no DOM. Works on any set of
// 2D points, so it supports every board shape equally.
// ─────────────────────────────────────────────────────────────

import { Pt } from './shapes';

export type Slots = (number | null)[]; // slot -> ropeId (or null = empty hole)
export type { Pt };

export interface Hint {
  from: number;
  to: number;
}

export interface Crossing {
  ropeA: number;
  ropeB: number;
  point: Pt;
  /** rope id that visually passes OVER the other at this crossing */
  over: number;
}

// ── geometry ─────────────────────────────────────────────────

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

function intersectionPoint(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-12) return { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  return { x: p1.x + d1x * t, y: p1.y + d1y * t };
}

// ── crossings / twists ───────────────────────────────────────

export function ropeEndpoints(ropeId: number, slots: Slots): [number, number] | null {
  const found: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === ropeId) found.push(i);
  }
  return found.length === 2 ? [found[0], found[1]] : null;
}

function ropeSegments(slots: Slots, ropeCount: number, points: Pt[]): [Pt, Pt][] {
  const out: [Pt, Pt][] = [];
  for (let r = 0; r < ropeCount; r++) {
    const ep = ropeEndpoints(r, slots);
    if (!ep) continue;
    out.push([points[ep[0]], points[ep[1]]]);
  }
  return out;
}

export function countCrossings(slots: Slots, ropeCount: number, points: Pt[]): number {
  const segs = ropeSegments(slots, ropeCount, points);
  let n = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (segmentsCross(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) n++;
    }
  }
  return n;
}

/** All crossings with an over/under assignment (deterministic alternation). */
export function findCrossings(slots: Slots, ropeCount: number, points: Pt[]): Crossing[] {
  const result: Crossing[] = [];
  for (let i = 0; i < ropeCount; i++) {
    const epA = ropeEndpoints(i, slots);
    if (!epA) continue;
    for (let j = i + 1; j < ropeCount; j++) {
      const epB = ropeEndpoints(j, slots);
      if (!epB) continue;
      const a1 = points[epA[0]];
      const a2 = points[epA[1]];
      const b1 = points[epB[0]];
      const b2 = points[epB[1]];
      if (segmentsCross(a1, a2, b1, b2)) {
        // alternate over/under by rope-id parity so multi-twists read as weaving
        const over = (i + j) % 2 === 0 ? i : j;
        result.push({ ropeA: i, ropeB: j, point: intersectionPoint(a1, a2, b1, b2), over });
      }
    }
  }
  return result;
}

export function isSolved(slots: Slots, ropeCount: number, points: Pt[]): boolean {
  return countCrossings(slots, ropeCount, points) === 0;
}

// ── moves ────────────────────────────────────────────────────

export function applyMove(slots: Slots, from: number, to: number): Slots {
  if (slots[from] === null || slots[to] !== null) return slots;
  const next = slots.slice();
  next[to] = next[from];
  next[from] = null;
  return next;
}

const slotKey = (s: Slots) => s.map((v) => (v === null ? '_' : v)).join(',');

/**
 * BFS hint: first step of the shortest path toward a state with fewer
 * crossings (often fully solved). Falls back to the best greedy move.
 */
export function findHint(
  slots: Slots,
  ropeCount: number,
  points: Pt[],
  maxDepth = 4,
  nodeCap = 20000,
): Hint | null {
  const current = countCrossings(slots, ropeCount, points);
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
      if (depth > 0 && countCrossings(s, ropeCount, points) < current) {
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
    let key = targetKey;
    let node = parents.get(key)!;
    while (node.prev !== rootKey) {
      key = node.prev;
      node = parents.get(key)!;
    }
    return node.move;
  }

  let best: Hint | null = null;
  let bestScore = current;
  for (const from of occupied) {
    for (const to of empty) {
      const score = countCrossings(applyMove(slots, from, to), ropeCount, points);
      if (score <= bestScore) {
        bestScore = score;
        best = { from, to };
      }
    }
  }
  return best;
}

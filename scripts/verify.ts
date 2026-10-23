// Engine verification across all generated levels.
import {
  LEVEL_COUNT,
  buildLevel,
  applyMove,
  findHint,
  isSolved,
  countCrossings,
  findCrossings,
  Slots,
} from '../src/game/engine';
import { ALL_SHAPES } from '../src/game/shapes';

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ FAIL:', msg);
  }
};

// shape coverage
const shapesUsed = new Set(Array.from({ length: LEVEL_COUNT }, (_, i) => buildLevel(i).def.shape));
assert(shapesUsed.size >= 10, `uses 10+ distinct shapes (got ${shapesUsed.size})`);
for (const shape of ALL_SHAPES) {
  assert(shapesUsed.has(shape), `shape "${shape}" appears in at least one level`);
}

for (let i = 0; i < LEVEL_COUNT; i++) {
  const level = buildLevel(i);
  const rc = level.ropes.length;
  const pts = level.points;

  assert(pts.length === level.def.total, `L${i + 1}: point count matches total slots`);
  assert(countCrossings(level.start, rc, pts) > 0, `L${i + 1}: starts with twists`);
  const empties = level.start.filter((s) => s === null).length;
  assert(empties >= 2, `L${i + 1}: at least two empty holes`);
  const used = new Set(level.start.filter((s): s is number => s !== null));
  assert(used.size === rc, `L${i + 1}: every rope has two pegs`);

  // crossing/weave data agrees with the counter
  assert(findCrossings(level.start, rc, pts).length === countCrossings(level.start, rc, pts),
    `L${i + 1}: weave list matches twist count`);

  // solved state is clean
  const solved: Slots = new Array(level.def.total).fill(null);
  level.def.pairs.forEach(([a, b], id) => {
    solved[a] = id;
    solved[b] = id;
  });
  assert(isSolved(solved, rc, pts), `L${i + 1}: reference solution is twist-free`);

  // solvable via the in-game hint policy
  let slots: Slots = level.start.slice();
  let steps = 0;
  while (!isSolved(slots, rc, pts) && steps < 400) {
    const h = findHint(slots, rc, pts);
    if (!h) break;
    slots = applyMove(slots, h.from, h.to);
    steps++;
  }
  assert(isSolved(slots, rc, pts), `L${i + 1}: solvable via hints (${steps} moves)`);
}

// illegal moves are no-ops
const l0 = buildLevel(0);
const fresh = l0.start.slice();
const emptySlot = fresh.findIndex((s) => s === null);
const occupiedSlot = fresh.findIndex((s) => s !== null);
assert(applyMove(fresh, emptySlot, occupiedSlot) === fresh, 'move from empty hole is a no-op');
assert(applyMove(fresh, occupiedSlot, occupiedSlot) === fresh, 'move onto occupied hole is a no-op');

console.log(failures ? `\n${failures} failure(s)` : `\nAll ${LEVEL_COUNT} levels verified ✅`);
process.exit(failures ? 1 : 0);

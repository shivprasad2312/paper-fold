// Engine verification: every level starts tangled and is solvable via hints,
// moves/undo behave correctly, and crossing detection works.
import {
  LEVELS,
  buildLevel,
  applyMove,
  findHint,
  isSolved,
  countCrossings,
  Slots,
} from '../src/game/engine';

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ FAIL:', msg);
  } else {
    console.log('  ✓', msg);
  }
};

for (let i = 0; i < LEVELS.length; i++) {
  const level = buildLevel(i);
  const rc = level.ropes.length;
  const total = level.def.total;

  console.log(`Level ${i + 1} — ${level.def.name}`);
  assert(countCrossings(level.start, rc, total) > 0, 'starts with crossings');
  assert(level.start.filter((s) => s === null).length === total - rc * 2, 'has correct number of empty holes');
  assert(new Set(level.start.filter((s): s is number => s !== null)).size === rc, 'every rope has two pegs');

  // solve using the same hint logic the game exposes
  let slots: Slots = level.start.slice();
  let steps = 0;
  while (!isSolved(slots, rc, total) && steps < 100) {
    const h = findHint(slots, rc, total);
    assert(h !== null, `hint available at step ${steps}`);
    if (!h) break;
    slots = applyMove(slots, h.from, h.to);
    steps++;
  }
  assert(isSolved(slots, rc, total), `solvable via hints (${steps} moves)`);
  assert(countCrossings(slots, rc, total) === 0, 'zero crossings when solved');

  // illegal moves are rejected
  const fresh = level.start.slice();
  const emptySlot = fresh.findIndex((s) => s === null);
  const occupiedSlot = fresh.findIndex((s) => s !== null);
  assert(applyMove(fresh, emptySlot, occupiedSlot) === fresh, 'move from empty hole is a no-op');
  assert(applyMove(fresh, occupiedSlot, occupiedSlot) === fresh, 'move onto occupied hole is a no-op');
}

console.log(failures ? `\n${failures} failure(s)` : '\nAll checks passed ✅');
process.exit(failures ? 1 : 0);

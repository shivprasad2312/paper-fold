// ─────────────────────────────────────────────────────────────
// Level-facing engine: data-driven levels + pure core logic.
// ─────────────────────────────────────────────────────────────

import { Pt, ShapeKind, sampleSlots } from './shapes';
import { LEVEL_DATA, LevelData } from './levels.data';
import { Slots, Hint, Crossing } from './engine-core';

export type { Slots, Pt, ShapeKind, Hint, Crossing };
export {
  applyMove,
  countCrossings,
  findCrossings,
  findHint,
  isSolved,
  ropeEndpoints,
} from './engine-core';

export interface RopeDef {
  a: number;
  b: number;
  color: string;
}

export interface Level {
  def: LevelData;
  ropes: RopeDef[];
  points: Pt[];
  start: Slots;
}

export const LEVEL_COUNT = LEVEL_DATA.length;

export function buildLevel(index: number): Level {
  const def = LEVEL_DATA[index];
  const points = sampleSlots(def.shape, def.total);
  const ropes: RopeDef[] = def.pairs.map(([a, b], i) => ({
    a,
    b,
    color: def.palette[i],
  }));
  return { def, ropes, points, start: def.start.slice() };
}

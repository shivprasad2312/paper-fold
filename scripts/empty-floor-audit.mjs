// Large, flat, mechanic-free rectangles are a presentation warning, not a
// claim that the level is unsolvable or that every plain tile is undesirable.
import { parseLevel, mechanicTiles, key } from '../src/rules.js';

export function emptyFloorRectangles(def) {
  const level = parseLevel(def);
  const occupied = mechanicTiles(level);
  for (const t of [level.start, level.goal, ...(level.shards || [])]) occupied.add(key(t.x, t.z));
  const found = [];
  const H = def.map.length, W = Math.max(...def.map.map(r => r.length));
  // Enumerate maximal horizontal runs for each vertical interval. Both
  // dimensions >= 3 distinguish empty plazas from intentional safe corridors.
  for (let top = 0; top < H; top++) {
    for (let bottom = top + 2; bottom < H; bottom++) {
      let start = 0, previous = null;
      const flush = (end) => {
        const w = end - start, h = bottom - top + 1;
        if (Math.min(w, h) >= 3 && Math.max(w, h) >= 8 && w * h >= 32)
          found.push({ x: start, z: top, w, h, area: w * h });
      };
      for (let x = 0; x <= W; x++) {
        const c = def.map[top]?.[x];
        const valid = c >= '0' && c <= '9' && Array.from({length: bottom-top+1}, (_, i) => top+i)
          .every(z => def.map[z]?.[x] === c && !occupied.has(key(x,z)));
        if (!valid || c !== previous) { flush(x); start = x; }
        if (!valid) start = x + 1;
        previous = valid ? c : null;
      }
    }
  }
  return found.sort((a,b) => b.area-a.area).filter((r,i,all) =>
    !all.slice(0,i).some(s => s.x<=r.x && s.z<=r.z && s.x+s.w>=r.x+r.w && s.z+s.h>=r.z+r.h));
}

// Upper bound, not a claim of aesthetic quality: a blank 8×12 plaza is
// already too large. Smaller landings remain warnings for human review.
export const MAX_EMPTY_FLOOR_AREA = 96;
export function emptyFloorProblems(def) {
  const largest = emptyFloorRectangles(def)[0];
  return largest?.area >= MAX_EMPTY_FLOOR_AREA
    ? [`empty flat terrace ${largest.w}×${largest.h} (${largest.area} tiles) at ${largest.x},${largest.z}; carve connections instead of padding floor`]
    : [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { LEVELS, VAULT_LEVELS } = await import('../src/levels.js');
  const rows = [...LEVELS, ...VAULT_LEVELS].map(d => ({id:d.id,name:d.name,rectangles:emptyFloorRectangles(d)})).filter(r=>r.rectangles.length);
  console.log(JSON.stringify(rows, null, 2));
}

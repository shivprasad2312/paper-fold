// Headless render check: draws a board to a PNG so visuals can be inspected.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { buildLevel, findHint, applyMove, isSolved, countCrossings, LEVELS } from '../src/game/engine';
import { drawScene } from '../src/game/render';

const levelIdx = Number(process.argv[2] ?? 2);
const mode = process.argv[3] ?? 'scrambled'; // scrambled | solved | hint

const level = buildLevel(levelIdx);
const size = 900;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');
const sceneCanvas = createCanvas(size, size);
const sceneCtx = sceneCanvas.getContext('2d');

// composite over the linen background, like the browser page
const bg = await loadImage('public/bg.jpg');
const scale = Math.max(size / bg.width, size / bg.height);
const bw = bg.width * scale;
const bh = bg.height * scale;
ctx.drawImage(bg, (size - bw) / 2, (size - bh) / 2, bw, bh);

let slots = level.start;
if (mode === 'solved') {
  slots = new Array(level.def.total).fill(null);
  level.def.pairs.forEach(([a, b], id) => {
    slots[a] = id;
    slots[b] = id;
  });
}

const hint = mode === 'hint' ? findHint(slots, level.ropes.length, level.def.total) : null;

drawScene(sceneCtx, {
  size,
  total: level.def.total,
  slots,
  ropes: level.ropes,
  selected: hint ? hint.from : mode === 'scrambled' ? level.start.findIndex((s) => s !== null) : null,
  hint,
  anim: null,
  won: mode === 'solved',
  time: 1000,
});
ctx.drawImage(sceneCanvas, 0, 0);

const out = `scripts/shot-${mode}-lvl${levelIdx + 1}.png`;
writeFileSync(out, canvas.toBuffer('image/png'));
console.log('wrote', out);
console.log('crossings:', countCrossings(slots, level.ropes.length, level.def.total));
console.log('solved:', isSolved(slots, level.ropes.length, level.def.total));

// greedy-hint solvability check across all levels
for (let i = 0; i < LEVELS.length; i++) {
  const l = buildLevel(i);
  let s = l.start;
  let steps = 0;
  const cap = 500;
  while (!isSolved(s, l.ropes.length, l.def.total) && steps < cap) {
    const h = findHint(s, l.ropes.length, l.def.total);
    if (!h) break;
    s = applyMove(s, h.from, h.to);
    steps++;
  }
  console.log(
    `level ${i + 1}: ${isSolved(s, l.ropes.length, l.def.total) ? 'SOLVABLE' : 'FAILED'} in ${steps} hint steps`,
  );
}

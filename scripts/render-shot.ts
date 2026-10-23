// Headless render check: draws a board to a PNG so visuals can be inspected.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { buildLevel, findHint, isSolved, countCrossings, findCrossings, LEVEL_COUNT } from '../src/game/engine';

const levelId = Number(process.argv[2] ?? 0);
const mode = process.argv[3] ?? 'scrambled'; // scrambled | solved | hint

const level = buildLevel(levelId);
const size = 900;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');
const sceneCanvas = createCanvas(size, size);
const sceneCtx = sceneCanvas.getContext('2d');

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

const hint = mode === 'hint' ? findHint(slots, level.ropes.length, level.points) : null;

const { drawScene } = await import('../src/game/render');
drawScene(sceneCtx, {
  size,
  shape: level.def.shape,
  points: level.points,
  slots,
  ropes: level.ropes,
  crossings: findCrossings(slots, level.ropes.length, level.points),
  selected: hint ? hint.from : mode === 'scrambled' ? level.start.findIndex((s) => s !== null) : null,
  hint,
  anim: null,
  won: mode === 'solved',
  time: 1000,
});
ctx.drawImage(sceneCanvas, 0, 0);

const out = `scripts/shot-${mode}-lvl${levelId + 1}.png`;
writeFileSync(out, canvas.toBuffer('image/png'));
console.log('wrote', out, '· shape:', level.def.shape, '· twists:', countCrossings(slots, level.ropes.length, level.points));

if (process.argv[4] === '--verify-all') {
  let fails = 0;
  for (let i = 0; i < LEVEL_COUNT; i++) {
    const l = buildLevel(i);
    let s = l.start;
    let steps = 0;
    while (!isSolved(s, l.ropes.length, l.points) && steps < 400) {
      const h = findHint(s, l.ropes.length, l.points);
      if (!h) break;
      s = (s = (await import('../src/game/engine')).applyMove(s, h.from, h.to));
      steps++;
    }
    if (!isSolved(s, l.ropes.length, l.points)) {
      fails++;
      console.log(`  ✗ level ${i + 1} NOT solvable via hints`);
    }
  }
  console.log(fails ? `${fails} failures` : `all ${LEVEL_COUNT} levels solvable via hints ✅`);
}

// Offscreen render harness: draws the real game canvas in Node so we can eyeball
// the art without a browser. Not part of the shipped app.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';

const W = Number(process.env.W || 430);
const H = Number(process.env.H || 860);
const TAG = process.env.TAG || '';
const DPR = 2;

global.window = {
  devicePixelRatio: DPR,
  addEventListener() {},
  ResizeObserver: undefined,
};

class FakeCanvas {
  constructor() {
    this.cssW = W;
    this.cssH = H;
    this.dpr = DPR;
    this.inner = createCanvas(W * DPR, H * DPR);
  }
  get width() {
    return this.inner.width;
  }
  set width(v) {
    this.inner.width = v;
  }
  get height() {
    return this.inner.height;
  }
  set height(v) {
    this.inner.height = v;
  }
  getContext(type) {
    return this.inner.getContext(type);
  }
  getBoundingClientRect() {
    return { width: this.cssW, height: this.cssH, left: 0, top: 0, right: this.cssW, bottom: this.cssH };
  }
  toBuffer(...args) {
    return this.inner.toBuffer(...args);
  }
}

global.document = {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error('unexpected element ' + tag);
    return createCanvas(300, 150);
  },
};

const { Game } = await import('./src/game.js');
const { Renderer } = await import('./src/renderer.js');
const { FRUITS } = await import('./src/fruits.js');

const canvas = new FakeCanvas();
const game = new Game();
const renderer = new Renderer(canvas, game);
renderer.setShowAim(true);

// mirror the presentation hooks that main.js wires up
game.on('merge', ({ tier, x, y, points, combo }) => {
  game.effects.push({
    kind: 'merge', tier, x, y, points, combo, t: 0, dur: 640,
    seed: Math.floor(Math.random() * 1e6),
  });
  renderer.bump(2 + tier * 0.55);
});

function step(ms) {
  game.update(ms);
}
function settle(seconds = 1) {
  for (let i = 0; i < seconds * 60; i++) step(1000 / 60);
}

// ---- scene 1: quiet jar with a small pile --------------------------------
let t = 0;
const dropAt = (x) => {
  const r = game.drop(x, t);
  settle(0.55);
  return r;
};
dropAt(120);
dropAt(250);
dropAt(180);
dropAt(60);
settle(1.2);
renderer.setAim(210);
renderer.render(16);
fs.writeFileSync(`preview-jar${TAG}.png`, canvas.toBuffer('image/png'));

// ---- scene 2: busy mid-game with many tiers ------------------------------
const seq = [200, 60, 300, 150, 250, 90, 320, 40, 210, 140];
for (let i = 0; i < 26; i++) {
  t += 400;
  game.drop(seq[i % seq.length] + (i % 3) * 12, t);
  settle(0.6);
}
settle(1.4);
renderer.setAim(190);
renderer.render(16);
fs.writeFileSync(`preview-game${TAG}.png`, canvas.toBuffer('image/png'));

// ---- scene 3: sprite sheet -----------------------------------------------
const sheet = createCanvas(1140, 640);
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#f6ecda';
sctx.fillRect(0, 0, 1140, 640);
renderer.sprites.forEach((s, i) => {
  const col = i % 6;
  const row = Math.floor(i / 6);
  const size = 170;
  const x = 18 + col * 188;
  const y = 20 + row * 300;
  sctx.drawImage(s.canvas, x, y, size, size);
  sctx.fillStyle = '#5a4632';
  sctx.font = '600 15px sans-serif';
  sctx.textAlign = 'center';
  sctx.fillText(FRUITS[i].name, x + size / 2, y + 200);
  sctx.fillStyle = '#a58d70';
  sctx.font = '600 11px sans-serif';
  sctx.fillText('tier ' + i, x + size / 2, y + 218);
});
fs.writeFileSync(`preview-sprites${TAG}.png`, sheet.toBuffer('image/png'));

// ---- scene 4: a merge in progress ---------------------------------------
{
  const g2 = new Game();
  const r2 = new Renderer(canvas, g2);
  r2.setShowAim(true);
  g2.on('merge', ({ tier, x, y, points, combo }) => {
    g2.effects.push({
      kind: 'merge', tier, x, y, points, combo, t: 0, dur: 640,
      seed: Math.floor(Math.random() * 1e6),
    });
    r2.bump(2 + tier * 0.55);
  });
  let t2 = 0;
  // build a pile, then drop pairs to force merges
  const spots = [110, 190, 250, 140, 300, 90, 220, 170, 260, 130];
  for (let i = 0; i < 22; i++) {
    t2 += 330;
    g2.drop(spots[i % spots.length], t2);
    for (let k2 = 0; k2 < 20; k2++) g2.update(1000 / 60);
  }
  // force a big merge so the burst is caught mid-flight
  const dupes = {};
  for (const f of g2.fruits) (dupes[f.tier] ||= []).push(f);
  const tierWithPair = Object.keys(dupes)
    .map(Number)
    .filter((t) => dupes[t].length >= 2)
    .sort((a, b) => b - a)[0];
  if (tierWithPair !== undefined) {
    g2.tryMerge(dupes[tierWithPair][0], dupes[tierWithPair][1]);
  }
  for (let k2 = 0; k2 < 6; k2++) g2.update(1000 / 60);
  r2.setAim(200);
  r2.render(1000 / 60);
  fs.writeFileSync(`preview-merge${TAG}.png`, canvas.toBuffer('image/png'));
  console.log('merge scene effects:', g2.effects.length, 'score', g2.score);
}

console.log('score', game.score, 'fruits', game.fruits.length, 'over', game.over);
console.log('fonts', GlobalFonts.families.slice(0, 5).map((f) => f.family).join(', '));

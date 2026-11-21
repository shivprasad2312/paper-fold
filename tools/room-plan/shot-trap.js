/* tools/room-plan/shot-trap.js — render one trap room to a PNG, with or without
   its answer drawn, so a room can be reviewed as a player would see it.

   node tools/room-plan/shot-trap.js <key> [--idle] [--seconds N] [out.png]
   `key` is the export name in traps.js (e.g. THE_MOAT) or the room id. */
'use strict';
const path = require('path');
const fs = require('fs');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { boot, poly, STEP, seed } = require('../simheadless');
const { levelOf } = require('./lib');
const TRAPS = require('./traps');

const HG = boot();
require(path.resolve(__dirname, '../../js/render.js'));
try {
  for (const w of [400, 500, 600, 700]) {
    GlobalFonts.registerFromPath(path.resolve(__dirname, `../../fonts/fredoka-latin-${w}-normal.woff2`), 'Fredoka');
  }
} catch (e) { /* fonts optional */ }

function keyOf(arg) {
  if (TRAPS[arg] && TRAPS[arg].glasses) return arg;
  const byId = Object.keys(TRAPS).find((k) => TRAPS[k] && TRAPS[k].glasses && TRAPS[k].id === Number(arg));
  return byId || null;
}

// Render one room into its own canvas. `mode` is 'solved' or 'idle'.
function render(room, mode, seconds) {
  const CW = 1280, CH = 760;
  const canvas = createCanvas(CW, CH);
  const ctx = canvas.getContext('2d');
  const fake = { clientWidth: CW, clientHeight: CH, width: CW, height: CH, getContext: () => ctx };
  const renderer = new HG.Renderer(fake);
  renderer.dpr = 1;
  // Seed exactly as the proof harness does (1234 + id). Without this the render
  // shares a stray random stream with every other shot in the process and shows
  // a different run from the one that was proved.
  seed(1234 + room.id);
  const level = JSON.parse(JSON.stringify(levelOf(room)));
  // Review shots drop the tip caption: it fades at 5.2 s of scene time, but a
  // room that wins in 5 s is captured before then and the caption sits right on
  // top of the hazard we are trying to look at.
  delete level.tip;
  const scene = new HG.Scene(level);
  if (mode === 'solved') {
    const strokes = room.answers || [room.answer];
    for (const st of (strokes || []).filter(Boolean)) {
      const pts = poly(st);
      if (!pts.length) continue;
      // Draw exactly as the game does: a point the pen refuses is skipped, not
      // forced in. Drawing blocked points anyway produced a line the player can
      // never make, and it lost — which is how this was caught.
      scene.beginInk(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        if (scene.inkPointBlocked(pts[i].x, pts[i].y)) continue;
        scene.addInkPoint(pts[i].x, pts[i].y);
      }
      scene.endInk();
    }
  }
  scene.start();
  const frames = Math.round((seconds * 1000) / STEP);
  for (let i = 0; i < frames; i++) {
    scene.step(STEP); scene.physics(STEP);
    if (scene.state === 'won' || scene.state === 'lost') {
      if (scene.winTimer > 0.3 || scene.state === 'lost') break;
    }
  }
  const game = { levelId: room.id, level, scene, pointer: { active: false }, mode: 'play' };
  renderer.draw(game, 16.7);
  const fill = scene.glasses.map((g) => (g.spoiled ? 'SPOILED' : g.fill.toFixed(2))).join(' / ');
  // verification banner (review aid only — never part of the game)
  ctx.fillStyle = 'rgba(24,32,42,0.82)';
  ctx.fillRect(0, CH - 34, CW, 34);
  ctx.fillStyle = '#e8f0f6';
  ctx.font = '600 19px Fredoka, sans-serif';
  ctx.fillText(`${String(room.id).padStart(2)}  ${room.name}`, 14, CH - 11);
  ctx.fillStyle = scene.state === 'won' ? '#7ee08a' : (scene.state === 'lost' ? '#ff8f8f' : '#ffd166');
  ctx.fillText(`${mode.toUpperCase()}  ·  ${scene.state}  ·  fill ${fill}  ·  ink ${Math.round(scene.ink.used)}`, 300, CH - 11);
  return canvas;
}

module.exports = { render, keyOf, TRAPS };

if (require.main === module) {
  const args = process.argv.slice(2);
  const key = keyOf(args[0]);
  if (!key) { console.error('unknown room:', args[0]); process.exit(1); }
  const mode = args.includes('--idle') ? 'idle' : 'solved';
  const si = args.indexOf('--seconds');
  const seconds = si >= 0 ? parseFloat(args[si + 1]) : 26;
  const outArg = args.find((a, i) => a.endsWith('.png') && i > 0);
  const out = outArg || path.resolve(__dirname, `../../shots/verify/trap-${TRAPS[key].id}${mode === 'idle' ? '-idle' : ''}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(TRAPS[key], mode, seconds).toBuffer('image/png'));
  console.log('wrote', out);
}

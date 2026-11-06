/* tools/room-plan/sheet-trap.js — contact sheets of the trap rooms, for
   reviewing every room as a picture rather than as a number.

   node tools/room-plan/sheet-trap.js [--idle] [--per 6] [--out DIR] */
'use strict';
const path = require('path');
const fs = require('fs');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { render, TRAPS } = require('./shot-trap');

try {
  GlobalFonts.registerFromPath(path.resolve(__dirname, '../../fonts/fredoka-latin-600-normal.woff2'), 'Fredoka');
} catch (e) {}

const args = process.argv.slice(2);
const mode = args.includes('--idle') ? 'idle' : 'solved';
const pi = args.indexOf('--per');
const PER = pi >= 0 ? Number(args[pi + 1]) : 6;
const oi = args.indexOf('--out');
const OUT = oi >= 0 ? args[oi + 1] : path.resolve(__dirname, '../../shots/verify');

const rooms = Object.keys(TRAPS).filter((k) => TRAPS[k] && TRAPS[k].glasses)
  .map((k) => TRAPS[k]).sort((a, b) => a.id - b.id);

const CW = 640, CH = 380, COLS = PER === 6 ? 2 : 3;
const ROWS = Math.ceil(PER / COLS);
const CAP = 26;

fs.mkdirSync(OUT, { recursive: true });
const sheets = [];
for (let i = 0; i < rooms.length; i += PER) {
  const batch = rooms.slice(i, i + PER);
  const sheet = createCanvas(CW * COLS, (CH + CAP) * ROWS);
  const sctx = sheet.getContext('2d');
  sctx.fillStyle = '#1d242e';
  sctx.fillRect(0, 0, sheet.width, sheet.height);
  batch.forEach((room, j) => {
    const c = render(room, mode, 26);
    const x = (j % COLS) * CW, y = Math.floor(j / COLS) * (CH + CAP);
    sctx.drawImage(c, 0, 0, c.width, c.height, x, y, CW, CH);
    sctx.fillStyle = '#1d242e';
    sctx.fillRect(x, y + CH, CW, CAP);
    sctx.fillStyle = '#dfe8f0';
    sctx.font = '600 15px Fredoka, sans-serif';
    sctx.fillText(`${String(room.id).padStart(2)} ${room.name}  ·  ${room.verb}/${room.intent}  ·  ${mode}`, x + 8, y + CH + 18);
  });
  const file = path.join(OUT, `sheet-${mode}-${sheets.length + 1}.png`);
  fs.writeFileSync(file, sheet.toBuffer('image/png'));
  sheets.push(file);
  console.log('wrote', file, '(' + batch.map((r) => r.id).join(',') + ')');
}

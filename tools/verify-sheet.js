/* ==========================================================================
   tools/verify-sheet.js — every room copied from the reference sheet, played
   with its one authored solution.

   A room that cannot be completed is reported, never quietly patched: the
   sheet is the spec, and some of its cells have no tap at all. Rooms whose
   cell is empty, or whose cup no stroke can fill, are counted separately so
   the difference between "we have not found the line" and "this cell cannot
   be watered" stays visible.

   node tools/verify-sheet.js        all 135 rooms
   node tools/verify-sheet.js 62     one room (sheet number, 1..135)
   node tools/verify-sheet.js -v     all rooms, every line printed
   ========================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');
const SOLUTIONS = require('./solutions-sheet');

const HG = boot();
require(path.resolve(__dirname, '../js/levels-pdf.js'));

const args = process.argv.slice(2);
const verbose = args.includes('-v');
const only = args.find((a) => /^\d+$/.test(a)) ? parseInt(args.find((a) => /^\d+$/.test(a)), 10) : null;

const rows = [];

HG.PDF_LEVELS.forEach((lv, i) => {
  const n = i + 1;                       // the sheet's own room number
  if (only && n !== only) return;
  // a room with no tap can never be watered: say so instead of trying
  const tapLess = !lv.faucets.length;
  const noCup = !lv.glasses.length;
  const strokes = (SOLUTIONS[n] || []).map((pl) => poly(pl));
  const r = tapLess || noCup ? null : play(HG, lv.id, strokes, { frames: 60 * 40, patient: true });
  const won = !!r && r.won;
  const fill = r ? r.fills.map((f) => f.fill.toFixed(2) + '/' + f.need).join(' ') : '—';
  const line =
    String(n).padStart(3, ' ') + '. ' + (lv.name || '').padEnd(16, ' ') +
    (tapLess ? 'NO TAP' : noCup ? 'NO CUP' : won ? 'WON   ' : 'FAIL  ') +
    '  fill[' + fill + ']' +
    '  taps ' + lv.faucets.length +
    '  cups ' + lv.glasses.length +
    (r ? '  ' + (r.state || '') + '  ' + r.seconds + 's  ink ' + Math.round(r.inkUsed) + '/' + r.budget : '');
  rows.push({ n, won, tapLess, noCup, line, r });
  if (only || verbose || !won) console.log(line);
  if (r && r.errors.length) console.log('     ' + r.errors.slice(0, 3).join(', '));
});

const total = rows.length;

if (!only) {
  const wonCount = rows.filter((r) => r.won).length;
  const noTap = rows.filter((r) => r.tapLess);
  const noCup = rows.filter((r) => r.noCup);
  const lost = rows.filter((r) => !r.won && !r.tapLess && !r.noCup);
  console.log('\n' + wonCount + '/' + total + ' sheet rooms solvable with their solution');
  if (noTap.length) console.log(noTap.length + ' rooms have no tap on the sheet: ' + noTap.map((r) => r.n).join(' '));
  if (noCup.length) console.log(noCup.length + ' rooms have no cup: ' + noCup.map((r) => r.n).join(' '));
  if (lost.length) {
    console.log(lost.length + ' rooms with a tap are not yet solved:');
    console.log('  ' + lost.map((r) => r.n).join(' '));
  }

  // Machine-readable summary, so a later pass can diff against this one.
  const out = process.env.SHEET_REPORT || path.resolve(__dirname, '../.sheet-report.json');
  fs.writeFileSync(out, JSON.stringify({
    at: new Date().toISOString(),
    total, won: wonCount,
    noTap: noTap.map((r) => r.n),
    noCup: noCup.map((r) => r.n),
    unsolved: lost.map((r) => r.n),
    fillOf: rows.filter((r) => r.r).map((r) => ({ n: r.n, fill: r.r.fills.map((f) => +f.fill.toFixed(2)) })),
  }, null, 1));
  if (lost.length) process.exit(1);
}

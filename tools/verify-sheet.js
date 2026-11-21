/* ==========================================================================
   tools/verify-sheet.js — every room copied from the reference sheet, played
   with its one authored solution. A room that cannot be completed is reported
   as unwinnable rather than quietly left failing: the sheet is the spec, and
   some of its cells have no tap at all.

   node tools/verify-sheet.js        all 135 rooms
   node tools/verify-sheet.js 62     one room (sheet number, 1..135)
   ========================================================================== */
'use strict';
const path = require('path');
const { boot, play, poly } = require('./simheadless');
const SOLUTIONS = require('./solutions-sheet');

const HG = boot();
require(path.resolve(__dirname, '../js/levels-pdf.js'));

const only = process.argv[2] ? parseInt(process.argv[2], 10) : null;

const rows = [];
let fails = 0;
let unsolvable = 0;

HG.PDF_LEVELS.forEach((lv, i) => {
  const n = i + 1;                       // the sheet's own room number
  if (only && n !== only) return;
  // a room with no tap can never be watered: say so instead of trying
  const tapLess = !lv.faucets.length;
  const strokes = (SOLUTIONS[n] || []).map((pl) => poly(pl));
  const r = tapLess ? null : play(HG, lv.id, strokes, { frames: 60 * 40 });
  const won = !!r && r.won;
  if (tapLess) unsolvable++;
  else if (!won) fails++;
  const fill = r ? r.fills.map((f) => f.fill.toFixed(2) + '/' + f.need).join(' ') : '—';
  const line =
    String(n).padStart(3, ' ') + '. ' + (lv.name || '').padEnd(16, ' ') +
    (tapLess ? 'NO TAP' : won ? 'WON   ' : 'FAIL  ') +
    '  fill[' + fill + ']' +
    '  taps ' + lv.faucets.length +
    '  cups ' + lv.glasses.length +
    (r ? '  ' + (r.state || '') + '  ' + r.seconds + 's  ink ' + Math.round(r.inkUsed) + '/' + r.budget : '');
  rows.push({ n, won, tapLess, line });
  if (only || !won || tapLess) console.log(line);
  if (!won && !tapLess && r.errors.length) console.log('     ' + r.errors.slice(0, 3).join(', '));
});

const total = rows.length;

if (!only) {
  const wonCount = rows.filter((r) => r.won).length;
  const noTap = rows.filter((r) => r.tapLess).length;
  const lost = rows.filter((r) => !r.won && !r.tapLess);
  console.log('\n' + wonCount + '/' + total + ' sheet rooms solvable with their solution');
  console.log(noTap + ' rooms have no tap on the sheet (cannot be watered)');
  if (lost.length) {
    console.log(lost.length + ' rooms with a tap are not yet solved:');
    console.log('  ' + lost.map((r) => r.n).join(' '));
  }
  if (lost.length) process.exit(1);
}

/* ==========================================================================
   tools/flaky.js — how much hand does a level tolerate?

   The pour is deterministic (see tools/simheadless.js), so replaying identical
   coordinates proves nothing. What a player actually does is draw the same
   shape a little differently, so every run here is a different hand: the wire
   keeps its length and its ends, and every point along it drifts a couple of
   pixels on a slow wave.

   The game is chaotic — water is 300 loose droplets and a level decides its
   answer by where the last few land — so "wins on every hand" is not a test any
   Honest level can pass. What is worth gating:

     a firm hand   ±2.4 px  · 4 hands  · at least 3 must win
     a light hand  ±1.2 px  · 1 hand   · reported, not gated

   A level that cannot stand a 2.4 px wobble is a level that asks the player to
   trace, not to think, and those get rebuilt.

   node tools/flaky.js [runs]
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const runs = parseInt(process.argv[2] || '4', 10);
const FIRM = 2.4;
const LIGHT = 1.2;
const NEED = 3;                                    // of `runs` firm hands
const HG = boot();

const hand = (pts, amp, run) => poly(pts.map((p, i) => [
  p[0] + Math.cos(run * 2.1 + i * 0.7) * amp,
  p[1] + Math.sin(run * 1.3 + i * 0.5) * amp,
]), 8);

const rows = [];
for (const lv of HG.LEVELS) {
  const sol = SOLUTIONS[lv.id] || [];
  const own = play(HG, lv.id, sol.map(poly), { frames: 60 * 30 });
  let won = 0;
  const worst = [];
  for (let run = 0; run < runs; run++) {
    const r = play(HG, lv.id, sol.map((s) => hand(s, FIRM, run)), { frames: 60 * 30 });
    if (r.won) won++;
    worst.push(r.fills[0].fill);
  }
  const light = play(HG, lv.id, sol.map((s) => hand(s, LIGHT, 7)), { frames: 60 * 30 });
  rows.push({ id: lv.id, name: lv.name, own: own.won, won, worst: Math.min(...worst), light: light.won });
}

const bad = rows.filter((r) => !r.own || r.won < NEED);
console.log('tolerance of the reference line, ' + rows.length + ' levels');
console.log('  firm hand ±' + FIRM + 'px, ' + runs + ' hands, need ' + NEED + ': ' +
  rows.filter((r) => r.won >= NEED).length + '/' + rows.length);
console.log('  light hand ±' + LIGHT + 'px, 1 hand: ' +
  rows.filter((r) => r.light).length + '/' + rows.length);
console.log('  reference line replays clean: ' + rows.filter((r) => r.own).length + '/' + rows.length);
if (bad.length) {
  console.log('\nneeds a rebuild (they ask the player to trace, not to think):');
  bad.forEach((r) => console.log('  L' + String(r.id).padStart(2) + ' ' + r.name.padEnd(18) +
    ' own ' + (r.own ? 'win' : 'LOSS') + '  firm ' + r.won + '/' + runs +
    '  worst fill ' + r.worst.toFixed(2) + '  light ' + (r.light ? 'win' : 'loss')));
}
process.exit(bad.length ? 1 : 0);

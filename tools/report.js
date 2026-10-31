/* ==========================================================================
   tools/report.js — where a level is likely to bite a HUMAN hand.

   The solver proves one thing: a line exists, and it survives six twitchy
   hands and four human ones. That is not the same as "this room will feel fair
   when someone plays it", because a human also misses by more, draws shorter,
   and knocks the glass. So this prints the risk profile of every level:

     fill      what the reference line lands, against what the glass needs
     wobble    how many of four ±2.4 px hands still win
     light     does one ±1.2 px hand still win
     slop      the most the stroke may stop early, as a % of its length, and
               still win — the commonest human error is drawing short, and a
               solver never makes it
     over      the furthest the stroke may overshoot, in px, and still win
     glass     how far the glass moved / how far it leans at the end. A glass
               that is quietly sliding is a second failure the player cannot see
               coming
     lost      droplets that left the level: water thrown away (frustration)
     secs      when the reference line actually wins

   Levels are sorted worst-first, so the top of the list is where to look.

   node tools/report.js [--md]
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const SOLUTIONS = require('./solutions');

const MD = process.argv.includes('--md');
const HG = boot();
// stop early / overshoot: the two mistakes a hand makes that a search does not
const trim = (pl, cut, extend) => {
  const pts = pl.map((p) => [p[0], p[1]]);
  if (!pts.length) return poly(pts);
  if (extend) {
    const a = pts[pts.length - 2] || pts[0], b = pts[pts.length - 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    return poly(pts.concat([[b[0] + (dx / d) * 40, b[1] + (dy / d) * 40]]));
  }
  // cut `cut` of the total length off the far end
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let want = total * cut;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (seg >= want && want > 0) {
      const t = want / seg;
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
      return poly(out);
    }
    want -= seg;
    out.push(pts[i]);
  }
  return poly(out);
};

const hand = (pts, amp, run) => poly(pts.map((p, i) => [
  p[0] + Math.cos(run * 2.1 + i * 0.7) * amp,
  p[1] + Math.sin(run * 1.3 + i * 0.5) * amp,
]), 8);

const rows = [];
for (const lv of HG.LEVELS) {
  const sol = SOLUTIONS[lv.id] || [];
  const own = play(HG, lv.id, sol.map(poly), { frames: 60 * 30 });
  let wob = 0;
  for (let r = 0; r < 4; r++) {
    if (play(HG, lv.id, sol.map((s) => hand(s, 2.4, r)), { frames: 60 * 30 }).won) wob++;
  }
  const light = play(HG, lv.id, sol.map((s) => hand(s, 1.2, 7)), { frames: 60 * 30 });
  // How much slop does the endpoint actually have? Bisected on the two mistakes
  // a human makes that no search makes: stopping early, and going over.
  let slop = 0;
  for (const t of [0.10, 0.07, 0.05, 0.03, 0.015]) {
    if (play(HG, lv.id, sol.map((s) => trim(s, t, false)), { frames: 60 * 30 }).won) { slop = Math.round(t * 100); break; }
  }
  let over = 0;
  for (const px of [80, 50, 30, 18, 8]) {
    if (play(HG, lv.id, sol.map((s) => trim(s, 0, px)), { frames: 60 * 30 }).won) { over = px; break; }
  }
  const g0 = own.glasses[0] || { x: 0, y: 0 };
  const g1 = (own.fills && own.fills[0]) || {};
  rows.push({
    id: lv.id,
    name: lv.name,
    won: own.won,
    fill: g1.fill == null ? 0 : g1.fill,
    need: g1.need == null ? 0 : g1.need,
    spare: g1.count == null || g1.needCount == null ? 0 : g1.count - g1.needCount,
    wob, light: light.won, slop, over,
    lean: own.glasses && own.glasses[0] ? Math.round(Math.abs(own.glasses[0].angle || 0) * 100) / 100 : 0,
    moved: own.glasses && own.glasses[0] ? Math.round(Math.hypot(own.glasses[0].x - lv.glasses[0].x, own.glasses[0].y - lv.glasses[0].y)) : 0,
    lost: own.removed ? own.removed.length : 0,
    secs: own.seconds,
    ink: Math.round(own.inkUsed), budget: own.budget,
    g0x: g0.x,
  });
}

// risk: a level is riskier the fewer hands survive and the fewer droplets spare
const risk = (r) => (4 - r.wob) * 10 + (r.light ? 0 : 8) + (r.over === 0 ? 4 : 0) +
  (r.moved > 8 ? 6 : 0) + (r.lost > 30 ? 4 : 0) + (r.won ? 0 : 100);
rows.sort((a, b) => risk(b) - risk(a) || a.spare - b.spare);

const flag = (r) => {
  const f = [];
  if (!r.won) f.push('**reference line no longer wins**');
  if (r.wob < 3) f.push('needs a steady hand');
  if (!r.light) f.push('fails a 1 px wobble');
  // `slop` and `over` are printed but never gated: the end of the stroke is what
  // aims the water in every level of this game, so a shorter line always lands
  // somewhere else. They are only useful as a comparison between rooms — an
  // overshoot of 0 px means the answer is a point, not a line.
  if (r.won && r.over === 0) f.push('no overshoot margin at all');
  if (r.moved > 8) f.push('glass slides ' + r.moved + ' px');
  if (r.lean > 0.06) f.push('glass leans ' + r.lean.toFixed(2) + ' rad');
  if (r.lost > 30) f.push(r.lost + ' droplets lost');
  return f.join('; ');
};

if (MD) {
  console.log('| # | Level | fill / need | hands /4 | 1 px | stops early | overshoot | glass | lost | verdict |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  rows.forEach((r) => {
    console.log('| ' + r.id + ' | ' + r.name + ' | ' + r.fill.toFixed(2) + ' / ' + r.need +
      ' | ' + r.wob + ' | ' + (r.light ? 'ok' : '**miss**') +
      ' | ' + (r.slop ? r.slop + '%' : '**0%**') + ' | ' + (r.over ? r.over + ' px' : '**0**') +
      ' | ' + (r.moved ? r.moved + ' px' : 'still') + ' | ' + r.lost +
      ' | ' + (flag(r) || 'clean') + ' |');
  });
} else {
  rows.forEach((r) => {
    console.log(String(r.id).padStart(2) + ' ' + r.name.padEnd(18) +
      (r.won ? 'win ' : 'LOSS') +
      ' fill ' + r.fill.toFixed(2) + '/' + r.need +

      ' hands ' + r.wob + '/4' +
      ' light ' + (r.light ? 'ok' : 'MISS') +
      ' slop ' + String(r.slop).padStart(2) + '%' +
      ' over ' + String(r.over).padStart(2) + 'px' +
      ' glass ' + (r.moved ? r.moved + 'px' : 'still') +
      ' lost ' + String(r.lost).padStart(2) +
      ' ' + r.secs + 's' +
      (flag(r) ? '  << ' + flag(r) : ''));
  });
}
const bad = rows.filter((r) => !r.won || r.wob < 3 || !r.light || r.moved > 8 || r.lost > 30);
console.log('\n' + rows.length + ' levels, ' + bad.length + ' flagged for a human look');

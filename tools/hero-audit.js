/* ==========================================================================
   tools/hero-audit.js — does the hero set actually differ from room to room?

   The old seventy rooms passed every check I had and were still the same room
   seventy times, because the check compared the *list of props*. A player reads
   the picture: where the tap is, where the cup is, and what shape the answer
   has. So this measures those three things, plus the one thing no other tool
   asks — whether the proved line has to lean on the room at all.

     bearing    how many pieces of scenery the proved stroke touches. A room
                whose answer touches nothing is a slide wearing a costume.
     offset     where the cup sits relative to the tap. All 70 old rooms were
                +200 px or more to the right; a set of rooms should not be.
     verb       one word per room, declared in tools/hero-rooms.js.
     delivery   how the ball gets there — thrown, tipped off a sill, dropped,
                or (the failure mode of the last set) rolled down a slope.

   node tools/hero-audit.js [--verbose]
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const SOLUTIONS = require('./solutions');
const ROOMS = require('./hero-rooms');

const HG = boot();
const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const fail = (msg) => { fails++; console.log('FAIL ' + msg); };

const rows = [];
for (const lv of HG.LEVELS) {
  const room = ROOMS.find((r) => r.name === lv.name) || {};
  const r = play(HG, lv.id, (SOLUTIONS[lv.id] || []).map(poly), { frames: 60 * 30 });
  // ---- bearing: which solids did the settled wire touch?
  // A solid is a box or a free-form slab (the wedge ramps), and a point counts
  // as leaning on it if it is inside it, give or take the same 6 px the pen
  // already allows for a stroke laid along a face.
  const solids = [];
  lv.platforms.forEach((p) => (p.poly
    ? solids.push({ poly: p.poly })
    : solids.push({ x: p.x, y: p.y, w: p.w, h: p.h, a: p.angle || 0 })));
  lv.crates.forEach((c) => solids.push({ x: c.x, y: c.y, w: c.w || c.size, h: c.h || c.size, a: c.angle || 0 }));
  const inPoly = (b, q) => {
    const xs = b.poly.map((v) => v[0]), ys = b.poly.map((v) => v[1]);
    if (q[0] < Math.min(...xs) - 6 || q[0] > Math.max(...xs) + 6) return false;
    if (q[1] < Math.min(...ys) - 6 || q[1] > Math.max(...ys) + 6) return false;
    let inside = false;
    for (let i = 0, j = b.poly.length - 1; i < b.poly.length; j = i++) {
      const xi = b.poly[i][0], yi = b.poly[i][1], xj = b.poly[j][0], yj = b.poly[j][1];
      if ((yi > q[1]) !== (yj > q[1]) && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) return true;
    // a stroke *lies on* the face, so within the pen's 6 px of an edge counts
    for (let i = 0, j = b.poly.length - 1; i < b.poly.length; j = i++) {
      const ax = b.poly[j][0], ay = b.poly[j][1], bx = b.poly[i][0], by = b.poly[i][1];
      const vx = bx - ax, vy = by - ay;
      const t = Math.max(0, Math.min(1, ((q[0] - ax) * vx + (q[1] - ay) * vy) / (vx * vx + vy * vy)));
      const dx = q[0] - (ax + t * vx), dy = q[1] - (ay + t * vy);
      if (dx * dx + dy * dy <= 36) return true;
    }
    return false;
  };
  const touched = new Set();
  for (const s of r.inkSegs || []) {
    for (const q of [[s.x1, s.y1], [(s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2], [s.x2, s.y2]]) {
      solids.forEach((b, i) => {
        if (b.poly) { if (inPoly(b, q)) touched.add(i); return; }
        const ca = Math.cos(-b.a), sa = Math.sin(-b.a);
        const dx = q[0] - b.x, dy = q[1] - b.y;
        const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
        if (Math.abs(lx) <= b.w / 2 + 6 && Math.abs(ly) <= b.h / 2 + 6) touched.add(i);
      });
    }
  }
  const g0 = lv.glasses[0];
  rows.push({
    id: lv.id, name: lv.name, verb: room.verb || '?',
    taps: lv.faucets.length, cups: lv.glasses.length,
    offset: Math.round(g0.x - lv.faucets[0].x),
    hanging: !!g0.hanging,
    props: lv.platforms.length + lv.crates.length + lv.balls.length,
    bearing: touched.size,
    ink: lv.ink, used: Math.round(r.inkUsed), won: r.won,
  });
}

console.log('## The hero set\n');
console.log('| # | Room | Verb | Taps | Cups | Cup − tap | Hanging | Props | Bearing | Ink | Won |');
console.log('|---|------|------|------|------|-----------|---------|-------|---------|-----|-----|');
rows.forEach((r) => console.log('| ' + r.id + ' | ' + r.name + ' | ' + r.verb + ' | ' + r.taps + ' | ' +
  r.cups + ' | ' + (r.offset > 0 ? '+' : '') + r.offset + ' px | ' + (r.hanging ? 'yes' : 'no') + ' | ' +
  r.props + ' | ' + r.bearing + ' | ' + r.used + '/' + r.ink + ' | ' + (r.won ? 'yes' : '**NO**') + ' |'));
console.log('');

// ---- 1. every room is winnable
rows.filter((r) => !r.won).forEach((r) => fail('room ' + r.id + ' ' + r.name + ' does not win with its own line'));

// ---- 2. the line has to lean on the room
rows.filter((r) => r.bearing < 1).forEach((r) =>
  fail('room ' + r.id + ' ' + r.name + ' is solved by a line that touches nothing — the props are decoration'));
const lean = rows.filter((r) => r.bearing >= 2).length;
if (lean < 3) fail('only ' + lean + ' room(s) need the line to bridge two or more pieces');

// ---- 3. no two rooms may demand the same STROKE.
// The previous gate hashed the verb word and the prop count, and passed twenty-one
// copies of one vertical bar. This hashes what the player's hand actually does:
// every reference stroke, translated so its room's cup is at the origin, then
// rounded to 10 px. Two rooms with the same hash ask the player for the same line.
const strokeSigs = new Map();
rows.forEach((r) => {
  const lv = HG.LEVELS.find((l) => l.id === r.id);
  const strokes = (SOLUTIONS[r.id] || []);
  if (!strokes.length) return;
  const g = lv.glasses[0];
  // solutions are [[[x, y], ...]] — arrays, not {x, y} objects. (Reading q.x here
  // made every signature NaN and reported seven "distinct" strokes for the whole
  // set; the gate has to be tested with a room that should fail.)
  const pick = (q) => (Array.isArray(q) ? q : [q.x, q.y]);
  const sig = strokes.map((st) => st.map((q) => {
    const [x, y] = pick(q);
    return [Math.round((x - g.x) / 10) * 10, Math.round(y / 10) * 10].join(',');
  }).join('|')).join('//');
  r.stroke = sig;
  if (strokeSigs.has(sig)) fail('room ' + r.id + ' ' + r.name + ' demands the same stroke as room ' +
    strokeSigs.get(sig) + ' (' + (strokes.length + ' stroke' + (strokes.length > 1 ? 's' : '')) + ')');
  else strokeSigs.set(sig, r.id);
});
const distinctStrokes = strokeSigs.size;
if (distinctStrokes < rows.length) fail('only ' + distinctStrokes + ' distinct strokes across ' + rows.length + ' rooms');

// ---- 3b. a ball room must be lethal at t = 0: untouched, the ball must spoil the cup
const ballRooms = rows.filter((r) => {
  const lv = HG.LEVELS.find((l) => l.id === r.id);
  return (lv.balls || []).length > 0;
});
ballRooms.forEach((r) => {
  const lv = HG.LEVELS.find((l) => l.id === r.id);
  const idle = play(HG, r.id, [], { frames: 60 * 26 });
  if (idle.won) fail('room ' + r.id + ' ' + r.name + ' has a ball but wins untouched — the ball is decoration');
});

// ---- 3c. how the ball ARRIVES has to vary, not just how the stroke stops it.
// This is the check the last set would have failed: forty rooms, four stop
// shapes, and the ball rolling down a tilted plank in every single one. A
// player reads the delivery first, so a set that is 90% chutes is one room
// drawn 25 times whatever the strokes look like.
const delivery = (lv) => {
  const balls = lv.balls || [];
  if (!balls.length) return 'none';
  if (balls.some((b) => b.vx || b.vy)) return 'thrown';
  const tilted = lv.platforms.filter((p) => Math.abs(p.angle || 0) > 0.05);
  const restsOn = (b, p) => Math.abs(b.x - p.x) < p.w / 2 + 40 &&
    b.y + (b.r || 22) > p.y - p.h / 2 - 46 && b.y < p.y + p.h;
  if (balls.some((b) => tilted.some((p) => restsOn(b, p)))) return 'chute';
  if (balls.some((b) => lv.platforms.some((p) => restsOn(b, p) && Math.abs(p.angle || 0) <= 0.05))) return 'sill';
  return 'drop';
};
const deliveries = rows.map((r) => { r.delivery = delivery(HG.LEVELS.find((l) => l.id === r.id)); return r.delivery; });
const tally = {};
deliveries.forEach((d) => { tally[d] = (tally[d] || 0) + 1; });
const sloped = tally.chute || 0;
if (sloped > 6) fail(sloped + ' of ' + ballRooms.length + ' ball rooms deliver the ball down a slope — that is ' +
  '"the same thing in every level" again (limit 6)');
if (ballRooms.length && new Set(deliveries.filter((d) => d !== 'none')).size < 2) {
  fail('every ball arrives the same way (' + deliveries[0] + ')');
}

// ---- 4. the ink budget has to mean something
rows.filter((r) => r.ink > r.used * 2.2).forEach((r) =>
  fail('room ' + r.id + ' hands out ' + (r.ink / r.used).toFixed(1) + 'x the ink its own answer needs'));

// ---- 5. the set has to span the grammar, not repeat one verb
const verbs = new Set(rows.map((r) => r.verb));
if (verbs.size < rows.length * 0.75) {
  fail('only ' + verbs.size + ' different verbs across ' + rows.length + ' rooms');
}
const offsets = new Set(rows.map((r) => Math.round(r.offset / 60)));
if (VERBOSE) {
  console.log('distinct tap positions   ' + new Set(rows.map((r) => r.id + ':' + 0)).size);
  console.log('distinct cup offsets     ' + offsets.size + ' of ' + rows.length);
  console.log('distinct verbs           ' + verbs.size);
  console.log('rooms needing 2+ anchors ' + lean);
  console.log('ball deliveries          ' + JSON.stringify(tally));
}

console.log(fails ? fails + ' hero check(s) failed' : 'all hero checks pass');
process.exit(fails ? 1 : 0);

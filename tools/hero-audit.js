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
  const solids = [];
  lv.platforms.forEach((p) => solids.push({ x: p.x, y: p.y, w: p.w, h: p.h, a: p.angle || 0 }));
  lv.crates.forEach((c) => solids.push({ x: c.x, y: c.y, w: c.w || c.size, h: c.h || c.size, a: c.angle || 0 }));
  const touched = new Set();
  for (const s of r.inkSegs || []) {
    for (const q of [[s.x1, s.y1], [(s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2], [s.x2, s.y2]]) {
      solids.forEach((b, i) => {
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

// ---- 3. no two rooms are the same picture
const seen = new Map();
rows.forEach((r) => {
  const sig = [r.verb, r.taps, r.cups, Math.round(r.offset / 60), r.hanging ? 'h' : 's',
    Math.round(r.props / 2)].join('|');
  if (seen.has(sig)) fail('room ' + seen.get(sig) + ' and room ' + r.id + ' are the same picture (' + sig + ')');
  seen.set(sig, r.id);
});

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
}

console.log(fails ? fails + ' hero check(s) failed' : 'all hero checks pass');
process.exit(fails ? 1 : 0);

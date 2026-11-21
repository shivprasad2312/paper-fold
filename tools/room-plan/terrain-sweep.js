/* tools/room-plan/terrain-sweep.js — solve a room built from polygon masses.

   node tools/room-plan/terrain-sweep.js <slot>     (reads terrain.js)
   Anchors come from polygon EDGES (every vertex pair, sampled) and rectangle
   tops, so a stroke can start anywhere on a mass's face — which is the whole
   point of a mass: its lip is an anchor. */
'use strict';
const { run, idle } = require('./lib');
const T = require('./terrain');

const want = Number(process.argv[2] || 30);
const room = Object.keys(T).map((k) => T[k]).find((r) => r && r.slot === want);
if (!room) { console.error('no terrain room in slot', want); process.exit(1); }

function anchors(stage) {
  const out = [];
  for (const p of stage) {
    if (p.poly) {
      for (let i = 0; i < p.poly.length; i++) {
        const a = p.poly[i], b = p.poly[(i + 1) % p.poly.length];
        for (const f of [0.05, 0.25, 0.5, 0.75, 0.95]) {
          out.push([Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f) - 8]);
        }
      }
    } else {
      const top = p.y - p.h / 2;
      for (const f of [0.03, 0.2, 0.5, 0.8, 0.97]) for (const lift of [8, 3]) {
        out.push([Math.round(p.x + (f - 0.5) * p.w), Math.round(top - lift)]);
      }
    }
  }
  return out;
}
const mouths = (gl) => {
  const o = [];
  for (const g of gl) {
    const t = g.y - 59;
    for (const dx of [-40, -18, 4, 26]) for (const up of [16, 34, 54, 76]) {
      o.push([Math.round(g.x + dx), Math.round(t - up)]);
    }
  }
  return o;
};
const plen = (c) => c.reduce((L, p, i) => (i ? L + Math.hypot(p[0] - c[i - 1][0], p[1] - c[i - 1][1]) : 0), 0);
const taps = (room.faucets || [room.faucet]).map((f) => f.x);
const cands = [];
for (const m of mouths(room.glasses)) for (const a of anchors(room.stage)) {
  if (Math.hypot(m[0] - a[0], m[1] - a[1]) > 700) continue;
  cands.push([a, m]);
  cands.push([a, [Math.round((a[0] + m[0]) / 2), Math.round(Math.min(a[1], m[1]) - 50)], m]);
}
cands.sort((a, b) => Math.min(...taps.map((t) => Math.abs(a[0][0] - t))) - Math.min(...taps.map((t) => Math.abs(b[0][0] - t))) || plen(a) - plen(b));
const i0 = idle(room);
const scr = [];
for (const c of cands.slice(0, 90)) {
  const r = run(room, [c], 60 * 15);
  scr.push({ c, won: r.won, f: r.fills.map((f) => (f.spoiled ? -1 : f.fill)), ink: r.inkUsed });
}
scr.sort((a, b) => ((b.won ? 2 : 0) + Math.min(...b.f)) - ((a.won ? 2 : 0) + Math.min(...a.f)) || a.ink - b.ink);
const ver = [];
for (const s of scr.slice(0, 5)) {
  const r = run(room, [s.c], 60 * 30);
  ver.push({ c: s.c, won: r.won, f: r.fills.map((f) => +f.fill.toFixed(2)), ink: Math.round(r.inkUsed) });
}
const win = ver.filter((v) => v.won).sort((a, b) => a.ink - b.ink)[0] || null;
console.log(JSON.stringify({ slot: want, name: room.name, idle: i0.fills.map((f) => +f.fill.toFixed(2)),
  idleWon: i0.won, answer: win ? win.c : null, fill: win ? win.f : null, ink: win ? win.ink : null, top: ver.slice(0, 2) }));

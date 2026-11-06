const fs = require('fs');
const { run, idle } = require('./lib');
const rooms = require('/tmp/hb/terrain.js');
const id = Number(process.argv[2]);
const room = JSON.parse(JSON.stringify(rooms[id]));
// anchors: poly edges + rect tops
function anchors(stage) {
  const out = [];
  for (const p of stage) {
    if (p.poly) {
      for (let i = 0; i < p.poly.length; i++) for (const f of [0.15, 0.5, 0.85]) {
        const a = p.poly[i], b = p.poly[(i + 1) % p.poly.length];
        out.push([Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f) - 8]);
      }
    } else {
      const top = p.y - p.h / 2;
      for (const f of [0.05, 0.3, 0.5, 0.7, 0.95]) for (const lift of [8, 3])
        out.push([Math.round(p.x + (f - 0.5) * p.w), Math.round(top - lift)]);
    }
  }
  return out;
}
const mouths = (glasses) => { const o = [];
  for (const g of glasses) { const top = g.y - 59;
    for (const dx of [-40, -18, 4, 26]) for (const up of [16, 34, 54, 76]) o.push([Math.round(g.x + dx), Math.round(top - up)]); }
  return o; };
const A = anchors(room.stage);
const taps = (room.faucets || [room.faucet]).map(f => f.x);
const cands = [];
for (const m of mouths(room.glasses)) for (const a of A) {
  const d = Math.hypot(m[0] - a[0], m[1] - a[1]);
  if (d > 700) continue;
  cands.push([a, m]);
  cands.push([a, [Math.round((a[0] + m[0]) / 2), Math.round(Math.min(a[1], m[1]) - 50)], m]);
}
const plen = (c) => c.reduce((L, p, i) => i ? L + Math.hypot(p[0] - c[i-1][0], p[1] - c[i-1][1]) : 0, 0);
cands.sort((a, b) => Math.min(...taps.map(t => Math.abs(a[0][0] - t))) - Math.min(...taps.map(t => Math.abs(b[0][0] - t))) || plen(a) - plen(b));
const cap = cands.slice(0, 90);
const i0 = idle(room);
const screen = [];
for (const c of cap) { const r = run(room, [c], 60 * 15); screen.push({ c, won: r.won, f: r.fills.map(f => f.spoiled ? -1 : f.fill), ink: r.inkUsed }); }
screen.sort((a, b) => ((b.won ? 2 : 0) + Math.min(...b.f)) - ((a.won ? 2 : 0) + Math.min(...a.f)) || a.ink - b.ink);
const ver = [];
for (const s of screen.slice(0, 5)) { const r = run(room, [s.c], 60 * 30);
  ver.push({ c: s.c, won: r.won, f: r.fills.map(f => +f.fill.toFixed(2)), ink: Math.round(r.inkUsed) }); }
const win = ver.filter(v => v.won).sort((a, b) => a.ink - b.ink)[0] || null;
console.log(JSON.stringify({ id, name: room.name, idle: i0.fills.map(f => +f.fill.toFixed(2)), idleWon: i0.won,
  tested: cap.length, answer: win ? win.c : null, fill: win ? win.f : null, ink: win ? win.ink : null,
  top: ver.slice(0, 3) }));
fs.writeFileSync('/tmp/hb/r' + id + '.json', JSON.stringify({ room, answer: win && win.c, ver }, null, 1));

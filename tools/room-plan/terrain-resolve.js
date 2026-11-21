/* tools/room-plan/terrain-resolve.js — re-prove a terrain room after a change.

   `terrain-sweep.js` searches one room. This one checks the room's stored
   answer first and only searches when the stored answer has stopped winning —
   which is what happens after a geometry change (a plinth moved 10 px, a cup
   raised). It prints a ready-to-paste `answer:` line so the file can be fixed
   without guessing.

     node tools/room-plan/terrain-resolve.js 40        one slot
     node tools/room-plan/terrain-resolve.js           every slot that fails
   ========================================================================== */
'use strict';
const { run, idle } = require('./lib');
const T = require('./terrain');

const rooms = Object.keys(T).filter((k) => T[k] && T[k].slot).map((k) => T[k]).sort((a, b) => a.slot - b.slot);
const want = process.argv[2] ? Number(process.argv[2]) : null;

function anchors(stage) {
  const out = [];
  for (const p of stage) {
    if (p.poly) {
      for (let i = 0; i < p.poly.length; i++) {
        const a = p.poly[i], b = p.poly[(i + 1) % p.poly.length];
        for (const f of [0.02, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.98]) {
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
function mouths(glasses) {
  const out = [];
  for (const g of glasses) {
    const top = g.y - g.h / 2;
    for (const dx of [-30, -10, 10, 30]) for (const up of [16, 34, 54, 76]) {
      out.push([Math.round(g.x + dx), Math.round(top - up)]);
    }
  }
  return out;
}
const plen = (c) => c.reduce((L, p, i) => (i ? L + Math.hypot(p[0] - c[i - 1][0], p[1] - c[i - 1][1]) : 0), 0);

for (const room of rooms) {
  if (want && room.slot !== want) continue;
  const i0 = idle(room);
  const cur = run(room, [room.answer], 60 * 26);
  if (!i0.won && i0.fills[0].fill < 0.02 && cur.won && cur.fills[0].fill >= 0.5) {
    console.log(`${room.slot} ${room.name.padEnd(16)} stored answer OK  ${Math.round(cur.inkUsed)} ink`);
    continue;
  }
  const tap = room.faucet.x;
  const cands = [];
  for (const m of mouths(room.glasses)) for (const a of anchors(room.stage)) {
    if (Math.hypot(m[0] - a[0], m[1] - a[1]) > 800) continue;
    cands.push([a, m]);
    cands.push([a, [Math.round((a[0] + m[0]) / 2), Math.round(Math.min(a[1], m[1]) - 50)], m]);
  }
  cands.sort((a, b) => Math.abs(a[0][0] - tap) - Math.abs(b[0][0] - tap) || plen(a) - plen(b));
  const scr = cands.slice(0, 20).map((c) => {
    const r = run(room, [c], 60 * 18);
    return { c, won: r.won, f: r.fills[0].fill, ink: r.inkUsed };
  }).sort((a, b) => (b.won - a.won) || b.f - a.f || a.ink - b.ink);
  let win = null;
  for (const s of scr.slice(0, 3)) {
    const r = run(room, [s.c], 60 * 30);
    if (r.won && r.fills[0].fill >= 0.5 && (!win || r.inkUsed < win.ink)) {
      win = { ink: r.inkUsed, c: s.c, fill: r.fills[0].fill };
    }
  }
  if (!win) { console.log(`${room.slot} ${room.name.padEnd(16)} FAIL no answer found (idle ${i0.fills[0].fill.toFixed(2)})`); continue; }
  const line = '[[['+'' + ']]]';
  console.log(`${room.slot} ${room.name.padEnd(16)} RE-SOLVED ${Math.round(win.ink)} ink  answer: ${JSON.stringify(win.c).replace(/\],\[/g, '], [')}  idle ${i0.fills[0].fill.toFixed(2)} fill ${win.fill.toFixed(2)}`);
}

/* tools/room-plan/verify-drawable.js — the gate the first proofs were missing.

   A room's answer has to be a line the PLAYER can draw. `addInkPoint` refuses
   any point inside scenery or a glass, and the proof harness skipped those
   points silently, so an answer could "win" while containing pieces of line
   that no pen can make. This replays every answer point by point and reports
   the ones the pen refuses.

   node tools/room-plan/verify-drawable.js [--trap] [--shipped] */
'use strict';
const { boot, poly, seed } = require('../simheadless');
const HG = boot();

function blockedPoints(roomId, strokes) {
  seed(1234 + roomId);
  const sc = new HG.Scene(JSON.parse(JSON.stringify(HG.levelById(roomId))));
  const out = [];
  strokes.forEach((st, si) => {
    const pts = poly(st);
    sc.beginInk(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (sc.inkPointBlocked(pts[i].x, pts[i].y)) out.push({ stroke: si, i, x: Math.round(pts[i].x), y: Math.round(pts[i].y) });
      else sc.addInkPoint(pts[i].x, pts[i].y);
    }
    sc.endInk();
  });
  return out;
}
function blockedWithLevel(room, level) {
  seed(1234 + room.id);
  const sc = new HG.Scene(JSON.parse(JSON.stringify(level)));
  const out = [];
  for (const st of room.answers || [room.answer]) {
    if (!st) continue;
    const pts = poly(st);
    sc.beginInk(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (sc.inkPointBlocked(pts[i].x, pts[i].y)) out.push({ i, x: Math.round(pts[i].x), y: Math.round(pts[i].y) });
      else sc.addInkPoint(pts[i].x, pts[i].y);
    }
    sc.endInk();
  }
  return out;
}
module.exports = { blockedPoints, blockedWithLevel };

if (require.main === module) {
  const args = process.argv.slice(2);
  const wantTrap = args.includes('--trap') || !args.includes('--shipped');
  const wantShipped = args.includes('--shipped') || !args.includes('--trap');
  let bad = 0, total = 0;
  if (wantTrap) {
    const { levelOf } = require('./lib');
    const TRAPS = require('./traps');
    for (const k of Object.keys(TRAPS).filter((x) => TRAPS[x] && TRAPS[x].glasses)) {
      const room = TRAPS[k];
      total++;
      const hits = blockedWithLevel(room, levelOf(room));
      if (hits.length) { bad++; console.log(`TRAP  R${room.id} ${room.name.padEnd(15)} ${hits.length} refused points, first ${hits[0].x},${hits[0].y}`); }
    }
  }
  if (wantShipped) {
    for (const room of require('../hero-rooms')) {
      total++;
      const hits = blockedPoints(room.id, (room.answers || [room.answer]).filter(Boolean));
      if (hits.length) { bad++; console.log(`SHIP  R${room.id} ${room.name.padEnd(16)} ${hits.length} refused points, first ${hits[0].x},${hits[0].y}`); }
    }
  }
  console.log(`\n${bad}/${total} answers contain points the pen refuses`);
  process.exitCode = bad ? 1 : 0;
}

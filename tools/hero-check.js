/* ==========================================================================
   tools/hero-check.js — fast iteration over the rooms, for the design loop.

   tools/solve-hero.js searches; this one just asks the only question that
   matters while authoring: does this room's answer win, and does it still win
   when the hand is not perfect? One line per room, seconds per room.

     node tools/hero-check.js [ids...] [--hands]
     node tools/hero-check.js 16 17 18          only those rooms
     node tools/hero-check.js                   every room
   ========================================================================== */
'use strict';
const { boot, play, poly } = require('./simheadless');
const ROOMS = require('./hero-rooms');

const HG = boot();
const ids = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const HANDS = process.argv.includes('--hands');
const JITTER = [[3, 1], [-3, 1], [2, 3], [-2, -2], [4, 0], [0, 4]];
const WAVY = [0, 1, 2, 3];

function levelOf(room) {
  return {
    id: room.id, name: room.name, tip: room.tip, ink: 900,
    faucets: (room.faucets || [room.faucet]).map((f) => ({
      x: f.x, y: f.y, rate: f.rate || 26, total: f.total || 110,
      spread: f.spread == null ? 0.55 : f.spread,
    })),
    glasses: room.glasses.map((g) => Object.assign({ w: 104, h: 118, need: 0.5 }, g)),
    platforms: (room.stage || []).map((p) => Object.assign({ kind: 'teal', angle: 0 }, p)),
    crates: (room.crates || []).map((c) => Object.assign({ kind: 'wood', angle: 0 }, c)),
    balls: room.balls || [], hots: room.hots || [],
    fans: (room.fans || []).map((f) => Object.assign({ angle: 0, force: 0.12, dir: 1 }, f)),
    spinners: [], seesaws: [], pins: [],
  };
}

let ok = 0, bad = 0;
for (const room of ROOMS) {
  if (ids.length && !ids.includes(room.id)) continue;
  const lv = levelOf(room);
  // A room's reference answer is one stroke (`answer`) or, where the room needs
  // two hands at once, a list of strokes (`answers`).
  const ansList = room.answers || (room.answer ? [room.answer] : null);
  if (!ansList) { console.log('R' + room.id + ' ' + room.name.padEnd(20) + 'NO ANSWER'); bad++; continue; }
  const r = play(HG, room.id, ansList.map(poly), { frames: 60 * 30, level: lv });
  let extra = '';
  if (r.won && HANDS) {
    let tw = 0, wv = 0;
    for (let k = 0; k < JITTER.length; k++) {
      const d = JITTER[k];
      const shaky = ansList.map((st) => poly(st.map((q, i) => [q[0] + (i % 2 ? -d[0] : d[0]), q[1] + d[1]]), 8));
      if (play(HG, room.id, shaky, { frames: 60 * 30, level: lv }).won) tw++;
    }
    for (const k of WAVY) {
      const crooked = ansList.map((st) => poly(st.map((q, i) => [
        q[0] + Math.cos(k * 2.1 + i * 0.7) * 2.4,
        q[1] + Math.sin(k * 1.3 + i * 0.5) * 2.4]), 8));
      if (play(HG, room.id, crooked, { frames: 60 * 30, level: lv }).won) wv++;
    }
    extra = ' hands ' + tw + '/6 wavy ' + wv + '/4';
    if (tw < 4 || wv < 2) { extra += '  <-- fragile'; }
  }
  const line = 'R' + String(room.id).padStart(2) + ' ' + room.name.padEnd(20) +
    (r.won ? ' WON ' : ' ' + r.state.toUpperCase() + ' ') +
    ' fill ' + r.fills.map((f) => f.fill.toFixed(2)).join('/') +
    (r.spoiled ? ' SPOILED' : '') +
    ' ink ' + Math.round(r.inkUsed) + extra;
  console.log(line);
  if (r.won) ok++; else bad++;
}
console.log('\n' + ok + ' won, ' + bad + ' not');
process.exit(bad ? 1 : 0);

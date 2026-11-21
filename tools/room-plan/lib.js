const { boot, play, poly, STEP } = require('/home/user/paper-fold/tools/simheadless');
const HG = boot();
function levelOf(room) {
  return { id: room.id, name: room.name, tip: room.tip || '', ink: 900, delay: room.delay || 0, wet: !!room.wet,
    faucets: (room.faucets || (room.faucet ? [room.faucet] : [])).map(f => ({ x: f.x, y: f.y, rate: f.rate == null ? 26 : f.rate, total: f.total == null ? 110 : f.total, spread: 0.55 })),
    glasses: room.glasses.map(g => Object.assign({ w: 108, h: 118, need: 0.5 }, g)),
    platforms: (room.stage || []).map(p => Object.assign({ kind: 'teal', angle: 0 }, p)),
    crates: (room.crates || []).map(c => Object.assign({ kind: 'wood', angle: 0 }, c)),
    balls: room.balls || [], hots: room.hots || [],
    fans: (room.fans || []).map(f => Object.assign({ angle: 0, force: 0.12, dir: 1 }, f)),
    spinners: room.spinners || [], seesaws: room.seesaws || [], pins: room.pins || [] };
}
const JIT = [[3,1],[-3,1],[2,3],[-2,-2],[4,0],[0,4]];
const WAVY = [0,1,2,3];
const run = (room, strokes, frames) => play(HG, room.id, (strokes||[]).map(poly), { frames: frames || 60*30, level: levelOf(room) });
const idle = (room) => run(room, [], 60*26);
module.exports = { HG, levelOf, run, idle, JIT, WAVY, poly, STEP };

// The eight compositions from docs/COMPETITOR-ALGORITHM.md §6, written as
// builders. Terrain is laid first and it is big — that is the whole point.
const FLOOR = { x: 640, y: 690, w: 1100, h: 20 };
const box = (x, y, w, h, kind) => ({ x, y, w, h, kind: kind || 'teal' });
// a column whose TOP is at `top`
const col = (x, top, w) => box(x, (top + 700) / 2, w || 90, 700 - top);

module.exports = {
  FLOOR, box, col,
  // 16/17 PLINTH: a big column, cup on it, tap off to the side
  plinth: (o) => Object.assign({
    stage: [FLOOR, col(o.colX || 760, o.colTop || 500, o.colW || 110)],
    crates: [box(300, 640, 100, 90, 'wood')],
  }, o),
  // 18 TWO-BLOCK GAP: two masses with a slot for the cup
  gap: (o) => Object.assign({
    stage: [FLOOR, col(o.leftX || 520, o.leftTop || 420, 110), col(o.rightX || 800, o.rightTop || 380, 110)],
  }, o),
  // 19/20 SHELF OF BALLS: an L-shelf overhanging the cup
  shelf: (o) => Object.assign({
    stage: [FLOOR, box(o.shelfX || 700, o.shelfY || 420, o.shelfW || 260, 18, 'wood'),
      col(o.propX || 830, o.shelfY || 420, 46)],
  }, o),
  // 21/22 BALL RAMP: a long static ramp, foot over the cup
  ramp: (o) => Object.assign({
    stage: [FLOOR, { x: o.rampX || 700, y: o.rampY || 430, w: o.rampW || 380, h: 18,
      angle: o.angle || 0.22, kind: 'teal' }],
  }, o),
  // 23/24 V DEFLECTORS: two static planks making a V above the cup
  vee: (o) => Object.assign({
    stage: [FLOOR,
      { x: (o.vx || 760) - 150, y: (o.vy || 420), w: 200, h: 16, angle: 0.5, kind: 'teal' },
      { x: (o.vx || 760) + 150, y: (o.vy || 420), w: 200, h: 16, angle: -0.5, kind: 'teal' }],
  }, o),
  // 25/26 BEAM OVER GLASS: two blocks, cup between, balls stacked above
  beam: (o) => Object.assign({
    stage: [FLOOR, col(o.leftX || 520, o.leftTop || 460, 110), col(o.rightX || 820, o.rightTop || 420, 110)],
  }, o),
  // 27/28 LOOSE BASE: a plinth with a loose block at its foot
  loose: (o) => Object.assign({
    stage: [FLOOR, col(o.colX || 760, o.colTop || 520, 110)],
    crates: [{ x: o.blockX || 560, y: o.blockY || 300, w: 70, h: 70, dynamic: true }],
  }, o),
  // 29 BALL UNDER CUP: wide low platform, ball wedged under the base
  wedgeUnder: (o) => Object.assign({
    stage: [FLOOR, box(o.px || 760, o.py || 600, o.pw || 300, 20, 'wood')],
  }, o),
  // 30/31 CHASM: floor with a hole
  chasm: (o) => Object.assign({
    stage: [{ x: 340, y: 690, w: 600, h: 20 }, { x: 1000, y: 690, w: 560, h: 20 }],
  }, o),
  // 32/33 TWO CUPS
  twin: (o) => Object.assign({ stage: [FLOOR, col(o.colX || 820, o.colTop || 520, 110)] }, o),
  // 34/35 HOT MOAT
  moat: (o) => Object.assign({
    stage: [FLOOR], hots: [{ x: (o.cupX || 760) - 190, y: 610, w: 200, h: 16 }, { x: (o.cupX || 760) + 190, y: 610, w: 200, h: 16 }],
  }, o),
  // 36/37 PIN
  pin: (o) => Object.assign({ stage: [FLOOR], pins: [{ x: o.pinX || 620, y: o.pinY || 300 }] }, o),
  // 38/39 COLUMN + THROWN BALL
  colThrow: (o) => Object.assign({
    stage: [FLOOR, col(o.colX || 780, o.colTop || 520, 110)],
    crates: [box(o.crateX || 340, 640, 100, 90, 'wood')],
  }, o),
};

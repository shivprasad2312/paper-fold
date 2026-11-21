const F = require('/tmp/h5/fams.js');
const { FLOOR, box, col } = F;
// 25 rooms in eight families. Each is a COMPOSITION, not a variation.
module.exports = [
  // ---- 16/17 PLINTH -------------------------------------------------------
  { id: 16, name: 'The Plinth', verb: 'pillar', ...F.plinth({ colX: 780, colTop: 500, colW: 110 }),
    faucet: { x: 760, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 780, y: 441, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 780, y: 250, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 17, name: 'Plinth Lid', verb: 'thread', ...F.plinth({ colX: 760, colTop: 500, colW: 110 }),
    stage: [FLOOR, col(760, 500, 110), box(760, 330, 260, 18, 'wood')],
    faucet: { x: 760, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 760, y: 441, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 700, y: 290, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 18 TWO-BLOCK GAP ---------------------------------------------------
  { id: 18, name: 'The Slot', verb: 'span', ...F.gap({ leftX: 540, leftTop: 430, rightX: 820, rightTop: 430 }),
    faucet: { x: 680, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 680, y: 611, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 680, y: 250, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 19/20 SHELF OF BALLS ----------------------------------------------
  { id: 19, name: 'Shelf Trap', verb: 'prop', ...F.shelf({ shelfX: 700, shelfY: 420, shelfW: 260, propX: 830 }),
    faucet: { x: 700, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 640, y: 380, r: 26, kind: 'heavy' }, { x: 740, y: 380, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 20, name: 'Shelf Left', verb: 'brace', ...F.shelf({ shelfX: 620, shelfY: 450, shelfW: 240, propX: 500 }),
    faucet: { x: 620, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 620, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 690, y: 410, r: 26, kind: 'heavy' }, { x: 580, y: 410, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 21/22 BALL RAMP ----------------------------------------------------
  { id: 21, name: 'The Ramp', verb: 'chock', ...F.ramp({ rampX: 720, rampY: 430, rampW: 400, angle: 0.2 }),
    faucet: { x: 860, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 880, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 560, y: 390, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 22, name: 'Steep Run', verb: 'cradle', ...F.ramp({ rampX: 700, rampY: 400, rampW: 320, angle: 0.34 }),
    faucet: { x: 830, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 850, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 570, y: 360, r: 26, kind: 'heavy' }, { x: 640, y: 340, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 23/24 V DEFLECTORS -------------------------------------------------
  { id: 23, name: 'The Vee', verb: 'close', ...F.vee({ vx: 760, vy: 420 }),
    faucet: { x: 760, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 760, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 700, y: 250, r: 26, kind: 'heavy' }, { x: 820, y: 250, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 24, name: 'Open Vee', verb: 'cap', ...F.vee({ vx: 700, vy: 470 }),
    faucet: { x: 640, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 700, y: 300, r: 26, kind: 'heavy' }, { x: 760, y: 250, r: 26, kind: 'heavy' }, { x: 640, y: 250, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 25/26 BEAM OVER GLASS ---------------------------------------------
  { id: 25, name: 'Beam Span', verb: 'beam', ...F.beam({ leftX: 520, leftTop: 470, rightX: 820, rightTop: 470 }),
    faucet: { x: 670, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 670, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 670, y: 300, r: 26, kind: 'heavy' }, { x: 660, y: 240, r: 26, kind: 'heavy' }, { x: 680, y: 180, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 26, name: 'Tilted Beam', verb: 'slant', ...F.beam({ leftX: 520, leftTop: 400, rightX: 820, rightTop: 490 }),
    faucet: { x: 670, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 670, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 670, y: 240, r: 26, kind: 'heavy' }, { x: 720, y: 300, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 27/28 LOOSE BASE ---------------------------------------------------
  { id: 27, name: 'Loose Base', verb: 'pin', ...F.loose({ colX: 780, colTop: 520, blockX: 560, blockY: 320 }),
    faucet: { x: 780, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 780, y: 441, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 300, y: 300, r: 26, kind: 'heavy', vx: 7 }], delay: 1.6 },
  { id: 28, name: 'Loose Lid', verb: 'brace', ...F.loose({ colX: 760, colTop: 520, blockX: 760, blockY: 300 }),
    faucet: { x: 760, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 760, y: 441, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 760, y: 190, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 29 BALL UNDER CUP --------------------------------------------------
  { id: 29, name: 'Under The Cup', verb: 'seat', ...F.wedgeUnder({ px: 760, py: 600, pw: 320 }),
    faucet: { x: 760, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 760, y: 531, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 640, y: 470, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 30/31 CHASM --------------------------------------------------------
  { id: 30, name: 'The Chasm', verb: 'bridge', ...F.chasm(),
    faucet: { x: 900, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 900, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 380, y: 300, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 31, name: 'Far Shelf', verb: 'cross',
    stage: [{ x: 340, y: 690, w: 600, h: 20 }, { x: 1000, y: 690, w: 560, h: 20 }, box(980, 520, 240, 18, 'wood')],
    faucet: { x: 1040, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 1040, y: 452, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 960, y: 480, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 32/33 TWO CUPS -----------------------------------------------------
  { id: 32, name: 'Two Cups', verb: 'divide', ...F.twin({ colX: 830, colTop: 520 }),
    faucet: { x: 640, y: 170, rate: 30, total: 140 },
    glasses: [{ x: 470, y: 621, w: 108, h: 118, need: 0.4 }, { x: 830, y: 461, w: 108, h: 118, need: 0.4 }],
    balls: [{ x: 830, y: 300, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 33, name: 'Twin Plinths', verb: 'tent',
    stage: [FLOOR, col(460, 520, 100), col(860, 520, 100)],
    faucet: { x: 660, y: 170, rate: 30, total: 150 },
    glasses: [{ x: 460, y: 461, w: 108, h: 118, need: 0.4 }, { x: 860, y: 461, w: 108, h: 118, need: 0.4 }],
    balls: [{ x: 460, y: 300, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 34/35 HOT MOAT -----------------------------------------------------
  { id: 34, name: 'The Moat', verb: 'shield', ...F.moat({ cupX: 760 }),
    faucet: { x: 760, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 760, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 760, y: 250, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 35, name: 'Moat Shelf', verb: 'carry',
    stage: [FLOOR, box(700, 420, 260, 18, 'wood'), col(830, 420, 46)],
    hots: [{ x: 570, y: 610, w: 200, h: 16 }],
    faucet: { x: 700, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 760, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 640, y: 380, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 36/37 PIN ----------------------------------------------------------
  { id: 36, name: 'The Pin', verb: 'hammock', ...F.pin({ pinX: 620, pinY: 300 }),
    faucet: { x: 820, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 820, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 820, y: 260, r: 26, kind: 'heavy' }], delay: 1.8 },
  { id: 37, name: 'Pin Shelf', verb: 'hang',
    stage: [FLOOR, box(700, 440, 240, 18, 'wood')], pins: [{ x: 700, y: 280 }],
    faucet: { x: 700, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 700, y: 621, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 660, y: 400, r: 26, kind: 'heavy' }], delay: 1.8 },

  // ---- 38/39 COLUMN + THROWN BALL ----------------------------------------
  { id: 38, name: 'Thrown At Plinth', verb: 'picket', ...F.colThrow({ colX: 800, colTop: 520, crateX: 330 }),
    faucet: { x: 800, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 800, y: 461, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 150, y: 360, r: 26, kind: 'heavy', vx: 9 }], delay: 1.5 },
  { id: 39, name: 'Lob Over Column', verb: 'canopy', ...F.colThrow({ colX: 760, colTop: 480, crateX: 950 }),
    faucet: { x: 760, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 760, y: 421, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 160, y: 420, r: 26, kind: 'heavy', vx: 8, vy: -5 }], delay: 1.5 },

  // ---- 40 FINALE ----------------------------------------------------------
  { id: 40, name: 'Last Light', verb: 'finish',
    stage: [FLOOR, col(780, 500, 110), box(600, 330, 260, 18, 'wood'), col(480, 620, 90)],
    faucet: { x: 780, y: 170, rate: 26, total: 115 },
    glasses: [{ x: 780, y: 441, w: 108, h: 118, need: 0.5 }],
    balls: [{ x: 640, y: 290, r: 26, kind: 'heavy' }], delay: 1.8 },
];

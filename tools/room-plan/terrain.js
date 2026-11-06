/* Terrain-mass rooms in the reference game's grammar: big solid teal masses
   (wedges, plateaus, funnels) instead of thin bars. Uniform glass everywhere:
   108 x 118, need 0.5. Canvas 1280x720, floor top 680. */
const G = (x, top) => ({ x, y: top - 59, w: 108, h: 118, need: 0.5 });   // base sits on `top`
const BALL = (x, y) => ({ x, y: y == null ? 640 : y, r: 26, kind: 'heavy' });

// a wedge: right triangle, vertical face on one side
const wedge = (x, y, w, h, dir) => ({
  kind: 'teal',
  poly: dir === 'l'
    ? [[x - w / 2, y], [x - w / 2, y - h], [x + w / 2, y]]        // vertical left face, slope down to the right
    : [[x + w / 2, y], [x + w / 2, y - h], [x - w / 2, y]],       // vertical right face, slope down to the left
});
const block = (x, y, w, h) => ({ kind: 'teal', poly: [[x - w/2, y], [x - w/2, y - h], [x + w/2, y - h], [x + w/2, y]] });

module.exports = {
  // 1 WEDGE — tap on the high side, water must ride the face down to the cup.
  21: { id: 21, name: 'The Wedge', verb: 'run', intent: 'chute', delay: 0.4,
    faucet: { x: 420, y: 200, rate: 26, total: 125 },
    glasses: [G(700, 680)],
    stage: [wedge(620, 680, 420, 250, 'l'), { x: 700, y: 690, w: 500, h: 20, kind: 'teal' }],
    balls: [BALL(1080)] },

  // 2 PLATEAU — a big block between the tap and the cup; water must go over it.
  22: { id: 22, name: 'Plateau', verb: 'cross', intent: 'chute', delay: 0.4,
    faucet: { x: 420, y: 200, rate: 26, total: 125 },
    glasses: [G(880, 680)],
    stage: [block(620, 680, 260, 220), { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }],
    balls: [BALL(160)] },

  // 3 FUNNEL — two wedges converging over the cup, gap between their tips.
  23: { id: 23, name: 'The Funnel', verb: 'funnel', intent: 'chute', delay: 0.4,
    faucet: { x: 380, y: 200, rate: 26, total: 125 },
    glasses: [G(640, 680)],
    stage: [wedge(400, 470, 300, 170, 'r'), wedge(880, 470, 300, 170, 'l'),
            { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }],
    balls: [BALL(1080)] },

  // 4 BIG RAMP — a long ramp that dumps water away from the cup.
  24: { id: 24, name: 'The Long Ramp', verb: 'divert', intent: 'chute', delay: 0.4,
    faucet: { x: 560, y: 200, rate: 26, total: 125 },
    glasses: [G(960, 680)],
    stage: [{ kind: 'teal', poly: [[500, 330], [900, 470], [900, 440], [500, 300]] },
            { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }],
    balls: [BALL(160)] },

  // 5 TWIN PEAKS — two masses with a valley between; the cup sits in the valley.
  25: { id: 25, name: 'Twin Peaks', verb: 'settle', intent: 'chute', delay: 0.4,
    faucet: { x: 420, y: 200, rate: 26, total: 125 },
    glasses: [G(720, 620)],
    stage: [block(520, 680, 240, 200), block(940, 680, 240, 200),
            { x: 720, y: 620, w: 240, h: 24, kind: 'teal' },
            { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' }],
    balls: [BALL(160)] },

  // 6 ISLAND — cup standing on top of a big mass, tap to one side.
  26: { id: 26, name: 'The Island', verb: 'climb', intent: 'beam', delay: 0.4,
    faucet: { x: 400, y: 200, rate: 26, total: 125 },
    glasses: [G(840, 460)],
    stage: [block(840, 680, 320, 220), { x: 640, y: 690, w: 1100, h: 20, kind: 'teal' },
            { x: 400, y: 430, w: 170, h: 22, kind: 'teal' }],
    balls: [BALL(160)] },
};

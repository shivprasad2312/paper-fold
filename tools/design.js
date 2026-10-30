/* ==========================================================================
   tools/design.js — build the level set around the one mechanic that works.

   The rule: a drawn line is a loose body that stays up only where its own shape
   is carried by scenery. So a level is a *corridor* (tap, glass, room to draw)
   plus the scenery that carries the line — and the level is finished only when
   a machine-drawn ramp actually lands the water, twice, under the level's real
   water budget.

   Everything here is generated, then proved. For each level the order is:

     1. place the tap, the glass and the ledge the glass stands on
     2. size the tap to the glass (so nobody pours a flood)
     3. search for a ramp + the rests under it that win the level
     4. add the level's hazard in the "miss zone" — where a bad line's water
        ends up — and prove the level still wins
     5. write it out

   node tools/design.js [id...]        -> /tmp/design.json + /tmp/design.log
   node tools/design.js --write        -> also emits js/levels.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const WRITE = process.argv.includes('--write');
const EMIT = process.argv.includes('--emit');   // assemble from /tmp/design-L*.json only

const W = HG.W, H = HG.H;
const rectOf = (p) => ({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 });
const ov = (a, b, pad) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

// ---------------------------------------------------------------- the recipes
// Every level is a corridor with a different shape, a different support count
// and one hazard that punishes the wrong line. side: +1 the glass is right of
// the tap. Nothing here repeats a layout.
const R = [
  { n: 'First Pour',          side: 1, cw: 380, drop: 210, hazard: 'none',   restW: 104, tip: 'Lay the line across both rests so it cannot tip. Then let the tap run.' },
  { n: 'A Gentle Slope',      side: 1, cw: 480, tapY: 158, glassY: 512, glassH: 132, gw: 112, need: 0.56, hazard: 'hot',    restW: 100, fr: 3, plinthKind: 'stone', tip: 'A tall tap and a deep glass. Three short rests hold a long line better than two long ones.' },
  { n: 'Small Step',          side: 1, cw: 350, drop: 245, hazard: 'none',   restW: 84, restStyle: 'peg', tip: 'The glass sits low. Give the line a shallow run and let it finish the drop.' },
  { n: 'Over The Wall',       side: 1, cw: 470, drop: 200, hazard: 'crate',  restW: 92,  tip: 'A block stands in the way of a straight ramp. Go over it.' },
  { n: 'Twin Falls',          side: 1, cw: 660, tapY: 150, glassY: 470, need: 0.42, hazard: 'none',   restW: 84,  fr: 1, split: 2, tip: 'One tap, two glasses. Peak the line in the middle and the stream divides itself.' },
  { n: 'Crate & Glass',       side: 1, cw: 400, drop: 230, hazard: 'crate',  restW: 88, restStyle: 'shelf', tip: 'The crate is a rest as well as an obstacle. Use its top.' },
  { n: 'Wall Run',            side: 1, cw: 520, drop: 250, hazard: 'hot',    restW: 100, tip: 'A long shallow run. Three rests will hold it better than two.' },
  { n: 'Hot Floor',           side: -1, cw: 420, drop: 220, hazard: 'hot2',  restW: 92,  tip: 'The floor is heated. Keep the water in the air until the glass.' },
  { n: 'Spinner',             side: -1, cw: 380, drop: 240, hazard: 'spin',  restW: 86, restStyle: 'peg', tip: 'The bar below turns whatever misses into spray. Hit the glass instead.' },
  { n: 'Tilting Plank',       side: -1, cw: 460, drop: 210, hazard: 'crate', restW: 96,  tip: 'Nothing here is welded. Rest the line on solid timber and it holds.' },
  { n: 'The Bridge',          side: 1, cw: 430, tapY: 180, glassY: 470, need: 0.55, hazard: 'none',   restW: 26, fr: 1, restStyle: 'post', tip: 'Two stone columns stand in the gap. One straight line across them makes a bridge.' },
  { n: 'The Neck',            side: 1, cw: 390, drop: 255, hazard: 'hot',    restW: 92,  tip: 'A narrow drop. Get the line inside the mouth, not over the rim.' },
  { n: 'Crosswind',           side: -1, cw: 440, drop: 215, hazard: 'fan',   restW: 94, restStyle: 'peg', tip: 'The blower pushes the whole stream. Put the line above its reach.' },
  { n: 'The Staircase',       side: -1, cw: 500, tapY: 212, glassY: 432, glassH: 134, need: 0.55, hazard: 'crate2', restW: 92, fr: 3, tip: 'A low tap and a high glass. Step the line up; do not try to bridge it in one.' },
  { n: 'Pillar Drop',         side: 1, cw: 340, tapY: 172, glassY: 486, glassH: 124, gw: 96, need: 0.55, hazard: 'crate', restW: 74, fr: 1, crateKind: 'stone', tip: 'A narrow glass and a stone block under the gap. Short rests, one straight line.' },
  { n: 'Gear Works',          side: 1, cw: 400, drop: 245, hazard: 'spin2', restW: 90,  tip: 'Two bars spin below. Keep every drop on the line.' },
  { n: 'Long Reach',          side: 1, cw: 560, tapY: 182, glassY: 496, glassH: 112, need: 0.55, hazard: 'none',   restW: 104, fr: 3, tip: 'The longest reach in the book. Three rests and the shallowest line that lands.' },
  { n: 'The Long Drop',       side: 1, cw: 560, drop: 270, hazard: 'none',   restW: 104, restStyle: 'post', tip: 'The longest run in the book. Three rests and a shallow slope.' },
  { n: 'Hot Pipes',           side: 1, cw: 500, drop: 250, hazard: 'hot3',  restW: 96,  tip: 'Heated pads on the floor. Bridge over them and keep the line high.' },
  { n: 'The Sink',            side: 1, cw: 380, drop: 265, hazard: 'spin',   restW: 88,  tip: 'The glass sits in a hollow. Land the water inside the mouth.' },
  { n: 'Twin Spinners',       side: -1, cw: 420, drop: 230, hazard: 'spin2', restW: 92, restStyle: 'peg', tip: 'Two crossed bars. A wide, steady line keeps the stream together.' },
  { n: 'Upstream',            side: -1, cw: 470, tapY: 170, glassY: 506, glassH: 122, need: 0.55, hazard: 'fan',   restW: 98, fr: 1, fanForce: 0.08, tip: 'The blower shoves the stream left. Keep the line above its reach.' },
  { n: 'The Gauntlet',        side: 1, cw: 520, drop: 255, hazard: 'gauntlet', restW: 100, tip: 'Hot pad, spinner, long gap. Take it in one careful line.' },
  { n: 'Two Storeys',         side: 1, cw: 440, tapY: 190, glassY: 392, glassH: 112, glassY2: 534, need: 0.5, hazard: 'crate', restW: 92, fr: 1, twoTaps: true, tip: 'Two taps: one high glass, one low. Each stream needs its own rests.' },
  { n: 'Last Drop',           side: -1, cw: 350, tapY: 204, glassY: 520, glassH: 138, need: 0.52, hazard: 'hot',    restW: 86, fr: 0, tip: 'A deep glass sitting low. Slope the line and let the water run; do not drop it.' },
  { n: 'Hold It Up',          side: 1, cw: 400, drop: 205, hazard: 'none',   restW: 90,  tip: 'A high glass. The line can be almost flat if both ends rest.' },
  { n: 'Two Hands',           side: -1, cw: 430, tapY: 200, tapY2: 220, glassY: 410, glassY2: 540, glassH: 112, glassH2: 112, need: 0.5, hazard: 'crate', restW: 94, fr: 1, twoTaps: true, tapSide: [1, -1], tip: 'Two taps at the far edges, two lines, one corridor each. Keep the streams apart.' },
  { n: 'Slippery Shelf',      side: -1, cw: 400, tapY: 186, glassY: 452, need: 0.55, hazard: 'crate', restW: 88, fr: 3, crateKind: 'ice', tip: 'An ice shelf under the gap. Take the line over it and land the water clean.' },
  { n: 'Diamond Gap',         side: 1, cw: 360, drop: 235, hazard: 'crate',  restW: 84, restStyle: 'peg', tip: 'A short gap between blocks. A straight edge is all you need.' },
  { n: 'Gap Bridge',          side: -1, cw: 330, drop: 255, hazard: 'hot',    restW: 80,  tip: 'The glass dangles beyond a gap. Bridge it, then pour.' },
  { n: 'The Wedge',           side: 1, cw: 450, drop: 220, hazard: 'spin',   restW: 96,  tip: 'A spinning bar under the line. Keep the water on top of it.' },
  { n: 'Falling Weight',      side: 1, cw: 410, drop: 250, hazard: 'crate2', restW: 90,  tip: 'Crates stacked in the way. Lay the line over their tops.' },
  { n: 'Wind Tunnel',         side: -1, cw: 480, drop: 240, hazard: 'fan',   restW: 100, restStyle: 'post', tip: 'A blower with a long reach. Stay above it.' },
  { n: 'Juggler',             side: 1, cw: 380, drop: 260, hazard: 'spin2', restW: 86,  tip: 'Two bars juggling everything that misses. Do not miss.' },
  { n: 'Grand Finale',        side: 1, cw: 540, drop: 265, hazard: 'gauntlet', restW: 104, tip: 'Everything at once: heat, blades and a long gap. One line, one chance.' },
];

// --------------------------------------------------------------- geometry aids
const PED_H = 18;
function pedestalFor(g, kind) { return { x: g.x, y: g.y + g.h / 2 + PED_H / 2, w: Math.round(g.w + 44), h: PED_H, kind: kind || 'wood', angle: 0 }; }

function freeRects(items, extraPad, boxes) {
  const pad = extraPad || 10;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) if (ov(rectOf(items[i]), rectOf(items[j]), pad)) return false;
  }
  for (const it of items) {
    const r = rectOf(it);
    if (r.x0 < 8 || r.x1 > W - 8 || r.y0 < 76 || r.y1 > H - 16) return false;
    for (const b of (boxes || [])) if (ov(r, b, pad)) return false;
  }
  return true;
}

// the tap housing is scenery the pen refuses to draw inside
const tapBox = (f) => ({ x0: f.x - 33, x1: f.x + 33, y0: f.y - 80, y1: f.y - 14 });
const glassBox = (g) => ({ x0: g.x - g.w / 2 - 6, x1: g.x + g.w / 2 + 6, y0: g.y - g.h / 2 - 6, y1: g.y + g.h / 2 + 6 });

// Mirror of Scene#inkPointBlocked: the pen refuses to lay ink inside scenery,
// the glasses or the tap housing (with its 2 px sink). A reference line that
// the pen would clip is not a reference line, so every candidate stroke is
// tested with the same rule the player's pen uses.
const PEN_PAD = 2;
function inkBlocked(x, y, points, glasses, faucets) {
  for (const p of points) {
    if (Math.abs(x - p.x) <= p.w / 2 + PEN_PAD && Math.abs(y - p.y) <= p.h / 2 + PEN_PAD) return true;
  }
  for (const g of glasses) {
    if (Math.abs(x - g.x) <= g.w / 2 + 6 && Math.abs(y - g.y) <= g.h / 2 + 6) return true;
  }
  for (const f of faucets) {
    if (x > f.x - 33 && x < f.x + 33 && y > f.y - 80 && y < f.y - 14) return true;
  }
  return false;
}

function strokeClear(stroke, rests, glasses, faucets) {
  for (let i = 1; i < stroke.length; i++) {
    const [xa, ya] = stroke[i - 1];
    const [xb, yb] = stroke[i];
    const n = Math.max(2, Math.ceil(Math.hypot(xb - xa, yb - ya) / 6));
    for (let k = 0; k <= n; k++) {
      if (inkBlocked(xa + (xb - xa) * k / n, ya + (yb - ya) * k / n, rests, glasses, faucets)) return false;
    }
  }
  return true;
}

// How many droplets actually fill this glass: ask the game's own Glass class
// rather than re-deriving the trapezoid, because the tap has to be sized
// against the same number the win condition uses.
function needCountOf(g) {
  const lv = {
    id: 0, name: '', ink: 900, faucets: [{ x: 60, y: 190, rate: 26, total: 60 }], glasses: [g],
    platforms: [], crates: [], spinners: [], seesaws: [], hots: [], fans: [], pins: [],
  };
  const sc = new HG.Scene(lv);
  const n = sc.glasses[0].needCount;
  sc.destroy();
  return n;
}

// ------------------------------------------------------------------ one level
function buildLevel(spec, index) {
  const id = index + 1;
  const glassY = spec.glassY || 470;
  const glassH = spec.glassH || 118;
  const gw = spec.gw || 108;
  const need = spec.need || 0.55;
  const tapY = spec.tapY || 190;

  // --- glasses and taps
  const glasses = [];
  if (spec.split) {
    // one tap over two glasses: the line is peaked at the tap and forks
    for (let i = 0; i < spec.split; i++) {
      const x = Math.round(W / 2 + (i - (spec.split - 1) / 2) * spec.cw);
      glasses.push({ x, y: glassY, w: spec.gw || 104, h: glassH, need: need });
    }
  } else if (spec.twoTaps) {
    glasses.push({ x: Math.round(W / 2 + 210), y: glassY, w: gw, h: glassH, need: need });
    glasses.push({ x: Math.round(W / 2 - 210), y: spec.glassY2 || glassY, w: gw, h: spec.glassH2 || glassH, need: need });
  } else {
    const dir = spec.side;
    const gx = Math.round(W / 2 + dir * spec.cw * 0.5);
    glasses.push({ x: gx, y: glassY, w: gw, h: glassH, need: need });
  }

  const faucets = [];
  if (spec.twoTaps) {
    // `tapSide` decides which way each tap is offset from its glass, so the two
    // corridors can be pushed to opposite edges and never cross.
    const ts = spec.tapSide || [glasses[0].x > W / 2 ? -1 : 1, glasses[1].x > W / 2 ? -1 : 1];
    faucets.push({ x: glasses[0].x + ts[0] * 350, y: tapY });
    faucets.push({ x: glasses[1].x + ts[1] * 350, y: spec.tapY2 || tapY + 110 });
  } else if (spec.split) {
    faucets.push({ x: Math.round(W / 2), y: tapY });
  } else {
    faucets.push({ x: Math.round(glasses[0].x - spec.side * spec.cw), y: tapY });
  }
  faucets.forEach((f) => { f.rate = 26; f.total = 60; f.spread = 0.55; });

  const pedestals = glasses.map((g) => pedestalFor(g, spec.plinthKind));
  const platforms = pedestals.slice();
  const crates = [];
  const hots = [];
  const spinners = [];
  const fans = [];
  const pins = [];

  // --- deco + hazards that sit in the MISS zone: below the ramp, between the
  //     tap and the glass. They never touch the line a player should draw.
  const midX = Math.round((faucets[0].x + glasses[0].x) / 2);
  const floorY = H - 60;
  const hz = spec.hazard;
  if (hz === 'crate') crates.push({ x: midX, y: floorY, size: 92, kind: spec.crateKind || 'teal', angle: 0 });
  if (hz === 'crate2') {
    crates.push({ x: midX - 70, y: floorY, size: 88, kind: 'wood', angle: 0 });
    crates.push({ x: midX + 60, y: floorY - 90, size: 76, kind: 'teal', angle: 0 });
  }
  if (hz === 'hot') hots.push({ x: midX, y: floorY + 10, w: 300, h: 26, angle: 0 });
  if (hz === 'hot2') {
    hots.push({ x: midX - 90, y: floorY, w: 220, h: 26, angle: 0 });
    hots.push({ x: midX + 110, y: floorY + 30, w: 220, h: 26, angle: 0 });
  }
  if (hz === 'hot3') {
    hots.push({ x: midX - 130, y: floorY, w: 200, h: 26, angle: 0 });
    hots.push({ x: midX + 60, y: floorY + 20, w: 240, h: 26, angle: 0 });
    hots.push({ x: midX + 250, y: floorY - 20, w: 140, h: 26, angle: 0 });
  }
  if (hz === 'spin') spinners.push({ x: midX, y: floorY - 70, w: 150, h: 16, speed: 0 });
  if (hz === 'spin2') {
    spinners.push({ x: midX - 80, y: floorY - 80, w: 130, h: 16, speed: 0 });
    spinners.push({ x: midX + 90, y: floorY - 40, w: 130, h: 16, speed: 0 });
  }
  if (hz === 'fan') fans.push({ x: midX, y: floorY - 30, w: 120, h: 70, angle: 0, force: spec.fanForce || 0.13, dir: spec.side });
  if (hz === 'gauntlet') {
    hots.push({ x: midX - 150, y: floorY, w: 220, h: 26, angle: 0 });
    spinners.push({ x: midX + 70, y: floorY - 60, w: 150, h: 16, speed: 0 });
    spinners.push({ x: midX + 220, y: floorY - 10, w: 120, h: 16, speed: 0 });
  }

  const blocked = [tapBox(faucets[0])].concat(glasses.map(glassBox)).concat(glasses.map(rectOf.bind(null)).map((r) => r));
  const boxes = blocked.concat(pedestals.map(rectOf))
    .concat(crates.map((c) => ({ x0: c.x - c.size / 2, x1: c.x + c.size / 2, y0: c.y - c.size / 2, y1: c.y + c.size / 2 })))
    .concat(hots.map(rectOf)).concat(spinners.map(rectOf)).concat(fans.map(rectOf));

  // --- size the tap to the glass(es)
  // Size every tap so its glass can reach `need` with room for what the line
  // drinks, but without turning the level into a flood: 2x the droplets the
  // glass needs (the audit refuses anything above 3.2x).
  const needOf = (g) => needCountOf(g);
  if (spec.split) {
    faucets[0].total = Math.round(needOf(glasses[0]) * 2.9);
  } else {
    faucets.forEach((f, i) => {
      const g = glasses[i] || glasses[0];
      f.total = Math.max(26, Math.round(needOf(g) * 2.1));
    });
  }

  // --- the ramp search
  const rimY = (g) => g.y - g.h / 2;
  const attempts = [];

  function tryRamp(f, g, start, endOff, dy0, dy1, fracs, rw, extraRests) {
    const s = Math.sign(g.x - f.x) || 1;
    const x0 = f.x + s * start;
    const x1 = g.x + endOff;
    const y0 = f.y + dy0;
    const y1 = rimY(g) - dy1;
    const span = (x1 - x0) * s;
    if (span < 120) return null;
    if (y1 < y0 + 16) return null;
    const slope = (y1 - y0) / (x1 - x0);
    if (Math.abs(slope) > 0.42) return null;
    const lineY = (x) => y0 + slope * (x - x0);
    const rests = (extraRests || []).slice();
    for (const fr of fracs) {
      const x = x0 + (x1 - x0) * fr;
      rests.push({ x: Math.round(x), y: Math.round(lineY(x) + 4 + 7), w: rw, h: 14, kind: 'wood', angle: 0 });
    }
    // keep the line itself clear of scenery it would be drawn through
    const linePts = [];
    for (let t = 0; t <= 1.0001; t += 0.05) linePts.push({ x: x0 + (x1 - x0) * t, y: lineY(x0 + (x1 - x0) * t) });
    for (const p of linePts) {
      for (const b of boxes) {
        if (p.x > b.x0 - 2 && p.x < b.x1 + 2 && p.y > b.y0 - 2 && p.y < b.y1 + 2) return null;
      }
    }
    if (!freeRects(rests, 8, boxes)) return null;
    return { x0, y0, x1, y1, rests, stroke: [[x0, y0], [x1, y1]] };
  }

  // build a ramp + rests from an already-solved aim point
  function tryRampGeo(c, fracs, rw, extraRests) {
    const { x0, y0, x1, y1 } = c;
    const slope = (y1 - y0) / (x1 - x0);
    const lineY = (x) => y0 + slope * (x - x0);
    for (let t = 0; t <= 1.0001; t += 0.04) {
      const x = x0 + (x1 - x0) * t, y = lineY(x);
      for (const b of boxes) {
        if (x > b.x0 - 2 && x < b.x1 + 2 && y > b.y0 - 2 && y < b.y1 + 2) return null;
      }
    }
    // How far under the wire the bracket sits. It has to clear the pen's 2 px
    // sink along the pad's whole width, and the wire has to be able to fall the
    // rest of the way onto it, so try a few depths and keep the first that both
    // the pen and the physics accept.
    for (const off of [14, 17, 21]) {
      const rests = (extraRests || []).slice();
      const style = spec.restStyle || 'bracket';
      const posts = style === 'post';
      // the shape of the thing the wire lies on is the level's signature: a
      // wide shelf, a small tack, a floating bracket or a column from the floor
      const dims = style === 'peg' ? { w: 30, h: 12 }
        : style === 'shelf' ? { w: 156, h: 20 }
          : { w: rw, h: 14 };
      for (const fr of fracs) {
        const x = x0 + (x1 - x0) * fr;
        const top = lineY(x) + off;
        if (posts) {
          // a column standing on the ground, not a bracket floating in the air
          const h = Math.round(H - 30 - top);
          rests.push({ x: Math.round(x), y: Math.round(top + h / 2), w: rw, h, kind: 'stone', angle: 0 });
        } else {
          rests.push({ x: Math.round(x), y: Math.round(top), w: dims.w, h: dims.h, kind: 'wood', angle: 0 });
        }
      }
      if (!freeRects(rests, 8, boxes)) continue;
      const stroke = [[x0, y0], [x1, y1]];
      if (!strokeClear(stroke, rests, glasses, faucets)) continue;
      return { x0, y0, x1, y1, rests, stroke };
    }
    return null;
  }

  function evaluate(cand, f, g, level) {
    const gi = level.glasses.indexOf(g);        // NB: before the deep copy
    const lv = JSON.parse(JSON.stringify(level));
    lv.platforms = lv.platforms.concat(cand.rests);
    const st = poly(cand.stroke.map((p) => [p[0], p[1]]), 8);
    const r = play(HG, id, [st], { frames: 60 * 13, level: lv });
    const q = r.fills[gi];
    const ok = q && (q.ok || q.fill >= g.need - 0.12);
    if (q && q.fill > (evaluate.best || 0)) evaluate.best = q.fill;
    const r2 = ok ? play(HG, id, [poly(cand.stroke.map((p) => [p[0] + 2, p[1] + 1]), 8)], { frames: 60 * 13, level: lv }) : null;
    const ok2 = r2 && r2.fills[gi] && (r2.fills[gi].ok || r2.fills[gi].fill >= g.need - 0.12);
    return ok && ok2 ? { r: r2, cand } : null;
  }

  const base = {
    id, name: spec.n, tip: spec.tip, ink: 900,
    faucets, glasses, platforms, crates, hots, spinners, fans, pins,
    seesaws: [],
  };

  // ---- how water actually leaves a ramp
  // It keeps the speed it picked up on the slope and then flies. That is why a
  // ramp that ends above the glass overshoots it: on a 460 px run the water
  // arrives at ~7 px/frame and sails a further 80-110 px before the rim. So the
  // aim point is solved, not guessed: for each ramp we predict the ballistic
  // landing, keep only the ones that land inside the mouth, and verify those.
  const G = 1381;                 // px/s^2, measured
  const DRAG = 0.78;              // what friction and air drag actually steal
  function landing(x0, y0, x1, y1, rimY) {
    const span = Math.abs(x1 - x0);
    if (span < 40) return null;
    const drop = y1 - y0;
    if (drop <= 0) return null;
    const v = DRAG * Math.sqrt(2 * G * drop);
    const s = drop / (x1 - x0);
    const vx = v / Math.sqrt(1 + s * s) * Math.sign(x1 - x0);
    const vy = v * Math.abs(s) / Math.sqrt(1 + s * s);   // always downward
    const dy = rimY - y1;
    if (dy <= 0) return null;
    const t = (-vy + Math.sqrt(vy * vy + 2 * G * dy)) / G;
    return x1 + vx * t;
  }

  const STARTS = [-100, -55, -20, 12];
  const DY0 = [60, 100, 145, 190];
  const DY1 = [22, 44, 70, 105];
  const FRAC = [[0.16, 0.84], [0.12, 0.5, 0.88], [0.2, 0.8], [0.1, 0.45, 0.82], [0.25, 0.75]];
  const RW = [spec.restW || 90, 70, 104];
  // A split pour hangs two beams off the same tap, so their rests must sit away
  // from the mouth or the two sets of pads land on top of each other.
  const FR = spec.split
    ? [[0.44, 0.88], [0.34, 0.64, 0.92], [0.52, 0.88]]
    : spec.fr != null ? [FRAC[spec.fr]].concat(FRAC.filter((_, i) => i !== spec.fr)) : FRAC;

  // ------------------------------------------------------------- verification
  // A solution only counts if the machine's own line wins *and* the same line
  // nudged by a pixel or three still wins. A hand will not draw the exact beam
  // this tool searches for, so a knife-edge solution is rejected here instead of
  // being shipped as "winnable". This is what failed L2 all those runs ago.
  const JITTER = [
    (p) => [p[0] + 2, p[1] + 1],
    (p) => [p[0] - 2, p[1] - 1],
    (p) => [p[0] + 1, p[1] + 3],
  ];
  const toPoly = (arr) => arr.map((st) => poly(st.map((p) => [p[0], p[1]]), 8));
  const jitter = (arr, k) => arr.map((st) => poly(st.map((p) => JITTER[k % JITTER.length](p)), 8));

  function playsFine(lv, strokes) {
    const r = play(HG, id, toPoly(strokes), { frames: 60 * 14, level: lv });
    if (!r.won) return { ok: false, r, won: 0 };
    let won = 0;
    for (let k = 0; k < JITTER.length; k++) {
      attempts.push(1);
      if (play(HG, id, jitter(strokes, k), { frames: 60 * 14, level: lv }).won) won++;
    }
    return { ok: won >= 2, r, won };
  }

  // the pairs of (tap, glass) that have to be solved; everything sharing one
  // stream is solved together later, so split pours share a single line.
  const pairs = spec.twoTaps
    ? [[faucets[0], glasses[0]], [faucets[1], glasses[1]]]
    : spec.split
      ? glasses.map((g) => [faucets[0], g])
      : [[faucets[0], glasses[0]]];

  const PER_PAIR = pairs.length > 1 ? 3 : 4;
  const solved = [];
  let failReason = 'no aim lands in the mouth';

  for (const [f, g] of pairs) {
    const gi = base.glasses.indexOf(g);
    const dir = Math.sign(g.x - f.x) || 1;
    const rim = rimY(g);
    // Streams solved earlier are not packed in here — a mirrored pair would
    // always collide near the shared tap. The whole set is checked once it is
    // assembled, and combinations that clash are skipped.
    const extras = [];

    // every aim whose ballistic landing falls inside the mouth, squarest first
    const STARTS_HERE = spec.split ? [-8, 10] : STARTS;
    const aims = [];
    for (const start of STARTS_HERE) for (const dy0 of DY0) for (const dy1 of DY1) {
      const x0 = f.x + dir * start;
      const y0 = f.y + dy0;
      const y1 = rim - dy1;
      for (let k = 150; k <= 700; k += 12) {
        const x1 = x0 + dir * k;
        const land = landing(x0, y0, x1, y1, rim);
        if (land == null) continue;
        const off = Math.abs(land - g.x);
        if (off > g.w / 2 - 14) continue;
        const s = (y1 - y0) / (x1 - x0);
        if (Math.abs(s) > 0.45) continue;
        aims.push({ x0, y0, x1, y1, off, s });
      }
    }
    aims.sort((a, b) => a.off - b.off);
    if (process.env.HG_DEBUG) console.log('   aims in the mouth:', aims.length, 'best', aims.length ? aims[0].off.toFixed(0) : '-');

    const picks = [];
    let tried = 0;
    outer:
    for (const a of aims.slice(0, 140)) {
      for (const fracs of FR) for (const rw of RW) {
        const cand = tryRampGeo(a, fracs, rw, extras);
        if (!cand) continue;
        if (++tried > 100) break outer;
        const lv = JSON.parse(JSON.stringify(base));
        lv.platforms = lv.platforms.concat(cand.rests);
        const r = play(HG, id, toPoly([cand.stroke]), { frames: 60 * 13, level: lv });
        const q = r.fills[gi];
        if (!q || !q.ok) continue;
        picks.push({ cand, score: q.fill - g.need, fill: q.fill });
        continue outer;                        // one geometry per aim is enough
      }
    }
    if (!picks.length) {
      failReason = 'no ramp fills glass ' + (gi + 1) + ' (tried ' + tried + ')';
      break;
    }
    picks.sort((a, b) => b.score - a.score);
    solved.push({ cands: picks.slice(0, PER_PAIR) });
  }

  // ---------------------------------------------------------------- assembly
  // One helper builds the finished level and proves it: the machine's line must
  // win, and the same line nudged a pixel or three must win too.
  function attempt(rests, strokes) {
    if (!freeRects(rests, 8, boxes)) return null;      // two lines cannot share a pad
    const lv = JSON.parse(JSON.stringify(base));
    lv.platforms = lv.platforms.concat(rests);
    const inkUsed = strokes.reduce((acc, st) => {
      let d = 0;
      for (let i = 1; i < st.length; i++) d += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
      return acc + d;
    }, 0);
    lv.ink = Math.max(Math.round(inkUsed * 1.35 / 10) * 10, 60);
    // cheap gate first: a single run before the four-run proof
    const quick = play(HG, id, toPoly(strokes), { frames: 60 * 14, level: lv });
    if (!quick.won) return null;
    const chk = playsFine(lv, strokes);
    if (!chk.ok) return null;
    return { rests, strokes, inkUsed, level: lv, r: chk.r };
  }

  let best = null;
  let lastFail = failReason;

  if (spec.split) {
    // A fork is ONE line: it starts in the left glass, peaks under the tap and
    // ends in the right one. Two separate lines would shove each other off the
    // mouth, and one line is what the paper would show anyway.
    const f = faucets[0];
    const L = glasses[0];
    const Rt = glasses[glasses.length - 1];
    split:
    for (const apexDy of [46, 66, 86, 108, 130]) {
      for (const endDy of [18, 34, 52, 72]) {
        for (const inset of [-26, -10, 8, 22]) {
          for (const rw of RW) {
            const apexY = f.y + apexDy;
            const endY = rimY(L) - endDy;
            if (endY <= apexY + 18) continue;
            const st = [[L.x + inset, endY], [f.x, apexY], [Rt.x - inset, endY]];
            const legs = [[st[0][0], st[0][1], st[1][0], st[1][1]], [st[1][0], st[1][1], st[2][0], st[2][1]]];
            const rests = legs.map((g2) => ({
              x: Math.round((g2[0] + g2[2]) / 2),
              y: Math.round((g2[1] + g2[3]) / 2) + 16,
              w: rw, h: 14, kind: 'wood', angle: 0,
            }));
            let clear = true;
            for (const leg of legs) {
              for (let t = 0; t <= 1.0001 && clear; t += 0.05) {
                const x = leg[0] + (leg[2] - leg[0]) * t;
                const y = leg[1] + (leg[3] - leg[1]) * t;
                for (const b of boxes) if (x > b.x0 - 2 && x < b.x1 + 2 && y > b.y0 - 2 && y < b.y1 + 2) clear = false;
              }
              if (!clear) break;
            }
            if (!clear) continue;
            if (!strokeClear(st, rests, glasses, faucets)) continue;
            attempts.push(1);
            const res = attempt(rests, [st]);
            if (res) { best = res; break split; }
          }
        }
      }
    }
    if (!best) lastFail = 'no fork wins';
  } else if (solved.length === pairs.length) {
    let combos = [[]];
    for (const s2 of solved) {
      const next = [];
      for (const cb of combos) for (const pk of s2.cands) next.push(cb.concat([pk]));
      next.sort((a, b) => b.reduce((t, p) => t + p.score, 0) - a.reduce((t, p) => t + p.score, 0));
      combos = next.slice(0, 6);
    }
    for (const combo of combos) {
      const res = attempt(combo.flatMap((p) => p.cand.rests), combo.map((p) => p.cand.stroke));
      if (res) { best = res; break; }
      lastFail = 'no combination of the per-tap solutions wins the level';
    }
  }

  if (!best) return { id, spec, failed: true, reason: lastFail, tries: attempts.length };

  return {
    id, spec, level: best.level, rests: best.rests, stroke: best.strokes[0], strokes: best.strokes,
    ink: best.level.ink, inkUsed: Math.round(best.inkUsed), fill: best.r.fills, tries: attempts.length,
  };
}

// ----------------------------------------------------------------------- run
const out = [];
for (let i = 0; i < R.length && !EMIT; i++) {
  if (only.length && !only.includes(i + 1)) continue;
  const t0 = Date.now();
  const res = buildLevel(R[i], i);
  out.push(res);
  const secs = ((Date.now() - t0) / 1000).toFixed(0) + 's';
  if (res.failed) {
    console.log('L' + String(i + 1).padStart(2), R[i].n.padEnd(18), 'FAILED', res.reason || '', '(' + res.tries + ' proves, ' + secs + ')');
  } else {
    console.log('L' + String(i + 1).padStart(2), R[i].n.padEnd(18), 'ok  rests', String(res.rests.length),
      ' ink', String(res.inkUsed).padStart(4) + '/' + res.ink,
      ' fill', res.fill.map((f) => f.fill.toFixed(2)).join('/'), secs);
  }
  fs.writeFileSync('/tmp/design-L' + (i + 1) + '.json', JSON.stringify(res, null, 1));
  fs.writeFileSync('/tmp/design.json', JSON.stringify(out, null, 1));
}

// --------------------------------------------------------------------- write
// Levels are solved in chunks (a whole set does not fit in one tool call), so
// every result is parked in /tmp/design-L<id>.json and the writer assembles
// whatever is on disk. `--emit` does that without solving anything.
const all = [];
for (let i = 0; i < R.length; i++) {
  const fresh = out.find((r) => r.id === i + 1);
  if (fresh) { all.push(fresh); continue; }
  const f = '/tmp/design-L' + (i + 1) + '.json';
  all.push(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { id: i + 1, failed: true, reason: 'not solved yet' });
}

if (WRITE || EMIT) {
  const good = all.filter((r) => !r.failed);
  if (good.length !== R.length) {
    console.log('\nrefusing to write: ' + (R.length - good.length) + ' level(s) failed: ' +
      all.filter((r) => r.failed).map((r) => 'L' + r.id).join(' '));
    process.exitCode = 1;
  } else {
    const num = (n) => (Math.round(n * 10) / 10);
    const body = good.map((r) => {
      const lv = r.level;
      const P = (p) => `P({ x: ${num(p.x)}, y: ${num(p.y)}, w: ${p.w}, h: ${p.h}, kind: '${p.kind || 'wood'}' })`;
      const lines = [];
      lines.push('    {');
      lines.push(`      name: ${JSON.stringify(r.spec.n)},`);
      lines.push(`      tip: ${JSON.stringify(r.spec.tip)},`);
      lines.push(`      ink: ${lv.ink},`);
      if (lv.faucets.length === 1) {
        const f = lv.faucets[0];
        lines.push(`      faucet: { x: ${f.x}, y: ${f.y}, rate: ${f.rate}, total: ${f.total} },`);
      } else {
        lines.push('      faucets: [');
        lv.faucets.forEach((f) => lines.push(`        { x: ${f.x}, y: ${f.y}, rate: ${f.rate}, total: ${f.total} },`));
        lines.push('      ],');
      }
      lines.push('      glasses: [');
      lv.glasses.forEach((g) => lines.push(`        { x: ${num(g.x)}, y: ${num(g.y)}, w: ${g.w}, h: ${g.h}, need: ${g.need} },`));
      lines.push('      ],');
      if (lv.platforms.length) {
        lines.push('      platforms: [');
        lv.platforms.forEach((p) => lines.push('        ' + P(p) + ','));
        lines.push('      ],');
      }
      if (lv.crates.length) {
        lines.push('      crates: [');
        lv.crates.forEach((c) => lines.push(`        { x: ${num(c.x)}, y: ${num(c.y)}, size: ${c.size}, kind: '${c.kind}' },`));
        lines.push('      ],');
      }
      if (lv.hots.length) {
        lines.push('      hots: [');
        lv.hots.forEach((h) => lines.push(`        { x: ${num(h.x)}, y: ${num(h.y)}, w: ${h.w}, h: ${h.h} },`));
        lines.push('      ],');
      }
      if (lv.spinners.length) {
        lines.push('      spinners: [');
        lv.spinners.forEach((s) => lines.push(`        { x: ${num(s.x)}, y: ${num(s.y)}, w: ${s.w}, h: ${s.h}, speed: ${s.speed} },`));
        lines.push('      ],');
      }
      if (lv.fans.length) {
        lines.push('      fans: [');
        lv.fans.forEach((f) => lines.push(`        { x: ${num(f.x)}, y: ${num(f.y)}, w: ${f.w}, h: ${f.h}, angle: ${f.angle}, force: ${f.force}, dir: ${f.dir} },`));
        lines.push('      ],');
      }
      lines.push('    },');
      return lines.join('\n');
    });

    const head = fs.readFileSync('js/levels.js', 'utf8').split('  const LEVELS = [')[0];
    const tail = fs.readFileSync('js/levels.js', 'utf8');
    const tailFrom = tail.indexOf('  // ------------------------------------------------------------- normalising');
    const file = head + '  const LEVELS = [\n' + body.join('\n') + '\n  ];\n\n' + tail.slice(tailFrom);
    fs.writeFileSync('js/levels.js', file);

    // reference solutions
    const sols = good.map((r) => {
      const strokes = r.strokes || [r.stroke];
      return '  ' + r.id + ': [' + strokes.map((st) =>
        '[' + st.map((p) => '[' + num(p[0]) + ', ' + num(p[1]) + ']').join(', ') + ']').join(', ') + '],';
    });
    const solHead = fs.readFileSync('tools/solutions.js', 'utf8').split('module.exports = {')[0];
    fs.writeFileSync('tools/solutions.js', solHead + 'module.exports = {\n' + sols.join('\n') + '\n};\n');
    console.log('wrote js/levels.js and tools/solutions.js (' + good.length + ' levels)');
  }
}
console.log('\ndone:', all.filter((r) => !r.failed).length + '/' + all.length);

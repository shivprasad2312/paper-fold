/* tools/room-plan/terrain-emit.js — write the proved mass rooms into the game.

   terrain.js is the workshop: it holds the rooms in the shape the sweeps and
   the prover want (`stage`, `slot`, `answer`). The game wants two other shapes:
   js/levels.js (no answer, no slot) and tools/hero-rooms.js (answer + verb +
   intent). Both are emitted from the same room record so a proved room can
   never be transcribed into the game with different geometry — the trap that
   already cost the Long Shelf and the Overhang their answers once.

     node tools/room-plan/terrain-emit.js levels   → level objects for 16-40
     node tools/room-plan/terrain-emit.js hero     → hero-room entries for 16-40

   Slots 41-43 are spares: they are proved, kept in terrain.js, and deliberately
   NOT emitted (the game has forty levels).
   ========================================================================== */
'use strict';
const T = require('./terrain');

const SLOTS = Array.from({ length: 25 }, (_, i) => i + 16);

const rooms = Object.keys(T)
  .filter((k) => T[k] && T[k].slot)
  .map((k) => T[k]);

function roomFor(slot) {
  const r = rooms.find((x) => x.slot === slot);
  if (!r) throw new Error('no proved terrain room for slot ' + slot);
  return r;
}

const glassOf = (r) => Object.assign({ w: 108, h: 118, need: 0.5 }, r.glasses[0]);

// Ink: the proved line plus a margin. The room is solvable at `answer` length;
// the budget has to be generous enough that a player's rougher line still fits,
// and tight enough that the budget is not free.
function inkFor(r) {
  const a = r.answer || [];
  let len = 0;
  for (let i = 1; i < a.length; i++) len += Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]);
  return Math.max(200, Math.ceil((len * 1.2) / 10) * 10);
}

const num = (v) => (typeof v === 'number' ? String(v) : v);
const poly = (p) => '[' + p.poly.map((q) => `[${q[0]}, ${q[1]}]`).join(', ') + ']';

function stageFor(r, indent, useP) {
  const out = [];
  for (const p of r.stage) {
    if (p.poly) out.push(`${indent}{ kind: '${p.kind || 'teal'}', poly: ${poly(p)} },`);
    else if (useP) out.push(`${indent}P({ x: ${num(p.x)}, y: ${num(p.y)}, w: ${num(p.w)}, h: ${num(p.h)}, kind: '${p.kind || 'teal'}' }),`);
    else out.push(`${indent}{ x: ${num(p.x)}, y: ${num(p.y)}, w: ${num(p.w)}, h: ${num(p.h)}, kind: '${p.kind || 'teal'}' },`);
  }
  return out;
}

function levelsOut() {
  return SLOTS.map((slot) => {
    const r = roomFor(slot);
    const g = glassOf(r);
    const lines = [];
    lines.push('    {');
    lines.push(`      name: ${JSON.stringify(r.name)},`);
    lines.push(`      tip: ${JSON.stringify(r.tip)},`);
    lines.push(`      ink: ${inkFor(r)},`);
    lines.push(`      faucet: { x: ${r.faucet.x}, y: ${r.faucet.y}, rate: ${r.faucet.rate}, total: ${r.faucet.total} },`);
    lines.push('      glasses: [');
    lines.push(`        { x: ${g.x}, y: ${g.y}, w: ${g.w}, h: ${g.h}, need: ${g.need} },`);
    lines.push('      ],');
    lines.push('      platforms: [');
    lines.push(...stageFor(r, '        ', true));
    lines.push('      ],');
    if (r.crates && r.crates.length) {
      lines.push('      crates: [');
      for (const c of r.crates) lines.push(`        { x: ${c.x}, y: ${c.y}, w: ${c.w}, h: ${c.h}, kind: 'wood' },`);
      lines.push('      ],');
    }
    if (r.balls && r.balls.length) {
      lines.push('      balls: [');
      for (const b of r.balls) lines.push(`        { x: ${b.x}, y: ${b.y}, r: ${b.r}, kind: '${b.kind}' },`);
      lines.push('      ],');
    }
    lines.push('    },');
    return lines.join('\n');
  }).join('\n');
}

function heroOut() {
  return SLOTS.map((slot) => {
    const r = roomFor(slot);
    const g = glassOf(r);
    const lines = [];
    lines.push('  {');
    lines.push(`    id: ${slot}, name: ${JSON.stringify(r.name)}, verb: ${JSON.stringify(r.verb)}, intent: ${JSON.stringify(r.intent)},`);
    lines.push(`    answer: ${JSON.stringify(r.answer).replace(/\],\[/g, '], [')},`);
    lines.push(`    tip: ${JSON.stringify(r.tip)},`);
    lines.push(`    faucet: { x: ${r.faucet.x}, y: ${r.faucet.y}, rate: ${r.faucet.rate}, total: ${r.faucet.total} },`);
    lines.push(`    glasses: [{ x: ${g.x}, y: ${g.y}, w: ${g.w}, h: ${g.h}, need: ${g.need} }],`);
    lines.push(`    delay: ${r.delay == null ? 0.4 : r.delay},`);
    lines.push('    stage: [');
    lines.push(...stageFor(r, '      ', false));
    lines.push('    ],');
    if (r.crates && r.crates.length) {
      lines.push('    crates: [');
      for (const c of r.crates) lines.push(`      { x: ${c.x}, y: ${c.y}, w: ${c.w}, h: ${c.h}, kind: 'wood' },`);
      lines.push('    ],');
    }
    if (r.balls && r.balls.length) {
      lines.push('    balls: [');
      for (const b of r.balls) lines.push(`      { x: ${b.x}, y: ${b.y}, r: ${b.r}, kind: '${b.kind}' },`);
      lines.push('    ],');
    }
    lines.push('  },');
    return lines.join('\n');
  }).join('\n');
}

module.exports = { SLOTS, roomFor, inkFor, levelsOut, heroOut };

if (require.main === module) {
  const what = process.argv[2];
  if (what === 'levels') console.log(levelsOut());
  else if (what === 'hero') console.log(heroOut());
  else {
    console.error('usage: node tools/room-plan/terrain-emit.js levels|hero');
    process.exit(1);
  }
}

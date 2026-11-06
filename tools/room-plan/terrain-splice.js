/* tools/room-plan/terrain-splice.js — push the proved rooms into the game files.

   Three files carry the same forty levels and they must agree:

     js/levels.js        what the game plays (no answers)
     tools/hero-rooms.js what the prover plays (answers, verb, intent)
     tools/solutions.js  what `npm run verify` plays (answers only)

   Hand-copying between them is how the Long Shelf and the Overhang lost their
   answers: a `{x,y,w,h}` rect is centred on (x,y) and these masses have their
   top at y, so a "tidy" transcription moved them 32 px. Nothing here is typed
   by hand — every number comes from terrain.js via terrain-emit.js, and the
   entries are replaced *in place* by index so the other 15 levels are untouched.

     node tools/room-plan/terrain-splice.js          write all three
     node tools/room-plan/terrain-splice.js --check  report, write nothing
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { SLOTS, roomFor, levelsOut, heroOut } = require('./terrain-emit');

const ROOT = path.resolve(__dirname, '../..');
const CHECK = process.argv.includes('--check');

// Text spans of the top-level `{ ... }` literals inside an array literal. Brace
// depth is counted with strings and comments skipped, so a `}` inside a tip
// string cannot end an entry early.
function spans(src, anchor, indent) {
  const open = src.indexOf(anchor);
  if (open < 0) throw new Error('anchor not found: ' + anchor);
  const ind = ' '.repeat(indent);
  const out = [];
  let from = open;
  for (;;) {
    const j = src.indexOf('\n' + ind + '{', from);
    if (j < 0) break;
    let k = j + ind.length + 1;
    let depth = 0;
    while (k < src.length) {
      const ch = src[k];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) break; }
      else if (ch === "'" || ch === '"') {
        const q = ch;
        k++;
        while (src[k] !== q) { if (src[k] === '\\') k++; k++; }
      } else if (ch === '/' && src[k + 1] === '/') {
        while (src[k] !== '\n') k++;
      }
      k++;
    }
    out.push([j, k + 1]);
    const next = /\n {2,}\{/.exec(src.slice(k + 1));
    const close = /\n\s*\];/.exec(src.slice(k + 1));
    if (!next || (close && close.index < next.index)) break;
    from = k + 1;
  }
  return out;
}

function spliceEntries(file, anchor, indent, first, last, body) {
  const src = fs.readFileSync(file, 'utf8');
  const sp = spans(src, anchor, indent);
  if (sp.length < last) throw new Error(file + ': found ' + sp.length + ' entries, wanted ' + last);
  const a0 = sp[0][0];
  const aPrev = sp[first - 1][1];
  const aLast = sp[last - 1][1];
  if (src[aPrev] !== ',' || src[aLast] !== ',') {
    throw new Error(file + ': expected a comma after entry ' + first + ' and ' + last);
  }
  const out = src.slice(0, a0) + src.slice(a0, aPrev) + ',\n' + body + src.slice(aLast + 1);
  if (!CHECK) fs.writeFileSync(file, out);
  return { file: path.relative(ROOT, file), entries: sp.length };
}

const levels = spliceEntries(path.join(ROOT, 'js/levels.js'), 'const LEVELS = [', 4, 15, 40, levelsOut());
const hero = spliceEntries(path.join(ROOT, 'tools/hero-rooms.js'), 'const S = [', 2, 15, 40, heroOut());

// solutions.js — one stroke per level, in the same order.
const solPath = path.join(ROOT, 'tools/solutions.js');
const solLines = SLOTS.map((slot) => {
  const r = roomFor(slot);
  return `  ${slot}: [${JSON.stringify(r.answer).replace(/\],\[/g, '], [')}],`;
}).join('\n');
const solSrc = fs.readFileSync(solPath, 'utf8');
const solOut = solSrc
  .replace(/\n  16:[\s\S]*?\n\};/, '\n' + solLines + '\n};');
if (!CHECK) fs.writeFileSync(solPath, solOut);
if (!solSrc.includes('  16:') || !solOut.includes('  40: [')) {
  throw new Error('tools/solutions.js: could not place the answers 16-40');
}

console.log((CHECK ? 'would write ' : 'wrote ') + levels.file + ' (' + levels.entries + ' entries)');
console.log((CHECK ? 'would write ' : 'wrote ') + hero.file + ' (' + hero.entries + ' entries)');
console.log((CHECK ? 'would write ' : 'wrote ') + 'tools/solutions.js (' + SLOTS.length + ' answers)');

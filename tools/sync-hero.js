/* tools/sync-hero.js — keep the prover's rooms identical to the game's.

   tools/hero-rooms.js is what `hero-check`, `hero-audit` and `solve-hero` play.
   js/levels.js is what the player plays. They are the same forty rooms, and when
   they drift the prover proves a room that does not exist: that is exactly how
   9-15 stopped winning, after a script added a second `crates:` key to each of
   them — the later key silently replaced the first, and the block the answer
   leans on vanished.

   So the game file is the source of truth for STRUCTURE, and this tool copies
   its stage / crates / balls / glasses / faucet into the hero room. It never
   touches an answer: answers are earned by tools/solve-hero.js, not generated.

     node tools/sync-hero.js            write tools/hero-rooms.js
     node tools/sync-hero.js --check    report drift, write nothing
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { boot } = require('./simheadless');

const HG = boot();
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'tools/hero-rooms.js');
const CHECK = process.argv.includes('--check');

// text spans of the top-level entries of an array literal
function spans(src, anchor, indent) {
  const open = src.indexOf(anchor);
  const ind = ' '.repeat(indent);
  const out = [];
  let from = open;
  for (;;) {
    const j = src.indexOf('\n' + ind + '{', from);
    if (j < 0) break;
    let k = j + ind.length + 1, depth = 0;
    while (k < src.length) {
      const ch = src[k];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (!depth) break; }
      else if (ch === "'" || ch === '"') {
        const q = ch; k++;
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

const fmt = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(v)) : v);
const pos = (p) => `{ x: ${fmt(p.x)}, y: ${fmt(p.y)}`;
const wh = (p) => `w: ${fmt(p.w || p.size)}, h: ${fmt(p.h || p.size)}`;

function stageLine(p) {
  if (p.poly) return `      { kind: '${p.kind || 'teal'}', poly: [${p.poly.map((q) => `[${q[0]}, ${q[1]}]`).join(', ')}] },`;
  return `      ${pos(p)}, w: ${fmt(p.w)}, h: ${fmt(p.h)}${p.kind ? `, kind: '${p.kind}'` : ''}${p.angle ? `, angle: ${p.angle}` : ''} },`;
}
function crateLine(c) {
  return `      ${pos(c)}, ${wh(c)}${c.kind ? `, kind: '${c.kind}'` : ''}${c.style ? `, style: '${c.style}'` : ''}${c.angle ? `, angle: ${c.angle}` : ''}${c.dynamic ? ', dynamic: true' : ''} },`;
}
function ballLine(b) {
  return `      { x: ${fmt(b.x)}, y: ${fmt(b.y)}${b.vx ? `, vx: ${b.vx}` : ''}${b.vy ? `, vy: ${b.vy}` : ''}, r: ${fmt(b.r)}${b.kind ? `, kind: '${b.kind}'` : ''} },`;
}

// strip every key of a name from an entry, however it was formatted
function dropKey(seg, key) {
  let out = seg;
  for (;;) {
    const m = new RegExp('\\n\\s*' + key + ':\\s*\\[').exec(out);
    if (!m) return out;
    let k = m.index + m[0].length, depth = 1;
    while (k < out.length && depth > 0) {
      const ch = out[k];
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
      else if (ch === "'" || ch === '"') {
        const q = ch; k++;
        while (out[k] !== q) { if (out[k] === '\\') k++; k++; }
      }
      k++;
    }
    // eat the trailing comma and any whitespace we own
    let end = k;
    while (out[end] === ',' || out[end] === ' ' || out[end] === '\n') end++;
    out = out.slice(0, m.index) + '\n' + out.slice(end);
  }
}

const src = fs.readFileSync(FILE, 'utf8');
const sp = spans(src, 'const S = [', 2);
if (sp.length !== HG.LEVELS.length) {
  console.error('hero-rooms has ' + sp.length + ' entries, the game has ' + HG.LEVELS.length);
  process.exit(1);
}

let out = src;
const drift = [];
for (let i = sp.length - 1; i >= 0; i--) {
  const lv = HG.LEVELS[i];
  const [a, b] = sp[i];
  let seg = out.slice(a, b);

  const want = {
    stage: lv.platforms.map(stageLine),
    crates: (lv.crates || []).map(crateLine),
    balls: (lv.balls || []).map(ballLine),
  };
  const extraKeys = ['hots', 'fans', 'pins', 'spinners', 'seesaws'];
  const extrasWant = {};
  for (const k of extraKeys) {
    const list = lv[k] || [];
    if (list.length) extrasWant[k] = list.map((o) => '    ' + k + ': [' + list.map(() => '').join('') + JSON.stringify(o).replace(/"/g, "'") + '],');
  }

  let next = seg;
  const syncKeys = ['faucets', 'faucet', 'glasses', 'stage', 'crates', 'balls'].concat(extraKeys);
  for (const k of syncKeys) next = dropKey(next, k);
  // the old single-object `faucet: {...}` spelling is redundant next to `faucets`
  next = next.replace(/\n\s*faucet:\s*\{[^\n]*\},?/g, '');

  const close = next.lastIndexOf('}');
  const head = next.slice(0, close).replace(/\s*$/, '');
  const glassLines = lv.glasses.map((g) => '      { x: ' + g.x + ', y: ' + g.y + ', w: ' + g.w + ', h: ' + g.h +
    ', need: ' + g.need + (g.hanging ? ', hanging: true' : '') + ' },');
  const faucetLines = lv.faucets.map((f) => '      { x: ' + f.x + ', y: ' + f.y + ', rate: ' + f.rate + ', total: ' + f.total + ' },');
  const block = [];
  block.push('    faucets: [\n' + faucetLines.join('\n') + '\n    ],');
  block.push('    glasses: [\n' + glassLines.join('\n') + '\n    ],');
  block.push('    stage: [\n' + want.stage.join('\n') + '\n    ],');
  if (want.crates.length) block.push('    crates: [\n' + want.crates.join('\n') + '\n    ],');
  if (want.balls.length) block.push('    balls: [\n' + want.balls.join('\n') + '\n    ],');
  for (const k of extraKeys) {
    if (!want[k]) continue;
    block.push('    ' + k + ': [\n' + want[k][0] + '\n    ],');
  }
  next = head.replace(/,$/, '') + ',\n' + block.join('\n') + '\n  }';

  if (next !== seg) drift.push(lv.id);
  out = out.slice(0, a) + next + out.slice(b);
}

if (CHECK) {
  console.log(drift.length ? 'DRIFT on levels: ' + drift.join(', ') : 'hero-rooms matches the game');
  process.exit(drift.length ? 1 : 0);
}
fs.writeFileSync(FILE, out);
console.log('synced ' + drift.length + ' room(s): ' + (drift.join(', ') || 'none needed'));

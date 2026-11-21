/* tools/apply-authored.js — write /tmp/authored.json back into the game:
   the wooden rests go into js/levels.js, the strokes into tools/solutions.js.

   node tools/apply-authored.js
*/
'use strict';
const fs = require('fs');
const authored = require('/tmp/authored.json');

let levels = fs.readFileSync('js/levels.js', 'utf8');
// idempotent: drop whatever a previous run injected
const before = levels.length;
levels = levels.replace(/[ \t]*P\(\{[^}]*kind: '[a-z]+' \}\),?[ \t]*\/\/ authored support,?\n?/g, '');
if (levels.length !== before) console.log('cleared', (before - levels.length), 'chars of an older injection');
let sols = fs.readFileSync('tools/solutions.js', 'utf8');

const fmt = (n) => (Math.round(n * 10) / 10).toString();

// injection by index: level N is the Nth "    {" block in LEVELS. Within a
// block, find `platforms: [`, walk to its matching `]`, and append.
function blocks(src) {
  const out = [];
  const re = /^    \{$/gm;
  let m;
  while ((m = re.exec(src))) out.push({ start: m.index });
  for (let i = 0; i < out.length; i++) {
    out[i].end = i + 1 < out.length ? out[i + 1].start : src.length;
    out[i].id = i + 1;
  }
  return out;
}
function matchBracket(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (!depth) return i; }
  }
  return -1;
}

const bs = blocks(levels);
if (bs.length !== 35) { console.error('expected 35 level blocks, found', bs.length); process.exit(1); }
let injected = 0;
for (const b of bs.slice().reverse()) {
  const a = authored[b.id];
  if (!a || !a.shelves.length) continue;
  const chunk = levels.slice(b.start, b.end);
  const pIdx = chunk.indexOf('platforms: [');
  if (pIdx < 0) { console.log('L' + b.id + ': no platforms array, skipped'); continue; }
  const open = b.start + pIdx + 'platforms: '.length;
  const close = matchBracket(levels, open);
  const inner = levels.slice(open + 1, close);
  const add = a.shelves.map((sh) =>
    `P({ x: ${fmt(sh.x)}, y: ${fmt(sh.y)}, w: ${fmt(sh.w)}, h: ${fmt(sh.h)}, kind: '${(a.shelfKinds || [])[a.shelves.indexOf(sh)] || 'wood'}' }), // authored support`).join('\n        ');
  const trimmed = inner.replace(/\s+$/, '');
  const joined = trimmed.trim() === '' ? `\n        ${add},\n      ` : `${trimmed.replace(/,$/, '')},\n        ${add},\n      `;
  levels = levels.slice(0, open + 1) + joined + levels.slice(close);
  injected++;
}
fs.writeFileSync('js/levels.js', levels);
console.log('injected rests into', injected, 'levels');

// ---- 2. solutions: rebuild the module from the old entries plus the authored
// ones. Loading the file and re-serialising is exact; patching it line by line
// is not (some entries are hand-written across several lines).
{
  const old = require(require('path').resolve('tools/solutions.js'));
  const merged = Object.assign({}, old);
  for (const id of Object.keys(authored)) {
    const a = authored[id];
    if (a.strokes.length) merged[id] = a.strokes;
  }
  const ids = Object.keys(merged).map(Number).sort((x, y) => x - y);
  const lines = ids.map((id) => {
    const strokes = merged[id];
    // two decimals on purpose: a bridge that clears the rim by 2 px does not
    // survive being rounded to whole pixels on the way through this file
    const body = strokes.map((st) =>
      '[' + st.map((q) => {
        const x = Array.isArray(q) ? q[0] : q.x, y = Array.isArray(q) ? q[1] : q.y;
        return '[' + (+x.toFixed(2)) + ', ' + (+y.toFixed(2)) + ']';
      }).join(', ') + ']').join(', ');
    return '  ' + id + ': [' + body + '],';
  });
  const head = fs.readFileSync('tools/solutions.js', 'utf8').split('module.exports = {')[0];
  fs.writeFileSync('tools/solutions.js', head + 'module.exports = {\n' + lines.join('\n') + '\n};\n');
  console.log('solutions:', ids.length, 'levels,', ids.filter((i) => merged[i].length).length, 'with a drawing');
}

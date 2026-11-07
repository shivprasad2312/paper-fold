/* tools/asset-audit.js — is every solid a real object at its real size?

   The complaint this answers: a long piece looked like it got shorter when it
   fell. Nothing resized (1,316 measured solid-frames, zero changes), but every
   solid was drawn with one "crate" artwork whose corner radius is min(8, h/2) —
   so an 18 px plank lost 8 px off each end and a 22 px post turned into a fat
   rounded stick. Same picture at twelve sizes: plank, column, post and crate
   were indistinguishable.

   Now js/assets.js holds a book of assets and each solid names its look. This
   audit is the gate:

     * every solid must map to a book asset (no "unknown shape" in the game)
     * every solid must be the SIZE its asset ships at, unless it is declared
       custom (an asset cut to the room — a floor, a wall, a long slab)
     * a given size must not be used as two different assets

     node tools/asset-audit.js [--verbose]
   ========================================================================== */
'use strict';
const { boot } = require('./simheadless');
const HG = boot();
const A = HG.Assets;
const VERBOSE = process.argv.includes('--verbose');

const rows = [];
for (const lv of HG.LEVELS) {
  const solids = [];
  lv.platforms.forEach((p, i) => {
    if (p.poly) return;                                  // free-form masses have no box size
    solids.push({ where: 'platform ' + i, d: p, kind: p.kind });
  });
  lv.crates.forEach((c, i) => solids.push({ where: 'crate ' + i, d: c, kind: c.kind }));
  for (const s of solids) {
    const w = s.d.w || s.d.size, h = s.d.h || s.d.size;
    const style = A.styleOf(s.d);
    const book = A.assetOf(s.d);
    const custom = !!(s.d.style && A.CUSTOM.has(s.d.style)) || A.CUSTOM.has(style);
    const model = A.onModel(s.d, 1);
    rows.push({ level: lv.id, name: lv.name, where: s.where, kind: s.kind || 'wood',
      w, h, style, key: book ? book.key : null, custom, ok: custom || model.ok, why: model.why });
  }
}

const unknown = rows.filter((r) => !r.key && !r.custom);
const offModel = rows.filter((r) => !r.custom && !r.ok);

// one size, one asset: the same footprint must not mean two different things
const bySize = new Map();
for (const r of rows) {
  const k = r.kind + ' ' + r.w + 'x' + r.h;
  if (!bySize.has(k)) bySize.set(k, new Set());
  bySize.get(k).add(r.style);
}
const ambiguous = [...bySize.entries()].filter(([, set]) => set.size > 1);

console.log('## Assets\n');
console.log('solids in the game: ' + rows.length);
const styles = {};
rows.forEach((r) => { styles[r.style] = (styles[r.style] || 0) + 1; });
console.log('distinct assets in use: ' + Object.keys(styles).length);
console.log(Object.entries(styles).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(' · '));

if (VERBOSE) {
  console.log('\nlevel | where | kind | size | asset | custom | ok');
  rows.forEach((r) => console.log([r.level, r.where, r.kind, r.w + 'x' + r.h, r.key || r.style, r.custom ? 'yes' : '', r.ok ? 'ok' : 'OFF'].join(' | ')));
}

function say(ok, label, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label + '   [' + detail + ']');
  return ok ? 0 : 1;
}
let fails = 0;
fails += say(unknown.length === 0, 'every solid is a known asset',
  unknown.length ? unknown.slice(0, 6).map((r) => 'L' + r.level + ' ' + r.kind + ' ' + r.w + 'x' + r.h).join(', ') : rows.length + ' mapped');
fails += say(offModel.length === 0, 'every solid is the size its asset ships at',
  offModel.length ? offModel.slice(0, 6).map((r) => 'L' + r.level + ' ' + (r.key || r.style) + ': ' + r.why).join('; ') : 'all on model');
fails += say(ambiguous.length === 0, 'one size never means two different assets',
  ambiguous.length ? ambiguous.map(([k, s]) => k + ' = ' + [...s].join('/')).join('; ') : bySize.size + ' distinct footprints');

console.log('\n' + (fails ? fails + ' asset check(s) failed' : 'all asset checks pass'));
process.exit(fails ? 1 : 0);

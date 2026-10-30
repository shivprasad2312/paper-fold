// For every level: how much headroom does the authored solution have over `need`?
const { boot, play, poly } = require('./simheadless');
const SOL = require('./solutions');
const HG = boot();
function seed(n) { let s = n >>> 0 || 1; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const rows = [];
for (const lv of HG.LEVELS) {
  const fills = [];
  let states = [];
  for (const sd of [7, 19]) {
    seed(sd);
    const r = play(HG, lv.id, (SOL[lv.id] || []).map(poly), { frames: 60 * 18 });
    fills.push(...(r.fills || []).map((f) => f.fill));
    states.push(r.state);
  }
  const need = Math.max(...lv.glasses.map((g) => g.need));
  const min = Math.min(...fills);
  rows.push({ id: lv.id, name: lv.name, need, min, states: states.join('/'), margin: +(min - need).toFixed(3) });
}
rows.sort((a, b) => a.margin - b.margin);
rows.forEach((r) => console.log(String(r.id).padStart(2), r.name.padEnd(18), 'need', r.need.toFixed(2), 'min fill', r.min.toFixed(3), 'margin', r.margin.toFixed(3), r.states));
console.log('levels with margin < 0.03:', rows.filter((r) => r.margin < 0.03).map((r) => r.id).join(','));

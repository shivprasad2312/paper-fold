/* ==========================================================================
   tools/delivery.js — give each tap the amount of water its level actually
   needs, and pour it as a stream instead of a firehose.

   Measured before this was written: levels were delivering 3–8x the water
   their glasses need (median 3.5x). Everything past the need has nowhere to
   go, so it stands on the drawn line in a heap and boils there. That heap is
   what reads as "excited water" — 92 droplets of 14 px alive at once, all
   jostling, is not how a tap looks.

   So: total = the glass's requirement + a working margin, and rate = a thin
   thread (a column of 14 px droplets at 46/s is a solid jet, not a stream).

   node tools/delivery.js [--apply] [id...]
   ========================================================================== */
'use strict';
const fs = require('fs');
const { boot } = require('./simheadless');

const HG = boot();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);

const MARGIN = +(process.env.HG_MARGIN || 1.75);   // how much more than the need to pour
const RATE = +(process.env.HG_RATE || 26);         // droplets per second per tap

const targets = ids.length ? ids : HG.LEVELS.map((l) => l.id);
const plan = {};
for (const id of targets) {
  const lv = HG.levelById(id);
  // a scene, purely to read the glass capacities the game itself computes
  const sc = new HG.Scene(JSON.parse(JSON.stringify(lv)));
  const need = sc.glasses.map((g) => g.needCount);
  // which tap feeds which glass: nearest along x, each tap used once
  const used = new Set();
  const perTap = lv.faucets.map(() => 0);
  lv.glasses.forEach((g, gi) => {
    let best = 0, bd = Infinity;
    lv.faucets.forEach((f, fi) => {
      const d = Math.abs(f.x - g.x) + (used.has(fi) ? 1e6 : 0);
      if (d < bd) { bd = d; best = fi; }
    });
    used.add(best);
    perTap[best] += need[gi];
  });
  plan[id] = {
    need,
    rate: RATE + lv.faucets.length * 3,
    totals: perTap.map((n) => Math.max(24, Math.round(n * MARGIN) + 4)),
    before: lv.faucets.map((f) => ({ rate: f.rate, total: f.total })),
  };
  sc.destroy();
}

console.log('id  need            was rate/total      ->  now rate/total');
for (const id of Object.keys(plan)) {
  const p = plan[id], lv = HG.levelById(+id);
  console.log(String(id).padStart(2), String(p.need.join('+')).padEnd(8), ' ',
    p.before.map((b) => b.rate + '/' + b.total).join(' ').padEnd(16), '->', p.rate + '/' + p.totals.join('+'));
  void lv;
}

if (!apply) {
  console.log('\n(dry run — pass --apply to write js/levels.js)');
  process.exit(0);
}

// rewrite the level file in place: level N is the Nth "    {" block, and its
// faucet objects are the only `rate:`/`total:` pairs inside that block
let src = fs.readFileSync('js/levels.js', 'utf8');
const starts = [];
const re = /^    \{$/gm;
let m;
while ((m = re.exec(src))) starts.push(m.index);
starts.push(src.length);
for (let i = starts.length - 2; i >= 0; i--) {
  const id = i + 1;
  const p = plan[id];
  if (!p) continue;
  const from = starts[i], to = starts[i + 1];
  let chunk = src.slice(from, to);
  let k = 0;
  chunk = chunk.replace(/(rate: )(-?[\d.]+)(, total: )(-?[\d.]+)/g, (all, a, b, c, d) => {
    void all; void b; void d;
    const idx = k++;
    return a + p.rate + c + (p.totals[idx] || p.totals[0]);
  });
  src = src.slice(0, from) + chunk + src.slice(to);
}
fs.writeFileSync('js/levels.js', src);
console.log('\nrewrote', Object.keys(plan).length, 'levels');

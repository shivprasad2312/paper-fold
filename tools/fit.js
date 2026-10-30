/* ==========================================================================
   tools/fit.js — level fitting for the one mechanic this game is built on.

   A ramp needs a corridor: a tap far enough from the glass, a drop big enough,
   and free space for the supports under the line. Some levels were drawn before
   the rule existed, so their tap sits almost on top of the glass and there is
   nowhere to put a line.

   Rather than inventing different physics for those levels, move the *tap* —
   it is level scenery, it hangs from the top edge wherever we put it — until
   the corridor exists. The glass, the props and the hazard stay exactly where
   the level was designed.

   node tools/fit.js <id> [id...]
   reads  /tmp/authored.json (merges)
   writes /tmp/authored.json  { id: { faucets?, shelves, strokes, ink, fill } }
   ========================================================================== */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
const ids = process.argv.slice(2).map(Number).filter(Boolean);

const rectOf = (p) => ({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 });
const overlap = (a, b, pad) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

function obstacles(lv) {
  const out = [];
  for (const p of lv.platforms) out.push(rectOf(p));
  for (const c of lv.crates) out.push({ x0: c.x - c.size / 2, x1: c.x + c.size / 2, y0: c.y - c.size / 2, y1: c.y + c.size / 2 });
  for (const p of (lv.pins || [])) out.push({ x0: p.x - 11, x1: p.x + 11, y0: p.y - 11, y1: p.y + 11 });
  for (const g of lv.glasses) out.push({ x0: g.x - g.w / 2, x1: g.x + g.w / 2, y0: g.y - g.h / 2, y1: g.y + g.h / 2 });
  return out;
}
function free(lv, shelf, extra) {
  const r = rectOf(shelf);
  if (r.x0 < 8 || r.x1 > HG.W - 8 || r.y0 < 72 || r.y1 > HG.H - 24) return false;
  for (const o of obstacles(lv)) if (overlap(r, o, 11)) return false;
  for (const o of (extra || [])) if (overlap(r, rectOf(o), 8)) return false;
  return true;
}

function attempt(lv, p, f, g, extra) {
  const s = Math.sign(g.x - f.x) || 1;
  const rimY = g.y - g.h / 2;
  const span = Math.max(80, rimY - f.y);
  const ax = f.x + s * p.dx;
  const bx = g.x - s * p.bx;
  const yA = f.y + span * p.ya;
  const yB = f.y + span * p.yb;
  if ((bx - ax) * s < 120) return null;
  if (yB < yA + 22) return null;
  const left = { x: ax, y: yA + 12, w: p.w, h: p.h, kind: 'wood', angle: 0 };
  const right = { x: bx, y: yB + 12, w: p.w, h: p.h, kind: 'wood', angle: 0 };
  if (!free(lv, left, extra) || !free(lv, right, extra)) return null;
  if (overlap(rectOf(left), rectOf(right), 8)) return null;
  const topA = yA + 5, topB = yB + 5;
  const slope = (topB - topA) / (bx - ax);
  const x0 = ax - s * p.ol, x1 = bx + s * p.or;
  const stroke = poly([[x0, topA + slope * (x0 - ax)], [x1, topA + slope * (x1 - ax)]]);
  const level = JSON.parse(JSON.stringify(lv));
  level.platforms = level.platforms.concat(extra || [], [left, right]);
  const r = play(HG, lv.id, [stroke], { frames: 60 * 16, level });
  return { r, stroke, shelves: [left, right] };
}

function search(lv, f, g, budgetMs) {
  const t0 = Date.now();
  const gi = lv.glasses.indexOf(g);
  const good = (r) => { const q = r && r.fills && r.fills[gi]; return !!q && (q.ok || q.fill >= g.need - 0.02); };
  const wins = [];
  let tried = 0;
  outer:
  for (const ya of [0.14, 0.22, 0.3, 0.38]) for (const yb of [0.5, 0.62, 0.74, 0.86, 0.96])
    for (const dx of [40, 70, 100]) for (const bx of [-30, 10, 50, 90])
      for (const w of [72, 100]) for (const h of [14, 18]) for (const ol of [30, 55]) for (const or of [32, 58]) {
        if (Date.now() - t0 > budgetMs || wins.length >= 2) break outer;
        const p = { ya, yb, dx, bx, w, h, ol, or };
        const a = attempt(lv, p, f, g, []);
        if (!a) continue;
        tried++;
        if (!good(a.r)) continue;
        const b = attempt(lv, p, f, g, []);
        if (!b || !good(b.r)) continue;
        wins.push({ p, ink: a.r.inkUsed, shelves: a.shelves, stroke: a.stroke, fill: a.r.fills });
      }
  return { wins, tried };
}

const out = {};
if (fs.existsSync('/tmp/authored.json')) {
  try { Object.assign(out, JSON.parse(fs.readFileSync('/tmp/authored.json', 'utf8'))); } catch (e) {}
}

for (const id of ids) {
  const base = HG.levelById(id);
  const g = base.glasses[0];
  const isTwo = base.glasses.length > 1 || base.faucets.length > 1;
  if (isTwo) { console.log('L' + id, 'has several glasses/taps — needs the tent, skipped'); continue; }
  const cands = [];
  for (const off of [380, 440, 500, 340, 300, 560]) {
    for (const sgn of [-1, 1]) {
      const x = Math.round(g.x + sgn * off);
      if (x < 70 || x > HG.W - 70) continue;
      cands.push(x);
    }
  }
  cands.push(base.faucets[0].x);
  let best = null;
  for (const fx of cands) {
    const lv = JSON.parse(JSON.stringify(base));
    lv.faucets = lv.faucets.map((f, i) => (i === 0 ? Object.assign({}, f, { x: fx }) : f));
    if (lv.faucet) lv.faucet = Object.assign({}, lv.faucet, { x: fx });
    const f = lv.faucets[0];
    if (Math.abs(f.x - g.x) < 260) continue;
    const r = search(lv, f, g, 24000);
    if (!r.wins.length) { console.log('   tap', fx, ': no bridge'); continue; }
    const w0 = r.wins[0];
    best = { faucets: lv.faucets.map((q) => ({ x: q.x, y: q.y })), faucetX: fx,
      shelves: w0.shelves, strokes: [w0.stroke], ink: w0.ink, fill: w0.fill };
    console.log('L' + id, 'tap x', fx, '-> bridge, ink', w0.ink.toFixed(0), 'rests', w0.shelves.map((s) => Math.round(s.x) + ',' + Math.round(s.y)).join(' '));
    break;
  }
  if (best) {
    out[id] = { faucets: best.faucets, shelfKinds: ['wood', 'wood'], shelves: best.shelves,
      strokes: best.strokes, ink: +best.ink.toFixed(1), fill: best.fill };
    console.log('L' + id, 'FITTED with tap', best.faucetX);
  } else {
    console.log('L' + id, 'could not be fitted by moving the tap');
  }
  fs.writeFileSync('/tmp/authored.json', JSON.stringify(out, null, 1));
}
console.log('done;', Object.keys(out).length, 'levels authored');

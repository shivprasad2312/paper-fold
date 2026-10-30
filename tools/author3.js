/* ==========================================================================
   tools/author3.js — author a level's *support scenery* from the line, not the
   other way round.

   The first author (tools/author.js) picked two rests from a grid around the
   tap and the glass, then drew a line through them. That works on a level that
   happens to have room for both, and fails everywhere else: a long run needs a
   third rest, a short run needs the rests closer together, and a level with a
   crate in the way needs the line routed around it.

   Here the order is reversed. Pick the *ramp* first — where the water should
   start and where it should leave — then stand rests under it at fixed
   fractions of its length. Every rest must fit in free space, and the finished
   level is played for real, twice.

   node tools/author3.js [levelIds...]
   reads  /tmp/authored.json   (merges; never clobbers other levels)
   writes /tmp/authored.json, /tmp/author3-<id>.json, /tmp/author3.log
   ========================================================================== */
'use strict';
const fs = require('fs');
const { boot, play, poly } = require('./simheadless');

const HG = boot();
const only = process.argv.slice(2).map(Number).filter(Boolean);

const rectOf = (p) => ({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 });
const overlap = (a, b, pad) => a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

function obstacles(lv) {
  const out = [];
  for (const p of lv.platforms) out.push(rectOf(p));
  for (const c of lv.crates) out.push({ x0: c.x - c.size / 2, x1: c.x + c.size / 2, y0: c.y - c.size / 2, y1: c.y + c.size / 2 });
  for (const p of (lv.pins || [])) out.push({ x0: p.x - 11, x1: p.x + 11, y0: p.y - 11, y1: p.y + 11 });
  for (const g of lv.glasses) out.push({ x0: g.x - g.w / 2, x1: g.x + g.w / 2, y0: g.y - g.h / 2, y1: g.y + g.h / 2 });
  for (const f of lv.faucets) out.push({ x0: f.x - 33, x1: f.x + 33, y0: f.y - 80, y1: f.y - 14 });
  for (const h of (lv.hots || [])) out.push({ x0: h.x - h.w / 2, x1: h.x + h.w / 2, y0: h.y - h.h / 2, y1: h.y + h.h / 2 });
  return out;
}

function free(lv, shelf, extra) {
  const r = rectOf(shelf);
  if (r.x0 < 8 || r.x1 > HG.W - 8 || r.y0 < 72 || r.y1 > HG.H - 24) return false;
  for (const o of obstacles(lv)) if (overlap(r, o, 11)) return false;
  for (const o of (extra || [])) if (overlap(r, rectOf(o), 8)) return false;
  return true;
}

// One ramp, described the way water sees it: the stream has to *land on* the
// line, so the line begins some way uphill of the tap; and it has to leave the
// line over the mouth of the glass, so it ends inside the mouth's width. A long
// gentle line is a ramp; a short steep one is a catapult, so slopes are capped.
function attempt(lv, p, f, g, extra) {
  const s = Math.sign(g.x - f.x) || 1;
  const rimY = g.y - g.h / 2;
  const x0 = f.x + s * p.start;     // negative start = the line begins before the tap
  const x1 = g.x + s * p.end;
  const y0 = f.y + p.y0;
  const y1 = rimY - p.y1;
  const span = (x1 - x0) * s;
  if (span < 120) return null;
  if (y1 < y0 + 18) return null;
  if ((y1 - y0) / span > 0.40) return null;          // steeper than ~22° and the water flies off
  const slope = (y1 - y0) / (x1 - x0);
  const lineY = (x) => y0 + slope * (x - x0);
  const rests = [];
  for (const fr of p.frac) {
    const x = x0 + (x1 - x0) * fr;
    // 4 px of daylight under the line, so a *replayed* stroke is never drawn
    // through its own support (the pen refuses to draw inside scenery)
    const rest = { x, y: lineY(x) + 4 + p.h / 2, w: p.w, h: p.h, kind: p.kind, angle: 0 };
    if (!free(lv, rest, (extra || []).concat(rests))) return null;
    rests.push(rest);
  }
  const level = JSON.parse(JSON.stringify(lv));
  level.platforms = level.platforms.concat(extra || [], rests);
  const stroke = poly([[x0, lineY(x0)], [x1, lineY(x1)]], 8);
  const r = play(HG, lv.id, [stroke], { frames: 60 * 16, level });
  return { r, level, stroke, rests };
}

const FRACS = [[0.16, 0.84], [0.12, 0.5, 0.88], [0.2, 0.8], [0.24, 0.76]];

function search(lv, f, g, extra, budgetMs, cap) {
  const t0 = Date.now();
  const found = [];
  let tried = 0;
  const gi = lv.glasses.indexOf(g);
  const ok = (r) => { const q = r && r.fills && r.fills[gi]; return !!q && (q.ok || q.fill >= g.need - 0.02); };
  outer:
  for (const start of [-120, -80, -40, 0, 30]) for (const end of [-20, 0, 20, 36])
    for (const y0 of [70, 110, 160, 210]) for (const y1 of [20, 40, 70]) for (const w of [64, 84, 104]) for (const frac of FRACS) {
      if (Date.now() - t0 > budgetMs || found.length >= cap) break outer;
      const p = { start, end, y0, y1, w, h: 14, frac, kind: 'wood' };
      const a = attempt(lv, p, f, g, extra);
      if (!a) continue;
      tried++;
      if (!ok(a.r)) continue;
      const again = attempt(lv, p, f, g, extra);
      if (!again || !ok(again.r)) continue;
      found.push({ p, ink: a.r.inkUsed, score: a.r.inkUsed + a.stroke.length * 0.1,
        shelves: a.rests, stroke: a.stroke, fill: a.r.fills });
    }
  found.sort((x, y) => x.score - y.score);
  return { found: found.slice(0, 3), tried };
}

function plan(lv) {
  const pairs = [];
  lv.faucets.forEach((f, fi) => lv.glasses.forEach((g, gi) => pairs.push({ fi, gi, d: Math.abs(f.x - g.x) })));
  pairs.sort((a, b) => a.d - b.d);
  const usedF = new Set(), usedG = new Set(), out = [];
  for (const p of pairs) {
    if (usedF.has(p.fi) || usedG.has(p.gi)) continue;
    usedF.add(p.fi); usedG.add(p.gi);
    out.push({ fi: p.fi, gi: p.gi, f: lv.faucets[p.fi], g: lv.glasses[p.gi] });
  }
  lv.glasses.forEach((g, gi) => {
    if (usedG.has(gi)) return;
    let best = 0, bd = Infinity;
    lv.faucets.forEach((f, fi) => { const d = Math.abs(f.x - g.x); if (d < bd) { bd = d; best = fi; } });
    out.push({ fi: best, gi, f: lv.faucets[best], g });
  });
  return out.sort((a, b) => a.gi - b.gi);
}

const out = {};
if (fs.existsSync('/tmp/authored.json')) {
  try { Object.assign(out, JSON.parse(fs.readFileSync('/tmp/authored.json', 'utf8'))); } catch (e) { /* fresh */ }
}
const ids = only.length ? only : HG.LEVELS.filter((l) => !out[l.id]).map((l) => l.id);
const BUDGET = 45000;
for (const id of ids) {
  const lv = HG.levelById(id);
  const bare = play(HG, id, [], { frames: 60 * 16 });
  if (bare.won) { out[id] = { shelves: [], strokes: [], ink: 0, fill: bare.fills }; console.log('L' + id, 'already wins bare'); continue; }
  const steps = plan(lv);
  const picks = [];
  let shelves = [], tried = 0, okAll = true;
  for (const st of steps) {
    const r = search(lv, st.f, st.g, shelves, BUDGET, 3);
    tried += r.tried;
    if (!r.found.length) { okAll = false; break; }
    picks.push(r.found);
    shelves = shelves.concat(r.found[0].shelves);
  }
  let best = null;
  if (okAll) {
    const combo = (i, acc) => {
      if (best) return;
      if (i === picks.length) {
        const level = JSON.parse(JSON.stringify(lv));
        level.platforms = level.platforms.concat(acc.shelves);
        const r = play(HG, id, acc.strokes, { frames: 60 * 16, level });
        if (r.won) {
          const r2 = play(HG, id, acc.strokes, { frames: 60 * 16, level });
          if (r2.won) best = { ink: r2.inkUsed, shelves: acc.shelves, strokes: acc.strokes, fill: r2.fills };
        }
        return;
      }
      for (const c of picks[i]) {
        combo(i + 1, { shelves: acc.shelves.concat(c.shelves), strokes: acc.strokes.concat([c.stroke]) });
        if (best) return;
      }
    };
    combo(0, { shelves: [], strokes: [] });
  }
  if (best) {
    out[id] = { shelves: best.shelves, strokes: best.strokes, ink: +best.ink.toFixed(1), fill: best.fill };
    console.log('L' + String(id).padStart(2), lv.name.padEnd(17), 'WON  ink', best.ink.toFixed(0) + '/' + lv.ink,
      '| rests', best.shelves.map((s) => Math.round(s.x) + ',' + Math.round(s.y)).join(' '), '|', tried, 'tries');
  } else {
    delete out[id];        // never leave a stale entry that no longer replays
    console.log('L' + String(id).padStart(2), lv.name.padEnd(17), 'no solution in', tried, 'candidates');
  }
  fs.writeFileSync('/tmp/author3-' + id + '.json', JSON.stringify(out[id] || null, null, 1));
  fs.writeFileSync('/tmp/authored.json', JSON.stringify(out, null, 1));
  fs.writeFileSync('/tmp/author3.log', Object.keys(out).join(',') + '\n');
}
console.log('\n/tmp/authored.json now has', Object.keys(out).length, 'levels');

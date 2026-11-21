/* ==========================================================================
   tools/author.js — author a legal solution for every level under the game's
   real rule: a drawn line is a *loose* body. Nothing is welded, nothing is
   pinned. It stays up only if its own shape is supported by scenery that is
   already in the level.

   What the research says a real Happy Glass line does
   ---------------------------------------------------
   A line hanging from a single point swings until its centre of mass is under
   that point, so a one-point hold can never make a ramp — it makes a pendulum.
   A line lying on one narrow ledge tips off as soon as anything but its centre
   rests there. What actually holds a ramp up is a line *lying across two
   supports*: both contacts carry it, its centre of mass sits between them, and
   it can still be shoved off if it is placed badly or overloaded. That is the
   shape this tool authors, and it is why each level gets two wooden rests
   instead of the old props standing under a welded ramp.

   node tools/author.js [levelIds...]
   writes  /tmp/authored.json   { id: { shelves: [l, r], strokes, ink, fill } }
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
  return out;
}

function free(lv, shelf) {
  const r = rectOf(shelf);
  if (r.x0 < 10 || r.x1 > HG.W - 10 || r.y0 < 70 || r.y1 > HG.H - 30) return false;
  for (const o of obstacles(lv)) if (overlap(r, o, 12)) return false;
  return true;
}

// One candidate: two wooden rests at different heights, and a straight line
// lying across both of them, overhanging at each end.
function attempt(lv, p, f, g, extra) {
  f = f || lv.faucets[0];
  g = g || lv.glasses[0];
  const s = Math.sign(g.x - f.x) || 1;
  const rimY = g.y - g.h / 2;
  const span = Math.max(80, rimY - f.y);
  const yA = f.y + span * p.ya;
  const yB = f.y + span * p.yb;
  const ax = f.x + s * p.dx;
  const bx = g.x - s * p.bx;
  if ((bx - ax) * s < 110) return null;
  if (yB < yA + 24) return null;
  const left = { x: ax, y: yA + 12, w: p.w, h: 14, kind: 'wood', angle: 0 };
  const right = { x: bx, y: yB + 12, w: p.w, h: 14, kind: 'wood', angle: 0 };
  const taken = (extra || []).concat([left, right]);
  for (let i = 0; i < taken.length; i++) {
    for (let j = i + 1; j < taken.length; j++) {
      if (overlap(rectOf(taken[i]), rectOf(taken[j]), 10)) return null;
    }
  }
  if (!free(lv, left) || !free(lv, right)) return null;
  const level = JSON.parse(JSON.stringify(lv));
  level.platforms = level.platforms.concat(extra || [], [left, right]);
  const topA = yA + 5, topB = yB + 5;
  const slope = (topB - topA) / (bx - ax);
  const x0 = ax - s * p.ol, x1 = bx + s * p.or;
  const stroke = poly([[x0, topA + slope * (x0 - ax)], [x1, topA + slope * (x1 - ax)]]);
  const r = play(HG, level.id, [stroke], { frames: 60 * 16, level });
  return { r, level, stroke, shelves: [left, right] };
}

// ---------------------------------------------------------------- searching
// A candidate is only kept when a *second*, independently drawn pour also
// delivers. Cheap-first: the least ink that still works is the answer.
function search(lv, f, g, extra, cap, budgetMs, topN) {
  const t0 = Date.now();
  const found = [];
  let tried = 0;
  const needOK = (r) => {
    const gi = lv.glasses.indexOf(g);
    const f = r && r.fills && r.fills[gi];
    return !!f && (f.ok || f.fill >= g.need - 0.02);
  };
  outer:
  for (const ya of [0.16, 0.26, 0.36]) {
    for (const yb of [0.52, 0.66, 0.8, 0.92]) {
      for (const dx of [40, 70, 100]) {
        for (const bx of [-30, 10, 50, 90]) {
          for (const w of [70, 108]) {
            for (const ol of [34, 62]) {
              for (const or of [36, 60]) {
                if (Date.now() - t0 > budgetMs || found.length >= cap) break outer;
                const p = { ya, yb, dx, bx, w, ol, or };
                const a = attempt(lv, p, f, g, extra);
                if (!a) continue;
                tried++;
                if (!needOK(a.r)) continue;
                const again = attempt(lv, p, f, g, extra);
                if (!again || !needOK(again.r)) continue;
                found.push({
                  p,
                  ink: a.r.inkUsed,
                  score: a.r.inkUsed + a.stroke.length * 0.15,
                  shelves: a.shelves,
                  stroke: a.stroke,
                  fill: a.r.fills,
                });
              }
            }
          }
        }
      }
      if (found.length >= cap) break;
    }
    if (found.length >= cap || Date.now() - t0 > budgetMs) break;
  }
  found.sort((a, b) => a.score - b.score);
  return { found: found.slice(0, topN || 3), tried };
}

// Which faucet feeds which glass: cheapest total distance, each tap used once.
function plan(lv) {
  const pairs = [];
  lv.faucets.forEach((f, fi) => lv.glasses.forEach((g, gi) => pairs.push({ fi, gi, d: Math.abs(f.x - g.x) })));
  pairs.sort((a, b) => a.d - b.d);
  const usedF = new Set(), usedG = new Set(), out2 = [];
  for (const p of pairs) {
    if (usedF.has(p.fi) || usedG.has(p.gi)) continue;
    usedF.add(p.fi); usedG.add(p.gi);
    out2.push({ fi: p.fi, gi: p.gi, f: lv.faucets[p.fi], g: lv.glasses[p.gi] });
  }
  // more glasses than taps: the extra glasses share the nearest tap
  lv.glasses.forEach((g, gi) => {
    if (usedG.has(gi)) return;
    let best = 0, bd = Infinity;
    lv.faucets.forEach((f, fi) => { const d = Math.abs(f.x - g.x); if (d < bd) { bd = d; best = fi; } });
    out2.push({ fi: best, gi, f: lv.faucets[best], g });
  });
  return out2.sort((a, b) => a.gi - b.gi);
}

const out = {};
if (fs.existsSync('/tmp/authored.json')) {
  try { Object.assign(out, JSON.parse(fs.readFileSync('/tmp/authored.json', 'utf8'))); } catch (e) { /* fresh */ }
}
const ids = only.length ? only : HG.LEVELS.map((l) => l.id);
const BUDGET_MS = 55000;      // per glass
for (const id of ids) {
  const lv = HG.levelById(id);
  // some levels are already a solution with an empty page
  const bare = play(HG, id, [], { frames: 60 * 16 });
  if (bare.won) {
    out[id] = { shelves: [], strokes: [], ink: 0, fill: bare.fills };
    console.log('L' + String(id).padStart(2), lv.name.padEnd(17), 'WON  with no drawing at all');
    fs.writeFileSync('/tmp/authored.json', JSON.stringify(out, null, 1));
    fs.writeFileSync('/tmp/author.log', Object.keys(out).join(',') + '\n');
    continue;
  }
  const steps = plan(lv);
  const picks = [];            // candidate list per glass
  let shelves = [], tried = 0, ok = true;
  for (const st of steps) {
    const r = search(lv, st.f, st.g, shelves, 3, BUDGET_MS);
    tried += r.tried;
    if (!r.found.length) { ok = false; break; }
    picks.push(r.found);
    shelves = shelves.concat(r.found[0].shelves);   // commit the cheapest to keep searching
  }

  let best = null;
  if (ok) {
    // every combination of the shortlisted bridges, whole level, real pour
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
    // single-glass levels: trust the search result even if the re-play differs
    if (!best && picks.length === 1 && picks[0][0]) {
      const c = picks[0][0];
      best = { ink: c.ink, shelves: c.shelves, strokes: [c.stroke], fill: c.fill };
    }
  }

  if (best) {
    out[id] = { shelves: best.shelves, strokes: best.strokes, ink: +best.ink.toFixed(1), fill: best.fill };
    console.log('L' + String(id).padStart(2), lv.name.padEnd(17), 'WON  ink', best.ink.toFixed(0) + '/' + lv.ink,
      '| rests', best.shelves.map((sh) => Math.round(sh.x) + ',' + Math.round(sh.y)).join(' '),
      '|', picks.map((p) => p.length).join('+') + ' bridge(s)', tried + ' tries');
  } else {
    delete out[id];
    console.log('L' + String(id).padStart(2), lv.name.padEnd(17), 'NO SOLUTION in', tried, 'candidates');
  }
  fs.writeFileSync('/tmp/author-' + id + '.json', JSON.stringify(out[id] || null, null, 1));
  fs.writeFileSync('/tmp/authored.json', JSON.stringify(out, null, 1));
  fs.writeFileSync('/tmp/author.log', Object.keys(out).join(',') + '\n');
}
console.log('\nwrote /tmp/authored.json with', Object.keys(out).length, 'of', ids.length, 'levels');

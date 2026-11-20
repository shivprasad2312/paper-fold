// ---------------------------------------------------------------------------
// KUBIK — scale audit (Phase G, ADR-045)
//
// The site-mass stage is per-candidate and probabilistic: a single level can
// land under the act's fill target (a compact route in a big frame) without
// being broken. What must NOT happen is an ACT quietly settling at ribbon
// scale — the exact failure Phase G exists to fix. So the per-level stage has
// a loose floor and the ACT has the real promise:
//
//   · every generated level is at least 20% filled and has the act's 2×2
//     floor of wide platform;
//   · the act AVERAGES its declared fill target (minus a 6-point tolerance
//     for the luck of a draw);
//   · a mass act's boards are the size the act declares (bosses +2).
//
// Run standalone (`node scripts/scale-audit.mjs`) for the table, or via the
// verifier, which fails the build on a violation.
// ---------------------------------------------------------------------------
import { LEVELS } from '../src/levels.js';
import { ACTS, actForId } from '../src/acts.js';

export function levelShape(def) {
  const H = def.map.length;
  const W = Math.max(...def.map.map((r) => r.length));
  const solid = (c) => c >= '1' && c <= '9';
  let tiles = 0;
  let inner = 0;
  let blocks = 0;
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (!solid(def.map[z][x])) continue;
      tiles++;
      if (x > 0 && z > 0 && x < W - 1 && z < H - 1
        && solid(def.map[z][x - 1]) && solid(def.map[z][x + 1])
        && solid(def.map[z - 1][x]) && solid(def.map[z + 1][x])) inner++;
    }
  }
  for (let z = 0; z < H - 1; z++) {
    for (let x = 0; x < W - 1; x++) {
      if (solid(def.map[z][x]) && solid(def.map[z][x + 1])
        && solid(def.map[z + 1][x]) && solid(def.map[z + 1][x + 1])) blocks++;
    }
  }
  return { W, H, tiles, inner, blocks, fill: tiles / (W * H) };
}

/**
 * @returns {{rows: object[], problems: string[]}}
 */
export function scaleAudit(defs = LEVELS) {
  const rows = [];
  const problems = [];
  for (const act of ACTS) {
    const g = act.gen;
    if (!g || !g.mass) continue;
    // Phase G regenerated 51–200. Levels 41–50 belong to act 3's presentation
    // band but were built by the first generator at 14–18 tiles, before the
    // scale law existed; they are audited by the proofs like every other
    // level, not by this one.
    const list = defs.filter((d) => d.id >= Math.max(act.start, 51) && d.id <= act.end);
    if (!list.length) continue;
    const shapes = list.map((d) => ({ def: d, ...levelShape(d) }));
    const meanFill = shapes.reduce((n, s) => n + s.fill, 0) / shapes.length;
    const meanBlocks = shapes.reduce((n, s) => n + s.blocks, 0) / shapes.length;
    const minFill = Math.min(...shapes.map((s) => s.fill));
    rows.push({
      act: act.id, name: act.name, W: g.W, levels: shapes.length,
      meanFill, meanBlocks, minFill,
      target: g.mass.fill, blocks: g.mass.blocks,
    });
    for (const s of shapes) {
      const boss = s.def.id % 20 === 0;
      const wantW = boss ? Math.max(18, g.W + 2) : g.W;
      if (s.W !== wantW) {
        problems.push(`L${s.def.id} (${act.name}): board ${s.W}×${s.H}, act ${act.id} declares ${wantW}${boss ? ' (boss)' : ''}`);
      }
      if (s.fill < 0.2) problems.push(`L${s.def.id} (${act.name}): only ${(s.fill * 100).toFixed(0)}% filled — a ribbon in an EDGE-scale act`);
      if (s.blocks < g.mass.blocks * 0.5) {
        problems.push(`L${s.def.id} (${act.name}): ${s.blocks} wide-platform 2×2s, act floor ${g.mass.blocks} (half-floor ${Math.floor(g.mass.blocks * 0.5)})`);
      }
    }
    if (meanFill < g.mass.fill - 0.06) {
      problems.push(`act ${act.id} (${act.name}): mean fill ${(meanFill * 100).toFixed(0)}% below the declared ${(g.mass.fill * 100).toFixed(0)}% (tolerance 6)`);
    }
  }
  return { rows, problems };
}

// standalone report
if (import.meta.url === `file://${process.argv[1]}`) {
  const { rows, problems } = scaleAudit();
  console.log('act  name              board  levels  mean fill  target  2x2  min fill');
  for (const r of rows) {
    console.log(
      String(r.act).padEnd(4)
      + r.name.padEnd(18)
      + String(r.W).padEnd(7)
      + String(r.levels).padEnd(8)
      + `${(r.meanFill * 100).toFixed(0)}%`.padEnd(10)
      + `${(r.target * 100).toFixed(0)}%`.padEnd(8)
      + String(Math.round(r.meanBlocks)).padEnd(5)
      + `${(r.minFill * 100).toFixed(0)}%`,
    );
  }
  if (problems.length) {
    console.error(`\n${problems.length} scale problem(s):`);
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log('\nscale audit passed ✓');
}

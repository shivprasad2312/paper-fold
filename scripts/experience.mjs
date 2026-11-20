// ---------------------------------------------------------------------------
// KUBIK — experience-diversity curation gate (M2.5)
//
// The solvability verifier proves a level can be finished. This gate proves
// the campaign does not ask for the same *experience* over and over: a level
// is fingerprinted by what the player actually does — mechanic set, sentinel
// count/speed band, crumble load, route-length band, travel direction and
// map scale — and the sequence is audited for repetition monocultures.
//
// Hard failures (scripts/verify-levels.mjs, so they block commits):
//   - three consecutive levels with the identical full fingerprint;
//   - six consecutive levels with the same mechanic signature (any rolling
//     six must contain at least two signatures);
//   - an act with fewer than five mechanic signatures, or one signature on
//     more than 60% of its levels;
//   - an act whose declared identity mechanic (acts.js gen.force) is missing
//     from any of its levels, or a key act (keyP ≥ 0.4) with keys on fewer
//     than 40% of its levels;
//   - an intra-act par jump over 16 rolls (act-end boss spikes and act
//     boundaries are exempt — those are the designed spikes).
//
// The 51–200 generator also consults sequenceProblems() while ranking
// candidates, so a future regeneration avoids the local repetitions instead
// of merely being caught by them.
// ---------------------------------------------------------------------------
import { parseLevel, shortestRoute } from '../src/rules.js';
import { actForId, parJumpAllowance } from '../src/acts.js';

const MECH_FIELDS = [
  ['ice', 'I', (d) => (d.ice || []).length > 0],
  ['springs', 'P', (d) => (d.springs || []).length > 0],
  ['conveyors', 'C', (d) => (d.conveyors || []).length > 0],
  ['doors', 'D', (d) => (d.doors || []).length > 0],
  ['shuttles', 'S', (d) => (d.shuttles || []).length > 0],
  ['lifts', 'V', (d) => (d.lifts || []).length > 0],
  ['shrink', 'M', (d) => (d.shrink || []).length > 0],
  ['piston', 'Y', (d) => (d.pistons || []).length > 0],
  ['turntables', 'R', (d) => (d.turntables || []).length > 0],
  ['clings', 'G', (d) => (d.clings || []).length > 0],
  ['key', 'K', (d) => !!d.key],
  ['blocks', 'B', (d) => (d.blocks || []).length > 0],
  ['sliders', 'L', (d) => (d.sliders || []).length > 0],
  // 'A' (air) — NOT 'W': twin platforms already own 'W', and two
  // mechanics sharing a char would let a wind level masquerade as a twin
  // level in the diversity audit's signature
  ['wind', 'A', (d) => !!d.wind],
  ['timed', 'T', (d) => (d.timed || []).length > 0],
  ['freeze', 'F', (d) => (d.freeze || []).length > 0],
  ['heavy', 'H', (d) => (d.heavy || []).length > 0],
  ['pulse', 'U', (d) => (d.pulse || []).length > 0],
  ['proximity', 'X', (d) => (d.orbs || []).some((o) => !!o.wake)],
  ['twin', 'W', (d) => (d.shuttles || []).some((s) => !!s.twin)],
  ['boss', 'B', (d) => !!d.boss],
];

/**
 * Complexity ceiling (Phase C batch 3, ADR-040): how many DISTINCT mechanics
 * one level may present. The shipped catalogue's own maximum is nine, so the
 * ceiling never removes shipped content — it stops the density work from
 * drifting into kitchen sinks (a re-cut slot, scored for variety, will
 * happily stack eleven mechanics on one par-38 board and stop reading as
 * any particular mechanic's level). Density is a property of the CAMPAIGN;
 * a level is a place to learn one thing and practise two.
 */
export const MECH_CAP = 9;

/** The mechanic set a level presents, as a compact signature ('IPSK', '-'). */
export function mechanicSignature(def) {
  const sig = MECH_FIELDS.filter(([, , has]) => has(def)).map(([, ch]) => ch).join('');
  return sig || '-';
}

function parBand(par) {
  if (par == null || par < 0) return 'p?';
  if (par <= 18) return 'pS';
  if (par <= 28) return 'pM';
  if (par <= 38) return 'pL';
  return 'pXL';
}

/**
 * Fingerprint one level def. `par` may be supplied by a caller that already
 * proved the level (the generators and the verifier both have it); otherwise
 * it is computed from the def.
 */
export function experienceFingerprint(def, par = null) {
  let p = par;
  if (p == null) {
    try {
      p = shortestRoute(parseLevel(def));
    } catch {
      p = -1;
    }
  }
  const orbs = def.orbs || [];
  const maxSpeed = orbs.length ? Math.max(...orbs.map((o) => o.speed || 0)) : 0;
  const speedBand = !orbs.length ? 's0' : maxSpeed < 1.8 ? 's1' : maxSpeed < 2.15 ? 's2' : 's3';
  const rows = def.map || [];
  const size = Math.max(rows.length, ...(rows.map((r) => r.length || 0)));
  const dir = `d${Math.sign((def.goal || [0, 0])[0] - (def.start || [0, 0])[0])},${Math.sign((def.goal || [0, 0])[1] - (def.start || [0, 0])[1])}`;
  const mech = mechanicSignature(def);
  const label = [
    mech,
    `o${Math.min(3, orbs.length)}`,
    `c${Math.min(4, (def.crumble || []).length)}`,
    parBand(p),
    speedBand,
    dir,
    `m${size}`,
  ].join('|');
  return {
    id: def.id ?? null,
    mech,
    par: p,
    orbs: orbs.length,
    crumble: (def.crumble || []).length,
    dir,
    size,
    label,
  };
}

/**
 * Local sequence law for one candidate fingerprint against the fingerprints
 * immediately before it (oldest → newest). Used by the generator while it
 * still has a choice; experienceProblems() applies the same law to the
 * shipped sequence.
 */
export function sequenceProblems(next, recent) {
  const problems = [];
  const last2 = recent.slice(-2);
  if (last2.length === 2 && last2.every((f) => f.label === next.label)) {
    problems.push(`third consecutive identical experience fingerprint ${next.label}`);
  }
  const last5 = recent.slice(-5);
  if (last5.length === 5 && last5.every((f) => f.mech === next.mech)) {
    problems.push(`sixth consecutive level with mechanic signature ${next.mech}`);
  }
  return problems;
}

/**
 * Audit a whole ordered catalogue. `parById` (Map id → proven par) lets the
 * verifier reuse the pars it already computed; without it pars are derived
 * per level. Returns human-readable problems; [] means the campaign's
 * experience curve is diverse enough to ship.
 */
export function experienceProblems(defs, parById = new Map()) {
  const fps = defs.map((def) => experienceFingerprint(def, parById.get(def.id) ?? null));
  const problems = [];
  const where = (i) => `L${fps[i].id ?? i + 1}`;

  // — per-level complexity ceiling (ADR-040): a board may present at most
  //   MECH_CAP distinct mechanics. Checked here (not at parse) because it
  //   is a curation law about the catalogue, not about a level's geometry.
  for (const f of fps) {
    if (f.mech !== '-' && f.mech.length > MECH_CAP) {
      problems.push(`${where(fps.indexOf(f))}: ${f.mech.length} distinct mechanics (${f.mech}) — over the complexity cap of ${MECH_CAP}`);
    }
  }

  // — local sequence: no triple-identical experience, no six-in-a-row
  //   mechanic monoculture anywhere in the run (act boundaries included:
  //   the player experiences one continuous campaign).
  for (let i = 2; i < fps.length; i++) {
    if (fps[i].label === fps[i - 1].label && fps[i].label === fps[i - 2].label) {
      problems.push(`${where(i - 2)}–${where(i)}: three consecutive identical experience fingerprints (${fps[i].label})`);
    }
  }
  for (let i = 5; i < fps.length; i++) {
    const w = fps.slice(i - 5, i + 1);
    if (w.every((f) => f.mech === w[0].mech)) {
      problems.push(`${where(i - 5)}–${where(i)}: six consecutive levels share mechanic signature ${w[0].mech}`);
    }
  }

  // — difficulty steps: inside an act the par may climb, but not cliff.
  //   The act-end boss (every 20th) and the act boundary itself are the
  //   designed spikes and are exempt.
  for (let i = 1; i < fps.length; i++) {
    const a = actForId(fps[i - 1].id);
    const b = actForId(fps[i].id);
    if (!a || a !== b) continue;
    if (fps[i].id % 20 === 0) continue; // boss spike
    if (fps[i - 1].par < 0 || fps[i].par < 0) continue;
    const jump = Math.abs(fps[i].par - fps[i - 1].par);
    // The allowance is the act's OWN bandwidth (Phase G, ADR-045): an act
    // that declares par 36–84 has designed that spread, and a plaza beside a
    // meridian is the act reading as intended. The same helper gates the
    // generator, so a compliant catalogue cannot fail this after the fact.
    const allowed = parJumpAllowance(b);
    if (jump > allowed) {
      problems.push(`${where(i - 1)}→${where(i)}: intra-act par jump of ${jump} (${fps[i - 1].par}→${fps[i].par}, allowed ${allowed})`);
    }
  }

  // — act shape: variety inside the act, and the act's declared identity
  //   mechanics actually present.
  const byAct = new Map();
  for (const f of fps) {
    const act = actForId(f.id);
    if (!act) continue;
    if (!byAct.has(act.id)) byAct.set(act.id, { act, list: [] });
    byAct.get(act.id).list.push(f);
  }
  for (const { act, list } of byAct.values()) {
    const counts = new Map();
    for (const f of list) counts.set(f.mech, (counts.get(f.mech) || 0) + 1);
    if (counts.size < 5) {
      problems.push(`act ${act.id} (${act.name}): only ${counts.size} mechanic signatures across ${list.length} levels`);
    }
    const [topSig, topCount] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0] || ['-', 0];
    if (list.length && topCount / list.length > 0.6) {
      problems.push(`act ${act.id} (${act.name}): mechanic signature ${topSig} dominates ${topCount}/${list.length} levels`);
    }
    const gen = act.gen || {};
    for (const [field, ch] of [['ice', 'I'], ['spring', 'P'], ['shuttle', 'S']]) {
      if (!(gen.force && gen.force[field] > 0)) continue;
      const defField = field === 'ice' ? 'ice' : field === 'spring' ? 'springs' : 'shuttles';
      const missing = defs
        .filter((d) => d.id >= act.start && d.id <= act.end && !(d[defField] || []).length)
        .map((d) => d.id);
      if (missing.length) {
        problems.push(`act ${act.id} (${act.name}): forced mechanic ${field} (${ch}) missing at levels ${missing.join(', ')}`);
      }
    }
    if (gen.keyP >= 0.4) {
      const keyed = defs.filter((d) => d.id >= act.start && d.id <= act.end && d.key).length;
      if (list.length && keyed / list.length < 0.4) {
        problems.push(`act ${act.id} (${act.name}): key act carries keys on only ${keyed}/${list.length} levels`);
      }
    }
    // — sawtooth relief (Phase C, ADR-032): a difficulty staircase needs
    //   breathing slots, not a flat wall of median-par levels. Inside a
    //   generated act, no run of more than five consecutive levels may
    //   sit above the relief line (bottom third of the act's par band).
    if (gen.par) {
      const [lo, hi] = gen.par;
      const reliefLine = lo + (hi - lo) / 3;
      let run = 0;
      let runStart = null;
      for (const f of list) {
        if (f.par >= 0 && f.par > reliefLine) {
          if (run === 0) runStart = f;
          run++;
          if (run === 6) {
            problems.push(`act ${act.id} (${act.name}): sawtooth relief missing — 6+ levels above par ${reliefLine.toFixed(0)} from L${runStart.id} (no breathing slot in the bottom third of the band)`);
          }
        } else {
          run = 0;
        }
      }
    }
  }

  return problems;
}

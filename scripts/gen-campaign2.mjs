// ---------------------------------------------------------------------------
// KUBIK — campaign generator, levels 51–200 (ADR-015, milestone M2)
//
// Extends the pipeline that made 14–50: an ARCHETYPE (scripts/archetypes.mjs)
// carves the layout, the shared HAZARD STAGE (scripts/hazards.mjs) dresses
// it, and the candidate is run through the FULL verifier — spawn safety,
// reachability, soft-lock proof, crumble-aware solver, sentinel timing
// fairness, par band, and the rescue-bench check. Reject → next candidate.
// On top of that gate this generator adds:
//   - act budgets (src/acts.js): size, par, orb/crumble/speed, key, mechanics
//   - act-end boss budget (every 20th level)
//   - archetype rotation (no repeats inside an act window)
//   - uniqueness: signature hash + tile-overlap Jaccard vs shipped levels
//   - curation score: hazard variety + par placement; best candidate wins
//
//   node scripts/gen-campaign2.mjs
// ---------------------------------------------------------------------------
import {
  parseLevel,
  reachable,
  canStillFinish,
  solveHazards,
  spawnProblems,
  timingProblems,
  shortestRoute,
  shortestPath,
  rescueTile,
  fairReachSet,
  windTarget,
  windLockProblems,
  key,
  ROLL_TIME,
} from '../src/rules.js';
import { ARCHETYPES } from './archetypes.mjs';
import { applyHazards } from './hazards.mjs';
import { applySiteMass } from './sitemass.mjs';
import { mirrorDef } from './mirror.mjs';
import { verify } from './level-gate.mjs';
import { experienceFingerprint, sequenceProblems, mechanicSignature, MECH_CAP } from './experience.mjs';
import {
  ACTS, actForId, isActEnd, parTarget, parJumpAllowance, reliefSlot as isReliefSlot, MECH_SLOTS,
} from '../src/acts.js';
import { CAMPAIGN } from '../src/campaign.js';
import { writeFileSync } from 'node:fs';

const FIRST = Number(process.argv[2]) || 51;
const LAST = Number(process.argv[3]) || 200;
// 300 (was 220, 2026-11-13): the corrected fair-route model (roll-law
// fair-reach, carve candidate source, slide-lands-on-spring) rejects more
// candidates than M2's, so sparse slots' winners sit deeper in the stream.
// Sparse ACTS can raise it via the gen band's `attempts` field (act 10:
// 450 — its vault slot needs >300 under the final model); a global bump
// would make every gauntlet pay for one sparse slot. Under the fast timing
// model a full-budget level costs ~30–45 s, so the caps bound worst case
// without slowing the run.
const MAX_ATTEMPTS = Number(process.env.KUBIK_MAX_ATTEMPTS) || 300;

function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Act budget for a level id (act-end levels get the boss spike). */
function budget(id) {
  const act = actForId(id);
  const g = act.gen;
  if (!g) throw new Error(`no gen budget for level ${id}`);
  const b = {
    W: g.W,
    H: g.W,
    hMin: 1,
    hMax: 3,
    par: g.par,
    orbs: g.orbs,
    crumble: g.crumble,
    speed: g.speed,
    shards: g.shards,
    fill: g.fill,
    keyP: g.keyP,
    mech: g.mech,
    // Phase G (ADR-045): the board's site-mass contract. Acts without one
    // (and every pre-Phase-G level) simply skip the stage.
    mass: g.mass,
  };
  if (isActEnd(id)) {
    // the act-end spike: the boss carries the act's ceiling — and the
    // board grows with the act (Phase A escalation, ADR-030): a finale
    // is the biggest room of its act, never a standard 18×18
    b.W = Math.max(18, g.W + 2);
    b.H = b.W;
    // the boss track runs long: allow the par to sit above the act ceiling
    b.par = [g.par[0] + 2, g.par[1] + 4];
    b.orbs = [g.orbs[1], g.orbs[1]];
    b.crumble = [g.crumble[1], g.crumble[1]];
    b.keyP = Math.max(g.keyP, 0.5);
    // boss arenas (M3): an act-end level usually answers its key with a
    // second wave — the conversion itself is content-hash rolled
    b.mech = { ...g.mech, boss: 0.65 };
  }
  if (id === 200) b.keyP = 1; // the campaign finale is always sealed
  return b;
}

/** The archetype a level should try first + its carve-forcing. */
function pickArchetype(id, act, recent, forcedArch) {
  const g = act.gen;
  if (isActEnd(id)) return { arch: 'boss-arena', force: {} };
  // A relief slot is a promise about the LEVEL'S LENGTH, so it also has to
  // constrain the SHAPE: act 10's tower route measures ~82 rolls at 26×26 and
  // can never land under the band's bottom third, so the slot would silently
  // break the sawtooth (caught by the curation audit: "relief missing from
  // L183"). The act declares which of its archetypes are short enough.
  const base = isReliefSlot(id, act) && g.relief ? g.relief : g.arch;
  // rotate through the pool, never repeating the last two
  const pool = base.filter((a) => !recent.includes(a));
  const list = pool.length ? pool : base;
  const arch = forcedArch || list[(id * 7 + act.id * 3) % list.length];
  const force = {};
  if (arch === 'shuttle-span') force.shuttle = 1;
  if (arch === 'spring-field') {
    force.spring = 2;
    force.noShuttle = true;
  }
  if (arch === 'ice-river') force.ice = 1;
  if (arch === 'undertow') {
    force.ice = 1;
    force.spring = 1;
  }
  return { arch, force };
}

/** Fairness-only failures: sentinel-timing windows and the bench route are
 *  both a function of patrol speed, so the speed-tuning ladder may rescue
 *  both. (M2.5, 2026-11-12: the bench gate was missing from this trigger,
 *  so a candidate whose ONLY fairness problem was the bench route never got
 *  slowed down — L82 died there 17/26 times.) */
function timingOnly(rep) {
  return rep.problems.length > 0 && rep.problems.every((p) =>
    p.startsWith('timing:') || p.startsWith('no fair route'));
}
function tuneOrbSpeeds(def, mult) {
  return {
    ...def,
    orbs: (def.orbs || []).map((o) => ({ ...o, speed: +(o.speed * mult).toFixed(2) })),
  };
}

/** Curation score: hazard variety + par placement in the band. */
function score(def, par, b) {
  let s = (def.orbs || []).length;
  s += (def.crumble || []).length * 0.5;
  if (def.shuttles) s += 2;
  if (def.springs) s += 1.5;
  if (def.conveyors) s += 1.5;
  if (def.doors) s += 1.5;
  if (def.timed) s += 1;
  if (def.freeze) s += 1;
  if (def.heavy) s += 1.5;
  if (def.pulse) s += 1.5;
  if (def.clings) s += 1.5;
  if ((def.orbs || []).some((o) => o.wake)) s += 1;
  if ((def.shuttles || []).some((sh) => sh.twin)) s += 1;
  if (def.boss) s += 2;
  if (def.ice) s += 1;
  if (def.sliders) s += 1.5;
  if (def.wind) s += 1.5;
  if (def.key) s += 2;
  const span = b.par[1] - b.par[0];
  if (par >= b.par[0] + span * 0.3 && par <= b.par[1]) s += 1.5;
  return s;
}

/** Uniqueness: exact signature or >85% tile overlap with a shipped level. */
function tileSet(def) {
  const t = new Set();
  def.map.forEach((row, z) => {
    [...row].forEach((ch, x) => {
      if (ch >= '0' && ch <= '9') t.add(`${x},${z}`);
    });
  });
  return t;
}
function isUnique(def, seenSigs, recentTileSets) {
  const ts = tileSet(def);
  const sig = [...ts].sort().join(';');
  const h = hashSeed(sig + ':' + (def.orbs || []).length + ':' + (def.crumble || []).length);
  if (seenSigs.has(h)) return null;
  for (const other of recentTileSets) {
    if (other.size > ts.size) continue;
    let inter = 0;
    for (const t of other) if (ts.has(t)) inter++;
    const union = ts.size + other.size - inter;
    if (union > 0 && inter / union > 0.85) return null;
  }
  return { sig: h, ts };
}

// ---------------------------------------------------------------------------
// seed the uniqueness set with the shipped levels (1–50)
const seenSigs = new Set();
const allTileSets = [];
for (const def of CAMPAIGN) {
  const ts = tileSet(def);
  allTileSets.push(ts);
  seenSigs.add(hashSeed([...ts].sort().join(';') + ':' + (def.orbs || []).length + ':' + (def.crumble || []).length));
}
const recentTileSets = [];

// Experience-diversity sequence state (M2.5 curation gate): fingerprints of
// the levels immediately before this run (the shipped file for a partial
// run, levels 46–50 for a full one), so candidate selection can avoid
// creating a repetitive run instead of leaving it to the verifier to catch.
const recentExperience = [];
{
  let shipped2 = [];
  try {
    ({ CAMPAIGN2: shipped2 } = await import(new URL('../src/campaign2.js', import.meta.url)));
  } catch {
    /* no shipped file yet — the run starts the sequence */
  }
  const seedDefs = [...CAMPAIGN, ...shipped2.filter((d) => d.id < FIRST)]
    .sort((a, b) => a.id - b.id)
    .slice(-5);
  for (const d of seedDefs) {
    try {
      recentExperience.push(experienceFingerprint(d));
    } catch {
      /* an unparseable seed level simply does not constrain the sequence */
    }
  }
}
const rememberExperience = (fp) => {
  if (!fp) return;
  recentExperience.push(fp);
  if (recentExperience.length > 12) recentExperience.shift();
};

// per-act name pools: consumed in level-id order, boss gets the last name
const nameQueue = {};
for (const act of ACTS) {
  if (!act.gen) continue;
  nameQueue[act.id] = [...act.gen.names];
  // a partial run starts mid-act: the earlier levels already took their
  // names. The act's generated range starts at max(act.start, 51) — acts
  // 3's first ten levels (41–50) live in campaign.js with their own NAMES
  // list, so act 3's pool only covers 51–60. (The previous
  // `FIRST - act.gen.start` was NaN — act.gen has no start — which
  // silently skipped the slice and reused already-consumed names.)
  const drop = Math.max(0, Math.min(nameQueue[act.id].length, FIRST - Math.max(act.start, 51)));
  if (drop) nameQueue[act.id] = nameQueue[act.id].slice(drop);
}

// PAR LEDGER (Phase G): the par curve is a promise between neighbours, so
// the generator has to know the par it has already committed to. Seed it with
// the level before FIRST (a chunked run starts mid-act) and add each level as
// it settles; `parseLevel`/`shortestRoute` are the same functions the audit
// uses, so the numbers cannot disagree.
const parsById = new Map();
{
  let shipped3 = [];
  try {
    ({ CAMPAIGN2: shipped3 } = await import(new URL('../src/campaign2.js', import.meta.url)));
  } catch { /* first run */ }
  const prev = [...CAMPAIGN, ...shipped3].find((d) => d.id === FIRST - 1);
  if (prev) {
    try {
      parsById.set(prev.id, shortestRoute(parseLevel(prev)));
    } catch { /* unparseable neighbour: no constraint */ }
  }
}

const out = [];
const archRecent = {};
for (let id = FIRST; id <= LAST; id++) {
  const act = actForId(id);
  const b = budget(id);
  const rand = rng(hashSeed(`kubik-campaign2-${id}`));
  let { arch, force } = pickArchetype(id, act, archRecent[act.id] || []);
  if (process.env.KUBIK_FORCE_ARCH) {
    const [fId, fArch] = process.env.KUBIK_FORCE_ARCH.split('=');
    if (Number(fId) === id) ({ arch, force } = pickArchetype(id, act, archRecent[act.id] || [], fArch));
  }

  // key archetypes are key levels, guaranteed
  let bEff = b;
  if (arch === 'key-detour' || arch === 'vault') bEff = { ...b, keyP: 1 };
  // spring-field: never also a shuttle
  if (force.noShuttle) bEff = { ...bEff, mech: { ...bEff.mech, shuttle: 0 } };
  // gauntlet/undertow (the same long spiral under two names): forced
  // mechanics on it are already dense, and the act's 2–3 patrols on top
  // starve sentinel-timing fairness (L82: 29/220 candidates reached the
  // expensive checks and every one failed a timing or bench-fairness gate;
  // L101 the same with forced ice only). Relax the sentinel FLOOR for the
  // archetype — the identity mechanics stay forced. M2.5, 2026-11-12.
  if (arch === 'undertow' || arch === 'gauntlet') bEff = { ...bEff, orbs: [0, 1] };
  // the act's IDENTITY mechanics (acts.js `force` — e.g. the ice act, the
  // shuttle act) merge under the archetype's own force; the archetype wins
  // a conflict. Must be wrapped as { force } — applyHazards' opts shape
  // (fixed 2026-11-12: passing the force object bare made opts.force
  // undefined, so no forced carve ever happened and the mechanic acts
  // silently shipped mechanic-free).
  let allForce = { ...(act.gen.force || {}), ...force };
  // the mechanic curriculum (Phase C) as DATA: a slot that exists to teach,
  // test or twist a mechanic carries that carve on every regeneration
  for (const [mech, idsV] of Object.entries(MECH_SLOTS)) {
    if (idsV.includes(id)) allForce[mech] = (allForce[mech] || 0) + 1;
  }
  // introduction knob (sibling of KUBIK_FORCE_ARCH): force a mechanic
  // carve on ONE slot, e.g. KUBIK_FORCE_MECH=175=conveyor — how a new
  // mechanic enters the shipped campaign: one proven slot at a time,
  // through the full gate, instead of a campaign-wide regeneration.
  if (allForce.wind) {
    // a wind slot is a designed pure-movement exception (ADR-039): the breeze
    // cannot share a level with the act's clocked identity mechanic
    for (const m of Object.keys(act.gen.force || {})) delete allForce[m];
  }
  if (process.env.KUBIK_FORCE_MECH) {
    const [fId, fMech] = process.env.KUBIK_FORCE_MECH.split('=');
    // a '+' list forces a combination on the slot (Phase C twist slots:
    // teach solo, test in context, twist paired — ADR-031)
    if (Number(fId) === id && fMech) {
      const list = fMech.split('+');
      // a wind slot is a designed pure-movement exception (ADR-039): the
      // breeze cannot share a level with the act's clocked identity
      // mechanic, so a forced wind slot drops the ACT's identity forces
      // (never the ones the caller explicitly paired with it)
      if (list.includes('wind')) {
        for (const m of Object.keys(act.gen.force || {})) delete allForce[m];
      }
      for (const m of list) allForce[m] = (allForce[m] || 0) + 1;
    }
  }
  // per-act attempt budget (acts.js gen band `attempts`); the act's slot
  // density sets it — see the MAX_ATTEMPTS note above.
  const slotBudget = (act.gen && act.gen.attempts) || MAX_ATTEMPTS;

  let def = null;
  let report = null;
  // best: proven AND unique; bestAny: proven but NOT unique. The rolling
  // 40-level uniqueness window can starve a level when the earlier levels
  // of the act settle on candidates that resemble every good candidate
  // here, so the END-OF-ATTEMPTS settle may relax to bestAny — with a
  // warning (the file-level gate does not enforce cross-level similarity).
  let best = null;
  // a jump-compliant fallback: when the budget runs out, the PACING promise
  // outranks the uniqueness preference — a level that breaks the act's
  // difficulty curve is worse than one that resembles its neighbours
  let bestJump = null;
  let bestAny = null;
  // Single-pass candidate loop (M2.5, fixed 2026-11-12): the old 3-phase
  // loop re-ran the same rand stream under orb budgets [orbs0, ceil/2, 0],
  // so an early "proven but low-orb" candidate was verified only under the
  // STRICT budget and could never pass — the relaxed phases saw only later
  // (and worse) candidates. L82 had exactly 4 proven candidates in 660
  // attempts, all orbs=0, all in the phase-3 window, so it failed at 220
  // attempts yet passed at 60. Now: verify once with minOrbs=0 and PREFER
  // full-orb candidates explicitly (rank = orb count, then score).
  // a wind slot is a pure-movement level: it carries no patrol by parse law
  // (ADR-039), so its orb target is zero by design, not by starvation
  const wantOrbs = allForce.wind ? 0 : bEff.orbs[0];
  // ranking: sentinels first (the act's band), then the designed curve —
  // a candidate ON the act's pacing target beats a busier one 20 rolls off it
  const target = parTarget(id, act);
  const rankOf = (c, s, par) => (c.orbs || []).length * 1e6
    - Math.abs(par - target) * 900 + s * 120;
  // sawtooth relief slot (Phase C, ADR-032): KUBIK_RELIEF=<id> settles
  // this slot on its SHORTEST proven candidate instead of the
  // highest-ranked one — a designed breathing slot in the act's par
  // curve (bottom third of the band), not an accident of the draw.
  const reliefSlot = Number(process.env.KUBIK_RELIEF || 0) === id;
  const rankRelief = (c, s, par) => (reliefSlot ? -par * 100000 + s : rankOf(c, s, par));
  for (let attempt = 0; attempt < slotBudget && !def; attempt++) {
    const layout = ARCHETYPES[arch](rand, bEff);
    if (!layout) continue;
    // Phase G (ADR-045): give the route a place to happen in BEFORE hazards
    // are dressed, so every patrol, shard and carve is placed against the
    // geometry the player actually meets. Mass is additive over void, keeps
    // every route tile's height, and the verifier still has to accept the
    // result — a massy board that flattens the par is rejected like any
    // other bad candidate.
    const site = applySiteMass(layout, rand, bEff);
    if (!site) continue;
    let cand = applyHazards(site, bEff, rand, { force: allForce });
    if (!cand) continue;
    cand = { ...cand, id, name: '', hint: act.gen.hint };
    // MIRROR FIRST, THEN PROVE (ADR-041). The shipped layout is the mirrored
    // one, so it — not the pre-mirror carve — is what the gate must accept.
    // The old order proved the carve and trusted the mirror to be a true
    // symmetry; that trust is unwarranted: a shuttle dock's height is
    // derived from an ORDERED neighbour scan (west, east, north, south), so
    // an x-flip can land the platform a storey off and the mirrored level is
    // no longer the level that was proven. L38 (hand-authored) is the
    // standing example: x-mirrored it is unsolvable. Mirror-then-verify
    // makes the symmetry argument unnecessary.
    if (act.gen.flip) cand = mirrorDef(cand, act.gen.flip);
    let rep = verify(cand, bEff, 0);
    if (process.env.KUBIK_PROBE && rep && !rep.ok && attempt < 4) {
      console.error(`  probe L${id} attempt ${attempt}: orbs=${(cand.orbs||[]).length} ${JSON.stringify((rep.problems||[]).slice(0,3))}`);
    }
    if (!rep.ok && timingOnly(rep) && (cand.orbs || []).length) {
      for (const m of [0.9, 0.8, 0.68, 0.56, 0.45]) {
        const tuned = tuneOrbSpeeds(cand, m);
        const r2 = verify(tuned, bEff, 0);
        if (r2.ok) {
          cand = tuned;
          rep = r2;
          break;
        }
      }
    }
    if (!rep.ok) continue;
    // a forced lift must be RIDDEN by the proven route — a shaft the
    // optimal line never takes teaches nothing (Phase B, ADR-033)
    if ((allForce.lift || 0) > 0) {
      const lv = parseLevel(cand);
      const pth = shortestPath(lv);
      if (!pth || !pth.some((t) => t.lift)) continue;
    }
    // a forced shrink must be DUCKED THROUGH by the proven route — a
    // tunnel the optimal line walks around teaches nothing (Phase B)
    if ((allForce.shrink || 0) > 0) {
      const lv = parseLevel(cand);
      const pth = shortestPath(lv);
      if (!pth || !pth.some((t) => t.low)) continue;
    }
    // a forced piston must be CROSSED by the proven route — a corridor
    // the optimal line never enters teaches nothing (Phase B, ADR-035)
    if ((allForce.piston || 0) > 0) {
      const lv = parseLevel(cand);
      const pth = shortestPath(lv);
      if (!pth || !pth.some((t) => lv.pistonCells.has(`${t.x},${t.z}`))) continue;
    }
    // a forced turntable must be CROSSED by the proven route — a bar
    // the optimal line walks around teaches nothing (Phase B, ADR-036)
    if ((allForce.turntable || 0) > 0) {
      const lv = parseLevel(cand);
      const pth = shortestPath(lv);
      if (!pth || !pth.some((t) => lv.turntableCells.has(`${t.x},${t.z}`))) continue;
    }
    // a forced slider must be CROSSED by the proven route (ADR-038): a
    // bridge the optimal line walks around teaches nothing. The carve
    // always takes the walk, but a shorter alternative may exist.
    if ((allForce.slider || 0) > 0) {
      const lv = parseLevel(cand);
      const pth = shortestPath(lv);
      if (!pth || !pth.some((t) => lv.sliderTiles.has(`${t.x},${t.z}`))) continue;
    }
    // a forced cling must be CROSSED by the proven route (Phase B,
    // ADR-037): the grip crevice only teaches if the optimal line takes
    // it. A cling edge is a shortcut, so this is a strict par comparison
    // — par with the clings must beat par with them stripped (any shorter
    // line necessarily crosses a grip).
    if ((allForce.cling || 0) > 0) {
      const lv = parseLevel(cand);
      const bare = parseLevel({ ...cand, clings: undefined });
      const p1 = shortestRoute(lv);
      const p0 = shortestRoute(bare);
      if (!(p1 > 0) || !(p0 > p1)) continue;
    }
    const uniq = isUnique(cand, seenSigs, recentTileSets);
    const s = score(cand, rep.par, bEff);
    const o = (cand.orbs || []).length;
    // experience fingerprint of the level as the player will meet it —
    // the def is already mirrored, so this is the shipped layout
    const expFp = experienceFingerprint(cand, rep.par);
    const expOk = sequenceProblems(expFp, recentExperience).length === 0;
    // THE MIRROR LAW (ADR-041), now proved rather than assumed. The generator
    // can flip a proven layout, and the mirror test pins every generated
    // level: the x- and z-mirror must have the same par. That held until a
    // Phase G candidate shipped where the mirrored board could only reach its
    // key by crossing the sealed goal (L72: 28 vs no route) — a legal level
    // whose mirror is not, which the test rightly refuses. Checking the
    // mirrors of a candidate is two BFS runs, and only when it is about to
    // be accepted.
    const mirroredOk = () => {
      for (const axis of ['x', 'z']) {
        try {
          if (shortestRoute(parseLevel(mirrorDef(cand, axis))) !== rep.par) return false;
        } catch {
          return false;
        }
      }
      return true;
    };
    // the pacing law, enforced rather than hoped for: a candidate that would
    // step further than the act's allowance from the level before it is not a
    // settle candidate at all (the audit uses the same allowance, so a
    // settled catalogue cannot fail it — the first Phase G run did, 18–31
    // rolls, because ranking only PREFERRED the curve).
    const prevPar = parsById.get(id - 1);
    // THE JUMP LAW, BOTH ENDS. A level may not step further than the act's
    // allowance from the one before it — and a level may not climb so high
    // that the BREATHER AFTER IT cannot reach it. Only the first half was
    // enforced at first: L197 settled at 79 (its target was 69) and the
    // relief slot L198 could not get within 34 of it even at its shortest
    // proven par (42), so the fallback shipped a 37-roll cliff into the
    // breather (caught by the curation audit). The headroom is the relief's
    // own target plus the allowance, less one slot's worth of slack.
    const nextIsRelief = id + 1 <= 200 && isReliefSlot(id + 1, actForId(id + 1));
    const headroom = nextIsRelief
      ? parTarget(id + 1, actForId(id + 1)) + parJumpAllowance(act) - 6
      : Infinity;
    const jumpOk = (prevPar == null || actForId(id - 1) !== act
      || Math.abs(rep.par - prevPar) <= parJumpAllowance(act))
      && rep.par <= headroom;
    const mirrorOk = jumpOk && uniq && expOk ? mirroredOk() : false;
    if (uniq && expOk && jumpOk && mirrorOk && (!best || rankRelief(cand, s, rep.par) > rankRelief(best.cand, best.s, best.rep.par))) best = { cand, rep, s, uniq, expFp };
    if (jumpOk && (!bestJump || rankRelief(cand, s, rep.par) > rankRelief(bestJump.cand, bestJump.s, bestJump.rep.par))) {
      bestJump = { cand, rep, s, uniq, expFp };
    }
    if (!bestAny || rankRelief(cand, s, rep.par) > rankRelief(bestAny.cand, bestAny.s, bestAny.rep.par)) bestAny = { cand, rep, s, uniq, expFp };
    // full orb budget met: take the best after a short exploration window
    // (a relief slot keeps exploring: its shortest candidate may come late)
    const span = bEff.par[1] - bEff.par[0];
    const tol = Math.max(3, Math.round(span * 0.1));
    // accept early only when the candidate also sits ON the act's designed
    // curve — a proven level 20 rolls off the pacing target keeps the search
    // going; the patience cap (110 attempts) is the escape hatch that keeps a
    // sparse slot from running forever.
    const nearCurve = best ? Math.abs(best.rep.par - parTarget(id, act)) <= tol : false;
    if (!reliefSlot && best && (best.cand.orbs || []).length >= wantOrbs
      && ((attempt >= 24 && nearCurve) || attempt >= 110)) {
      def = best.cand;
      report = best.rep;
      seenSigs.add(best.uniq.sig);
      recentTileSets.push(best.uniq.ts);
      allTileSets.push(best.uniq.ts);
      rememberExperience(best.expFp);
      break;
    }
    // end of attempts: settle for the best proven candidate
    if ((best || bestAny) && attempt >= slotBudget - 40) {
      const pick = best || bestAny;
      if (!best) console.error(`⚠ level ${id} (${arch}): uniqueness exhausted — settled non-unique`);
      if (pick.expFp && sequenceProblems(pick.expFp, recentExperience).length) {
        console.error(`⚠ level ${id} (${arch}): diversity exhausted — settled repetitive (${pick.expFp.label})`);
      }
      if ((pick.cand.orbs || []).length < wantOrbs) {
        console.error(`⚠ level ${id} (${arch}): relaxed sentinels to ${(pick.cand.orbs || []).length}`);
      }
      def = pick.cand;
      report = pick.rep;
      if (pick.uniq) {
        seenSigs.add(pick.uniq.sig);
        recentTileSets.push(pick.uniq.ts);
        allTileSets.push(pick.uniq.ts);
      }
      rememberExperience(pick.expFp);
    }
  }
  // the settle above only runs on attempts whose own candidate passed —
  // a slot with a single proven candidate early in the budget (the boss
  // finale under a forced mechanic: 1 in 450) would otherwise starve.
  // Settle for the best proven candidate at the true end of attempts.
  if (!def && (best || bestJump || bestAny)) {
    const pick = best || bestJump || bestAny;
    if (!best && bestJump) {
      console.error(`⚠ level ${id} (${arch}): settled for pacing over uniqueness/diversity`);
    } else if (!best) {
      console.error(`⚠ level ${id} (${arch}): uniqueness exhausted — settled non-unique`);
    }
    if (pick.expFp && sequenceProblems(pick.expFp, recentExperience).length) {
      console.error(`⚠ level ${id} (${arch}): diversity exhausted — settled repetitive (${pick.expFp.label})`);
    }
    if ((pick.cand.orbs || []).length < wantOrbs) {
      console.error(`⚠ level ${id} (${arch}): relaxed sentinels to ${(pick.cand.orbs || []).length}`);
    }
    def = pick.cand;
    report = pick.rep;
    if (pick.uniq) {
      seenSigs.add(pick.uniq.sig);
      recentTileSets.push(pick.uniq.ts);
      allTileSets.push(pick.uniq.ts);
    }
    rememberExperience(pick.expFp);
  }
  if (!def) {
    console.error(`✗ level ${id} (${arch}): no candidate passed ${slotBudget} attempts`);
    process.exit(1);
  }
  // commit the par to the ledger the next slot reads
  parsById.set(id, report.par);
  {
    const prevPar = parsById.get(id - 1);
    if (prevPar != null && actForId(id - 1) === act
      && Math.abs(report.par - prevPar) > parJumpAllowance(act)) {
      console.error(`⚠ level ${id} (${arch}): settled off-curve — par jump ${prevPar}→${report.par} exceeds ${parJumpAllowance(act)}`);
    }
  }

  // name from the act pool (boss takes the act's last name automatically)
  def.name = nameQueue[act.id].shift();
  if (!def.name) {
    console.error(`✗ level ${id}: act ${act.id} name pool exhausted`);
    process.exit(1);
  }

  // orientation rotation (M2.5): mirror the proven level per act budget

  // remember the archetype (rotation window: last 2 in this act)
  archRecent[act.id] = [...(archRecent[act.id] || []), arch].slice(-2);
  if (recentTileSets.length > 40) recentTileSets.shift();

  out.push(def);
  const mech =
    (def.shuttles ? 'S' : '') + (def.springs ? 'P' : '') + (def.ice ? 'I' : '') + (def.conveyors ? 'C' : '') + (def.doors ? 'D' : '') + (def.timed ? 'T' : '') + (def.freeze ? 'F' : '') + (def.heavy ? 'H' : '') + (def.pulse ? 'U' : '') + ((def.orbs || []).some((o) => o.wake) ? 'X' : '') + ((def.shuttles || []).some((sh) => sh.twin) ? 'W' : '') + (def.boss ? 'B' : '') + (def.key ? 'K' : '') + (def.clings ? 'G' : '') + (def.sliders ? 'L' : '') + (def.wind ? 'A' : '');
  console.log(
    `${String(id).padStart(3)} [${act.name.slice(0, 8).padEnd(8)}] ${arch.padEnd(13)} ${def.name.padEnd(24)} ` +
      `par ${String(report.par).padStart(2)} · orbs ${(def.orbs || []).length} · crumble ${(def.crumble || []).length}` +
      (mech ? ` · ${mech}` : ''),
  );
}

// a PARTIAL run (e.g. `51 60`) must splice into the existing file, never
// truncate it: keep the shipped levels outside the regenerated span (and
// any slot the range failed to prove). Always merge — even a run where
// every slot in the span succeeded must not drop the rest of the file.
{
  let shipped = [];
  try {
    ({ CAMPAIGN2: shipped } = await import(new URL('../src/campaign2.js', import.meta.url)));
  } catch {
    /* no file yet — nothing to merge into */
  }
  const byId = new Map(shipped.map((d) => [d.id, d]));
  out.forEach((d) => byId.set(d.id, d));
  const merged = [...byId.values()].sort((a, b) => a.id - b.id);
  const want = Array.from({ length: 200 - 51 + 1 }, (_, i) => i + 51);
  if (want.every((id) => byId.has(id))) {
    out.length = 0;
    out.push(...merged);
    console.log(`(merged: ${merged.length} levels, ${merged.length - (LAST - FIRST + 1)} kept from the shipped file)`);
  } else {
    const missing = want.filter((id) => !byId.has(id));
    console.error(`ERROR: span ${FIRST}–${LAST} left the catalogue incomplete (missing ${missing.join(',')}) — file not written`);
    process.exit(1);
  }
}

const js = `// ---------------------------------------------------------------------------
// KUBIK — campaign levels 51–200
//
// Generated by scripts/gen-campaign2.mjs: an archetype carves the layout, the
// shared hazard stage dresses it, and every candidate is rejected until the
// full verifier proves it (reachability, soft-lock proof, crumble-aware
// solver, sentinel timing fairness, par band, rescue-bench fairness) and the
// uniqueness gate clears it. Static data on purpose: the shipped game stays
// deterministic and version-controlled (ADR-004).
// ---------------------------------------------------------------------------

export const CAMPAIGN2 = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(new URL('../src/campaign2.js', import.meta.url), js);
console.log(`\nWrote src/campaign2.js with ${out.length} proven levels (${FIRST}–${LAST}) ✓`);

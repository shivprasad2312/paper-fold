// ---------------------------------------------------------------------------
// KUBIK — the Vault generator, levels 201–210 (Phase E, ADR-043)
//
// The Vault is bonus content that sits OUTSIDE the 200-level campaign: ten
// citadel-scale rooms, unlocked by total shards, one per headline mechanic.
// They are generated offline and committed as static data, exactly like the
// campaign (ADR-004), and they are proved by the SAME gate —
// scripts/level-gate.mjs — so "bonus" never means "less verified".
//
// Rules that differ from the campaign:
//   - the board ladder runs 22 → 26: the Vault meets the campaign's cap
//     (Phase G, ADR-045) instead of topping out below it
//   - every slot opens with its headline mechanic FORCED, so the Vault reads
//     as ten master classes rather than ten more levels
//   - par bands are wider than Act 10's, and the finale (L210) is sealed
//
//   node scripts/gen-vault.mjs               # all ten
//   node scripts/gen-vault.mjs 203 204       # re-cut specific ids
// ---------------------------------------------------------------------------
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { LEVELS } from '../src/levels.js';
import { parseLevel, shortestPath, shortestRoute } from '../src/rules.js';
import { ARCHETYPES } from './archetypes.mjs';
import { applyHazards } from './hazards.mjs';
import { verify } from './level-gate.mjs';
import { experienceFingerprint, sequenceProblems, mechanicSignature, MECH_CAP } from './experience.mjs';

const FIRST = 201;
const LAST = 210;
const MAX_ATTEMPTS = Number(process.env.KUBIK_MAX_ATTEMPTS || 600);
const OUT = process.env.KUBIK_OUT || 'src/vault.js';

// One slot per headline mechanic: teach the campaign's whole vocabulary at
// master scale. `mech` is the forced carve; the rest of the stage is the
// Act-10 probability table, so a Vault room still carries company.
const SCHEDULE = [
  { id: 201, mech: 'lift', arch: ['tower', 'citadel', 'plaza'], W: 22, par: [50, 74], name: 'The Long Haul', hint: 'A lift you have to earn — the counterweight is your patience' },
  { id: 202, mech: 'shrink', arch: ['tower', 'plaza', 'citadel'], W: 22, par: [50, 74], name: 'The Narrowing', hint: 'Small doors, big drops — the tunnel is the only way through' },
  { id: 203, mech: 'piston', arch: ['tower', 'plaza', 'citadel'], W: 24, par: [52, 78], name: 'The Hammer', hint: 'Cross behind the arm, never against it' },
  { id: 204, mech: 'turntable', arch: ['tower', 'citadel', 'plaza'], W: 24, par: [54, 80], name: 'The Turning Point', hint: 'The bar joins one pair, then the other — pick your moment' },
  { id: 205, mech: 'cling', arch: ['tower', 'plaza', 'citadel'], W: 24, par: [54, 80], name: 'The Overhang', hint: 'The far face is catchable — a press, not a jump' },
  { id: 206, mech: 'slider', arch: ['tower', 'citadel', 'plaza'], W: 26, par: [56, 84], name: 'The Tide Bridge', hint: 'The bridge is a clock — wait for the rise, then commit' },
  { id: 207, mech: 'wind', arch: ['meridian', 'tower', 'citadel'], W: 26, par: [56, 84], name: 'The Gale Room', hint: 'Stand still and the room moves you — roll, never wait' },
  { id: 208, mech: 'door', arch: ['tower', 'aperture', 'citadel'], W: 26, par: [58, 88], name: 'The Long Lock', hint: 'The plate is not beside the door it opens' },
  { id: 209, mech: 'freeze', arch: ['tower', 'aperture', 'citadel'], W: 26, par: [60, 90], name: 'The Cold Vault', hint: 'Every shard you take freezes you in place — time them' },
  { id: 210, mech: 'shuttle', arch: ['boss-arena', 'tower', 'citadel'], W: 26, par: [88, 96], name: 'The Vault Itself', hint: 'Everything you have learned, at the top of the game' },
];

/**
 * The Vault's declared par band, exported into the generated file so the
 * verifier and the unit tests read ONE number instead of three copies.
 *
 * Phase G (ADR-045) raised the campaign to 26×26 and par 84 at the finale,
 * which quietly made the old Vault (20–24 boards, par 38–80) EASIER than the
 * content that unlocks it — the bonus rooms are the top of the game by
 * fiction, so they have to be the top of it by numbers too. The Vault now
 * starts where act 10's sawtooth peaks (50) and ends 12 above the campaign
 * ceiling (96), on boards that ladder up to the same 26 cap.
 */
export const VAULT_PAR_BAND = [50, 96];


/**
 * A room's floor contract. The campaign generator may relax sentinels under
 * schedule pressure; the Vault may not — but the floor has to be one the
 * geometry can actually meet at this size with a forced carve, or the slot
 * never proves (probed: 2 sentinels + 2 crumble on a forced-grip 20×20 is
 * a lottery). So the contract is "a hazard budget", not two separate
 * quotas: one sentinel at least, and at least two of (sentinel, crumble
 * cluster) — the room must never be a bare walk.
 * The breeze is the exception by parse law: a wind level carries no
 * patrol at all, so its floor is crumble only.
 */
function floorFor(slot) {
  // the breeze is a pure-movement level by parse law (ADR-039): no patrols,
  // and the hazard stage never carves crumble into a wind room, so its
  // contract is the breeze itself — which the gate already proves moves the
  // route at two or more tiles. Demanding a hazard quota here would make
  // the slot unprovable for a reason the design does not have.
  if (slot.mech === 'wind') return { orbs: 0, crumble: 0, hazard: 0, mech: 3 };
  return { orbs: 1, crumble: 0, hazard: 2, mech: 4 };
}

// The Act-10 stage table: the Vault is the endgame's company, at density.
const MECH = {
  ice: 0.7, spring: 0.7, shuttle: 0.8, conveyor: 0.6, door: 0.5, timed: 0.55,
  freeze: 0.5, heavy: 0.45, blocks: 0.35, pulse: 0.45, proximity: 0.45,
  twin: 0.45, lift: 0.35, shrink: 0.35, piston: 0.35, turntable: 0.35,
  cling: 0.35, slider: 0.35, wind: 0.15,
};

const NAMES = new Set(LEVELS.map((d) => d.name));
const seenSigs = new Set();
const allTileSets = [];

function tileSet(def) {
  const t = new Set();
  def.map.forEach((row, z) => {
    [...row].forEach((ch, x) => {
      if (ch >= '0' && ch <= '9') t.add(`${x},${z}`);
    });
  });
  return t;
}
function isUnique(def, recent) {
  const ts = tileSet(def);
  const sig = [...ts].sort().join(';');
  if (seenSigs.has(sig)) return null;
  for (const prev of recent) {
    if (prev.size === ts.size && [...ts].every((k) => prev.has(k))) return null;
  }
  return { sig, ts };
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
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const wanted = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n));
const slots = wanted.length ? SCHEDULE.filter((s) => wanted.includes(s.id)) : SCHEDULE;
if (!slots.length) {
  console.error(`no slot matched; ids are ${FIRST}–${LAST}`);
  process.exit(1);
}

// keep the already-shipped Vault levels that are not being re-cut
let shipped = [];
const outPath = resolve(process.cwd(), OUT);
if (existsSync(outPath)) {
  const mod = await import(`${pathToFileURL(outPath).href}?t=${Date.now()}`);
  shipped = mod.VAULT || [];
}
const keep = shipped.filter((d) => !slots.some((s) => s.id === d.id));
for (const d of keep) {
  seenSigs.add([...tileSet(d)].sort().join(';'));
  NAMES.add(d.name);
  allTileSets.push(tileSet(d));
}

const out = [...keep];
for (const slot of slots) {
  const rand = rng(hashSeed(`kubik-vault-${slot.id}`));
  const b = {
    W: slot.W,
    H: slot.W,
    hMin: 1,
    hMax: 3,
    par: slot.par,
    orbs: slot.mech === 'wind' ? [0, 0] : [2, 3],
    crumble: [2, 4],
    speed: [1.7, 2.4],
    shards: [4, 4],
    fill: [6, 10],
    keyP: slot.id === 210 ? 1 : 0.4,
    mech: { ...MECH, boss: slot.id === 210 ? 0.65 : 0 },
  };
  const allForce = { [slot.mech]: 1 };
  const floor = floorFor(slot);

  let def = null;
  let report = null;
  let best = null;
  let bestAny = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && !def; attempt++) {
    const arch = slot.arch[attempt % slot.arch.length];
    const layout = ARCHETYPES[arch](rand, b);
    if (!layout) continue;
    let cand = applyHazards(layout, b, rand, { force: allForce });
    if (!cand) continue;
    cand = { ...cand, id: slot.id, name: '', hint: slot.hint };
    const rep = verify(cand, b, 0);
    if (!rep.ok) continue;
    // hard floors: a Vault room may not settle below its hazard contract
    // (see floorFor — the campaign relaxes under schedule pressure; the
    // Vault has none, so a slot that cannot meet its floor fails loudly
    // instead of shipping a quiet walk)
    const o = (cand.orbs || []).length;
    const c = (cand.crumble || []).length;
    if (o < floor.orbs || c < floor.crumble || o + c < floor.hazard) continue;
    // the forced mechanic must be CROSSED by the proven route — the same
    // law every campaign slot obeys (ADR-033…ADR-038): decoration cannot
    // ship, and in the Vault a headline mechanic that the optimal line
    // walks around would be the whole point of the room, missing
    const lv = parseLevel(cand);
    const pth = shortestPath(lv) || [];
    const crossed = {
      lift: (t) => t.lift,
      shrink: (t) => t.low,
      piston: (t) => lv.pistonCells.has(`${t.x},${t.z}`),
      turntable: (t) => lv.turntableCells.has(`${t.x},${t.z}`),
      // a cling press spans the crevice, so the proven path never STANDS on
      // the void cell — the gate's own law (a grip whose par is not shorter
      // than the bare par is rejected as decoration) is the crossing check
      cling: () => true,
      slider: (t) => lv.sliderTiles.has(`${t.x},${t.z}`),
      door: (t) => !!t.door,
      freeze: (t) => t.freeze,
      shuttle: (t) => t.shuttle,
      // the breeze is proved by the gate itself (it must move the proven
      // route at two or more tiles, or the level is rejected as decoration)
      wind: () => true,
    }[slot.mech];
    if (!crossed || !pth.some(crossed)) continue;
    const uniq = isUnique(cand, allTileSets.slice(-40));
    const rank = (cand.orbs || []).length * 100000 + (cand.crumble || []).length + rep.par / 100;
    if (uniq && (!best || rank > best.rank)) best = { cand, rep, uniq, rank };
    if (!bestAny || rank > bestAny.rank) bestAny = { cand, rep, uniq, rank };
    if (best && (best.cand.orbs || []).length >= b.orbs[0] && attempt >= 20) {
      def = best.cand;
      report = best.rep;
      break;
    }
    if (attempt >= MAX_ATTEMPTS - 40 && (best || bestAny)) {
      const pick = best || bestAny;
      if (!best) console.error(`⚠ vault ${slot.id}: uniqueness exhausted — settled non-unique`);
      def = pick.cand;
      report = pick.rep;
      break;
    }
  }

  if (!def) {
    console.error(`✗ vault ${slot.id}: no candidate passed ${MAX_ATTEMPTS} attempts`);
    process.exitCode = 1;
    continue;
  }
  def.name = slot.name;
  if (NAMES.has(def.name)) {
    console.error(`✗ vault ${slot.id}: name "${def.name}" already used`);
    process.exitCode = 1;
    continue;
  }
  NAMES.add(def.name);
  const ts = tileSet(def);
  seenSigs.add([...ts].sort().join(';'));
  allTileSets.push(ts);
  out.push(def);
  const mech = mechanicSignature(def).length;
  console.log(
    `${slot.id} ${def.name.padEnd(20)} ${slot.mech.padEnd(9)} @${slot.W} ` +
      `par ${report.par} · orbs ${(def.orbs || []).length} · crumble ${(def.crumble || []).length} · mech ${mech}`,
  );
}

// the Vault's own experience sequence: ten rooms, no two back-to-back alike,
// and the same cap the campaign obeys
const pars = new Map();
for (const d of out) pars.set(d.id, shortestRoute(parseLevel(d)));
const problems = experienceProblemsForVault(out, pars);
for (const p of problems) {
  console.error(`✗ vault sequence: ${p}`);
  process.exitCode = 1;
}

function experienceProblemsForVault(defs, parsById) {
  const probs = [];
  let recent = [];
  const sorted = [...defs].sort((a, b) => a.id - b.id);
  for (const d of sorted) {
    const fp = experienceFingerprint(d, parsById.get(d.id));
    for (const p of sequenceProblems(fp, recent)) probs.push(`L${d.id}: ${p}`);
    recent = [...recent.slice(-3), fp];
    const mech = mechanicSignature(d).length;
    if (mech > MECH_CAP) probs.push(`L${d.id}: ${mech} distinct mechanics (cap ${MECH_CAP})`);
    // no room may collapse into one mechanic: the Vault is the endgame.
    // A wind room is the exception by parse law (the breeze refuses doors,
    // tunnels and sentinels), so it may carry one fewer.
    const mechFloor = d.wind ? 3 : 4;
    if (mech < mechFloor) probs.push(`L${d.id}: only ${mech} mechanics — a Vault room is the endgame`);
  }
  return probs;
}

if (process.exitCode) {
  console.error('\nvault generation FAILED — nothing written');
  process.exit(1);
}

out.sort((a, b) => a.id - b.id);
const header = `// ---------------------------------------------------------------------------
// KUBIK — the Vault, levels 201–210 (Phase E, ADR-043, scaled in ADR-045)
//
// Bonus content outside the campaign: ten citadel-scale rooms, each built
// around one headline mechanic, unlocked by total shards. Generated offline
// by scripts/gen-vault.mjs and proved by the SAME gate as the campaign
// (scripts/level-gate.mjs) — reachability, soft-lock freedom, crumble-aware
// solving, sentinel-timing fairness, the rescue bench, the complexity cap and
// the experience sequence. Static data on purpose (ADR-004): the shipped game
// stays deterministic and version-controlled.
//
// Regenerate:  node scripts/gen-vault.mjs [id...]
// ---------------------------------------------------------------------------

export const VAULT_PAR_BAND = [${VAULT_PAR_BAND[0]}, ${VAULT_PAR_BAND[1]}];

export const VAULT = `;
writeFileSync(OUT, header + JSON.stringify(out, null, 2) + ';\n');
console.log(`\nWrote ${OUT} with ${out.length} proven Vault level(s) ✓`);

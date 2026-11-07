# KUBIK — Agent & Contributor Rules

Operating rules for anyone (human or agent) modifying this repository.
These exist so the game's invariants survive independent of any single
session's memory.

## 1. The invariants (never break these)

1. **No level may ship that is unsolvable or soft-locking.** The verifier
   (`scripts/verify-levels.mjs`) must pass for all 50 levels + 14 dailies.
2. **No level may ship that the bot cannot play to `won`.**
   (`scripts/test-levels-playable.mjs`) — logic proof and real play are
   both required (ADR-010).
3. **Input is never a source of difficulty.** Never drop a buffered move,
   add input latency, or make a control layout non-canonical, "for feel".
4. **The game is offline, asset-free, ad-free.** No CDN, no fetch, no
   third-party runtime dependency, no analytics, no IAP. If a change
   needs the network, it is out of scope — say so and stop.
5. **Death causes stay player-readable.** Falls, crumbles, sentinels.
   Never add a hidden/precision/RNG death (research §3: fairness is the
   product).
6. **`rules.js` stays pure.** No DOM, no three.js, no timers, no RNG. It
   is the verifier's foundation; impurity here silently breaks proofs.
7. **All 50 levels stay open from the start.** Do not re-add gating
   without an explicit request (ADR-011).
8. **Presentation never writes logic state** (single documented
   exception: the slider clock, ADR-009).

## 2. Workflow rules

1. **The gate is the workflow.** Commit → pre-commit hook runs
   `npm test` (unit + verify + playable bot, ≈4 min) → only then is the
   commit created. `KUBIK_SKIP_HOOKS=1` is for emergencies (documented in
   the commit message). CI re-runs the gate on push/PR.
2. **Understand before modifying.** Read the module and its consumers
   (grep the function name) before editing. The architecture docs are the
   map; the code is the truth.
3. **Commit early, commit small.** The sandbox environment resets;
   uncommitted work dies. One concern per commit; the gate runs on every
   one (that's a feature — it makes each commit a verified milestone).
4. **Keep docs synchronized with code** (rule 15 of the studio charter).
   If you change a mechanic, update: GDD §5, `level_design.md` if level
   data, `algorithms.md` if a rule, README commands/architecture if the
   tree changed, `progress.md` always.
5. **No placeholder implementations.** A stub is a bug with a deadline.
   If scope forces a cut, say it in `progress.md` under "remaining",
   don't fake completion.
6. **Real verification, not assumed verification.** Run the test that
   proves the change. If no test exists for the behaviour you changed,
   add one (usually: a `tests/unit/` case, a verifier check, or a
   playtest entry).
7. **Regression-test every bug fix.** File it in `bug_tracker.md`
   (BUG-xxx, repro, root cause, fix, regression test path) *before* the
   fix commit.

## 3. Adding content

### New hand level
1. Add the def to `src/levels.js` (format below). Name it in the
   progression (teach at most one new mechanic; combine only taught ones).
2. `npm test` — the verifier and the bot now include it automatically
   (they iterate `LEVELS`). If the bot can't find a route, that's a
   design problem, not a test problem.
3. Screenshot it (`npm run shots`) if it's representative; update
   `level_design.md`'s table.

### Level def format
```js
{
  id, name, hint,
  map: [ '211.', ... ],   // digits = slab height, '.' = void
  start: [x, z], goal: [x, z],
  shards: [[x, z] ×3],
  crumble: [[x, z]],                    // one-way slabs
  blocks: [[x, z]], nudge: N,           // telekinesis
  orbs: [{ path: [[x, z], ...], speed, phase? }],  // sentinels
  sliders: [{ tiles: [[x, z]], period, phase }],   // bridges
  shuttles: [{ a: [x, z], b: [x, z], wait? }],     // looping platform (gap 2–5, straight)
  ice: [[x, z]],                        // slabs that keep a rolling cube sliding
  springs: [[x, z]],                    // pads that launch a roll over void (≤3)
  key: [x, z],                          // sealed gate (finale only)
  wind: { x: ±1, z: ±1 },               // diagonal breeze
}
```

### New mechanic (the full chain, in order)
`rules.js` (laws + solver awareness) → `parseLevel` (data) →
`levelView.js` (look) → `game.js` (behaviour + events) →
`verify-levels.mjs` (proof) → `test-levels-playable.mjs` conventions
(frozen or live?) → `tests/unit/` → docs (GDD/algorithms/level_design) →
playtest entry. The gate enforces the chain: a mechanic whose solver
doesn't model it will fail "no route survives" on any level that uses it.

### Regenerating the campaign
`npm run gen` (`gen-campaign.mjs`) → rewrites `src/campaign.js` → `npm
test`. Never hand-edit `campaign.js` — edit the generator. New levels
beyond 50: extend the generator's act plan, not the file.

## 4. Performance rules

- The slab field is **one merged mesh**. Don't introduce per-slab meshes
  or per-frame allocations in the render/anim hot path.
- No new per-frame DOM writes (HUD updates are event-driven; minimap
  draws once per move).
- Measure before "optimizing": `npm run perf` (budgets in
  `docs/performance_report.md`). A change that regresses p95 frame time
  > 20% needs a justification in the commit message.
- Bundle: `npm run build` currently ships ~655 kB JS (168 kB gzip), of which
  three.js is the dominant share. A regression of >10% needs a justification
  in the commit message. Any new dependency needs an ADR entry first.

## 5. Environment rules (this repo's sandbox)

- Dev server binds `0.0.0.0` (preview requirement) — `npm run dev`.
- Headless scripts self-locate NSS libs in the sandbox
  (`/tmp/dist/Release/lib`); on CI the OS provides them. Scripts must run
  from the project root (they import `puppeteer-core` by name).
- `/tmp` is volatile across sandbox resets — anything that must survive
  is committed to the repo.
- Screenshots land in `docs/` (visual gate), not in `dist/`.

## 6. Style

- ES modules, no TypeScript (the codebase is JS; adding TS is an ADR, not
  a drive-by), 2-space indent, single quotes, semicolons.
- Comments explain *why* (especially invariants and bug-adjacent code);
  the function name explains *what*.
- No dead code: a removed feature's code is deleted, not commented out
  (git remembers).

## 7. When in doubt

1. Check the docs (`docs/`) — the decision is probably logged there.
2. Ask the player for anything that changes **gameplay trade-offs or
   scope** (camera feel, difficulty, monetization, feature additions).
3. Never silently remove a feature; a removal is a commit with a reason.

# KUBIK — Level Design

_Phase 6 deliverable. The level data is `src/levels.js` (13 hand) +
`src/campaign.js` (37 generated); this document is the design layer above
it: what each level teaches, the constraints it obeys, and how it is
validated._

## 1. The level definition (data contract)

See `agent_rules.md §3` for the field reference. Rules every def must
satisfy (enforced by `parseLevel` + verifier):

- `map`: row strings, digit = slab height (0–9), `.` = void.
- `start` / `goal`: on slabs; start not a crumble slab; start ≠ goal.
- `shards`: exactly 3, on slabs, none on start/goal.
- `orbs`: every path point on a slab; spawn point never on start/goal.
- `crumble`: never on a sentinel patrol line or on a tile adjacent to one — a crumble on a crossing entry would force the player to wait for the crossing window on a slab that breaks (BUG-005). The generator enforces this; hand-authored levels are checked by the verifier.
- `sliders`: groups of slabs; period ≥ ~1.5 s (human-readable timing).
- `shuttles`: `[{a: [x,z], b: [x,z], wait}]` — a straight track of gap 2–5;
  the gap interior and the docks are void in the map (the parser
  solidifies the docks as `shuttle` tiles); the two structure ends may
  differ by ≤ 2 heights (the platform flies at the rounded average, so
  boarding and alighting are single legal rolls); the platform is solid on
  a dock only while it dwells there (view clock, ADR-013).
- `ice`: `[[x,z]]` — slabs that slide: a press onto ice continues in the
  same direction while it keeps landing on ice (one press, `resolveRoll`
  models the whole slide); never on a sentinel's clearance.
- `springs`: `[[x,z]]` — a pad that launches a press up to 3 tiles in the
  direction of travel (over void, landing on the first slab within ±3
  height; nothing in range = a fall); the flight corridor keeps sentinel
  clearance.
- `conveyors`: `[[x,z,dx,dz]]` — a belt tile (M3 wave-1): a roll onto it
  is carried one tile in the BELT's direction, chaining along the belt,
  and the belt direction becomes the travel direction for whatever
  follows (ice slides the belt's way, a pad fires the belt's way). A
  blocked belt step leaves the cube resting on the belt. Belt cycles are
  rejected at parse; the whole carried path keeps sentinel clearance.
  Never on start/goal/ice/springs/docks.
- `timed`: `[[x,z]]` — a timed slab (delayed crumble): `TIMED_FUSE`
  (2.4 s) after the cube's first landing the slab falls, cracking in
  stages as the fuse burns. Never a tile the player may need to wait
  on (the spawn audit keeps it out of sentinel clearance, away from
  shuttle docks and sliding bridges); proofs model it exactly like a
  crumble — gone once you step off — so the fuse is pure player grace.
- `freeze`: `[[x,z]]` — a freeze shard: a consumable pickup on a plain
  slab. Grabbing it locks every sentinel for `FREEZE_TIME` (3.2 s) —
  patrol clocks stop and frozen sentinels cannot kill. Fairness counts
  the freeze in presses, not seconds: a crossing with no natural safe
  window is still proven fair when a shard is reachable through
  already-fair crossings and pickup → entry + the crossing burst fits
  `FREEZE_PRESS_BUDGET` (8 presses). Parse law: plain slab only —
  never stacked on another mechanic, never start/goal/block/shard/key.
- `doors`: `[{plate: [x,z], at: [x,z]}]` — a pressure plate + doorway
  (M3 wave-1): the doorway cell is void in the map (the parser
  solidifies it at the plate's height); the door is a wall to every
  press except one that STARTS on its plate, so the route detours onto
  the plate, steps through, and cannot return the same way. The cube's
  weight only — blocks never press a plate. A launch flies over a
  doorway, never lands on it; the plate/doorway can be waited on, so
  sentinel fairness is the ordinary timing model (no corridor audit).
- `key`: only with a sealed gate (finale); on a slab, not on start/goal.
- `wind`: diagonal unit vector only.
- `nudge` ≥ number of blocks that *must* move for any route (solver
  proves it — a level with 2 required pushes and `nudge: 1` fails
  `solveHazards`).

## 2. Design laws (why these numbers)

| Law | Value | Rationale |
|---|---|---|
| Max drop | 2 | Falling is the core threat; 2 lets you "jump" two slabs without it feeling like a fall. 3+ reads as a cliff, 1 makes height meaningless. |
| Max climb | 1 | Asymmetry (fall 2 / climb 1) makes heightfields *directional* — you can be led downhill and stopped going up. Symmetric movement would make every level a flat maze. |
| Roll time | 0.243 s (30% slower than the original 0.17 s, player-directed 2026-11-07) | Slow enough to read the next tile comfortably; crossing windows are re-proven by the timing gate at this speed (L37 re-rolled). |
| Crumble | break on leave | One-way commitment without any "timer to memorize" — the hazard is the route itself. |
| Sentinel period | ≥ ~2 s per loop | Readable patrol; never strobe-fast (eye-strain finding, research §6). |
| Wind period | 0.62 s | A nudge every ~4 rolls at typical pace — a drift you plan around, not a force you fight. |
| Shards | 2–5 (2 teaching / 3 most / 4 campaign / 5 pre-boss) | Risk/reward budget: each is ~1–3 rolls off-route; collecting every one ≈ a meaningful time cost = the perfect flag. |
| Level size | hand 7×3 → 11×10, campaign 8×8 → 18×18 | Teaching levels tiny; the finale is EDGE-scale. Size ≈ difficulty budget (campaign enlarged 2026-11-07). |
| Shuttle dwell | 2.0 s per dock, travel 0.8 s per gap tile | ~8 s full loop: readable at 4.12 tiles/s, tight enough that "board before it leaves" is a real reflex (dwell ≥ ~2.2 rolls, proven by the verifier). |
| Ice slide | 1 press, stops at first non-ice / illegal step | Momentum without a timer: the whole slide is one graph edge, so fairness is provable. |
| Spring launch | ≤ 3 tiles, landing slab within ±3 height | A fixed, readable hop — never "how high do I go?" |
| Conveyor carry | 1 tile per belt tile, belt direction, chains | The current chooses for you: one press, no mid-belt decisions, so the whole ride is one provable graph edge. |
| Door entry | only from its plate; the cube's weight alone | A door is a directed edge, not a state machine: legality depends only on where the press starts, so every solver sees the same law. |
| Timed slab | 2.4 s fuse from first landing, then it falls | The crumble's slow sibling (plain crumble burns in 0.75 s): cross at a stroll, never dawdle — and the proof models break-on-leave, so the fuse is margin, not a requirement. |
| Freeze shard | one grab, 3.2 s of frozen sentinels | The catalogue's first consumable timing tool: the proof counts it in presses (8-press budget from pickup to crossing exit), so a frozen crossing is provable without trusting real-time reflexes. |

## 3. Hand levels (1–13) — the teaching spine

One new mechanic per level; combinations only after both parts are taught.
`par` shown = BFS shortest route (what the HUD counts against).

| # | Name | Size | Mechanics | Design intent |
|---|------|------|-----------|---------------|
| 1 | First Light | 7×3 | — | "Roll to the gate." One verb. |
| 2 | Step Down | 7×3 | drop | Falling is legal; the edge is the limit. |
| 3 | Switchback | 7×7 | climb | The asymmetry: you can be walled going up. |
| 4 | Twin Bridges | 9×6 | **blocks + nudge** | Telekinesis: plan the push, it's a resource. |
| 5 | Paper Bridge | 9×6 | **crumble** | One-way slabs: commitment, no backtrack. |
| 6 | Sentinel | 9×6 | **orbs** | Timing hazard, telegraphed patrol. |
| 7 | Weave | 9×6 | orbs + blocks | First *combination*: timing + resource. |
| 8 | Cascade | 9×7 | **wind** | Drift management: the world moves you. |
| 9 | Fault Line | 9×6 | orbs + crumble | Two commitment hazards at once (the level that shipped with the spawn bug — see bug_tracker BUG-002; the verifier now pins its spawn). |
| 10 | Spiral | 7×7 | — | Pure-heightfield fluency check (no new mechanic, harder shape). |
| 11 | Gauntlet | 9×8 | orbs + crumble | Density: many hazards, narrow routes. |
| 12 | The Fold | 9×8 | **key/lock** | Objective sequencing: key first, gate second. |
| 13 | Boss: The Folded Keep | 11×10 | orbs + crumble + **sliders** | Everything so far, plus the timing bridges. The hand-designed exam. |

**Par values (BFS):** 2, 2, 7, 7, 5, 5, 5, 7, 10, 7, 13, 10, 9 — monotone
*within* teaching beats (not across, by design: each mechanic changes the
route economy).

## 4. Campaign (14–50) — generated, proven, structured

`gen-campaign.mjs` seeds per level id, proposes, and **rejects until the
verifier proves** the layout (ADR-004). Five acts, EDGE-scale maps
(8×8 → 18×18), each with a mechanic budget — the new mechanics
introduce gradually (ice → spring → shuttle):

| Act | Levels | Map | Par | Budget (what it may use) |
|---|---|---|---|---|
| Descent | 14–19 | 8×8 | 9–16 | heightfield, crumble, orb, **ice** |
| Glass Meadow | 20–27 | 10×10 | 11–19 | + **spring pits** |
| Lattice | 28–35 | 12×12 | 13–23 | + **shuttles**, multi-mechanic combos |
| Crucible | 36–43 | 14×14 | 16–28 | all mechanics, denser crumble |
| Spire | 44–50 | 16×16 → 18×18 | 19–36 | all; **50: 18×18 with key & sealed gate and a double-shuttle ride** |

Generator guarantees: unique layouts (seeded, no repeats), shard
placement on-route-or-near (1–3 rolls off), par in the act's band, full
8-check proof, and mechanic fairness — the generator carves the mechanic
*into* the route (the pit/dock is the only way across), keeps every
sentinel line one tile clear of mechanic corridors, and the verifier
re-proves the ride/slide/launch as single graph edges. Re-running the
generator is a *content release*, not a code change — see
`agent_rules.md §3`.

## 5. Campaign (51–200) — ten acts, an archetype library, one hazard stage

The 200-level campaign (ADR-015) is generated by
`scripts/gen-campaign2.mjs`: an **archetype** (`scripts/archetypes.mjs`,
24 builders) carves the topology, the **shared hazard stage**
(`scripts/hazards.mjs`) dresses it with mechanics, shards, sentinels and
crumble, and the candidate is rejected until the full verifier proves it.
14–50 run through the same hazard stage. Content ships as static data
(`src/campaign2.js`) — ADR-004.

**The acts.** Acts 1–2 are the hand-set + the 14–50 band above (levels
1–50). Acts 3–10 are the generated campaign; every 20th level is the
act's BOSS (boss-arena, 18×18, 2+ sentinels, par band +2/+4):

| Act | Levels | Name | Map | Par | Sentinels | Character |
|---|---|---|---|---|---|---|
| 3 | 41–60 | Below the Summit | 16×16 | 19–34 | 1–2 | heightfall + first shuttles |
| 4 | 61–80 | Hollow Country | 16×16 | 22–38 | 1–3 | the ground disappears: crumble, gaps |
| 5 | 81–100 | Crosshatch | 18×18 | 24–40 | 2–3 | density: nothing straight is safe |
| 6 | 101–120 | Glasswork | 18×18 | 26–42 | 2–3 | ice everywhere; springs |
| 7 | 121–140 | Slow Current | 18×18 | 28–44 | 2–3 | shuttles everywhere; waiting |
| 8 | 141–160 | Darkwater | 18×18 | 30–46 | 2–3 | keys (45% of levels); vaults |
| 9 | 161–180 | The Pressure | 18×18 | 32–48 | 2–3 | everything at once |
| 10 | 181–200 | The Last Ascent | 18×18 | 34–50 | 2–3 | the finale; 200: sealed gate |

Par, sentinel band, crumble, speed, shard count, fill density, mechanic
probabilities, key probability and the act's name pool are data in
`src/acts.js` — retuning the curve is an edit, not a code change.

**The archetypes.** descent, switchback, twin-bridge, spiral, lattice,
split-merge, ring, key-detour, vault, shuttle-span, spring-field, ice-river,
gauntlet, bridge-chain, staircase, crossroads, aperture, twin-falls, fork,
long-drop, meridian, undertow, canyon, boss-arena. Each act's pool
(§acts.js) contains the archetypes it wants; the picker rotates through
the pool and never repeats the last two in an act. An archetype whose
natural par falls outside the act's band is not in that act's pool
(meridian, par 46 at 18×18, plays in Darkwater/The Pressure/The Last
Ascent only).

**The hazard stage's laws.**
- Mechanics (ice, spring, shuttle) are carved only along MAXIMAL straight
  runs of the path — a mechanic replaces solid route tiles with a hazard
  so the only way across is the mechanic itself.
- **Refuge:** a sentinel patrols a straight run; the timing model only
  counts *off-line* neighbours as escapes, so every run ≥ 5 tiles gets a
  dead-end fill slab beside it (every 3rd tile, both sides tried). The
  slab must be a true dead end — a slab with two openings would be a
  shortcut and would recreate the par collapse the gap rows prevent.
- Shards sit on-route or 1–3 rolls off; crumble only where the verifier
  proves a surviving route; the key (when the act budget allows) goes on a
  fill slab that is off the main line.

**Uniqueness + curation.** A candidate is rejected if its tile signature
hash repeats or its tile set overlaps > 85% (Jaccard) with a recently
shipped level; of the proven candidates the best curation score (hazard
variety + par placement) wins. On top of that, the experience-diversity
gate (`scripts/experience.mjs`, run by the verifier) fingerprints every
level — mechanic set, sentinel count/speed band, crumble load, par band,
travel direction, map scale — and rejects a catalogue with three
consecutive identical fingerprints, six consecutive levels sharing one
mechanic signature, a mechanic-monoculture act, a missing act-identity
mechanic, or an intra-act par cliff over 16 (boss spikes exempt).

## 6. Daily challenge

One level per calendar date: seed `'kubik-daily-'+YYYY-MM-DD`, generated
in the same pipeline and **proven at load** (unprovable → next seed
variant). Own medal track + 14-day history in the save. This is the
retention hook (research §7) and doubles as a *live* exercise of the
prover: the generator + verifier + bot run on new data every single day.

## 7. Difficulty curve policy

- **Teach once, combine later.** A mechanic appears in exactly one "intro"
  level (the first level that uses it in the hand set); later uses combine
  it with already-taught ones.
- **No spikes:** adjacent levels in the hand set differ by ≤ 1 new
  mechanic; in the campaign, the act budget widens gradually — par band,
  map size, sentinel band and mechanic density all step up per act
  (§5), and the boss at each act end is the deliberate spike the act
  builds toward.
- **One character per act.** Each act owns a mechanic character
  (Hollow Country = disappearing ground, Glasswork = ice, Slow Current =
  shuttles, Darkwater = keys); its archetype pool and mechanic
  probabilities serve that character rather than mixing everything early.
- **Endgame is meant to hurt.** Levels 44–50 are the deliberate hard
  finish (research §2: EDGE's hard endgame is specifically praised).
- **No pixel-timing.** Any timing window the player needs must be ≥ ~1
  roll wide at sentinel speed — the verifier's always-solid model plus the
  bot's live play bounds both directions of this. Since ADR-016 both timing
  models (the verifier's `crossingWindow` and the bot's `crossingSafe`)
  run the commit's press-schedule BAND (`commitSchedules`/
  `commitBandProgress`): a real commit can be as fast as the bot's
  pre-queued rolls (the game queue dedupes same-direction presses, but
  one continuation always rides the pre-queue) or as slow as a human's
  swipe rhythm — the cube may be anywhere on the band's path polyline
  (corner tiles included, ± `ARC_SLACK` for the mesh arc) at any
  moment, so a window that only one specific press rhythm could catch
  never ships (ADR-018; the band over-covers each roll, which is why
  the per-roll `easeInOut` no longer matters to the gate — ADR-016
  stays the law of the *game*).
- **No unfair randomness.** Zero runtime RNG in gameplay (ADR-005
  contract).

## 8. Validation pipeline (what "level done" means)

A level is done when, all green:

1. `npm run verify` — all checks pass (route, soft-lock, shards,
   crumble/push survival, spawn safety, data sanity, par computable,
   **timing fairness** — at least one path whose every sentinel crossing
   has a ≥ 0.5 s window; for `gateKey` levels, start→key and key→goal
   are proven separately (algorithms §6.1); **rescue bench** — if the
   level has a mid-path second-chance tile, a timing-fair route
   bench→goal must also exist, so the relief never strands you
   (ADR-014)).
2. `npm run test:play` — the bot plays it to `won` through real input. At 200
   levels this is stratified (ADR-015): the commit gate plays the CHANGED
   levels plus a rotating 50-level quarter (`scripts/live-gate.mjs`); the
   full 200 runs nightly (`.github/workflows/nightly-full-play.yml`).
3. Design review against §3/§4/§5 (teaches ≤ 1 new mechanic; par in band;
   shards worth 1–3 rolls of risk).
4. Screenshot (dark + light) in `docs/` for the visual gate.

Steps 1–2 are automated commit blockers; 3–4 are human (agent) review at
content time. **A level that fails 1 or 2 cannot be committed** — this is
the level-validation system the studio charter asks for, implemented as a
gate rather than a spreadsheet.

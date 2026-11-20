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
- `wind`: `{x: ±1, z: ±1}` — a level-wide breeze (ADR-039) that carries
  an IDLE cube one tile per `WIND_PERIOD` (0.62 s). Rolling is never
  disturbed (the timer restarts on every animation), the drift is only
  ever level or a small fall (never a climb, never more than `MAX_DROP`),
  and it refuses doorways the cube cannot pass, low tunnels at full size
  and blocked landing tiles. A wind level is a ROLLING level by parse
  law: it may not carry sentinels, shuttles, lifts, sliding bridges,
  pulsing gaps, turntables, pistons, crumble/timed slabs, blocks, freeze
  shards or a sealed gate — all of those ask the player to stand still,
  which is exactly what the breeze will not allow. Proofs require every
  drift landing to be able to finish (`windLockProblems`) and require
  the breeze to move the proven route at two or more tiles.
- `orbs`: every path point on a slab; spawn point never on start/goal.
- `crumble`: never on a sentinel patrol line or on a tile adjacent to one — a crumble on a crossing entry would force the player to wait for the crossing window on a slab that breaks (BUG-005). The generator enforces this; hand-authored levels are checked by the verifier.
- `sliders`: `[{tiles: [[x,z],…], period?, phase?}]` — a RIGID sliding
  bridge (ADR-038): contiguous slabs at ONE height that rise and sink
  together. `period` ∈ [2.4, 8] s (default 3.2), `phase` ∈ [0, 1)
  (default 0); `sliders[].h` records the bridge height. Two parse laws
  keep it honest: a span must be crossable inside the up window
  (`tiles × ROLL_TIME + TIMING_FLOOR ≤ period × SLIDER_UP_FRACTION`,
  the same 55% cutoff the view draws), and a bridge tile may carry
  nothing — no second mechanic, start, goal, key, block or shard.
  Proofs price the bridge as always solid (wait out the sink beside
  it); the rescue bench never lands on one and blocks are never
  pushed onto one.
- `shuttles`: `[{a: [x,z], b: [x,z], wait, twin}]` — a straight track of gap 2–5;
  the gap interior and the docks are void in the map (the parser
  solidifies the docks as `shuttle` tiles); the two structure ends may
  differ by ≤ 2 heights (the platform flies at the rounded average, so
  boarding and alighting are single legal rolls); the platform is solid on
  a dock only while it dwells there (view clock, ADR-013). `twin: true`
  runs a second platform half a cycle out of phase on the same loop —
  proofs still model the one logical shuttle, so a twin only ever
  adds boarding windows.
- `lifts`: `[{at: [x,z], low, high, wait}]` — a shuttle turned vertical
  (Phase B, ADR-033): the dock cell is void in the map (the parser
  solidifies it as a `lift` tile); the platform dwells at `low`, rides
  to `high` (0.8 s per storey) and back. Board at one bank, ride, step
  off at the other. Rise 2–4 storeys; each dwell needs a bank the roll
  law can serve at that height, and some bank must serve exactly one
  dwell (a shaft joining nothing is rejected). Static proofs price a
  step against either dwell (waiting is free, as at a shuttle dock);
  live presses price against the dwell the view clock shows, and the
  dock only holds while the platform dwells (ADR-013). The shaft is
  entered only by a deliberate press: no sentinel patrols the dock, no
  ice/spring/conveyor tile feeds it, no other mechanic stacks on it,
  blocks never park on it, and no platform dock touches another.
- `shrink` / `grow`: `[[x,z]]` — size pads (Phase B, ADR-034): landing on
  a shrink pad makes the cube mini (0.55 scale) until a grow pad restores
  it; pads fire on every landing and are never consumed. `low`: `[[x,z]]`
  — a low tunnel tile: only the mini cube may stand on it (a full-size
  roll is a bump); rendered as a gantry the small cube passes under.
  Pads and tunnels must co-occur (a tunnel needs a shrink pad or
  `startMini: true`; pads need a tunnel to matter). Pads stack on no
  mechanic and never sit on start/goal/key/block/shard or a patrol line;
  low tiles are plain slabs (a shard may end a tunnel niche); blocks
  never enter a tunnel or park on a pad. Proofs carry size as search
  state; the rescue bench never lands on a low tile or pad.
- `pistons`: `[{at, dx, dz, period?, phase?}]` — piston pushers (Phase B,
  ADR-035): a machinery base whose arm sweeps the next cell along
  (dx,dz) for the tail of every cycle (retracted for the first 55% —
  cross then). The base is a wall; the strike cell is plain floor in
  every proof, and live the arm refuses entry while extended and
  otherwise shoves a resting cube one tile under the drift law — a
  legal shove displaces, an illegal one stalls; pistons never crush.
  The strike cell's neighbourhood keeps clear of patrol lines, docks
  and bridges (nothing a player waits beside the arm); the rescue
  bench never lands on it. Never on a wind level (one drift force).
- `turntables`: `[{at, period?, phase?}]` — turntable bridges (Phase B,
  ADR-036): a rigid 3-tile bar turning on the pivot cell over a void
  cross, joining one pair of banks for half a cycle, then sweeping
  90° to join the other. The pivot is always floored (the refuge);
  arms hold only while the bar joins their side, and a cube standing
  on an arm when it sweeps is dropped (the slider law). Cross cells
  are plain floor in every proof; the bar must reach at least two
  shores (cross, T or corner) at one height — the lowest bank — and
  nothing else may live on the cross. Patrols never cross the bar,
  conveyors never feed it, the rescue bench never lands on it, and
  wind never shares the level.
- `clings`: `[[x,z]]` — grip crevices (Phase B, ADR-037, the hang-ledge):
  ONE void cell between two plain slabs. A press *into* the crevice from
  either bank catches the far face, hangs a beat and mantles up, so the
  press crosses the crevice in a single action — and the height step it
  can span is one storey past the roll law each way (climb +2, drop −3;
  the roll law's +1/−2 still applies everywhere else). Both banks must be
  real map structure within reach of each other; a grip face may carry no
  other mechanic, block or patrol (the hang has no waiting spot), and the
  crevice may touch neither start nor goal. **Never decoration:** the
  verifier fails a level whose clings do not SHORTEN the proven route, so
  a crevice always reads as a fold in the level you can cut across. The
  resolver prices the whole press (game, solver, fair-reach, bot), and the
  generator rejects any candidate whose clings do not beat the stripped
  par (the two BFS runs are compared explicitly). The generator carve
  only converts EXISTING void cells at a fold of the walk — it never
  opens a crevice through structure — and its banks must sit on (or
  beside) the proven route.
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
- `heavy`: `[[x,z]]` — a heavy block: an obstacle block (telekinesis,
  `nudge` charges) that can be pushed only onto a tile at or below its
  current height — never uphill. Heaviness travels with the block
  through every search state; a shove downhill is one-way, so where a
  heavy block comes to rest is a commitment. Levels place it astride
  the route with a level-or-downhill push-forward.
- `pulse`: `[[x,z]]` — a pulsing gap: a VOID cell a phantom slab
  seals for `PULSE_ON` (40%) of every `PULSE_PERIOD` (4.0 s), the
  seal sweeping diagonally across the floor. Cross on the blink —
  it never holds long enough to wait on. The slab rises to the
  lowest neighbouring bank. Proofs model it exactly like a sliding
  bridge (a timing hazard you wait out beside); the waiting-spot
  audit keeps it out of sentinel clearance, away from shuttle
  docks and sliding bridges, and off the rescue bench.
- `orbs[].wake`: `R` (tiles, ≥ 1) — a proximity sentinel: the
  patrol sleeps parked at its path start (dark eyes, no kill
  radius) until the cube comes within `R` tiles, then patrols
  normally for the rest of the attempt. Proofs ignore the sleep —
  every sentinel is modelled always-awake, so dormancy can only
  ever help the player.
- `doors`: `[{plate: [x,z], at: [x,z]}]` — a pressure plate + doorway
  (M3 wave-1): the doorway cell is void in the map (the parser
  solidifies it at the plate's height); the door is a wall to every
  press except one that STARTS on its plate, so the route detours onto
  the plate, steps through, and cannot return the same way. The cube's
  weight only — blocks never press a plate. A launch flies over a
  doorway, never lands on it; the plate/doorway can be waited on, so
  sentinel fairness is the ordinary timing model (no corridor audit).
- `key`: only with a sealed gate (finale); on a slab, not on start/goal.
- `boss`: `{speed}` (1 < speed ≤ 2, default 1.35) — a boss arena
  (M3): grabbing the gate key starts phase 2 — `wave: 2` sentinels
  (parked dark-eyed at their patrol starts until then) wake, and
  every patrol runs at `speed`×. Proofs are phase-blind: crossings
  are proven with wave-2 sentinels awake at boss speed, so the one
  static model covers both phases. A wave-2 spawn must sit ≥ 2
  tiles from the key (the cube is standing on it at the trigger).
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
| Level size | hand 7×3 → 11×10, campaign 8×8 → 26×26 | Teaching levels tiny; the finale is EDGE-scale. Size ≈ difficulty budget (18×18 in 2026-11-07; **26×26 + site mass in Phase G, ADR-045**). |
| Shuttle dwell | 2.0 s per dock, travel 0.8 s per gap tile | ~8 s full loop: readable at 4.12 tiles/s, tight enough that "board before it leaves" is a real reflex (dwell ≥ ~2.2 rolls, proven by the verifier). |
| Ice slide | 1 press, stops at first non-ice / illegal step | Momentum without a timer: the whole slide is one graph edge, so fairness is provable. |
| Spring launch | ≤ 3 tiles, landing slab within ±3 height | A fixed, readable hop — never "how high do I go?" |
| Conveyor carry | 1 tile per belt tile, belt direction, chains | The current chooses for you: one press, no mid-belt decisions, so the whole ride is one provable graph edge. |
| Door entry | only from its plate; the cube's weight alone | A door is a directed edge, not a state machine: legality depends only on where the press starts, so every solver sees the same law. |
| Timed slab | 2.4 s fuse from first landing, then it falls | The crumble's slow sibling (plain crumble burns in 0.75 s): cross at a stroll, never dawdle — and the proof models break-on-leave, so the fuse is margin, not a requirement. |
| Freeze shard | one grab, 3.2 s of frozen sentinels | The catalogue's first consumable timing tool: the proof counts it in presses (8-press budget from pickup to crossing exit), so a frozen crossing is provable without trusting real-time reflexes. |
| Heavy block | pushed level or downhill only, 1 nudge per tile | Weight as a one-way valve: a heavy block shoved down a step can never be shoved back up, so its resting place is a commitment the proof models exactly (heaviness is part of the block's state identity). |
| Sliding bridge | rigid group of slabs, up 55% of a 2.4–8 s cycle (default 3.2) | The bridge is a clock, not a hole: the whole span rises and sinks together, so a crossing is one timed commitment. The proof treats it as always solid and the parse law proves one crossing fits the up window — the wait-out doctrine, made checkable. |
| Wind | one tile per 0.62 s on an idle cube, diagonal, level or down | A tax on standing still: keep moving and it never touches you, stop and it takes the decision away — and because it only ever drops you, the proof's job is to guarantee no drift is a one-way pocket. |
| Pulsing gap | sealed 40% of a 4.0 s cycle, diagonal sweep | A hole that blinks shut: you wait beside it, never on it — the proof treats it as a wait-out timing hazard (like a sliding bridge) and the audit keeps it out of every waiting spot. |
| Proximity sentinel | sleeps until the cube is within `wake` tiles | Kindness as a mechanic: the proof assumes it is already awake, so a sleeping patrol is a pure gift — the tension is knowing it wakes as you close in. |
| Twin shuttle | second platform half a cycle out of phase | The ferry comes twice as often: the wait at the dock halves, and the proof never noticed — it models the one logical shuttle, so the twin is pure service. |
| Complexity ceiling | ≤ 9 distinct mechanics per level | Density belongs to the campaign, not the board: a level is a place to learn one thing and practise two. The ceiling is the shipped catalogue's own maximum, so it only ever rejects new drift — the curation score rewards variety and would otherwise build eleven-mechanic par-38 boards. |
| Boss arena | key grab wakes `wave: 2` sentinels, all patrols ×1.35 | The boss is the level itself: the key run is the quiet first phase, the escape is the loud one — and the proof simply always assumed the loud phase. |

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
act's BOSS (boss-arena, the act's board +2 tiles, 2+ sentinels, par band
+2/+4):

| Act | Levels | Name | Map | Par | Sentinels | Character |
|---|---|---|---|---|---|---|
| 3 | 41–60 | Below the Summit | 20×20 | 22–36 | 1–2 | heightfall + first shuttles |
| 4 | 61–80 | Hollow Country | 22×22 | 24–40 | 1–3 | the ground disappears: crumble, gaps |
| 5 | 81–100 | Crosshatch | 24×24 | 26–46 | 2–3 | density: nothing straight is safe |
| 6 | 101–120 | Glasswork | 24×24 | 28–50 | 2–3 | ice everywhere; springs |
| 7 | 121–140 | Slow Current | 26×26 | 30–60 | 2–3 | shuttles everywhere; waiting |
| 8 | 141–160 | Darkwater | 26×26 | 32–64 | 2–3 | keys (45% of levels); vaults |
| 9 | 161–180 | The Pressure | 26×26 | 34–68 | 2–3 | everything at once |
| 10 | 181–200 | The Last Ascent | 26×26 | 36–84 | 2–3 | the finale; 200: sealed gate |

**Scale (Phase G, ADR-045).** Board size and **fill** are both part of the
difficulty budget now. The old catalogue was 15–21% filled from act 3 to act
7 — a route in a void, and 31 of 200 levels had zero interior tiles. From
act 3 on, every generated board passes through the **site-mass stage**
(`scripts/sitemass.mjs`), which grows the route into a place — wide
causeways, courts, raised clubs, a few floating isles — before hazards are
dressed, under a contract that keeps every route tile's height, fills only
void, forbids bridges between route legs (a mass tile may touch only the
route tiles around its seed) and forbids dissolving the design (the route
may shorten by at most 2 rolls). Per-act targets: fill 30 / 32 / 34 / 36 /
36 / 38 / 40 / 42% for acts 3–10, checked by the scale audit in the
verifier (act mean within 6 points, every level ≥ 20% filled with at least
half the act's 2×2 floor, board size as declared, bosses +2).
The **level-select and HUD are unchanged**; the camera is not — see
"the camera" below.

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
(meridian, par ~66 at 26×26, plays in The Pressure/The Last
Ascent only).

**The camera (ADR-049).** One law at every size: the whole board is fitted
on screen at the live yaw, with 20% breathing room (a little less on
portrait), and the only movement is a clamped parallax — the view leans at
most 0.9 world units toward the cube and never pans or zooms. A seat
rotation refits the projection for the new yaw, so a rotated seat cannot
crop the board. The cost is honest: on a 26×26 board the cube is small, and
the minimap is what makes a big site readable at a glance. A cube hidden
behind geometry is echoed through it (ghost mesh, depth test off) — a ray
test against the level's own height map decides, not a render pass. The
minimap and the four camera seats are unchanged.

**Structure archetypes (Phase A, ADR-030).** The track archetypes fill
≈ 19% of their board before site mass; three builders make *places*: **plaza** (a filled
court, fill ≈ 0.6, crossed on chosen lines under patrol lanes),
**tower** (a terraced massif, rings 1→2→3 split by void moats, stairs
at opposite corners so every ring is walked), **citadel** (court +
moated keep, the finale-class composite). Escalation is budgeted:
Acts 3–10 generate on the Phase G ladder (20→26, ADR-045) with the
par bands in the act table above, and an act-end board is `W+2` — size
and route depth grow act over act while the opening stays readable. First
spliced slots: plaza L88, L113, L128; tower L148, L168, L188;
citadel L155, L177, L196.

**Density arcs (Phase C, ADR-031).** A mechanic becomes vocabulary
only after a dozen appearances in growing contexts. New appearances
are scheduled teach → test → twist in level order (solo force,
act-context force, paired force) by forced-slot splices, and a
density ratchet in the unit gate fails the build if any tracked
mechanic's count drops. Batch 1: door 2→8 (teach L92, twist
L172), pulse 3→14, twin 3→10, conveyor 6→11, timed 6→14.
Batch 2 (ADR-032) completes the floors (door →14, conveyor →14,
twin →15), teaches the generator light blocks (carve + solver
budget; teach L58, twist L171), and makes sawtooth relief law:
relief slots settle on their shortest proven candidate, and the
experience audit rejects any act running 6+ levels above its
relief line (bottom third of the par band).

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

## 5b. The Vault (201–210) — bonus rooms behind shards

Ten rooms outside the campaign, one per headline mechanic, generated by
`scripts/gen-vault.mjs` and proved by the **same gate** as everything
else (`scripts/level-gate.mjs`). They are the only locked content in the
game: each opens at **60 total shards** collected across the campaign —
roughly fifteen good levels for the first, ~600 of ~800 for the last.
The campaign's 200 stay open from the start.

| room | headline | scale | par |
|---|---|---|---|
| V01 The Long Haul | lift | 22×22 | 57 |
| V02 The Narrowing | shrink | 22×22 | 60 |
| V03 The Hammer | piston | 24×24 | 69 |
| V04 The Turning Point | turntable | 24×24 | 66 |
| V05 The Overhang | cling | 24×24 | 70 |
| V06 The Tide Bridge | slider | 26×26 | 82 |
| V07 The Gale Room | wind | 26×26 | 82 |
| V08 The Long Lock | door | 26×26 | 87 |
| V09 The Cold Vault | freeze | 26×26 | 77 |
| V10 The Vault Itself | shuttle (boss) | 26×26 | 90 |

Laws specific to the set:

- **Master scale.** 22×22 up to 26×26 — the Vault meets the campaign's
  Phase G cap and tops its par band instead of sitting below it (ADR-045).
  The ladder is a climb with one deliberate dip: 57, 60, 69, 66, 70, 82,
  82, 87, 77, **90** — the freeze room breathes so the finale can spike.
- **One headline per room, and the route must cross it.** A room whose
  forced mechanic the optimal line walks around is rejected, exactly as
  in the campaign: the room has to teach the thing it is named for.
- **The hazard budget.** At least one sentinel and at least two of
  (sentinel, crumble cluster). A hard two-sentinel quota made most rooms
  unprovable at this scale once a mechanic was carved through them; the
  budget keeps every room from being a bare walk without lying about
  what the geometry can hold.
- **The breeze is exempt** from the hazard budget: by parse law a wind
  level carries no patrol and no crumble, so its contract is the gate's
  own rule — the breeze must move the proven route at two or more tiles.
- **The complexity cap still applies**: no room presents more than nine
  distinct mechanics, and none collapses to fewer than four (three for
  the wind room).

The Vault has its own par band ([38, 80]) and its own experience
sequence audit: no two adjacent rooms may read alike.

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

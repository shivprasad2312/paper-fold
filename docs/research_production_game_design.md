# Production Game & Level Design — Research, KUBIK Audit, and Strategy

*Compiled 2026-11-17 from published design literature, retention research,
and a teardown of the reference title EDGE (Mobigame), plus a quantitative
audit of KUBIK's shipped 200 levels. Status: **strategy document** — the
research and the plan. Implementation proceeds phase by phase, one proven
slot at a time, exactly like every mechanic before it. Nothing here is
built "blind": each proposal names the evidence behind it, the files it
touches, and the gate that must pass.*

*Originality guardrail (standing rule): KUBIK is an original homage.
Mechanics named below are generic genre vocabulary (a lift, a switch, a
shrinking pad). We re-invent them under our own one-law resolver and our
own names; we never copy EDGE level data, art, music, or names.*

---

## 1. Executive summary

KUBIK's engineering is production-grade — every level is machine-proven,
bot-played, and gated. Its **content design** is not yet production-grade,
and the audit below proves the player's three complaints with numbers:

1. **Same structure everywhere.** Generated levels fill only ~17–19% of
   their bounding box: they are 1-wide serpentine *tracks* (U/C/S paths),
   not *places*. Fill never rises after Act 2.
2. **No escalation.** The board stops growing at 18×18 in Act 5; tile mass
   actually *falls* after Act 6 (avg 90 → 51–63 tiles); the longest proven
   route in the game is 44 rolls; only 7 of 200 levels exceed 40.
3. **Novelty starves.** We built 8 wave-1 mechanics, but doors appear in
   **1** level, timed slabs in 2, pulse in 2, heavy blocks in 2, conveyors
   in 3 — while crumble appears in 131 and sentinels in 165. New mechanics
   arrive too late (doors first at L152) and too rarely to be taught,
   tested, or twisted — the exact cadence production design research says
   drives retention.

EDGE, the reference, runs the opposite playbook: 48+17 levels (not 200),
each a filled, multi-storey *structure* of moving machinery, built around
player **verbs** KUBIK doesn't have (climb, hang, shrink), with a rank
system (S+…D on time + prisms + deaths) that makes every level replayable.

The strategy (Section 6) is therefore not "more levels" but:
**structures instead of tracks, verbs instead of tiles, density instead
of debuts, and a mastery meta on top.** Phased so every step ships
through the existing verifier + live-bot gate.

---

## 2. What the research says (the production knowledge base)

### 2.1 Level-design core: pacing, beats, teach–test–twist

- A level is a sequence of **beats** along a **critical path**; pacing is
  the rhythm of intensity across them — when the player strains, when
  they rest. Setpieces are the high beats a level is remembered by.
  (*The Level Design Book*, "Pacing".)
- The canonical 3-beat teaching pattern is **teach → test → twist**:
  introduce an activity safely, test it with prompting, then twist it
  later *with less prompting and spacing* (Portal's fling chambers are
  the textbook case). Twists must not come immediately after the test.
- Puzzle-ordering practice mirrors this: introduce a mechanic nearly
  alone, explore its uses, demand mastery, then start **combining**
  A+B, A+C, B+C. Difficulty compounds through combinations, not through
  raw repetition. (r/gamedesign practitioner consensus; King's design
  literature agrees — see 2.2.)

### 2.2 Difficulty architecture: sawtooth, staircase, onboarding, flow

- **Sawtooth curve:** difficulty climbs within an arc, then drops sharply
  for a relief level before climbing from a higher baseline. The single
  most validated progression pattern in commercial puzzle design; relief
  every ~5–7 levels. A straight line loses players at the first wall.
- **Complexity staircase (King, Candy Crush):** one new blocker/mechanic
  per step, first in an easy context, then integrated with old ones.
- **Onboarding decides everything:** the first level should be
  *impossible to fail* (<30 s, first-try success, player feels clever);
  levels 1–5 each introduce exactly one concept; levels 1–10 are a
  tutorial disguised as gameplay. "The first five levels determine
  whether the other five hundred will ever be played."
- **Flow (Csikszentmihalyi; Chen 2007):** engagement peaks when challenge
  stretches skill without exceeding it; clear goals + immediate feedback
  are preconditions. Difficulty spikes outside the channel read as
  unfairness and churn; flat difficulty reads as boredom and churn.

### 2.3 Space & structure: landmarks, verticality, variety

- **Landmarks ("weenies"):** a dominant visible feature orients the
  player from anywhere and pulls them forward (Disney Imagineering via
  AAA level-design practice). Levels need a *readable silhouette*, not
  just a path.
- **Verticality is a full dimension, not decoration:** distinct visual
  identity per height band, structures you climb *onto* and *over*, and
  vertical transitions as pacing beats. "Designing in 2D top-down and
  extruding" is the named failure mode — which is precisely how a
  track-generator thinks.
- **Visual variety per zone:** each area/height needs its own material
  and lighting identity, or the world reads as one repeated wallpaper
  (players navigate by distinctiveness; uniform terrain gets players
  lost and bored).

### 2.4 Game feel & juice

- Immediate (≤100 ms), proportional feedback on every action: particles,
  squash/stretch, tiny screen shake, synced sound, haptics on mobile.
  Jonasson & Purho's classic demo showed juice alone dramatically
  increases play duration; UX research finds 80–120 ms feedback feels
  ~34% more responsive than 200 ms+.
- **Feel beats graphics for retention:** "a game with great feel and
  modest graphics will retain players; great graphics and poor feel will
  not." Failure must also feel good (fast, satisfying restart) — death
  is part of the loop, so death must be cheap and juicy.

### 2.5 Motivation, progression, retention (the business of coming back)

Benchmarks (GameAnalytics / devtodev / AppAgent, 2024–2026):

| Metric | Median game | Good | Top tier |
|---|---|---|---|
| D1 | ~22% | 25–35% | 40–50% |
| D7 | ~4% | 10–15% | 20–25% |
| D30 | <1% | 3–6% | 8–12% |

- **D1 = onboarding**, **D7 = core-loop depth** ("weak D7 almost always
  points to a thin or repetitive core loop"), **D30 = long-term goals
  and content freshness.**
- **Self-Determination Theory:** retention follows *competence*
  (mastery targets: personal bests, ranks, leaderboards), *autonomy*
  (meaningful choice: multiple routes, optional challenges, skip-able
  hard levels), *relatedness* (social comparison). Mastery loops —
  "close the gap between current and best performance" — are the
  strongest documented replay driver.
- **Progression hygiene:** frequent visible milestones, micro-goals
  (daily puzzle, streaks), tiered rewards; avoid grind =
  "content repetition outweighs variety; rewards feel disconnected from
  effort."
- **Zeigarnik effect:** unfinished tasks pull players back — end
  sessions *mid-challenge*, keep a visible "next thing" pending.

### 2.6 Content strategy: handcrafted density vs generated volume

- EDGE shipped **48** designer-built levels (2-person team, ~2 years)
  plus bonus sets, and is still replayed 15+ years later. Candy Crush
  ships thousands but each follows the staircase law with human tuning.
  The shared lesson: **memorable beats per level** beat level count;
  generation is a force multiplier only when the generator can produce
  *variety of structure and combination*, not just variety of seed.
- Replayability is engineered, not hoped for: ranks per level, optional
  collectibles off the critical path, shortcut hunting, ghost/best-time
  chasing, bonus levels unlocked by mastery.

---

## 3. Reference teardown: EDGE (Mobigame, 2008; Steam 2011)

Facts from the store pages, Wikipedia, and contemporary reviews:

**Core verbs (what the cube can DO):**
- Roll with **momentum** (press duration matters; overshoot is a skill).
- **Climb** ledges of equal height.
- **Hang / balance on edges** — the signature move: cling to a wall's
  edge to cross gaps, ride moving blocks sideways, shave time.
  "EDGE time" is a scored stat.
- **Shrink/grow** on resizer pads; the mini-cube fits narrow passages.

**Level elements ("the levels are alive"):**
- Moving blocks, pistons, escalators, conveyor belts, catapults,
  falling platforms, flying-tile carpets, friendly block-robots that
  carry you, switches that reconfigure the machinery.
- Collectible **prisms** (optional, off-path, count toward rank).
- In *EDGE Extended*: **Darkcube**, an AI antagonist cube that blocks
  paths and presses switches against you.

**Structure & presentation:**
- Levels are filled multi-storey block *structures* (walls to climb,
  rooftops, underpasses), not tracks; long levels run minutes.
- Camera dynamically scales to frame the action; an overhead **radar**
  shows layout, elevation, and nearby prisms (occlusion is designed
  for, not suffered).
- Minimal HUD; strong electronic soundtrack (an award category for the
  game); per-level **ranks S+/S/A/B/C/D** from time + prisms + deaths;
  48 levels + 17 bonus (Extended: 48 + 15); final levels unlock by
  collecting all prisms earlier — mastery gates *bonus* content.
- Reviews praise: "levels are living, breathing creatures… massive
  playgrounds"; criticism targets control clumsiness and minimap
  helpfulness at times. Play Store demo: 4.4★, 50L+ (5M+) downloads;
  Steam: 92% positive (1,828 reviews); nostalgia reviews repeatedly
  cite "no ads, relaxing, original" as why they returned.

**Transferable lesson, in one line:** EDGE's variety lives in *verbs and
machines* — the world moves and the cube changes — while its levels are
*places with landmarks*, and its rank system makes 48 levels last
longer than a flat 200.

---

## 4. KUBIK audit (measured, 2026-11-17)

Method: one-off audit over the shipped defs (`src/levels.js`,
`src/campaign.js`, `src/campaign2.js` — deduped by id), geometry counted
from the map strings, route length = proven BFS rolls via
`rules.legalNeighbours` (unkeyed subset; keyed levels need the key
detour, so route medians below understate keyed levels slightly).

### 4.1 Size & fill — the track problem

| Block | Board (median) | Tiles avg | Fill avg | Route median |
|---|---|---|---|---|
| L1–50 | 10×10 | 31 | 0.30 | 13 |
| L51–100 | 16×16 | 55 | 0.19 | 24 |
| L101–150 | 18×18 | 68 | 0.21 | 36 |
| L151–200 | 18×18 | 60 | 0.19 | 38 |

Per act, tile mass: 27 → 30 → 42 → 49 → 65 → **90 (Act 6)** → 51 → 56 →
60 → 63. The bounding box maxes at 18×18 in Act 5 and never grows again;
substance *declines* for the last 80 levels. Longest route in the game:
**44 rolls**; only 7/200 levels exceed 40; none exceed 60.

Fill ≈ 0.17–0.19 means **four fifths of every late-game board is void**:
the level is a 1-wide path through empty space — the U/C/P/L silhouettes
in the player's screenshots. The few high-fill levels (L106–118,
fill 0.52–0.62) are flat ice sheets, not structures.

### 4.2 Height — steps, not storeys

143/200 levels use exactly 3 height characters; height span ≤ 2 in
195/200; only 21 levels touch a 4th height. Heights work as *stairs on
the track*. Nothing is ever *on top of* anything: no rooftops, no
underpasses, no climbing, no route that crosses over itself at another
storey. The third dimension is spent on making the track bumpy.

### 4.3 Mechanic density — debuts instead of design

Levels (of 200) containing each mechanic:

| Mechanic | Levels | First appears |
|---|---|---|
| Sentinels (orbs) | 165 | L6 |
| Crumble | 131 | L5 |
| Ice | 109 | L14 |
| Springs | 77 | L20 |
| Shuttles | 77 | L28 |
| Key + sealed goal | 61 | L12 |
| Freeze shard | 5 | L120 |
| Boss arena | 5 | L120 |
| Wind (nudge) | ~5 | L4/L8 |
| Conveyor | 3 | L175 |
| Timed slab | 2 | L112 |
| Heavy block | 2 | L144 |
| Pulsing gap | 2 | L169 |
| Doors | **1** | L152 |
| Sliders | 1 | L13 |

The M2/M3 mechanics shipped one proven slot each (ADR-020 law) — and
then the generator's probability rolls almost never dealt them again.
A mechanic seen once (doors) cannot be taught, tested, or twisted;
players reasonably conclude the game has ~5 mechanics. Meanwhile the
top-4 repeat 77–165 times each: that repetition *is* the sameness.

Combinations exist (avg 3.24 mechanic kinds/level, 85 levels with 4+)
but they are combinations of the same four veterans.

### 4.4 What KUBIK already does at production level

To be credited in any honest comparison:

- **Correctness culture EDGE never had:** every level machine-proven
  fair (phase-blind proofs, ADR-018/029), bot-played live before every
  commit, diversity audit against fingerprint monotony.
- **Player-kind systems:** mid-path rescue (ADR-014), all 200 levels
  open from the start (EDGE locks finales behind 100% prisms — we
  chose kinder), daily seeded challenge, par + medals, minimap.
- **Original systems EDGE lacks:** sentinel patrol ecosystem
  (proximity sleepers, boss wave phases), freeze shards, heavy blocks,
  pulsing gaps, timed slabs, twin shuttles.
- **Content volume:** 200 + daily ∞ vs EDGE's 48+17.

The gap is not talent or systems — it is **content design density**:
structure, verbs, cadence, and meta.

---

## 5. Gap analysis (research + EDGE vs KUBIK)

| # | Dimension | Production bar (evidence) | KUBIK today | Verdict |
|---|---|---|---|---|
| G1 | Level topology | Filled places, landmarks, multiple routes (§2.3) | 1-wide tracks, fill 0.19, one critical path + shard spurs | **Behind** |
| G2 | Verticality | Storeys, climb, cross-overs (§2.3) | Height-span ≤2, stairs only | **Behind** |
| G3 | Scale escalation | Boards & routes keep growing (§2.2) | Caps at 18×18 / 44 rolls; mass falls after Act 6 | **Behind** |
| G4 | Player verbs | New verbs change what player *does* (EDGE: hang, shrink) | Roll + shrink pads (ADR-034) + lift rides (ADR-033) + clinging, the hang (ADR-037); no momentum verb | Closing |
| G5 | Machinery life | Levels move: pistons, lifts, carriers (§3) | Shuttles horizontal + lifts vertical (ADR-033) + shrink pads (ADR-034) + piston pushers (ADR-035) + turntable bridges (ADR-036) + clinging (ADR-037) | Partial |
| G6 | Mechanic cadence | Teach–test–twist; staircase (§2.1–2.2) | Debuts at density 1–5, no twist possible | **Behind** |
| G7 | Difficulty rhythm | Sawtooth + relief (§2.2) | Act bands rise ~monotonically; intra-act cliffs audited ≤16 | Partial |
| G8 | Mastery meta | Ranks/ghosts/best-times (§2.5–2.6) | Par + medals only; no per-level grade, no ghost | **Behind** |
| G9 | Long-term goals | Unfinished-task hooks, unlocks (§2.5) | Finish 200; shards have no meta use | **Behind** |
| G10 | Visual variety | Per-zone identity (§2.3) | Per-act hue only; same slab language 200 levels | **Behind** |
| G11 | Game feel | Juice everywhere (§2.4) | Shake/flash/chips on big events; landings, slides, pickups thin | Partial |
| G12 | Fairness/proof | (not an EDGE axis) | Phase-blind proofs + live bot gate | **Ahead** |
| G13 | Player-kindness | — | Rescue, all-open, no ads | **Ahead** |
| G14 | Content volume | 48+17 handcrafted | 200 proven + daily | Ahead (quantity) |

Player complaints map 1:1: "same 3D platform structure" = G1+G10;
"no increase in complexity/big platform" = G3+G2; "no new features,
elements, attractive" = G4+G5+G6.

---

## 6. Strategy — the build plan (in dependency order)

Design principles for every phase: (i) our own mechanics under the
one-law resolver — if it can't be *proven*, it doesn't ship;
(ii) ADR-020 law — one proven slot, then generator rollout, then density
retune; (iii) static versioned content (ADR-004); (iv) base campaign
stays fully open — new unlocks may only gate *bonus* content;
(v) every phase ends with unit + verifier + focused-live + full hook.

### Phase A — Structure: from tracks to places (G1, G2, G3)

*The archetype library learns architecture.*

1. **New archetype family "structures"** (`scripts/archetypes.mjs`):
   - `plaza` — filled courts (fill ≥ 0.45) where the puzzle is routing
     across open ground among sentinel lanes, not following a path.
   - `tower` — a stepped pyramid/block massif: route spirals *up* a
     structure and down the far side; height span 3–4 as architecture.
   - `rooms` — walled compounds (use height-3 walls as visual mass):
     3–5 chambers joined by doorways/plates, shard in a side chamber.
   - `crossing` — two-storey weave: the route passes *over* its earlier
     self on a bridge bank (span-2 overpass), first true cross-over.
   - `citadel` — finale-class: plaza + tower + rooms composite,
     24×24 board (see decision D1), route target 70–100 rolls.
2. **Generator floors, enforced like the diversity audit:**
   fill ≥ 0.30 for structure archetypes; ≥ 1 structure archetype per
   3 levels from Act 5; tiles-act curve monotonic non-decreasing
   (Act n avg tiles ≥ Act n−1), route medians rising to ≥ 55 by Act 10.
3. **Resize the finale line:** Act bosses (120…200) become citadels —
   the boss phase-2 chase plays across a place, not a corridor.

*Files:* `archetypes.mjs`, `gen-campaign2.mjs`, `acts.js`,
`experience.mjs` (new fingerprints), `campaign2.js` (regenerated slots
only, splice law). *Gate:* verifier gains fill/structure floors; focused
live on every regenerated slot; screenshot review per archetype.
*Risk:* generator attempt budgets (structures are denser — proofs get
slower; keep 18×18 for non-finales, citadel slots get 450-attempt act-10
treatment).

### Phase B — Verbs: things the cube learns to DO (G4, G5)

*Each is an original KUBIK mechanic, one proven slot each (ADR-020).
Ordered by proof-friendliness:*

1. **Lift platforms (vertical shuttles).** ✅ *Shipped (ADR-033).*
   A shuttle whose track moves in *height* between two banks: board
   at low bank, ride up, step off high. Proof-wise it is a shuttle
   edge between different-height tiles — the resolver already prices
   bank steps; the ride edge stays one logical edge. Unlocks
   towers/crossings from Phase A. *First slots:* teach L131
   "The Wait" (Act 7, 1→3) and test L173 "Over the Edge" (Act 9
   tower, 2→4); density arc deferred to a later cadence pass.
2. **Shrink pads ("mini-cube").** ✅ *Shipped (ADR-034).* Rolling
   onto a pad halves the cube until a grow pad re-pads it. Mini-cube
   fits *low tunnels* (tiles flagged `low` — impassable to full
   cube). Resolver: size is cube state like freeze presses — one
   more bit, priced in every proof (searches carry (tile, size);
   pad states are pruned to the sizes that can be stood in).
   *First slots:* teach L126 "Tidegate" (Act 7 plaza), test L161
   "Full Tide" (Act 9 tower), twist L193 "The Final Angle" (Act 10
   citadel); density arc deferred like the lift arc.
3. **Piston pushers.** *(Shipped — ADR-035.)* A block that periodically
   extends one tile, shoving the cube (like a conveyor with timing):
   crossing a piston corridor is a timing beat the crossing-window
   model already knows how to prove. Adds EDGE-like "machinery that
   can hurt/help you". As shipped, the strike cell is plain floor in
   every proof (the sliding-bridge doctrine), the base is a wall, and
   the live arm refuses entry while extended and otherwise shoves a
   resting cube under the wind-drift law — displacement, never a
   crush. *First slots:* teach L137 "The Turnaround" (Act 7), test
   L169 "Compression" (Act 9), twist L187 "The Last Push" (Act 10
   citadel); density arc deferred like the lift/shrink arcs.
4. **Turntable bridges.** *(Shipped — ADR-036.)* A bridge segment that
   rotates 90° on a cycle, re-wiring the route graph over time. As
   shipped: a rigid 3-tile bar over a void cross, pivot always floored
   as the mid-crossing refuge, cross cells plain floor in every proof
   (the slider-family wait-out model, as promised), the live arm
   dropping a loitering cube exactly as a sinking slider does.
   *First slots:* teach L129 "The Crossing" (Act 7), test L164 "The
   Crunch" (Act 9), twist L189 "The Unwinding" (Act 10); density arc
   deferred like the other Phase B arcs; plate-pressed rotation not
   modelled — cycles only.
5. **Hang-ledge (the expressive one, name ours: "clinging").** ✅
   *Shipped (ADR-037) — as a declared grip crevice, not an inferred
   one.* Roll off a bank into a declared void crevice and the cube
   catches the far face, hangs one beat and mantles up: a single press
   spans the gap and a height step one storey past the roll law each way
   (climb +2, drop −3). The prototype decision the plan reserved was
   made the safe way: the edge is DECLARED and audited (banks in reach,
   plain faces, on the walk, never decoration — the verifier fails any
   cling that does not shorten the proven route), so it cannot silently
   rewrite the 200 shipped levels the way an inferred hang would have.
   Proof cost did not explode: the edge rides the one press primitive,
   so every search inherits it. *First slots:* teach L176 "The Wall of
   It" (Act 9 citadel), test L186 "Loose Ends" (Act 10), twist L191
   "The Last Seam" (Act 10); density arc deferred like the rest of
   Phase B. Not modelled: player-controlled hang time, hang-to-side
   transfer, and the trap use of the verb (a crevice the optimal line
   does not take is rejected by design).

*Files per mechanic:* `rules.js` (law + proof), `game.js`,
`levelView.js`, `hazards.mjs` (conversion, content-hash only),
`experience.mjs` (fingerprints), `tests/unit/mechanics.test.mjs`, the
live bot's crossing model, README/`level_design.md` + a new ADR each.

### Phase C — Cadence: teach, test, twist, combine (G6, G7)

*No new code systems — the generator learns scheduling.*

1. **Density floors:** every shipped mechanic appears in ≥ 12 levels
   (doors/timed/pulse/heavy/conveyor/freeze/wind go from 1–5 to 12+);
   no mechanic exceeds 55% of levels (crumble 131 → cap).
2. **Introduction arcs in `acts.js`:** when a mechanic debuts in an act,
   its next 3 appearances are scheduled: teach (solo, easy context),
   test (paired with the act's terrain), twist (combined or inverted) —
   generator enforces signature sequencing per act like the existing
   diversity audit, and the audit *fails the build* if an arc is broken.
3. **Sawtooth enforcement:** act par bands get deliberate relief slots
   (every 6th level targets −30% par vs act median); the intra-act
   cliff audit (≤16) already exists — add a *floor* audit so relief is
   real, not accidental.
4. **Re-deal the deck:** regeneration pass that splices the retuned
   slots only (forced-slot law), preserving names/ids; full hook per
   batch of ~25 levels.

### Phase D — Feel & presentation (G10, G11)

1. **Per-act material identity:** tile top material, edge trim, and
   backdrop gradient per act (data-driven from `acts.js`), so Act 6
   ice country and Act 8 vaults *look* like different countries, not
   hue shifts. Structure archetypes get landmark silhouettes.
2. **Machinery life:** idle motion language — lifts breathe, pistons
   tick with audible pre-cues, turntables telegraph before rotating
   (fairness is also readability).
3. **Cube juice:** squash on landing, stretch on spring launch, dust
   puff on ice stop, shard sparkle burst, key-grab pulse, death
   shatter-and-swift-respawn (< 600 ms back in control), landing
   *thock* pitched by fall height. All proportional, all cheap.
4. **Camera:** fit-to-structure framing (zoom breathes with level
   footprint; today it is one framing for a 10×10 and an 18×18 alike).

### Phase E — Mastery meta (G8, G9) — retention layer

1. **Grades per level:** CLEAR / SWIFT (≤ par) / FLAWLESS (≤ par, all
   shards, no death) rendered as a 3-notch seal on level cards —
   EDGE's S-rank chase, in our vocabulary; stored in the existing save.
2. **Ghost of your best:** the win panel offers "race your best"
   replaying your medal run as a translucent cube (we already record
   best times; ghost = stored move list per level, replayed by the
   bot's own driver code). Pure client-side, no server.
3. **The Vault (bonus content):** 10 hand-finished citadel levels
   (ids 201–210, "Vault" set) unlocked by *total shards* across the
   campaign (e.g., every 60 shards opens one). Base 200 stay open —
   the all-open rule is untouched; the Vault is the Zeigarnik hook for
   completionists.
4. **Daily streak:** calendar streak counter + "perfect week" badge on
   the daily card; streaks are the cheapest D7 lever in the research.

### Phase F — Prove it like production (validation)

- Playtest protocol per phase: 5 fresh players, measure first-try
  clear rate, deaths/level, time-to-clear vs par, quit points; compare
  against the bot's move counts (current proxy). Targets from §2:
  L1 impossible-to-fail, relief every ~6, no level with > 25%
  playtest quit.
- Verifier additions shipped with each phase (fill floors, arc audit,
  density audit) so the *generator cannot regress* the design.
- Re-run this audit (Section 4 method) after each phase; publish the
  before/after table in `docs/progress.md`.

**Sequencing:** A (structure) and C (cadence) are generator-only and
de-risk everything; B1 lift unblocks A's towers; B2 mini unblocks
vaults; D is independent and can interleave; E lands last on stable
content; B5 clinging was gated on a prototype that the declared-crevice
design cleared (ADR-037).

**Status (2026-11-17):** direction approved (structure first, re-cut
shipped levels, full meta later; size = production-style escalation,
not a flat cap). **Phase A milestone 1 shipped** (ADR-030): plaza /
tower / citadel archetypes; Acts 8–10 at W20 with par bands
[32,50]/[36,58]/[40,66]; act-end boards `max(18, W+2)`; nine spliced
slots (plaza L88/L113/L128, tower L148/L168/L188, citadel
L155/L177/L196) — structure slots measure fill 0.53–0.67 against the
campaign's 0.19, and tower routes run 47–57 rolls against the old
44-roll game-wide ceiling. **Phase C batch 1 shipped** (ADR-031):
21 forced slots scheduled teach→test→twist lift door 2→8,
pulse 3→14, twin 3→10, conveyor 6→11, timed 6→14, guarded by a
unit-test density ratchet. **Phase C batch 2 shipped** (ADR-032):
floors completed (door →14, conveyor →14, twin →15 — every
generator-placeable mechanic now ≥12); light blocks join the
generator (2→10, teach L58 → twist L171); sawtooth relief is
audit law (`KUBIK_RELIEF` shortest-candidate settling; no act
may run 6+ levels above its relief line). **Phase C slider carve shipped** (ADR-038): sliding bridges are
generator-placeable (rigid one-height groups, content-hash carve of
the proven walk, parse-time crossing-window law, purity audit, shards
off the span), taught at L133 and tested/twisted at L163/L194; the
density ratchet tracks slider at 3. **Phase C wind carve shipped**
(ADR-039, the last carve): the breeze now has one rules-side drift
predicate, a wind-lock audit that forbids unescapable drift pockets,
and a parse law that keeps every waiting mechanic out of its levels —
wind is a rolling-only modifier, taught at L148 and tested/twisted at
L167/L184. Every mechanic in the catalogue is now generator-placeable
and tracked by the density ratchet; only the ≤55% crumble/sentinel
overuse-cap decision remains from Phase C. **Phase B complete (ADR-033…ADR-037):**
lift platforms shipped (see Phase B item 1); shrink pads shipped
(ADR-034, Phase B item 2); piston pushers shipped (ADR-035, Phase B
item 3); turntable bridges shipped (ADR-036, Phase B item 4); clinging
shipped (ADR-037, Phase B item 5) — every Phase B verb has landed.
**Phase C batch 3 shipped** (ADR-040): the density arcs received 21
context slots (one per scarce mechanic per act, Acts 7/9/10), lifting
lift 4→11, shrink 4→13, cling 4→11, turntable 3→9, piston 3→8,
slider 3→8 and wind 3→7 (catalogue 51–200), and the batch added the
complexity ceiling `MECH_CAP = 9` — the shipped maximum — so bulk
density work can never produce an unreadable eleven-mechanic board.
Next: the fourth density batch (the remaining slots toward 12+ for the
Phase B verbs), the crumble/sentinel overuse-cap decision, and Phase
E meta.

---

## 7. Decisions needed before Phase A

- **D1 — Board ceiling.** Citadels want 24×24 (proof cost, camera,
  minimap legibility all grow). Approve 24×24 for finale/Vault slots
  only, keep 18×18 elsewhere?
- **D2 — Verb scope.** B1–B4 as specified, B5 clinging behind a
  prototype gate — approve the *verb-first* direction (vs more tiles)?
- **D3 — Meta.** Grades + Vault unlock-by-total-shards (bonus-only
  gating) — approve within the all-open rule?
- **D4 — Regeneration appetite.** Phase C re-deals a large share of
  51–200 (names/ids preserved, content spliced per batch, full hook
  each). Approve re-cutting shipped levels, or only *add* density via
  the Vault + a 201+ "Season 2" band?

## 8. Sources

- EDGE — Steam store page (features, ranks context, reviews):
  https://store.steampowered.com/app/38740/EDGE/
- EDGE Demo — Google Play (features, awards, ratings):
  https://play.google.com/store/apps/details?id=net.mobigame.edge.demo
- Edge (video game) — Wikipedia (gameplay, hang/climb, levels):
  https://en.wikipedia.org/wiki/Edge_(video_game)
- EDGE by Mobigame — fan wiki (prisms, resizers, Darkcube, ranks):
  https://kyubiwans-fantasy-world.fandom.com/wiki/EDGE_by_Mobigame
- Edge (2009) — MobyGames (mechanics summary):
  https://www.mobygames.com/game/41029/edge/
- Edge review — 148apps (machinery, controls, level life):
  https://www.148apps.com/edge/edge/
- The Level Design Book — Pacing (beats, teach–test–twist):
  https://book.leveldesignbook.com/process/preproduction/pacing
- The Invisible Architecture of Fun — puzzle level design (sawtooth,
  staircase, onboarding): https://www.ludaxis.io/blog/level-design-puzzle-games-guide
- Challenging level design — complete guide (calibration, playtest
  metrics): https://aventurauniversal.com/en/Challenging-level-design-in-video-games:-a-complete-guide/
- Mobile game retention 2026 (D1/D7/D30 benchmarks, drivers):
  https://appfollow.io/blog/mobile-game-retention
- devtodev — Retention (what each checkpoint diagnoses):
  https://www.devtodev.com/resources/news/retention
- Game feel & juice (Jonasson/Purho lineage, proportionality):
  https://gamemaker8.com/design/game-feel-juice-what-makes-controls-feel-good-why-matters-more-than-graphics/
- Flow in games — Chen/Csikszentmihalyi (challenge–skill channel):
  https://www.researchgate.net/publication/220421228_Flow_in_games_and_everything_else
- Pathways to Mastery — progression taxonomy & SDT:
  https://www.intechopen.com/chapters/1221745
- The psychology of repeat play (mastery, Zeigarnik, streaks):
  https://guul.games/blog/why-we-play-again-and-again-the-psychology-of-repeat-gaming
- Visual language in level design (weenies, verticality, wayfinding):
  https://game-designers.net/visual-language-in-game-level-design

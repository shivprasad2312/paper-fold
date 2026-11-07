# KUBIK — Game Design Document

_Phase 2 deliverable. This document describes the game as it is implemented
(`src/` is the source of truth where they could diverge). Version 1.0.0,
2026-11-06._

## 1. Concept & vision

**One sentence:** roll a paper cube across floating slabs, survive the
machinery, reach the gate.

KUBIK is a minimalist 3D reflex-puzzle in the lineage of EDGE: a single
input (roll in 4 directions), instant death, instant retry, short levels,
mastery-driven replay. The vision is **"a reflex game you can verify"** —
every level is provably solvable and bot-played in CI, all content is
generated from source (no asset files), and the whole experience ships as
one small web build that runs anywhere a browser runs, offline.

## 2. Target audience

- Primary: mobile + desktop web players 14–35 who like Geometry Dash /
  Super Hexagon / EDGE — short sessions (one level ≈ 10–40 s), high skill
  ceiling, fair difficulty.
- Secondary: puzzle purists who like *knowing* a level is fair (medals, par,
  ghosts, dailies); accessibility-minded players (light theme, 4 camera
  seats, hold-to-roll).
- Platform: any modern browser, phone-first but equally good with
  keyboard. No install, no account, no network.

## 3. Core loop

```
read geometry → choose roll → (die | gate)
   die ──────────────┴─→ instant restart (same level, 0 input)
   gate → win panel (time, shards, par, medal, ghost saved) → next level / retry
```

The loop must survive scrutiny at **10-second scale**: no menus, no loading,
no camera fly-throughs between attempts. Retry is one key/tap and the cube
is reset to the start within the same frame budget.

## 4. Controls

| Input | Action |
|---|---|
| Arrow keys / WASD | roll one tile (screen-relative — remapped per camera seat) |
| **Hold** an arrow (or hold a swipe direction) | keep rolling that way until released, death, gate, or a wall |
| Swipe (mobile) | roll one tile in the swipe direction |
| `R` / `R` key or tap-restart | instant restart |
| `P` / `Esc` / HUD ⏸ | pause / resume (auto-pauses when the tab hides) |
| `Q` / `E` / HUD cam buttons | orbit the camera (4 seats) |
| `M` | mute / music toggle (HUD) |
| Theme toggle (HUD + menu) | dark ↔ high-key light |

Design rule from research (§5 of `research.md`): **input is never a source
of difficulty.** Presses while a roll animates are buffered (2-deep queue,
deduped) so fast play feels faster, not lossy.

## 5. Mechanics

Every mechanic has one job. If a mechanic doesn't change *how* a route is
planned, it doesn't ship.

| Mechanic | Rule | Job |
|---|---|---|
| **Roll** | 90° roll onto an adjacent slab; may climb ≤1 height, fall ≤2 heights; anything else is a wall or a fall | core verb; heightfield IS the level |
| **Fall** | roll off a slab edge → death | the constant threat that makes geometry readable |
| **Crumble slab** | cracked slab: you may stand on it, but it breaks when you leave it (one-way) | route commitment / no backtracking |
| **Sentinel (orb)** | cube patrolling a fixed loop (path, speed, phase); touching it = death; it passes *through* nothing | timing hazard; telegraphed, periodic, deterministic |
| **Block + telekinesis** | dark cube; you have N nudge charges; pushing a block slides it one tile and costs a charge | planning resource; "is there enough push left?" |
| **Rising bridge (slider)** | group of slabs that rise/sink on a fixed period/phase; solid only while up | timing + path (L13 boss, finale) |
| **Shuttle (platform loop)** | a lone platform dwells ~2 s on each of two dock tiles, drives across the void gap between two structures, dwells, returns — forever. The docks are solid only while the platform stands on them; a settled cube on the moving platform is carried across | long-gap traversal; "board before it leaves" reflex on a fair, readable loop (campaign band 3+) |
| **Ice slab** | a roll onto ice keeps the cube sliding one tile per step in the same direction until the first non-ice slab or an illegal step — one press, several tiles | momentum / route compression; the slide is one press in par (campaign from band 1) |
| **Spring pad** | a press on (or onto) a spring launches the cube up to 3 tiles in the direction of travel, flying over void, landing on the first slab within height ±3; no slab in range = a fall | pit-hopping with a fixed, readable launch (campaign from band 2) |
| **Key & sealed gate** | gate is locked until the key slab is visited (finale) | objective sequencing |
| **Wind** | diagonal breeze that nudges the cube a tile every ~0.62 s (soft hop, no roll count) | drift management; can't be "pushed back" |
| **Shards** | 2–5 per level, on slabs; collected passively | risk-reward (off-route pickups), medal input — teaching levels 1–2 carry 2, most levels 3–4, the pre-boss L12/L13 carry 5 |
| **Gate** | finish pad; standing on it wins | objective |

**Win condition:** cube reaches the gate (with the key first, if the level
has one). **Lose condition:** fall, crumble-out, sentinel contact, or — in
the locked-gate finale — walking into the sealed gate refuses the roll
(soft bounce, no death; death stays reserved for *player*-readable causes).

## 6. Physics & interactions

Deliberately **not** a physics engine. The world is a discrete tile grid
(`Map<"x,z", tile>`); a roll is a legal-move check (`checkRoll`) plus a
fixed-duration 0.243 s animation. Blocks are tile-anchored objects moved in
whole tiles. Sentinels move along tile loops with continuous interpolation
but deterministic timing (period/phase), so a given sentinel is at a given
place at a given time — a run is reproducible given inputs.

Consequences: (a) no tunneling, no precision-dependent deaths; (b) every
"fair or not" question reduces to a graph search the verifier can answer;
(c) the animation layer is pure presentation — it can't desync the logic,
and the playable-route test drives *real input* against it to prove that.

The new mechanics follow the same rule. A press has exactly one *resolved*
landing (`resolveRoll`): the roll, plus any ice-slide / spring-launch
follow-through. The solver, the route planner and the playable bot all use
that one function, so "one press, several tiles" is one edge in the graph,
never a physics simulation. The shuttle is the slider pattern taken to the
extreme (ADR-013): the level view is the clock, the platform position is a
pure function of shared time, the game asks `shuttlePos()` /
`shuttleDocked()` instead of trusting stored state, and the "ride" is an
explicit edge between the two docks in every search.

Fixed durations: roll 0.243 s (30% slower, player-directed 2026-11-07),
push 0.22 s, wind hop 0.24 s, wind period 0.62 s, locked-gate bounce
0.243 s × 1.35, spring flight 0.18 s + 0.08 s per tile, shuttle dwell
2.0 s per dock, shuttle travel 0.8 s per gap tile.

## 7. Scoring & rewards

- **Time** — main mastery metric, per level (best kept).
- **Par** — the BFS shortest route length (campaign/daily levels), i.e. the
  theoretical minimum rolls. "par clear" = exactly par rolls.
- **Shards** — 2–5 per level; all of them = "perfect" flag.
- **Medals** (bronze/silver/gold) — 3 independent criteria, each worth a
  point: all shards, ≤ par rolls, fast time (≤ 0.5 s slack per par roll).
  3 = gold, 2 = silver, 1 = bronze. This is the EDGE S-rank loop: an
  open-ended chase that never makes a level "done" feel dead.
- **Ghosts** — your best run is recorded (per-tile positions vs time) and
  races you on the next attempt.
- **Dailies** — one date-seeded level per day (verifier-proven at load),
  own medal track, 14 most recent tracked.

No coins, no energy, no IAP, no ads (research §5).

## 8. Progression

- **50 levels, all open from the start.** Levels 1–13 are hand-designed
  (one mechanic each, in teaching order — see `level_design.md`); 14–50 are
  a seeded-generated campaign in 5 acts (Descent, Glass Meadow, Lattice,
  Crucible, Spire) with a key/lock finale (50).
- **No lockout, by design decision** (2026-11-06, player request): mastery,
  not access, is the progression. Difficulty is a menu, not a wall.
  `save.unlocked` remains in the save schema (legacy, inert).
- Difficulty curve: teaching → single mechanic → combined mechanics →
  resource/timing pressure (nudge budgets, sentinel gauntlets) → finale
  (12×12, key + lock + everything). Deliberately steepest at the end,
  matching the player praise of EDGE's hard endgame.

## 9. Lives / attempts / checkpoints

Base convention is the genre's: **instant death, instant restart, full
level** — levels are short enough that a permanent checkpoint would break
the loop's rhythm, and the "checkpoint" is your own memory (and the
ghost).

One relief valve for the big levels (ADR-014): dying after you've spent
more than half the proven path offers a **mid-path second chance** — one
resume from the level's bench tile (the 50% press of the proven route,
adjusted to a safe slab). The choice window is 6 s; do nothing and the
normal instant restart happens. A rescue keeps your moves, time, shards,
broken slabs and blocks (only the sentinels reset), and a rescued clear
doesn't enter the time/ghost rankings — the S-chase stays a clean-run
chase. Levels with ≤ 4 presses have no bench (restarting is instant).

## 10. UI/UX

- **Menu**: title, Play (current level), Levels, Daily, theme, mute, camera
  seat. No more than two taps to a rolling cube.
- **Level select**: wall of 50 cards — index, name, best medal, best time;
  daily card pinned. All cards active.
- **In-level HUD**: top — level name + timer + moves/par + shards; bottom —
  mechanic chips (what this level uses), hint; minimap (top-right) shows
  geometry, you, shards, gate, sentinels.
- **Pause**: overlay with resume/restart/menu; auto-pause on `visibilitychange`.
- **Win panel**: medal animation, time, shards, moves vs par, best,
  "perfect par clear" eyebrow; **Next** (primary) / Retry / Menu.
- **Death**: 0.2 s fade, auto-restart; the `R` key and tap work mid-death.
- Typography: single system stack, strong hierarchy, tabular numerals for
  the timer. Dark theme by default; high-key light theme is a full skin
  (not a filter), chosen to address the neon eye-strain complaint in the
  genre (research §6).

## 11. Audio

All synthesized at runtime (Web Audio, zero files): a slow generative
ambient bed (pad + arpeggio, seeded per level so each level has its own
sound), and SFX for roll (filtered noise tick), push, crumble, shard
pickup (rising chime), death (down-chirp), gate (resolving chord), UI.
Music is deliberately metronome-calm, not pulse-fast (research: fast
neon + fast music is where eye-strain complaints cluster). Mute/music
toggles persist.

## 12. Onboarding & tutorial

There is no tutorial screen. Level 1 is a 3-tile roll with the hint "Roll
to the gate — arrows, WASD or swipe". Each hand level teaches at most one
new mechanic with a name + chip in the HUD (e.g. L4 introduces
telekinesis, L5 crumble, L6 sentinels, L8 wind). The verifier + playable
gate guarantee the teaching order is actually learnable (a level that
combined two untaught mechanics would fail the design review, not the
build).

## 13. Replayability

- Par + medal chase (EDGE S-rank pattern).
- Ghosts (race your best).
- Dailies (new proven level every day, 14-day medal history).
- Theme + 4 camera seats (cosmetic mastery).
- 50 levels open at once → player-chosen difficulty routing.

## 14. Accessibility

- Light theme (full high-key skin) for neon-fatigue / low-light contexts.
- 4 camera seats (Q/E) — the genre's single fixed camera is a known
  comfort pain point; ours is a setting.
- Hold-to-roll reduces rapid-input demand (important for motor-accessible
  play); single-tap still works.
- All controls available on keyboard and touch; 44 px+ targets; HUD text
  ≥ 13 px; no time-limits that punish slow readers (there is no timer
  *except* your score).
- Known gap: no reduced-motion mode yet (see `progress.md`).

## 15. Non-goals (deliberate cuts)

- No multiplayer / live leaderboards (offline-first; share-codes later).
- No level editor (generator + verifier is the content pipeline; editor is
  scope creep for v1).
- No narrative. The geometry is the story (genre norm).
- No backend of any kind.
- No physics engine, no particles system beyond lightweight mesh effects.

## 16. Monetization

None in v1. If the store build ships (see research §5 discussion), the
default is paid or free-with-no-ads; IAP/ads would have to pass the
"does it touch the 10-second retry loop?" test.

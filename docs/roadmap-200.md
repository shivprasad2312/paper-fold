# KUBIK — Roadmap to ~200 Levels (implementation plan)

_2026-11-07. Companion to the scaling consultation. No paper-fold
references: KUBIK is its own thing, and the plan is anchored on the
cube, not on any other game's name or identity._

## Ground rules (unchanged)

- Every level stays **provable**: the 8-check verifier (soon 9, with the
  rescue proof) must pass for every level, hand or generated.
- The **live playable-route gate** stays a commit blocker — at 200
  levels it runs stratified (M2): unit + verifier on every commit, live
  bot on changed levels + a rotating 50 per commit, full set nightly.
- No placeholder mechanics, no silent feature removals, one mechanic =
  one resolved-press law extension + unit tests + live play + docs.

## Milestone 1 — Mid-path second chance ("rescue")  ✅ SHIPPED (2026-11-07)

A death after more than half the proven path offers **one** resume from
the middle of the path, instead of a full restart.

**Status:** done — ADR-014. Shipped: `shortestPath` + `rescueTile`
(pure) in `rules.js`; `rescueOffered/acceptRescue` + 6 s choice window in
`game.js`; R/Enter/tap accept + "rescued" win banner in `main.js`;
`save.rescue` (default on); **verifier check 0c** (fair bench→goal route
for every level with a bench); 7 unit tests (`tests/unit/rescue.test.mjs`);
7 playtest checks; the live bot accepts rescues. Bench census: 48/50
levels carry one (only the 2-press warm-ups don't); 50%-press placement
confirmed (L27 → 1,6); key-aware placement confirmed (L50 bench past the
key). Result: unit 59/59 · verify 9-check green · playtest 71/71 ·
live suite green. Toggle defers to M5's assist mode (save key wired now).

- **Rescue tile** (pure, in `rules.js`): the 50% tile of the proven
  shortest path, adjusted to the nearest *safe* tile along that path —
  safe = not on a patrol line, not a crumble, not a shuttle dock, not
  ice, not a spring. For `gateKey` levels the rescue tile must sit past
  the key on the path; otherwise the level ships without a rescue tile
  (documented).
- **Effect of accepting**: cube re-placed at rest on the rescue tile;
  moves, collected shards, broken crumbles and pushed blocks are KEPT
  (commitments stay real); sentinels reset to their start phase
  (deterministic); timer keeps running; one rescue per attempt; medal
  times achieved with a rescue are flagged (separate ranking tier).
- **UX**: on a qualifying death the normal instant restart is replaced
  by a ~6 s choice — resume mid-path or restart from the start (do
  nothing = restart, so the muscle memory holds). Settings toggle,
  default on.
- **Gate extension** (verifier check 9): for every level with a rescue
  tile, a timing-fair path rescue-tile → goal must exist (the "at least
  one path" invariant extended to the bench).
- **Playtest**: a scripted scenario (high move count → death → accept →
  resume at the rescue tile → win).
- **Deliverables**: `shortestPath` + `rescueTile` in rules.js, game +
  main wiring, save setting, verifier check 9, unit tests, playtest
  entry, ADR-014, GDD §9 update.

## Milestone 2 — The 200-level skeleton

- **10 acts × 20 levels** (act = map size + mechanic budget + theme +
  one boss level at the end).
- **Difficulty model**: {size, par, mechanic count, orb count, crumble
  density, gap width} as a monotonic curve with plateaus and act-end
  spikes (the EDGE-praised endgame shape).
- **Archetype library (20+ named layouts)**: descent corridor, twin
  bridge, spiral, lattice, split-and-merge, ring, key detour, shuttle
  span, ice river, spring field, wind canyon, gauntlet, bridge chain,
  boss arena, … the generator picks archetype + parameters from the
  difficulty budget. (Today it has ~6 effective archetypes — repetition
  shows around level 60; this is the real scaling risk.)
- **Uniqueness check**: shape signatures, reject near-duplicates.
- **Curation pass**: candidates score on route efficiency, fair
  branch choices, hazard variety; top candidates hand-played for act
  intros/bosses.
- **Level select**: flat list → act map (stations + progress rings).
- **Names/hints at scale**: themed pools per act + hint templates.
- **Gate stratification**: unit + verifier (pure Node, ~1 min) on every
  commit; live bot = changed levels + rotating 50 per commit; full 200
  nightly CI.

## Milestone 3 — Wave-1 mechanics (cheap, provable, high variety)

Each ships as its own gated increment (rules law + view + game +
generator budget + unit + live + docs):

1. **Conveyor/current tiles** — pushes the cube one tile per beat.
2. **Pressure plate + door** — static puzzle element, zero timing.
3. **Delayed crumble** — trembles ~1 s after you step on it, then breaks
   (visible telegraph instead of break-on-leave).
4. **Sentinel-freeze shard** — pickup; stops an orb for 3 s (a resource
   against timing).
5. **Mid-act key & gate** — the lock leaves the finale and becomes a
   normal act element.
6. **Heavy block** — a pushed block breaks crumble slabs it lands on.
7. **Pulsing gap** — gap tile solid 2 s / void 2 s (slider-law
   extension).
8. **Proximity sentinel** — sleeps until the cube is within 3 tiles.
9. **Twin-platform shuttle** — two phase-offset platforms on one track;
   boarding becomes a decision.

## Milestone 4 — Bosses & themed acts

- One **boss level per act**: scripted orb gauntlet in a tight arena
  (the double-shuttle finale pattern generalises).
- **Themed worlds per act** (starfield, ink, paper sky, ice, sand…) —
  zero new rules, big "new game" feel.
- Story beat: 2–3 lines per act (the levels are the narrative).

## Milestone 5 — Retention layer

- **Weekly challenge** (seeded, local + shareable leaderboard, 14-day
  history — the daily pipeline already proves this pattern).
- **Secret collectible** — a companion cube (or golden prism) hidden
  ≥10 moves off-route; unlocks themes/skins.
- **Assist mode** — sentinel speed −25%, separate medal tier (the
  rescue's "flagged times" tier generalises into it).
- **Zen mode** (no timer/medal) and **sprint mode** (timer-only reruns).
- **Local leaderboards + share codes** (no backend).
- **Ghost upgrade** — "your best run" ghost alongside the fastest.

## Milestone 6 — Wave-2 exotic (one at a time, each its own gate)

1. **Twin cube** — linked second cube in mirror sync (state = two
   positions; still provable). The distinctive KUBIK hook.
2. **Time rewind** — 1–2 uses per level, one move back, full world
   state restored; doubles as a relief tool.
3. **Board rotation pivot** — touch a pivot, the whole map turns 90°.
4. **Direction flip** — a tile that inverts up/down for the next few
   rolls (VVVVVV-style reading trick).

## Milestone 7 — Packaging revisit

PWA manifest + real-app decision, revisited at 200 levels (the
one-time-purchase price point changes with content depth).

## Order & dependencies

M1 → M2 (the skeleton hangs the rest off) → M3 (each mechanic) → M4 →
M5 → M6 (exotic, one per increment) → M7. **M1 is done** (it was first:
smallest scope, biggest retention win, and it extended the fairness
gate in the direction the 200-level era needs — the bench is provable
too). **Next: M2** — the 200-level skeleton (acts, difficulty curve,
level-generator scaffolding), which the rest hangs off.

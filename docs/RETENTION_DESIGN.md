# Rope Untangle — Game Design & Retention Playbook

Ideas for engagement, monetization and long-term retention, scoped from
quick wins to bigger systems. Items marked **[built]** already exist in the
codebase; the rest are proposals.

## 1. Core loop & progression

- **[built] 100 levels in 10 difficulty tiers** — ropes grow from 3 → 10,
  twists from ~3 → 38, slots from 8 → 24.
- **[built] 13 board shapes** (circle, oval, square, rounded square, triangle,
  diamond, pentagon, hexagon, 5/6-point stars, heart, arrow, cross) keep each
  tier visually fresh; shapes are sampled as even arc-length polylines, so new
  shapes only need a vertex list.
- **[built] Star ratings (1–3)** based on moves vs. par, persisted per level.
- **[built] Level-select map** with tier grouping, lock progression and star
  totals — visible goals drive completionism.
- Suggested: **3-star replay prompts** — after finishing with <3 stars, show
  "3 stars possible in N fewer moves" and a one-tap replay.
- Suggested: **world map** instead of a list, with the wooden/linen art theme
  and a winding thread connecting cleared nodes.

## 2. Novelty mechanics (high impact, medium effort)

1. **Locked/colored pegs** — a peg can only land in a hole of its own color;
   forces planning instead of free moves.
2. **Fragile rope** — cannot be moved more than X times; adds resource
   management and raises tension.
3. **Knots (true 3D over/under)** — extend the existing weave renderer so a
   crossing can be *toggled*: tap a twist to flip which rope is over. Untangle
   then becomes a topology puzzle as well as a placement puzzle.
4. **Move limit mode** — par becomes a hard limit with fail/retry; great for
   daily-challenge-style pressure.
5. **Obstacle holes / blocked slots** — some holes are nailed shut and must be
   routed around.
6. **Multiple boards per level** — solve two mini-boards; the second unlocks
   only after the first is clean.
7. **Rope slack physics** — strands sag with a quadratic curve when far apart;
   purely visual at first, later collisions can count only when sag is tight.
8. **Golden thread level** — one rope must never be the "under" rope at any
   crossing; teaches the weave system explicitly.

## 3. Retention systems

- **Daily puzzle** — deterministic level from the date (`seed = yyyymmdd`),
  same for every player, with a global leaderboard of fewest moves. Drives a
  daily habit; push notification "Today's weave is ready".
- **Streaks** — consecutive days with at least one solved level; escalating
  rewards (themes, hint credits). Streak loss is a strong return trigger.
- **Hint economy** — start with 5 hints; earn one per 3-star level and via
  rewarded video. Creates soft-currency sinks without blocking skill players.
- **Collections** — finish a shape's tier set to unlock a new board *material*
  (dark walnut, marble, brass, chalkboard) or rope dye (indigo, terracotta…).
- **Seasons / events** — 2-week themed packs (e.g. "Winter Loom", heart boards
  for Valentine's) reusing the generator with new palettes and shapes.
- **Undo tickets / unlimited-undo IAP** alongside a one-time "remove ads"
  purchase — casual-friendly monetization that never gates the core puzzle.

## 4. Engagement & social

- **Share card** — render the solved board to an image with the level number,
  stars and time; one-tap share to stories. Free acquisition channel.
- **Ghost race** — replay of a friend's/developer's move sequence shown as
  semi-transparent pegs; beat their move count.
- **Level editor** — players place ropes on any shape; levels get share codes
  (the slot array already serializes to a compact string). UGC can supply
  effectively infinite content.
- **Achievements** — "First 100 twists untangled", "No-hint run", "All heart
  boards 3-starred", "Speed weaver (under 30 s)".
- **Tutorialization** — first 3 levels as scripted hands-on lessons: tap peg,
  tap hole, use a hint, then free play. Lowers drop-off for non-gamers.

## 5. Feel & polish (cheap, do early)

- **Haptics** (mobile): light tick on select, soft thud on drop, success
  buzz on solve — HapticFeedback calls alongside the existing sound service.
- **Confetti of cotton fibers** on win, matching the textile theme.
- **Settings**: sound/haptics toggles, reduce-motion option, color-blind-safe
  rope palette (patterns already differ via twist shading; add glyph tags).
- **Offline-first**: all progress local; optional cloud sync later.
- **Tablet & foldable layout**: board centered, controls as a side rail on
  wide screens (the ConstrainedBox already caps width at 540/620 px).

## 6. Analytics worth instrumenting

- Funnel: install → tutorial complete → level 5 → day-1 return.
- Level-level: attempts, solve rate, median moves/par, hint usage, quit points.
- Hint failure: if BFS ever falls back to greedy, log the level id — direct
  signal that a level is too hard or the search depth needs tuning.
- Retention: D1/D7/D30, streak distribution, daily-puzzle participation.

## Suggested next build order

1. Haptics + win confetti + settings (one short iteration, big feel upgrade).
2. Daily puzzle + streaks (retention backbone).
3. Hint economy + rewarded video (monetization without blocking).
4. Knot-toggle mechanic (differentiator; renderer already supports over/under).
5. Level editor + share codes (UGC growth loop).

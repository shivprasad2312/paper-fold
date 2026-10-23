# 🧶 Rope Untangle

A cozy, canvas-rendered rope-untangling puzzle inspired by the wooden-ring
mobile puzzle (peg-and-rope board on embroidered linen).

Tap a wooden **peg** to lift it, then tap an **empty hole** to drop it there.
Move pegs around the board until **no two ropes cross** to win. Ropes are
rendered as realistic 3-ply twisted cotton cord, and at every crossing one rope
visually passes **over** the other, so tangles read as real weaving.

## Content

- **100 hand-generated levels in 10 difficulty tiers** (3 → 10 ropes, ~3 → 38
  twists), every one verified solvable through the in-game hint policy
- **13 board shapes**: circle, oval, square, rounded square, triangle,
  diamond, pentagon, hexagon, 5/6-point stars, heart, arrow and cross —
  pegs are sampled evenly along each shape's perimeter
- Star ratings (1–3 vs. par), per-level progress saved in localStorage, and a
  tier-grouped level-select map with lock progression
- BFS-powered hints that always find progress (escaping local minima), undo,
  restart, prev/next, mute
- Wooden shape frames, realistic twisted ropes with fuzz/fibers/sheen,
  over/under weave bridges, glossy pegs and recessed holes via Canvas 2D
- WebAudio sound effects (no audio files), mobile-first responsive layout

See [`docs/RETENTION_DESIGN.md`](docs/RETENTION_DESIGN.md) for the full game
design and retention roadmap (daily puzzle, streaks, knot-toggle mechanic,
level editor, monetization…).

## How to play

1. **Tap a peg** — it lifts with a golden ring and empty holes glow.
2. **Tap an empty hole** — the peg flies there (animated), ropes follow.
3. Keep going until the **Twists** counter reaches `0`.
4. Stuck? **💡 Hint** marks the peg and target hole (green crosshair).

## Tech stack

React 18 + TypeScript + Vite, HTML5 Canvas rendering, plain CSS.
Flutter port: Dart + CustomPainter + audioplayers (in `flutter_app/`,
same 100 levels — generated from one source into both languages).

## Project structure

```
src/
  game/
    shapes.ts        # 13 shape polylines + even arc-length slot sampling
    engine-core.ts   # pure logic: crossings, weave assignment, BFS hints
    engine.ts        # data-driven level construction
    levels.data.ts   # 100 generated levels (auto-generated)
    render.ts        # canvas renderer: shape frames, ropes, pegs, weave
    progress.ts      # localStorage stars/unlocks
    sound.ts         # WebAudio blips
  components/
    LevelSelect.tsx  # tier-grouped level map
  App.tsx            # game state, input, HUD and win overlay
scripts/
  gen-levels-v2.ts   # the level generator; emits TS AND Dart level data
  verify.ts          # verifies all 100 levels (npm test)
  render-shot.ts     # headless board renderer for visual QA
flutter_app/         # full Flutter/Dart port (see its README)
docs/
  RETENTION_DESIGN.md
```

## Scripts

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and production build
npm test          # verify all 100 levels are valid and solvable
npm run levels    # regenerate level data (TS + Dart) from the generator
npm run shot      # render a board to scripts/shot-*.png for visual QA
```

## Level generation

`scripts/gen-levels-v2.ts` builds each puzzle from a verified non-crossing
matching of pegs on the shape perimeter, then runs a biased random walk that
prefers crossing-creating moves. A candidate is accepted only when it exceeds
the tier's minimum twist count and is re-solvable via the same hint policy the
games use. The generator emits both `src/game/levels.data.ts` and
`flutter_app/lib/game/levels.data.dart`, guaranteeing the web and Flutter
apps always play identical puzzles.

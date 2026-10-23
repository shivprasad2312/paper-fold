# 🧶 Rope Untangle

A cozy, canvas-rendered rope-untangling puzzle inspired by the wooden-ring
mobile puzzle (peg-and-rope board on embroidered linen).

Tap a wooden **peg** to lift it, then tap an **empty hole** to drop it there.
Each move shifts one peg around the ring. Untangle every rope so that **no two
ropes cross** to win the level.

## How to play

1. **Tap a peg** — it lifts with a golden ring, and every empty hole glows.
2. **Tap an empty hole** — the peg flies there (animated) and both ropes follow.
3. Keep moving pegs until the **Crossings** counter reaches `0`.
4. Stuck? Use **💡 Hint** — a green crosshair marks the target hole and the
   relevant peg pulses. **↩ Undo** rewinds your last move.
5. Solve within **par** moves to earn three stars.

## Features

- 5 hand-curated levels (3–7 ropes, 8–16 slots), each verified solvable with a
  known minimum depth
- Exact segment-intersection crossing detection on a circular board
- BFS-powered hint system that always finds progress (escapes local minima),
  with a greedy fallback
- Fully animated peg moves, pulsing selection/hint indicators, win celebration
- Wooden ring, twisted-fiber ropes and glossy pegs rendered with the Canvas 2D
  API — no image assets besides the linen background
- WebAudio sound effects (no audio files), with mute toggle
- Mobile-first responsive layout, pointer events for touch and mouse
- Undo, restart, level navigation, move/par/crossing stats and star ratings

## Tech stack

React 18 + TypeScript + Vite, HTML5 Canvas rendering, plain CSS.

## Project structure

```
src/
  game/
    engine.ts   # pure puzzle logic: levels, geometry, crossings, BFS hints
    render.ts   # canvas renderer: board, ropes, pegs, holes, animations
    sound.ts    # WebAudio blips (select / move / error / hint / win)
  App.tsx       # game state, input handling, HUD and win overlay
  styles.css
public/
  bg.jpg        # embroidered-linen background texture
scripts/
  verify.ts       # engine test suite (`npm test`)
  gen-levels.ts   # offline BFS curator that produced CURATED_STARTS
  render-shot.ts  # headless board renderer for visual QA (`npm run shot`)
```

## Scripts

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and production build
npm test         # verify every level is valid and solvable
npm run shot     # render a board to scripts/shot-*.png for visual QA
npm run levels   # regenerate curated starting layouts
```

## Level design

Starting layouts are generated offline (`scripts/gen-levels.ts`) by random
walks from a known non-crossing solution, then filtered with a breadth-first
search so each level has a guaranteed minimum solution depth and a healthy
number of crossings. The accepted layouts are stored as
`CURATED_STARTS` in `src/game/engine.ts`, making gameplay deterministic while
keeping the generator reproducible.

## Roadmap ideas

- More levels and a progression/save system (localStorage)
- Haptic feedback and a mobile (Expo) port
- Rope slack/physics curves instead of straight strands
- Daily challenge and timed modes

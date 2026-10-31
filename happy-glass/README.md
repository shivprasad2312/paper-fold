# Happy Glass — clone

A clean-room, browser-based clone of the *mechanics* of Happy Glass: draw a line
with a limited ink budget, the water falls forever, get enough of it into the glass.

No code, art, audio or level layouts from Lion Studios' game are used. The
mechanics are reimplemented from how the game plays; the ten levels are mine.

```
open http://localhost:8000      # or: python3 -m http.server -d happy-glass 8000
```

## How it plays

- **Drag** to draw. The line is wet while your finger is down and hardens into a
  solid surface the moment you release.
- Ink is a *length* budget, not a number of strokes — a long lazy arc costs more
  than two short ones.
- The pipe never runs dry. Water is recycled from the bottom of the field back up
  to the mouth, so you can take your time and experiment.
- The glass has a dashed fill line. Reach it and the face goes from a frown to a
  smile.

## How it is built

| file | what it is |
| --- | --- |
| `engine.js` | physics only — particles, capsule colliders, glass, fill scoring. No DOM, so it runs headless. |
| `levels.js` | ten hand-authored levels: pipe position, glass box, obstacles, ink budget. |
| `game.js` | canvas renderer, pointer input, level flow. |
| `index.html` | shell and HUD. |

Water is ~210 soft circular particles: gravity, positional separation against
neighbours through a spatial hash, and capsule collisions against ink, glass and
obstacles. That is enough to make it pool, slosh and stack like a liquid without a
full fluid solver. The renderer pushes the particle field through a
`blur + contrast` filter, which fuses the circles into a single blobby surface.

Victory is measured, not scripted: the water height inside the glass is estimated
from how many particles it holds (`count × (2r)² / innerWidth`) and compared with
the level's fill line, so it stays honest if the physics changes.

## Checks

```bash
node happy-glass/smoke-test.mjs    # loads the game against a stub DOM, runs the loop
node happy-glass/sim-solve.mjs     # tries ramps on every level, reports the best fill
```

`sim-solve` is the useful one: it proves each level is reachable before a player
ever sees it. Current status: all ten levels clear.

## Deliberate differences from the original

- Multiple strokes are allowed until the ink runs out (the original commits you
  to one continuous line).
- No stars, hints, coins or ads — just the puzzle loop.
- Levels are generated layouts of my own, tuned by simulation rather than playtest.

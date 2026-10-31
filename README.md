# paper-fold

A clean-room, playable clone of **Happy Glass** — draw one line on a limited ink
budget, the water falls forever, get enough of it into the glass.

Ten hand-authored levels, custom particle physics (no engine, no libraries), and a
headless solver that proves every level is reachable before a player sees it.

```bash
python3 -m http.server -d happy-glass 8000   # then open http://localhost:8000
node happy-glass/smoke-test.mjs              # loads the game against a stub DOM
node happy-glass/sim-solve.mjs               # per-level solvability report
```

Nothing here contains code, art, audio or level layouts from the original game.
See [happy-glass/README.md](happy-glass/README.md) for how it works.

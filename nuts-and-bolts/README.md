# Nuts & Bolts — Sort Puzzle (original clone)

A from-scratch browser implementation of the "nuts and bolts screw sorting" mechanic:
tap a bolt to lift its top nut, tap another bolt to drop it there (only onto an
empty bolt or onto a matching top nut, with room left). Sort every bolt so each
holds four nuts of one colour.

This is an original implementation of the game mechanic. It does not reuse the
original game's code, art, sounds, or level data.

## Run

No build step. Open `index.html` in a browser, or serve the folder:

    python3 -m http.server 8000 --bind 0.0.0.0   # then open http://localhost:8000/nuts-and-bolts/

## Test

    node nuts-and-bolts/test.js

Tests cover move rules, win detection, the solver, and that every generated level
is solvable and reproducible from its seed.

## Files

- `logic.js` — pure game rules, DFS solver, seeded level generator (no DOM).
- `index.html` — UI, CSS-drawn art, undo/restart/next, progress saved in localStorage.
- `test.js` — Node test suite.

## Ideas to extend

- Hints using `NutsLogic.solve`
- Move "stacks" of same-colour nuts in one tap
- Extra bolts with obstacles, timed mode, sound effects

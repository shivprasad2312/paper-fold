# Screw Puzzle (original clone of the screw-and-slide puzzle mechanic)

Wooden pieces are fixed to the board with screws. Unscrew them, then slide each
free piece off the board. A piece can only leave when its path to the edge is
clear. Clear the whole board to finish the level.

This is an original implementation. It uses its own colours, shapes, and CSS
art, and does not reuse any code, images, or level data from the original game.

## Run

    python3 -m http.server 8000 --bind 0.0.0.0   # then open /screw-puzzle/

## Test

    node screw-puzzle/test.js

## Files

- `logic.js`: rules (unscrew, slide, solvability check) and seeded level generator. No DOM.
- `index.html`: UI with timer, undo, restart, skip, and win screen. Progress saved in localStorage.
- `test.js`: Node test suite.

## How levels are guaranteed solvable

Screws can always be removed, so a level is solvable exactly when its pieces can
be slid off one at a time. The generator places random pieces, checks that greedy
removal clears the board, and only then adds screws. Removing a piece never blocks
another piece, so greedy removal is complete.

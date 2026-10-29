# Screw Puzzle (physics, original implementation)

A physics-based screw puzzle. Planks are held on the board by screws. Remove
screws and the planks swing, slide, or fall off the board. Clear every plank
to win.

This is an original implementation. It uses its own layouts, colours, and
drawn art, and does not reuse any code, images, or level data from the
original game.

## Controls

- Tap a screw in a plank: it is unscrewed and goes into a tray slot. The tray
  has a fixed number of slots, so you may have to park screws first.
- Tap a loose screw (in the tray or an open hole) to pick it up, then tap an
  empty hole to park it there. If a plank covers that hole, the screw pins the
  plank again.
- Clear every plank off the board to win.

## Run

    python3 -m http.server 8000 --bind 0.0.0.0   # then open /screw-puzzle/

## Test

    node screw-puzzle/test.js

The test runs the real Matter.js physics for each level and checks that the
scripted solution clears the board.

## Files

- `game.js`: physics core (pins, holes, tray, win check). No DOM. Works in the
  browser and in Node.
- `levels.js`: hand-designed levels.
- `index.html`: canvas UI.
- `vendor/matter.min.js`: Matter.js 0.19.0 (MIT, see `vendor/matter-js.LICENSE`).
- `test.js`: headless solution tests.

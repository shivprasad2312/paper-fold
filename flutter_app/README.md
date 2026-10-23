# 🧶 Rope Untangle — Flutter app

The Flutter port of the Rope Untangle puzzle, sharing the exact game design,
artwork, background image, sound effects and curated levels with the web build
in the repository root.

Tap a wooden **peg** to lift it, then tap an **empty hole** to drop it there.
Move pegs around the ring until **no two ropes cross** to win.

## First-time setup

This repository contains the app sources, assets and tests but no
SDK-generated platform folders (they can't be checked in portably). Generate
them once with the Flutter SDK installed:

```bash
cd flutter_app
flutter create .                 # adds android/ ios/ web/ ... around the existing app
flutter pub get
flutter run                      # pick a device / emulator / Chrome
```

`flutter create .` keeps every existing file; it only fills in missing
platform scaffolding.

## Commands

```bash
flutter test                     # engine test suite (all levels solvable, etc.)
flutter analyze                  # static analysis
flutter run                      # run on a connected device
flutter build apk                # Android
flutter build ios                # iOS (macOS only)
flutter build web                # web
```

Without a Flutter SDK, `node tool/check_syntax.cjs` runs a string/comment-aware
bracket-balance check over every Dart file (used during CI-less development).

## Re-generating the sound assets

The five WAV effects are committed under `assets/sounds/`. To regenerate them
(no dependencies beyond Python 3):

```bash
python3 tool/generate_sounds.py
```

## Project structure

```
lib/
  main.dart                  # MaterialApp entry point
  screens/game_screen.dart   # game state, input, animations, layout
  game/
    engine.dart              # pure puzzle logic: levels, crossings, BFS hints
    board_painter.dart       # CustomPainter: wooden ring, ropes, pegs, holes
    sound_service.dart       # audioplayers wrapper for the WAV effects
  widgets/
    hud.dart                 # level title, stats, mute, level dots
    wood_button.dart         # reusable wooden 3D button
    win_overlay.dart         # solved card with star rating
assets/
  images/bg.jpg              # embroidered-linen background (shared with web)
  sounds/*.wav               # generated effects
test/
  engine_test.dart           # parity tests for the ported engine
tool/
  generate_sounds.py         # WAV generator (Python stdlib only)
```

## Notes on the port

- `engine.dart` is a line-by-line port of the web `src/game/engine.ts`,
  including the five BFS-verified `kCuratedStarts` layouts, so both builds play
  identically.
- The board is drawn with a single `CustomPainter` (`BoardPainter`) using
  radial gradients, even-odd annulus paths, dashed strands and mask filters —
  the Flutter equivalent of the HTML5 Canvas renderer.
- Peg movement runs on a 320 ms `AnimationController`; pulsing selection,
  hint and hole indicators run on a repeating controller, both merged into the
  painter's `repaint` listenable.
- Sounds use the `audioplayers` package with pre-generated WAV assets, matching
  the WebAudio tones of the web build.
- Mobile-first layout, pointer/touch input via `GestureDetector`, no remote
  fonts or runtime network dependencies.

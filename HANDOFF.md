# Agent Handoff — Paper Fold

_Last updated: 2026-10-24_

## Current project layout and intent

The repository has two independent app targets, intentionally separated by folder:

- **`mobile/`** — active Flutter isometric block-path puzzle. The user's Flutter requirements apply here: reference-inspired isometric platforms, light and dark themes, a theme switch, adjustable lighting, and playable routes.
- **`web/`** — preserved Vite/browser Fluffy Merge prototype. This is a separate legacy app, not the Flutter app or a web build of it.

Root-level `README.md` describes setup. This document gives agents the architecture, verification status, and continuation guidance. Keep both apps unless the user explicitly asks to remove one.

## Flutter app (`mobile/`)

### Architecture and behavior

- Entry point: `mobile/lib/main.dart`.
- `IsometricPathApp` state includes theme mode, lighting value, selected level, player position, level completion, and the status message.
- The theme switch toggles `MaterialApp.themeMode`. The lighting slider affects ambient glow, platform face brightness, highlights, and shadows in the custom painter.
- `PuzzleLevel` and `PathCell` describe three hard-coded routes. A cell has grid coordinates `(x, y)` and elevation `z`.
- `PuzzleLevel.nextIndexFrom` allows only a route cell at the requested neighboring grid coordinate, and rejects elevation changes greater than one block. Invalid moves keep the player in place and show a hint.
- The routes contain 7, 8, and 9 cells. Each finishes at a glowing exit. Completing a route shows replay and next-level actions.
- The level picker allows all three levels immediately. The Next action advances and wraps to the first level after the last; there is no unlock system.
- On-screen diagonal controls and keyboard arrows/WASD move the player; **R** resets the current level.
- Grid/control mapping: NW `(0, -1)`, NE `(1, 0)`, SE `(0, 1)`, SW `(-1, 0)`. Keyboard directions use the same mapping.
- `IsometricBoardPainter` draws the background, route, platform top and side faces, scenery blocks, start marker, goal, player cube, and lighting effects with Flutter Canvas APIs. The board does not rely on image assets.
- `LayoutBuilder` chooses a landscape/sidebar or portrait/stacked layout based on constraints.

### Flutter files

| Path | Role |
| --- | --- |
| `mobile/lib/main.dart` | UI, level data/logic, input, themes, lighting, custom painter |
| `mobile/test/puzzle_logic_test.dart` | Route adjacency, elevation, and invalid-move tests |
| `mobile/test/widget_test.dart` | Theme/lighting, keyboard/reset, and all-level completion flows |
| `mobile/pubspec.yaml` | Flutter package; Dart constraint `>=3.3.0 <4.0.0` |
| `mobile/analysis_options.yaml` | Flutter lint configuration |

### Flutter setup and verification

Requires Flutter 3.19+ / Dart 3.3+. Flutter platform folders have not been generated. From `mobile/`:

```bash
flutter create --platforms=android,ios,web .
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter run -d chrome
```

Generate platform scaffolding without overwriting the custom `mobile/lib/main.dart`. The current environment has no `flutter` or `dart` executable, so compilation, formatter, analyzer, widget tests, and device rendering are unverified.

Tests written so far:

- `mobile/test/puzzle_logic_test.dart`: every configured route step must be adjacent and change elevation by no more than one; a two-block jump, missing move, and invalid indices are rejected.
- `mobile/test/widget_test.dart`: theme switch, lighting slider, keyboard move/reset, completion of all three routes, and next-level reset.

Earlier static checks passed for balanced delimiters and route adjacency/elevation. Those checks are not a substitute for Flutter execution.

## Browser app (`web/`)

- Entry page: `web/index.html`.
- Vite source: `web/src/` (game, renderer, art, audio, fruit/content data, styles, and utilities).
- Static assets: `web/public/`.
- Node test suite: `web/tests/game.test.mjs`.
- DOM smoke test: `web/tools/dom-smoke.mjs`.
- Offscreen render helper: `web/tools/preview.mjs`.
- Dependencies/scripts: `web/package.json`, `web/package-lock.json`.
- Vite config: `web/vite.config.js`, bound to `0.0.0.0`, strict port 5173, and permissive preview hosts for the Arena proxy.

From `web/`:

```bash
npm ci
npm run dev       # port 5173
npm test
npm run build
npm run smoke
```

After the folder split, `npm test` passes 12/12 tests, `npm run build` succeeds, and `npm run smoke` completes with `ERRORS: none` when run from `web/`. `web/node_modules/` is present in this workspace but ignored; a fresh checkout should run `npm ci`.

## Root files

- `README.md` — top-level app separation and setup instructions.
- `HANDOFF.md` — this agent continuation guide.
- `.gitignore` — ignores Node dependencies/build output and generated Flutter files under `mobile/`.

## Recent work and limitations

- Flutter review added arrow/WASD controls and **R** reset, elevation-aware route movement, a static route validation, and broader widget tests.
- A missing delimiter around Flutter's keyboard `Focus` wrapper was fixed.
- Flutter tests have never run in this environment because Flutter/Dart are unavailable.
- Theme, lighting, level selection, and completion state are in-memory only; they reset after app restart. Persistence was not requested.
- There are only three hand-authored levels; there is no locked progression.
- Actual Flutter layout, render quality, accessibility, and keyboard focus behavior remain to be checked on a Flutter runtime/device.
- The browser prototype and Flutter app have separate dependencies and are not wired together.

## Git and current worktree

- Continue on `arena/34e88136-paper-fold`; do not switch or rename the branch. Arena reports this branch as `pr_open`.
- Before the folder separation, local `HEAD` was `8111f3b`, and most project files were untracked in this checkout. The current `mobile/` and `web/` project trees remain untracked in this snapshot; inspect `git status --short --branch` before staging or committing, and do not assume the index has a committed baseline for these files.
- The previous Vite process was stopped before moving the web project and restarted from working directory `web/` on port `5173`. The preview is currently running and bound to `0.0.0.0`.
- The folder reorganization itself has not been committed or pushed.

## Suggested next steps

1. Check Git status and confirm the top-level `mobile/` and `web/` split.
2. From `web/`, run `npm test`, `npm run build`, and `npm run smoke`; fix any path issues introduced by the move.
3. Restart the Vite preview from `web/` on port 5173 if requested.
4. When Flutter is available, generate platforms inside `mobile/`, then format, analyze, test, and run the Flutter app. Avoid touching the separate `web/` prototype while doing so.
5. Update this handoff and README if the structure, run commands, or verification status changes.

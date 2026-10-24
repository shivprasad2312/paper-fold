# Paper Fold

This repository now keeps its two app targets in separate folders:

- `mobile/` — the Flutter isometric block-path puzzle.
- `web/` — the preserved Vite/browser Fluffy Merge prototype.

The two projects have independent dependencies, entry points, and test commands. See [`HANDOFF.md`](HANDOFF.md) for the implementation map, current verification status, and agent continuation notes.

## Mobile app (Flutter)

The Flutter entry point is `mobile/lib/main.dart`. It draws an isometric block puzzle with three playable routes, light and dark themes, an interactive theme switch, adjustable lighting, on-screen diagonal controls, arrow/WASD movement, and **R** to reset.

Requires Flutter 3.19 or newer (Dart 3.3+). Platform scaffolding has not yet been generated. From the Flutter project directory:

```bash
cd mobile
flutter create --platforms=android,ios,web .
flutter pub get
flutter run -d chrome
flutter test
```

The Flutter SDK is not installed in the current workspace, so the app has not yet been compiled or run here. When generating platforms, keep the custom `mobile/lib/main.dart` entry point intact.

## Web app (Vite)

The browser prototype is self-contained in `web/`. From that directory:

```bash
cd web
npm ci
npm run dev
```

Vite serves the web app on port `5173`. Other scripts are:

```bash
npm test
npm run build
npm run smoke
```

## Project map

```text
mobile/  Flutter app, Dart tests, pubspec.yaml, Flutter lint config
web/     Vite app, package.json/lock, browser source, assets, tests, tooling
README.md
HANDOFF.md
.gitignore
```

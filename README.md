# Isometric Path

A Flutter puzzle game inspired by the supplied block-world references. It uses a
hand-painted isometric renderer: stacked white platforms, deep gaps, a bright
player cube, readable route cues, and a glowing exit. Three short routes are
playable with diagonal movement controls.

## Flutter app

The Flutter entry point is `lib/main.dart`. It includes a live light/dark theme
switch and an adjustable lighting control that changes ambient glow, highlights,
face brightness, and shadows without changing the puzzle layout.

Flutter is not installed in this workspace, so platform scaffolding and runtime
validation have not been generated here. With Flutter 3.3 or newer installed:

```bash
flutter create --platforms=android,ios,web .
flutter pub get
flutter run -d chrome
flutter test
```

## Game design notes

- **Isometric geometry:** each platform is drawn as a top diamond with two
  shaded side faces; raised scenery blocks create depth and negative space.
- **Readable puzzles:** the player can move only between adjacent route tiles.
  Each level has a start marker, an exit marker, a reset, and a level picker.
- **Lighting as a control:** the slider changes scene illumination in real time;
  higher values lift the faces and add more ambient glow.
- **Two palettes:** light mode uses a misty slate world; dark mode keeps the void
  deep and shifts the platforms to cool, luminous whites.
- **Responsive layout:** controls move beside the board in landscape and remain
  below it in portrait.

## Tests

`test/puzzle_logic_test.dart` covers route adjacency and invalid movement.
`test/widget_test.dart` covers theme switching and a valid move. Run them with
`flutter test` after installing Flutter.

## Legacy browser prototype

The earlier Fluffy Merge web prototype remains under `src/` and can be run with
`npm install && npm run dev`.

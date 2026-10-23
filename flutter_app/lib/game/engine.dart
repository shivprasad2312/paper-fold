// ─────────────────────────────────────────────────────────────
// Level-facing engine: data-driven levels + pure core logic.
// Port of src/game/engine.ts.
// ─────────────────────────────────────────────────────────────

import 'dart:ui';

import 'engine_core.dart';
import 'levels.data.dart';
import 'shapes.dart';

export 'levels.data.dart';

export 'engine_core.dart' show Hint, Crossing, Slots, applyMove, countCrossings, findCrossings, findHint, isSolved, ropeEndpoints;
export 'shapes.dart' show ShapeKind, kShapeLabels, sampleSlots, shapePolyline, scalePolyline, kAllShapes;

class RopeDef {
  const RopeDef(this.a, this.b, this.color);
  final int a;
  final int b;
  final Color color;
}

class Level {
  const Level({required this.def, required this.ropes, required this.points, required this.start});
  final LevelData def;
  final List<RopeDef> ropes;
  final List<Offset> points;
  final Slots start;
}

final int kLevelCount = kLevelData.length;

Level buildLevel(int index) {
  final LevelData def = kLevelData[index];
  final List<Offset> points = sampleSlots(def.shape, def.total);
  final List<RopeDef> ropes = <RopeDef>[
    for (int i = 0; i < def.pairs.length; i++)
      RopeDef(def.pairs[i][0], def.pairs[i][1], def.palette[i]),
  ];
  return Level(def: def, ropes: ropes, points: points, start: List<int?>.from(def.start));
}

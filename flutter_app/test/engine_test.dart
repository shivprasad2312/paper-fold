// Engine verification across all 100 generated levels.
// Port of scripts/verify.ts. Run with: flutter test
import 'package:flutter_test/flutter_test.dart';
import 'package:rope_untangle/game/engine.dart';
import 'package:rope_untangle/game/engine_core.dart';
import 'package:rope_untangle/game/shapes.dart';

void main() {
  test('all 13 shapes are used across the level set', () {
    final Set<ShapeKind> used = <ShapeKind>{
      for (int i = 0; i < kLevelCount; i++) buildLevel(i).def.shape,
    };
    expect(used.length, greaterThanOrEqualTo(10));
    for (final ShapeKind shape in kAllShapes) {
      expect(used.contains(shape), isTrue, reason: 'shape $shape must appear');
    }
  });

  for (int i = 0; i < kLevelCount; i++) {
    final Level level = buildLevel(i);
    final int rc = level.ropes.length;
    final List<Offset> pts = level.points;

    group('Level ${i + 1} — ${level.def.name}', () {
      test('starts tangled with the right geometry and empty holes', () {
        expect(pts.length, level.def.total);
        expect(countCrossings(level.start, rc, pts), greaterThan(0));
        final int empties = level.start.where((int? s) => s == null).length;
        expect(empties, greaterThanOrEqualTo(2));
        final Set<int> used = <int>{
          for (final int? s in level.start)
            if (s != null) s,
        };
        expect(used.length, rc);
      });

      test('weave list matches the twist counter', () {
        expect(findCrossings(level.start, rc, pts).length,
            countCrossings(level.start, rc, pts));
      });

      test('reference solution is twist-free', () {
        final Slots solved = List<int?>.filled(level.def.total, null);
        for (int id = 0; id < level.def.pairs.length; id++) {
          solved[level.def.pairs[id][0]] = id;
          solved[level.def.pairs[id][1]] = id;
        }
        expect(isSolved(solved, rc, pts), isTrue);
      });

      test('is solvable via hints and ends with zero twists', () {
        Slots slots = List<int?>.from(level.start);
        int steps = 0;
        while (!isSolved(slots, rc, pts) && steps < 400) {
          final Hint? h = findHint(slots, rc, pts);
          expect(h, isNotNull, reason: 'hint must exist at step $steps');
          slots = applyMove(slots, h!.from, h.to);
          steps++;
        }
        expect(isSolved(slots, rc, pts), isTrue);
        expect(countCrossings(slots, rc, pts), 0);
      });

      test('rejects illegal moves as no-ops', () {
        final Slots fresh = List<int?>.from(level.start);
        final int emptySlot = fresh.indexWhere((int? s) => s == null);
        final int occupiedSlot = fresh.indexWhere((int? s) => s != null);
        expect(applyMove(fresh, emptySlot, occupiedSlot), same(fresh));
        expect(applyMove(fresh, occupiedSlot, occupiedSlot), same(fresh));
      });
    });
  }
}

// Engine verification — Flutter port of scripts/verify.ts.
// Run with: flutter test
import 'package:flutter_test/flutter_test.dart';
import 'package:rope_untangle/game/engine.dart';

void main() {
  for (int i = 0; i < kLevels.length; i++) {
    final Level level = buildLevel(i);
    final int rc = level.ropes.length;
    final int total = level.def.total;

    group('Level ${i + 1} — ${level.def.name}', () {
      test('starts tangled with the right number of empty holes', () {
        expect(countCrossings(level.start, rc, total), greaterThan(0));
        final int empties = level.start.where((int? s) => s == null).length;
        expect(empties, total - rc * 2);
      });

      test('every rope occupies exactly two pegs', () {
        final Set<int> used = <int>{
          for (final int? s in level.start)
            if (s != null) s,
        };
        expect(used.length, rc);
        for (int r = 0; r < rc; r++) {
          expect(ropeEndpoints(r, level.start), isNotNull);
        }
      });

      test('is solvable via hints and ends with zero crossings', () {
        Slots slots = List<int?>.from(level.start);
        int steps = 0;
        while (!isSolved(slots, rc, total) && steps < 100) {
          final Hint? h = findHint(slots, rc, total);
          expect(h, isNotNull, reason: 'hint must exist at step $steps');
          slots = applyMove(slots, h!.from, h.to);
          steps++;
        }
        expect(isSolved(slots, rc, total), isTrue);
        expect(countCrossings(slots, rc, total), 0);
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

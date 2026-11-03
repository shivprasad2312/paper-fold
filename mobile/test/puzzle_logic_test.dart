import 'package:flutter_test/flutter_test.dart';
import 'package:isometric_path/main.dart';

void main() {
  test('each level route moves one grid tile at a time', () {
    for (final level in puzzleLevels) {
      for (var i = 0; i < level.path.length - 1; i++) {
        final current = level.path[i];
        final next = level.path[i + 1];
        final dx = next.x - current.x;
        final dy = next.y - current.y;
        expect(dx.abs() + dy.abs(), 1, reason: '${level.name} step $i should be adjacent');
        expect((next.z - current.z).abs(), lessThanOrEqualTo(1), reason: '${level.name} step $i should not jump elevation');
        expect(level.nextIndexFrom(i, dx, dy), i + 1);
      }
    }
  });

  test('route rejects an elevation jump greater than one block', () {
    const level = PuzzleLevel(
      name: 'Test ramp',
      subtitle: '',
      path: [PathCell(0, 0), PathCell(1, 0, 2)],
      scenery: [],
    );
    expect(level.nextIndexFrom(0, 1, 0), isNull);
  });

  test('route rejects missing and out-of-range moves', () {
    final level = puzzleLevels.first;
    expect(level.nextIndexFrom(0, 0, -1), isNull);
    expect(level.nextIndexFrom(-1, 1, 0), isNull);
    expect(level.nextIndexFrom(level.path.length, -1, 0), isNull);
  });
}

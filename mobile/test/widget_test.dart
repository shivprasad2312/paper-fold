import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:isometric_path/main.dart';

void main() {
  testWidgets('theme and lighting controls respond', (tester) async {
    await tester.pumpWidget(const IsometricPathApp());
    expect(find.text('FIRST LIGHT'), findsOneWidget);
    expect(find.byTooltip('Switch to dark theme'), findsOneWidget);

    await tester.tap(find.byTooltip('Switch to dark theme'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Switch to light theme'), findsOneWidget);

    final before = tester.widget<Slider>(find.byType(Slider)).value;
    await tester.drag(find.byType(Slider), const Offset(60, 0));
    await tester.pumpAndSettle();
    final after = tester.widget<Slider>(find.byType(Slider)).value;
    expect(after, greaterThan(before));
  });

  testWidgets('keyboard movement and reset work', (tester) async {
    await tester.pumpWidget(const IsometricPathApp());
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
    await tester.pumpAndSettle();
    expect(find.text('1/6'), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.keyR);
    await tester.pumpAndSettle();
    expect(find.text('0/6'), findsOneWidget);
  });

  testWidgets('all three routes can be completed and the next level resets', (tester) async {
    await tester.pumpWidget(const IsometricPathApp());
    for (var levelIndex = 0; levelIndex < puzzleLevels.length; levelIndex++) {
      final level = puzzleLevels[levelIndex];
      for (var i = 0; i < level.path.length - 1; i++) {
        final current = level.path[i];
        final next = level.path[i + 1];
        final dx = next.x - current.x;
        final dy = next.y - current.y;
        final tooltip = switch ((dx, dy)) {
          (1, 0) => 'North east',
          (0, -1) => 'North west',
          (0, 1) => 'South east',
          (-1, 0) => 'South west',
          _ => throw StateError('Level ${level.name} contains a non-adjacent step'),
        };
        await tester.tap(find.byTooltip(tooltip));
        await tester.pumpAndSettle();
      }

      expect(find.text('Perfect path.'), findsOneWidget, reason: '${level.name} should clear');
      if (levelIndex < puzzleLevels.length - 1) {
        await tester.tap(find.text('Next level'));
        await tester.pumpAndSettle();
        expect(find.text('0/${puzzleLevels[levelIndex + 1].path.length - 1}'), findsOneWidget);
      }
    }
  });
}

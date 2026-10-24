import 'package:flutter_test/flutter_test.dart';
import 'package:isometric_path/main.dart';

void main() {
  testWidgets('theme switch and isometric path controls work', (tester) async {
    await tester.pumpWidget(const IsometricPathApp());
    expect(find.text('FIRST LIGHT'), findsOneWidget);
    expect(find.byTooltip('Switch to dark theme'), findsOneWidget);

    await tester.tap(find.byTooltip('Switch to dark theme'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Switch to light theme'), findsOneWidget);

    await tester.tap(find.byTooltip('North east'));
    await tester.pumpAndSettle();
    expect(find.text('1/6'), findsOneWidget);
  });
}

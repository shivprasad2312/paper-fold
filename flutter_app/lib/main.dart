import 'package:flutter/material.dart';

import 'game/progress_service.dart';
import 'screens/game_screen.dart';
import 'screens/level_select_screen.dart';

void main() {
  runApp(const RopeUntangleApp());
}

class RopeUntangleApp extends StatelessWidget {
  const RopeUntangleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rope Untangle',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFE6DCC6),
        fontFamily: 'Roboto',
      ),
      home: const _RootShell(),
    );
  }
}

class _RootShell extends StatefulWidget {
  const _RootShell();

  @override
  State<_RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<_RootShell> {
  final ProgressService _progress = ProgressService();
  Map<int, int> _stars = <int, int>{};
  int _levelId = 0;
  bool _showSelect = false;

  @override
  void initState() {
    super.initState();
    _progress.getStars().then((Map<int, int> s) {
      if (mounted) setState(() => _stars = s);
    });
  }

  Future<void> _onSolved(int levelId, int stars) async {
    final Map<int, int> updated = await _progress.saveStars(levelId, stars);
    if (mounted) setState(() => _stars = updated);
  }

  @override
  Widget build(BuildContext context) {
    if (_showSelect) {
      return LevelSelectScreen(
        stars: _stars,
        onPick: (int id) {
          setState(() {
            _levelId = id;
            _showSelect = false;
          });
        },
      );
    }
    return GameScreen(
      key: ValueKey<int>(_levelId),
      initialLevelId: _levelId,
      onOpenLevels: () => setState(() => _showSelect = true),
      onSolved: _onSolved,
    );
  }
}

import 'package:flutter/material.dart';

import '../game/board_painter.dart';
import '../game/engine.dart';
import '../game/engine_core.dart';

/// Small animated tangled board shown on the Home screen.
class HomeHero extends StatefulWidget {
  const HomeHero({super.key, this.size = 224});

  final double size;

  @override
  State<HomeHero> createState() => _HomeHeroState();
}

class _HomeHeroState extends State<HomeHero> with TickerProviderStateMixin {
  late final AnimationController _pulse;
  late final Level _level;

  @override
  void initState() {
    super.initState();
    // a nicely tangled circle board for the hero illustration
    _level = buildLevel(2);
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))
      ..repeat();
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: CustomPaint(
        painter: BoardPainter(
          shape: _level.def.shape,
          points: _level.points,
          slots: List<int?>.from(_level.start),
          ropes: _level.ropes,
          crossings: findCrossings(_level.start, _level.ropes.length, _level.points),
          selected: null,
          hint: null,
          move: null,
          won: false,
          pulse: _pulse.value,
          repaint: _pulse,
        ),
      ),
    );
  }
}

import 'dart:math' as math;

import 'package:flutter/material.dart';

void main() => runApp(const IsometricPathApp());

const _orange = Color(0xFFFFB84C);
const _mint = Color(0xFF75E884);
const _lime = Color(0xFFB7F66E);

class IsometricPathApp extends StatefulWidget {
  const IsometricPathApp({super.key});

  @override
  State<IsometricPathApp> createState() => _IsometricPathAppState();
}

class _IsometricPathAppState extends State<IsometricPathApp> {
  bool _dark = false;
  double _lighting = .76;
  int _levelIndex = 0;
  int _playerIndex = 0;
  bool _solved = false;
  String _message = 'Find the glowing exit. Tap the diagonal controls to move.';

  PuzzleLevel get _level => puzzleLevels[_levelIndex];

  ThemeData _theme(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: ColorScheme.fromSeed(
        seedColor: dark ? const Color(0xFFB8F56E) : const Color(0xFFFFB74E),
        brightness: brightness,
        surface: dark ? const Color(0xFF111722) : Colors.white,
      ),
      scaffoldBackgroundColor: dark ? const Color(0xFF080B11) : const Color(0xFFF1F4F8),
      fontFamily: 'Roboto',
    );
  }

  void _move(int dx, int dy) {
    if (_solved) return;
    final nextIndex = _level.nextIndexFrom(_playerIndex, dx, dy);
    if (nextIndex == null) {
      setState(() => _message = 'No platform that way. Look for the next lit tile.');
      return;
    }
    setState(() {
      _playerIndex = nextIndex;
      if (_playerIndex == _level.path.length - 1) {
        _solved = true;
        _message = 'Perfect landing! The path is yours.';
      } else {
        _message = 'Nice step · ${_level.path.length - 1 - _playerIndex} to the exit';
      }
    });
  }

  void _reset() {
    setState(() {
      _playerIndex = 0;
      _solved = false;
      _message = 'Find the glowing exit. Tap the diagonal controls to move.';
    });
  }

  void _selectLevel(int index) {
    setState(() {
      _levelIndex = index;
      _playerIndex = 0;
      _solved = false;
      _message = 'Find the glowing exit. Tap the diagonal controls to move.';
    });
  }

  void _nextLevel() => _selectLevel((_levelIndex + 1) % puzzleLevels.length);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: _theme(Brightness.light),
      darkTheme: _theme(Brightness.dark),
      themeMode: _dark ? ThemeMode.dark : ThemeMode.light,
      home: Builder(
        builder: (context) {
          final colors = Theme.of(context).colorScheme;
          return Scaffold(
            body: SafeArea(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final wide = constraints.maxWidth > constraints.maxHeight * 1.05;
                  final header = _buildHeader(context, colors);
                  final info = _buildLevelInfo(colors);
                  final board = _buildBoard(colors);
                  final controls = _buildControls(context, colors);
                  if (wide) {
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(22, 10, 22, 18),
                      child: Column(
                        children: [
                          header,
                          const SizedBox(height: 12),
                          Expanded(
                            child: Row(
                              children: [
                                Expanded(flex: 6, child: board),
                                const SizedBox(width: 20),
                                SizedBox(width: 300, child: Column(children: [info, const SizedBox(height: 12), Expanded(child: SingleChildScrollView(child: controls))])),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(16, 6, 16, 14),
                    child: Column(
                      children: [
                        header,
                        const SizedBox(height: 8),
                        info,
                        const SizedBox(height: 9),
                        Expanded(child: board),
                        const SizedBox(height: 9),
                        controls,
                      ],
                    ),
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context, ColorScheme colors) {
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            color: colors.primary.withOpacity(.12),
          ),
          child: CustomPaint(painter: const MiniCubePainter()),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('CUBE PATH', style: TextStyle(color: colors.onSurface, fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 1.4)),
              Text('ISOMETRIC PUZZLE', style: TextStyle(color: colors.onSurface.withOpacity(.52), fontSize: 8, fontWeight: FontWeight.w800, letterSpacing: 1.7)),
            ],
          ),
        ),
        PopupMenuButton<int>(
          tooltip: 'Choose a level',
          initialValue: _levelIndex,
          onSelected: _selectLevel,
          itemBuilder: (context) => [
            for (var i = 0; i < puzzleLevels.length; i++)
              PopupMenuItem(value: i, child: Text('Level ${i + 1} · ${puzzleLevels[i].name}')),
          ],
          child: _HeaderButton(icon: Icons.grid_view_rounded, label: 'LEVEL ${(_levelIndex + 1).toString().padLeft(2, '0')}'),
        ),
        const SizedBox(width: 7),
        Tooltip(
          message: _dark ? 'Switch to light theme' : 'Switch to dark theme',
          child: Material(
            color: colors.surface,
            borderRadius: BorderRadius.circular(13),
            child: InkWell(
              onTap: () => setState(() => _dark = !_dark),
              borderRadius: BorderRadius.circular(13),
              child: SizedBox(width: 43, height: 43, child: Icon(_dark ? Icons.dark_mode_rounded : Icons.light_mode_rounded, size: 19, color: colors.primary)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLevelInfo(ColorScheme colors) {
    final completed = _solved;
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_level.name.toUpperCase(), style: TextStyle(color: colors.onSurface, fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 1.1)),
              const SizedBox(height: 2),
              Text(_level.subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: colors.onSurface.withOpacity(.55), fontSize: 10, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
        _StatPill(icon: completed ? Icons.check_circle_rounded : Icons.route_rounded, text: completed ? 'CLEARED' : '${_playerIndex}/${_level.path.length - 1}'),
      ],
    );
  }

  Widget _buildBoard(ColorScheme colors) {
    return Container(
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(27),
        border: Border.all(color: colors.onSurface.withOpacity(_dark ? .1 : .08)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(_dark ? .22 : .08), blurRadius: 24, offset: const Offset(0, 12))],
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: IsometricBoardPainter(level: _level, playerIndex: _playerIndex, dark: _dark, lighting: _lighting, solved: _solved),
            ),
          ),
          Positioned(
            top: 13,
            left: 14,
            child: _GlassChip(icon: Icons.lightbulb_outline_rounded, label: 'LIGHT ${(_lighting * 100).round()}%'),
          ),
          Positioned(
            top: 13,
            right: 14,
            child: _GlassChip(icon: Icons.flag_rounded, label: '${_level.path.length - 1 - _playerIndex} STEPS'),
          ),
          if (_solved)
            Positioned.fill(
              child: Center(
                child: _WinBadge(onNext: _nextLevel, onReplay: _reset),
              ),
            ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 12,
            child: Text(_message, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
              style: TextStyle(color: _dark ? Colors.white.withOpacity(.74) : const Color(0xFF344257).withOpacity(.75), fontSize: 10, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildControls(BuildContext context, ColorScheme colors) {
    final accent = _dark ? _lime : const Color(0xFF3D8C59);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(13, 8, 13, 7),
          decoration: BoxDecoration(color: colors.surface, borderRadius: BorderRadius.circular(17), border: Border.all(color: colors.onSurface.withOpacity(.07))),
          child: Row(
            children: [
              Icon(Icons.wb_sunny_rounded, size: 16, color: accent),
              const SizedBox(width: 8),
              Text('LIGHTING', style: TextStyle(color: colors.onSurface.withOpacity(.58), fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1)),
              Expanded(
                child: SliderTheme(
                  data: SliderTheme.of(context).copyWith(trackHeight: 3, thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7), overlayShape: const RoundSliderOverlayShape(overlayRadius: 14), activeTrackColor: accent, inactiveTrackColor: colors.onSurface.withOpacity(.1), thumbColor: accent),
                  child: Slider(value: _lighting, min: .15, max: 1, onChanged: (value) => setState(() => _lighting = value)),
                ),
              ),
              Text('${(_lighting * 100).round()}%', style: TextStyle(color: colors.onSurface, fontSize: 10, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
        const SizedBox(height: 7),
        Row(
          children: [
            Expanded(child: Text('MOVE', style: TextStyle(color: colors.onSurface.withOpacity(.42), fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1.5))),
            _IconAction(icon: Icons.refresh_rounded, label: 'Reset', onTap: _reset),
            const SizedBox(width: 6),
            _IconAction(icon: Icons.skip_next_rounded, label: 'Next', onTap: _nextLevel),
          ],
        ),
        const SizedBox(height: 1),
        SizedBox(
          height: 102,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Positioned(top: 0, left: 40, child: _MoveButton(icon: Icons.north_west_rounded, tooltip: 'North west', onTap: () => _move(0, -1), colors: colors)),
              Positioned(top: 0, right: 40, child: _MoveButton(icon: Icons.north_east_rounded, tooltip: 'North east', onTap: () => _move(1, 0), colors: colors)),
              Positioned(bottom: 0, right: 40, child: _MoveButton(icon: Icons.south_east_rounded, tooltip: 'South east', onTap: () => _move(0, 1), colors: colors)),
              Positioned(left: 40, bottom: 0, child: _MoveButton(icon: Icons.south_west_rounded, tooltip: 'South west', onTap: () => _move(-1, 0), colors: colors)),
              Container(width: 36, height: 36, decoration: BoxDecoration(shape: BoxShape.circle, color: colors.surface, border: Border.all(color: colors.onSurface.withOpacity(.08))), child: Icon(Icons.control_camera_rounded, size: 16, color: colors.onSurface.withOpacity(.38))),
            ],
          ),
        ),
      ],
    );
  }
}

class PathCell {
  const PathCell(this.x, this.y, [this.z = 0]);
  final int x;
  final int y;
  final int z;
}

class PuzzleLevel {
  const PuzzleLevel({required this.name, required this.subtitle, required this.path, required this.scenery});
  final String name;
  final String subtitle;
  final List<PathCell> path;
  final List<PathCell> scenery;

  int? nextIndexFrom(int currentIndex, int dx, int dy) {
    if (currentIndex < 0 || currentIndex >= path.length) return null;
    final current = path[currentIndex];
    for (var i = 0; i < path.length; i++) {
      final cell = path[i];
      if (cell.x == current.x + dx && cell.y == current.y + dy) return i;
    }
    return null;
  }
}

const puzzleLevels = <PuzzleLevel>[
  PuzzleLevel(
    name: 'First Light',
    subtitle: 'A quiet first step through the void',
    path: [PathCell(0, 3), PathCell(1, 3), PathCell(1, 2), PathCell(2, 2), PathCell(3, 2), PathCell(3, 1), PathCell(4, 1)],
    scenery: [PathCell(0, 1, 1), PathCell(1, 0, 2), PathCell(3, 0, 1), PathCell(4, 3, 1), PathCell(5, 2, 2)],
  ),
  PuzzleLevel(
    name: 'Green Signal',
    subtitle: 'Follow the soft green edge lights',
    path: [PathCell(0, 2), PathCell(0, 3), PathCell(1, 3), PathCell(2, 3), PathCell(2, 2), PathCell(3, 2), PathCell(4, 2), PathCell(4, 1)],
    scenery: [PathCell(0, 0, 2), PathCell(1, 1, 1), PathCell(3, 0, 2), PathCell(5, 1, 1), PathCell(5, 3, 2)],
  ),
  PuzzleLevel(
    name: 'Split Horizon',
    subtitle: 'A longer route with a higher landing',
    path: [PathCell(0, 4), PathCell(1, 4), PathCell(2, 4), PathCell(2, 3), PathCell(3, 3), PathCell(3, 2), PathCell(4, 2), PathCell(5, 2), PathCell(5, 1)],
    scenery: [PathCell(0, 1, 2), PathCell(1, 2, 1), PathCell(2, 0, 2), PathCell(4, 0, 1), PathCell(5, 4, 2)],
  ),
];

class IsometricBoardPainter extends CustomPainter {
  const IsometricBoardPainter({required this.level, required this.playerIndex, required this.dark, required this.lighting, required this.solved});
  final PuzzleLevel level;
  final int playerIndex;
  final bool dark;
  final double lighting;
  final bool solved;

  @override
  void paint(Canvas canvas, Size size) {
    final background = dark ? const Color(0xFF080B11) : const Color(0xFFE9EEF4);
    canvas.drawRect(Offset.zero & size, Paint()..shader = RadialGradient(
      center: const Alignment(-.2, -.5), radius: 1.2,
      colors: dark ? [const Color(0xFF1A2532), background] : [Colors.white, background],
    ).createShader(Offset.zero & size));

    final speck = Paint()..color = (dark ? Colors.white : const Color(0xFF8491A0)).withOpacity(.08 + lighting * .08);
    for (var i = 0; i < 26; i++) {
      final x = (i * 71.3 + 19) % size.width;
      final y = (i * 43.7 + 31) % size.height;
      canvas.drawCircle(Offset(x, y), i % 4 == 0 ? 1.2 : .7, speck);
    }

    const rawW = 62.0, rawH = 31.0, rawBlock = 25.0;
    final cells = [...level.path, ...level.scenery];
    Offset raw(PathCell c) => Offset((c.x - c.y) * rawW / 2, (c.x + c.y) * rawH / 2 - c.z * rawBlock);
    final points = cells.map(raw).toList();
    final minX = points.map((p) => p.dx - rawW / 2).reduce((a, b) => a < b ? a : b);
    final maxX = points.map((p) => p.dx + rawW / 2).reduce((a, b) => a > b ? a : b);
    final minY = points.map((p) => p.dy - rawH / 2 - rawBlock).reduce((a, b) => a < b ? a : b);
    final maxY = points.map((p) => p.dy + rawH / 2 + rawBlock).reduce((a, b) => a > b ? a : b);
    final scale = math.min((size.width - 46) / (maxX - minX), (size.height - 68) / (maxY - minY)).clamp(.55, 1.45).toDouble();
    final tw = rawW * scale, th = rawH * scale, bh = rawBlock * scale;
    final offset = Offset(size.width / 2 - (minX + maxX) * scale / 2, size.height / 2 - (minY + maxY) * scale / 2 + 9);
    Offset center(PathCell c) => offset + raw(c) * scale;

    final ordered = <({PathCell cell, bool walkable, int index})>[];
    for (var i = 0; i < level.path.length; i++) {
      ordered.add((cell: level.path[i], walkable: true, index: i));
    }
    for (var i = 0; i < level.scenery.length; i++) {
      ordered.add((cell: level.scenery[i], walkable: false, index: i));
    }
    ordered.sort((a, b) => (a.cell.x + a.cell.y).compareTo(b.cell.x + b.cell.y));

    // A soft light cone makes the lighting control visibly affect the scene.
    final glow = Paint()
      ..shader = RadialGradient(colors: [
        (dark ? const Color(0xFFB8F56E) : const Color(0xFFFFC56E)).withOpacity(.04 + lighting * .14),
        Colors.transparent,
      ]).createShader(Rect.fromCircle(center: Offset(size.width * .53, size.height * .5), radius: size.width * .7));
    canvas.drawRect(Offset.zero & size, glow);

    // A faint route line sits beneath the individual platforms.
    final routePaint = Paint()
      ..color = (dark ? _lime : const Color(0xFF72AF85)).withOpacity(.14 + lighting * .15)
      ..strokeWidth = 2.3 * scale
      ..strokeCap = StrokeCap.round;
    for (var i = 0; i < level.path.length - 1; i++) {
      canvas.drawLine(center(level.path[i]), center(level.path[i + 1]), routePaint);
    }

    for (final item in ordered) {
      final cell = item.cell;
      final c = center(cell);
      final isGoal = item.walkable && item.index == level.path.length - 1;
      final isStart = item.walkable && item.index == 0;
      final tileTop = item.walkable
          ? (dark ? const Color(0xFFF4F8FC) : const Color(0xFFFFFFFF))
          : (dark ? const Color(0xFFE1E8F0) : const Color(0xFFF9FBFD));
      final ambient = (lighting - .5) * 16;
      final top = _shift(tileTop, ambient);
      final left = _shift(dark ? const Color(0xFF8994A3) : const Color(0xFFB7C1CE), ambient * .42);
      final right = _shift(dark ? const Color(0xFF626D7D) : const Color(0xFF919DAC), ambient * .28);
      _drawBlock(canvas, c, tw, th, bh, top, left, right, (dark ? .3 : .17) * (1.2 - lighting * .45), scale);
      if (isGoal) _drawGoal(canvas, c, tw, th, dark, lighting, solved);
      if (isStart && !solved) _drawStartPip(canvas, c, dark, lighting);
    }

    final playerCell = level.path[playerIndex.clamp(0, level.path.length - 1).toInt()];
    final playerCenter = center(playerCell) - Offset(0, bh * 1.35);
    _drawPlayer(canvas, playerCenter, tw * .76, th * .76, bh * 1.48, dark, lighting, solved);
  }

  void _drawBlock(Canvas canvas, Offset c, double w, double h, double depth, Color topColor, Color leftColor, Color rightColor, double shadow, double scale) {
    final t = c + Offset(0, -h / 2), r = c + Offset(w / 2, 0), b = c + Offset(0, h / 2), l = c + Offset(-w / 2, 0);
    final bd = b + Offset(0, depth), ld = l + Offset(0, depth), rd = r + Offset(0, depth);
    final topPath = Path()..moveTo(t.dx, t.dy)..lineTo(r.dx, r.dy)..lineTo(b.dx, b.dy)..lineTo(l.dx, l.dy)..close();
    canvas.drawShadow(topPath, Colors.black.withOpacity(shadow), 11 * scale, true);
    canvas.drawPath(Path()..moveTo(l.dx,l.dy)..lineTo(b.dx,b.dy)..lineTo(bd.dx,bd.dy)..lineTo(ld.dx,ld.dy)..close(), Paint()..color = leftColor);
    canvas.drawPath(Path()..moveTo(b.dx,b.dy)..lineTo(r.dx,r.dy)..lineTo(rd.dx,rd.dy)..lineTo(bd.dx,bd.dy)..close(), Paint()..color = rightColor);
    canvas.drawPath(topPath, Paint()..color = topColor);
    final edge = Paint()..style = PaintingStyle.stroke..strokeWidth = math.max(.65, scale).toDouble()..color = Colors.white.withOpacity(.32 + lighting * .3);
    canvas.drawPath(topPath, edge);
    canvas.drawLine(t, r, Paint()..color = Colors.white.withOpacity(.48 * lighting)..strokeWidth = 1.3 * scale);
    canvas.drawLine(l, b, Paint()..color = Colors.black.withOpacity(.08)..strokeWidth = .7 * scale);
  }

  void _drawGoal(Canvas canvas, Offset c, double w, double h, bool dark, double light, bool solved) {
    final color = dark ? _lime : const Color(0xFF67C982);
    final glow = Paint()..color = color.withOpacity(.08 + light * .14);
    canvas.drawCircle(c + Offset(0, -h * .12), w * .33, glow);
    final ring = Paint()..style = PaintingStyle.stroke..strokeWidth = 2..color = color.withOpacity(.42 + light * .5);
    canvas.drawCircle(c + Offset(0, -h * .12), w * .2, ring);
    final center = Paint()..color = color.withOpacity(solved ? 1 : .82);
    canvas.drawCircle(c + Offset(0, -h * .12), w * .055, center);
  }

  void _drawStartPip(Canvas canvas, Offset c, bool dark, double light) {
    final color = dark ? const Color(0xFF8EA0B7) : const Color(0xFF6F8296);
    canvas.drawCircle(c + const Offset(0, -3), 2.6, Paint()..color = color.withOpacity(.35 + light * .3));
  }

  void _drawPlayer(Canvas canvas, Offset c, double w, double h, double depth, bool dark, double light, bool solved) {
    final top = dark ? _mint : _orange;
    final left = _shift(dark ? const Color(0xFF43B966) : const Color(0xFFE3992C), light * 12);
    final right = _shift(dark ? const Color(0xFF23884B) : const Color(0xFFC7741E), light * 8);
    _drawBlock(canvas, c, w, h, depth, top, left, right, .28, 1);
    final shine = Paint()..color = Colors.white.withOpacity(.22 + light * .25);
    canvas.drawCircle(c + Offset(-w * .12, -h * .08), math.max(1.2, w * .04).toDouble(), shine);
    if (solved) {
      final spark = Paint()..color = (dark ? _lime : const Color(0xFFFFD05E)).withOpacity(.85);
      for (var i = 0; i < 4; i++) {
        final angle = i * math.pi / 2 + math.pi / 4;
        canvas.drawCircle(c + Offset(math.cos(angle) * w * .62, math.sin(angle) * h * .9), 2.3, spark);
      }
    }
  }

  Color _shift(Color color, double amount) {
    final factor = amount / 255;
    return Color.fromARGB(
      color.alpha,
      (color.red + 255 * factor).round().clamp(0, 255).toInt(),
      (color.green + 255 * factor).round().clamp(0, 255).toInt(),
      (color.blue + 255 * factor).round().clamp(0, 255).toInt(),
    );
  }

  @override
  bool shouldRepaint(covariant IsometricBoardPainter oldDelegate) =>
      oldDelegate.level != level || oldDelegate.playerIndex != playerIndex || oldDelegate.dark != dark || oldDelegate.lighting != lighting || oldDelegate.solved != solved;
}

class MiniCubePainter extends CustomPainter {
  const MiniCubePainter();
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * .5, size.height * .49);
    const w = 22.0, h = 11.0, d = 13.0;
    final t = center + const Offset(0, -h / 2), r = center + const Offset(w / 2, 0), b = center + const Offset(0, h / 2), l = center + const Offset(-w / 2, 0);
    final bd = b + const Offset(0, d), ld = l + const Offset(0, d), rd = r + const Offset(0, d);
    canvas.drawPath(Path()..moveTo(l.dx,l.dy)..lineTo(b.dx,b.dy)..lineTo(bd.dx,bd.dy)..lineTo(ld.dx,ld.dy)..close(), Paint()..color=const Color(0xFFE4932E));
    canvas.drawPath(Path()..moveTo(b.dx,b.dy)..lineTo(r.dx,r.dy)..lineTo(rd.dx,rd.dy)..lineTo(bd.dx,bd.dy)..close(), Paint()..color=const Color(0xFFC87322));
    canvas.drawPath(Path()..moveTo(t.dx,t.dy)..lineTo(r.dx,r.dy)..lineTo(b.dx,b.dy)..lineTo(l.dx,l.dy)..close(), Paint()..color=_orange);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _HeaderButton extends StatelessWidget {
  const _HeaderButton({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      height: 41,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(color: colors.surface, borderRadius: BorderRadius.circular(13), border: Border.all(color: colors.onSurface.withOpacity(.08))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 15, color: colors.primary), const SizedBox(width: 6), Text(label, style: TextStyle(color: colors.onSurface, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: .5))]),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7), decoration: BoxDecoration(color: colors.primary.withOpacity(.1), borderRadius: BorderRadius.circular(30)), child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 13, color: colors.primary), const SizedBox(width: 5), Text(text, style: TextStyle(color: colors.onSurface, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: .5))]));
  }
}

class _GlassChip extends StatelessWidget {
  const _GlassChip({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) {
    return Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6), decoration: BoxDecoration(color: Colors.black.withOpacity(.3), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(.12))), child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 12, color: Colors.white.withOpacity(.88)), const SizedBox(width: 5), Text(label, style: const TextStyle(color: Colors.white, fontSize: 7, fontWeight: FontWeight.w900, letterSpacing: .6))]));
  }
}

class _MoveButton extends StatelessWidget {
  const _MoveButton({required this.icon, required this.tooltip, required this.onTap, required this.colors});
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final ColorScheme colors;
  @override
  Widget build(BuildContext context) {
    return Tooltip(message: tooltip, child: Material(color: colors.surface, elevation: 2, shadowColor: Colors.black.withOpacity(.14), shape: const CircleBorder(), child: InkWell(onTap: onTap, customBorder: const CircleBorder(), child: SizedBox(width: 43, height: 43, child: Icon(icon, color: colors.onSurface, size: 19)))));
  }
}

class _IconAction extends StatelessWidget {
  const _IconAction({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return TextButton.icon(onPressed: onTap, icon: Icon(icon, size: 15), label: Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800)), style: TextButton.styleFrom(foregroundColor: colors.onSurface.withOpacity(.72), visualDensity: VisualDensity.compact));
  }
}

class _WinBadge extends StatelessWidget {
  const _WinBadge({required this.onNext, required this.onReplay});
  final VoidCallback onNext;
  final VoidCallback onReplay;
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(21, 18, 21, 15),
      decoration: BoxDecoration(color: colors.surface.withOpacity(.96), borderRadius: BorderRadius.circular(22), boxShadow: [BoxShadow(color: Colors.black.withOpacity(.18), blurRadius: 30, offset: const Offset(0, 10))]),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('✦  LEVEL CLEARED  ✦', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 1.2, color: Color(0xFF4E9A66))),
        const SizedBox(height: 5),
        Text('Perfect path.', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900, color: colors.onSurface)),
        const SizedBox(height: 13),
        FilledButton(onPressed: onNext, child: const Text('Next level')),
        TextButton(onPressed: onReplay, child: const Text('Replay')),
      ]),
    );
  }
}

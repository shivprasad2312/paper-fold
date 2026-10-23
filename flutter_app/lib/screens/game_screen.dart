import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../game/board_painter.dart';
import '../game/engine.dart';
import '../game/sound_service.dart';
import '../widgets/hud.dart';
import '../widgets/win_overlay.dart';
import '../widgets/wood_button.dart';

class _Move {
  const _Move(this.from, this.to);
  final int from;
  final int to;
}

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with TickerProviderStateMixin {
  int _levelIdx = 0;
  Level _level = buildLevel(0);
  Slots _slots = List<int?>.from(buildLevel(0).start);
  List<_Move> _history = <_Move>[];
  int _moves = 0;
  int? _selected;
  Hint? _hint;
  bool _won = false;
  bool _muted = false;

  late final AnimationController _pulse;
  late final AnimationController _moveCtrl;
  int? _animFrom;
  int? _animTo;

  final SoundService _sound = SoundService();
  Timer? _hintTimer;
  Timer? _winTimer;

  int get _total => _level.def.total;
  int get _ropeCount => _level.ropes.length;
  int get _crossings => countCrossings(_slots, _ropeCount, _total);

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))
      ..repeat();
    _moveCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 320));
    _moveCtrl.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _hintTimer?.cancel();
    _winTimer?.cancel();
    _pulse.dispose();
    _moveCtrl.dispose();
    _sound.dispose();
    super.dispose();
  }

  // ── actions ───────────────────────────────────────────────

  void _startAnim(int from, int to, {int ms = 320}) {
    _animFrom = from;
    _animTo = to;
    _moveCtrl.duration = Duration(milliseconds: ms);
    _moveCtrl.forward(from: 0);
  }

  void _handleTap(int slot) {
    if (_won) return;

    if (slot < 0) {
      setState(() => _selected = null);
      return;
    }

    if (_slots[slot] != null) {
      setState(() {
        _hint = null;
        if (_selected == slot) {
          _selected = null;
        } else {
          _selected = slot;
          _sound.select();
        }
      });
      return;
    }

    // empty hole
    if (_selected == null) {
      _sound.error();
      return;
    }

    final int from = _selected!;
    final Slots next = applyMove(_slots, from, slot);
    setState(() {
      _slots = next;
      _history = <_Move>[..._history, _Move(from, slot)];
      _moves++;
      _selected = null;
      _hint = null;
    });
    _sound.move();
    _startAnim(from, slot);

    if (isSolved(next, _ropeCount, _total)) {
      _winTimer?.cancel();
      _winTimer = Timer(const Duration(milliseconds: 480), () {
        if (mounted && isSolved(_slots, _ropeCount, _total)) {
          setState(() => _won = true);
          _sound.win();
        }
      });
    }
  }

  void _undo() {
    if (_history.isEmpty || _won) return;
    final _Move last = _history.last;
    final Slots next = applyMove(_slots, last.to, last.from);
    setState(() {
      _slots = next;
      _history = _history.sublist(0, _history.length - 1);
      _moves = math.max(0, _moves - 1);
      _selected = null;
      _hint = null;
    });
    _startAnim(last.to, last.from, ms: 260);
  }

  void _restart() => _loadLevel(_levelIdx);

  void _loadLevel(int idx) {
    final int clamped = idx.clamp(0, kLevels.length - 1);
    final Level l = buildLevel(clamped);
    _hintTimer?.cancel();
    _winTimer?.cancel();
    _moveCtrl.stop();
    setState(() {
      _levelIdx = clamped;
      _level = l;
      _slots = List<int?>.from(l.start);
      _history = <_Move>[];
      _moves = 0;
      _selected = null;
      _hint = null;
      _won = false;
      _animFrom = null;
      _animTo = null;
    });
  }

  void _showHint() {
    if (_won) return;
    final Hint? h = findHint(_slots, _ropeCount, _total);
    if (h == null) return;
    setState(() {
      _hint = h;
      _selected = h.from;
    });
    _sound.hint();
    _hintTimer?.cancel();
    _hintTimer = Timer(const Duration(milliseconds: 2800), () {
      if (mounted) setState(() => _hint = null);
    });
  }

  void _toggleMute() {
    setState(() {
      _muted = !_muted;
      _sound.muted = _muted;
    });
  }

  int get _stars =>
      _moves <= _level.def.par ? 3 : _moves <= (_level.def.par * 1.6).round() ? 2 : 1;

  // ── build ─────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final bool isLast = _levelIdx == kLevels.length - 1;

    return Scaffold(
      backgroundColor: const Color(0xFFE6DCC6),
      body: Container(
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/images/bg.jpg'),
            fit: BoxFit.cover,
          ),
        ),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: <Color>[Color(0x40E6DCC6), Color(0x2E785F3C)],
            ),
          ),
          child: SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 540),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 26),
                  child: Column(
                    children: <Widget>[
                      Hud(
                        level: _level,
                        levelIdx: _levelIdx,
                        levelCount: kLevels.length,
                        moves: _moves,
                        crossings: _crossings,
                        muted: _muted,
                        onToggleMute: _toggleMute,
                        onSelectLevel: _loadLevel,
                      ),
                      const SizedBox(height: 14),
                      Expanded(
                        child: Center(
                          child: AspectRatio(
                            aspectRatio: 1,
                            child: LayoutBuilder(
                              builder: (BuildContext context, BoxConstraints constraints) {
                                final double size = constraints.maxWidth;
                                final PegMove? move = _moveCtrl.isAnimating && _animFrom != null
                                    ? PegMove(
                                        from: _animFrom!,
                                        to: _animTo!,
                                        progress: _moveCtrl.value,
                                      )
                                    : null;
                                return Stack(
                                  children: <Widget>[
                                    GestureDetector(
                                      behavior: HitTestBehavior.opaque,
                                      onTapDown: (TapDownDetails d) =>
                                          _handleTap(hitSlot(d.localPosition, size, _total)),
                                      child: CustomPaint(
                                        size: Size.square(size),
                                        painter: BoardPainter(
                                          slots: _slots,
                                          ropes: _level.ropes,
                                          total: _total,
                                          selected: _selected,
                                          hint: _hint,
                                          move: move,
                                          won: _won,
                                          pulse: _pulse.value,
                                          repaint: Listenable.merge(<Listenable>[_pulse, _moveCtrl]),
                                        ),
                                      ),
                                    ),
                                    if (_won)
                                      WinOverlay(
                                        moves: _moves,
                                        par: _level.def.par,
                                        stars: _stars,
                                        isLast: isLast,
                                        onReplay: _restart,
                                        onNext: () => _loadLevel(_levelIdx + 1),
                                      ),
                                  ],
                                );
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: <Widget>[
                          Expanded(child: WoodButton(label: '↩ Undo', onPressed: _history.isEmpty || _won ? null : _undo)),
                          const SizedBox(width: 8),
                          Expanded(child: WoodButton(label: '💡 Hint', onPressed: _won ? null : _showHint)),
                          const SizedBox(width: 8),
                          Expanded(child: WoodButton(label: '⟳ Restart', onPressed: _restart)),
                          const SizedBox(width: 8),
                          Expanded(child: WoodButton(label: '‹ Prev', onPressed: _levelIdx == 0 ? null : () => _loadLevel(_levelIdx - 1))),
                          const SizedBox(width: 8),
                          Expanded(child: WoodButton(label: 'Next ›', onPressed: isLast ? null : () => _loadLevel(_levelIdx + 1))),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xD1FFF9EE),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: const <BoxShadow>[
                            BoxShadow(color: 0x2E4A3520, offset: Offset(0, 10), blurRadius: 30),
                          ],
                        ),
                        child: const Text(
                          'Tap a wooden peg to lift it, then tap an empty hole. '
                          'Untangle every rope so none cross.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12.5,
                            height: 1.5,
                            color: Color(0xFF7A5C3C),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

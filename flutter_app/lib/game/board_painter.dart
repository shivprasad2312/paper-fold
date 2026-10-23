// ─────────────────────────────────────────────────────────────
// Board renderer: CustomPainter port of the web canvas renderer.
// Wooden ring board, twisted ropes, pegs, holes and animations.
// ─────────────────────────────────────────────────────────────

import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'engine.dart';

/// A peg currently flying from one slot to another.
class PegMove {
  const PegMove({required this.from, required this.to, required this.progress});
  final int from;
  final int to;
  final double progress; // 0..1, already eased by the caller
}

class _Geom {
  const _Geom(this.size)
      : cx = size / 2,
        cy = size / 2,
        outerR = size * 0.455,
        innerR = size * 0.268,
        ringR = size * 0.365,
        pegR = size * 0.052,
        ropeW = size * 0.027;

  final double size;
  final double cx;
  final double cy;
  final double outerR;
  final double innerR;
  final double ringR;
  final double pegR;
  final double ropeW;
}

Color _shade(Color c, double amt) {
  if (amt >= 0) {
    return Color.lerp(c, const Color(0xFFFFFFFF), amt)!;
  }
  final double m = 1 + amt;
  return Color.fromARGB(c.alpha, (c.red * m).round(), (c.green * m).round(), (c.blue * m).round());
}

double _easeInOutCubic(double t) =>
    t < 0.5 ? 4 * t * t * t : 1 - math.pow(-2 * t + 2, 3) / 2;

Offset slotXY(int i, int total, _Geom g) {
  final Offset p = slotPos(i, total);
  return Offset(g.cx + p.dx * g.ringR, g.cy + p.dy * g.ringR);
}

/// Hit test: returns the slot index within tap range, or -1.
int hitSlot(Offset local, double size, int total) {
  final _Geom g = _Geom(size);
  final double limit = g.pegR * 1.25;
  int best = -1;
  double bestD = limit;
  for (int i = 0; i < total; i++) {
    final Offset p = slotXY(i, total, g);
    final double d = (local - p).distance;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

class BoardPainter extends CustomPainter {
  BoardPainter({
    required this.slots,
    required this.ropes,
    required this.total,
    required this.selected,
    required this.hint,
    required this.move,
    required this.won,
    required this.pulse,
    Listenable? repaint,
  }) : super(repaint: repaint);

  final Slots slots;
  final List<RopeDef> ropes;
  final int total;
  final int? selected;
  final Hint? hint;
  final PegMove? move;
  final bool won;
  final double pulse; // 0..1 ambient animation phase

  @override
  void paint(Canvas canvas, Size size) {
    final _Geom g = _Geom(size.width);
    final double wave = math.sin(pulse * 2 * math.pi);

    double animT = 1;
    if (move != null) animT = math.min(1, move!.progress);
    final bool animActive = move != null && animT < 1;
    final double eased = _easeInOutCubic(animT);

    Offset xy(int slot) {
      final Offset base = slotXY(slot, total, g);
      if (move != null && animActive && slot == move!.to) {
        final Offset a = slotXY(move!.from, total, g);
        return Offset(a.dx + (base.dx - a.dx) * eased, a.dy + (base.dy - a.dy) * eased);
      }
      return base;
    }

    _drawBoard(canvas, g, wave);

    // empty holes
    for (int i = 0; i < total; i++) {
      if (slots[i] != null) continue;
      final Offset p = slotXY(i, total, g);
      final bool isHintTarget = hint?.to == i;
      final bool selectable = selected != null && !isHintTarget;
      _drawEmptyHole(
        canvas,
        p,
        g.pegR * 0.98,
        isHintTarget
            ? _HoleGlow.hint
            : selectable
                ? _HoleGlow.selectable
                : _HoleGlow.none,
        wave,
      );
      if (isHintTarget) _drawCrosshair(canvas, p, g.pegR, wave);
    }

    // ropes (under pegs)
    for (int id = 0; id < ropes.length; id++) {
      int a = -1;
      int b = -1;
      for (int i = 0; i < slots.length; i++) {
        if (slots[i] == id) {
          if (a == -1) {
            a = i;
          } else {
            b = i;
          }
        }
      }
      if (a == -1 || b == -1) continue;
      final bool involvesHint = hint != null &&
          (hint!.from == a || hint!.from == b || hint!.to == a || hint!.to == b);
      _drawRope(canvas, xy(a), xy(b), ropes[id].color, g.ropeW, involvesHint);
    }

    // pegs
    for (int i = 0; i < total; i++) {
      if (slots[i] == null) continue;
      if (animActive && move!.to == i) continue; // moving peg drawn separately
      final Offset p = slotXY(i, total, g);
      final _PegState state =
          selected == i ? _PegState.selected : hint?.from == i ? _PegState.hint : _PegState.normal;
      _drawPeg(canvas, p, g.pegR, state, wave);
    }

    // moving peg on top
    if (move != null && animActive) {
      _drawPeg(canvas, xy(move!.to), g.pegR, _PegState.moving, wave);
    }
  }

  // ── board ─────────────────────────────────────────────────

  void _drawBoard(Canvas canvas, _Geom g, double wave) {
    final Offset c = Offset(g.cx, g.cy);

    // soft drop shadow
    final Paint sh = Paint()
      ..shader = RadialGradient(
        colors: const <Color>[Color(0x593C2612), Color(0x003C2612)],
        stops: const <double>[0, 1],
      ).createShader(Rect.fromCircle(center: c.translate(0, g.outerR * 0.08), radius: g.outerR * 1.08));
    canvas.drawCircle(c.translate(0, g.outerR * 0.06), g.outerR * 1.08, sh);

    // wooden annulus (center stays transparent so the linen shows through)
    final Path annulus = Path()
      ..addOval(Rect.fromCircle(center: c, radius: g.outerR))
      ..addOval(Rect.fromCircle(center: c, radius: g.innerR))
      ..fillType = PathFillType.evenOdd;

    final Paint wood = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.4),
        radius: 1.0,
        colors: const <Color>[Color(0xFFF2D6AB), Color(0xFFDDB27C), Color(0xFFBD8750)],
        stops: const <double>[0, 0.55, 1],
      ).createShader(Rect.fromCircle(center: c, radius: g.outerR));
    canvas.drawPath(annulus, wood);

    // wood grain — deterministic wavy annular strokes
    canvas.save();
    canvas.clipPath(annulus);
    for (int i = 0; i < 90; i++) {
      final double seed = i * 137.508;
      final double r = g.innerR + ((i * 37.7) % (g.outerR - g.innerR));
      final double alpha = 0.035 + (i % 5) * 0.012;
      final Paint p = Paint()
        ..color = Color.fromRGBO(110, 70, 32, alpha)
        ..strokeWidth = 1 + (i % 3) * 0.7
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;
      final double startA = (seed % 360) * 0.01745;
      final double len = 0.6 + (i % 7) * 0.28;
      final Path path = Path();
      for (int s = 0; s <= 24; s++) {
        final double a = startA + (s / 24) * len;
        final double wob = math.sin(a * 5 + i) * 2.2 + math.sin(a * 11 + i * 1.7) * 1.1;
        final double rr = r + wob;
        final Offset pt = Offset(g.cx + math.cos(a) * rr, g.cy + math.sin(a) * rr);
        if (s == 0) {
          path.moveTo(pt.dx, pt.dy);
        } else {
          path.lineTo(pt.dx, pt.dy);
        }
      }
      canvas.drawPath(path, p);
    }
    canvas.restore();

    // outer rim (two strokes)
    final Paint rim1 = Paint()
      ..color = const Color(0x8C7A4C22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = g.outerR * 0.018;
    canvas.drawCircle(c, g.outerR - rim1.strokeWidth / 2, rim1);
    final Paint rim2 = Paint()
      ..color = const Color(0x80FFF0D6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = g.outerR * 0.008;
    canvas.drawCircle(c, g.outerR - g.outerR * 0.028, rim2);

    // inner hole: recessed shadow ring
    final Paint hole = Paint()
      ..shader = RadialGradient(
        colors: const <Color>[Color(0x00462D14), Color(0x1F462D14), Color(0x8C34200E), Color(0xBF28180A)],
        stops: const <double>[0, 0.82, 0.95, 1],
      ).createShader(Rect.fromCircle(center: c, radius: g.innerR));
    canvas.drawCircle(c, g.innerR, hole);
    final Paint holeRim = Paint()
      ..color = const Color(0x995A381A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = g.innerR * 0.03;
    canvas.drawCircle(c, g.innerR - holeRim.strokeWidth / 2, holeRim);

    // win celebration ring
    if (won) {
      final double pulseAmt = 0.5 + 0.5 * wave;
      final Paint win = Paint()
        ..color = Color.fromRGBO(232, 195, 58, 0.35 + pulseAmt * 0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = g.outerR * 0.012;
      canvas.drawCircle(c, g.outerR * (0.97 - pulseAmt * 0.02), win);
    }
  }

  // ── empty hole ────────────────────────────────────────────

  void _drawEmptyHole(Canvas canvas, Offset c, double r, _HoleGlow glow, double wave) {
    final Paint grad = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.15, -0.2),
        radius: 1.0,
        colors: const <Color>[Color(0xFF241709), Color(0xFF432C14), Color(0xFF6E4A26), Color(0xFF8A5F33)],
        stops: const <double>[0.1, 0.65, 0.92, 1],
      ).createShader(Rect.fromCircle(center: c, radius: r));
    canvas.drawCircle(c, r, grad);

    // rim light, top-left
    final Paint rim = Paint()
      ..color = const Color(0x66FFE8C4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.12
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(Rect.fromCircle(center: c, radius: r * 0.92), math.pi * 0.95, math.pi * 0.6, false, rim);

    if (glow != _HoleGlow.none) {
      final double pulseAmt = 0.5 + 0.5 * wave;
      final Paint gp = Paint()
        ..color = glow == _HoleGlow.hint
            ? Color.fromRGBO(93, 224, 108, 0.55 + pulseAmt * 0.4)
            : Color.fromRGBO(255, 240, 214, 0.45 + pulseAmt * 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = r * 0.11;
      canvas.drawCircle(c, r * 1.18 + pulseAmt * r * 0.12, gp);
    }
  }

  void _drawCrosshair(Canvas canvas, Offset c, double r, double wave) {
    final double pulseAmt = 0.5 + 0.5 * wave;
    final double R = r * 1.35 + pulseAmt * r * 0.18;
    final Paint p = Paint()
      ..color = const Color(0xFF5DE06C)
      ..strokeWidth = r * 0.1
      ..strokeCap = StrokeCap.round
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, r * 0.18);
    const double tick = 0.5;
    const double gap = 0.28;
    final List<Offset> dirs = <Offset>[
      const Offset(0, -1),
      const Offset(0, 1),
      const Offset(-1, 0),
      const Offset(1, 0),
    ];
    for (final Offset d in dirs) {
      canvas.drawLine(
        c + d * (R - gap * r),
        c + d * (R - gap * r - tick * r),
        p,
      );
    }
    canvas.drawCircle(c, R - gap * r - tick * r - r * 0.12, p);
  }

  // ── rope ──────────────────────────────────────────────────

  void _drawRope(Canvas canvas, Offset p1, Offset p2, Color color, double w, bool highlight) {
    final Offset d = p2 - p1;
    final double len = d.distance == 0 ? 1 : d.distance;
    final Offset n = Offset(-d.dy / len, d.dx / len);
    final double off = w * 0.24;

    // drop shadow
    final Paint shadow = Paint()
      ..color = const Color(0x523A2612)
      ..strokeWidth = w + w * 0.18
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(p1.translate(w * 0.12, w * 0.22), p2.translate(w * 0.12, w * 0.22), shadow);

    // base strand (with a soft glow when this rope is part of the hint)
    final Paint base = Paint()
      ..color = color
      ..strokeWidth = w
      ..strokeCap = StrokeCap.round
      ..maskFilter = highlight ? MaskFilter.blur(BlurStyle.normal, w * 0.55) : null;
    canvas.drawLine(p1, p2, base);

    // twisted fiber strands (two offset dashed strokes, opposite phase)
    final double dash = w * 0.55;
    for (final int side in <int>[-1, 1]) {
      final Paint strand = Paint()
        ..color = _shade(color, side > 0 ? 0.22 : -0.18)
        ..strokeWidth = w * 0.17
        ..strokeCap = StrokeCap.round;
      _drawDashedLine(
        canvas,
        p1 + n * (off * side),
        p2 + n * (off * side),
        dash,
        dash,
        side > 0 ? 0 : dash,
        strand,
      );
    }

    // soft center highlight
    final Paint hi = Paint()
      ..color = _shade(color, 0.3)
      ..strokeWidth = w * 0.08
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(p1 - n * (off * 0.4), p2 - n * (off * 0.4), hi);
  }

  void _drawDashedLine(Canvas canvas, Offset a, Offset b, double dash, double gap, double startOffset, Paint p) {
    final Offset dir = b - a;
    final double total = dir.distance;
    final Offset unit = dir / total;
    double pos = -startOffset;
    while (pos < total) {
      final double s = math.max(0, pos);
      final double e = math.min(total, pos + dash);
      if (e > s) canvas.drawLine(a + unit * s, a + unit * e, p);
      pos += dash + gap;
    }
  }

  // ── peg ───────────────────────────────────────────────────

  void _drawPeg(Canvas canvas, Offset c, double r, _PegState state, double wave) {
    double rr = r;
    if (state == _PegState.selected || state == _PegState.moving) {
      rr = r * 1.1;
    }

    // body with its own radial gradient; a soft disc underneath fakes the shadow
    final Paint body = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.4),
        radius: 1.0,
        colors: const <Color>[Color(0xFFF4D49E), Color(0xFFCF9458), Color(0xFF96602C)],
        stops: const <double>[0.12, 0.55, 1],
      ).createShader(Rect.fromCircle(center: c, radius: rr));
    // offset the shadow downward by drawing a translucent disc first
    final Paint drop = Paint()
      ..color = const Color(0x46462C10)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, rr * 0.25);
    canvas.drawCircle(c.translate(0, rr * 0.16), rr * 0.98, drop);
    canvas.drawCircle(c, rr, body);

    // rim
    final Paint rim = Paint()
      ..color = const Color(0xA66E441C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = rr * 0.1;
    canvas.drawCircle(c, rr - rim.strokeWidth / 2, rim);

    // glossy cap
    final Paint cap = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.32, -0.38),
        radius: 0.7,
        colors: const <Color>[Color(0xBFFFF4DE), Color(0x00FFF4DE)],
      ).createShader(Rect.fromCircle(center: c, radius: rr * 0.92));
    canvas.drawCircle(c, rr * 0.92, cap);

    if (state == _PegState.selected) {
      final Paint ring = Paint()
        ..color = const Color(0xF2E8C33A)
        ..style = PaintingStyle.stroke
        ..strokeWidth = rr * 0.1;
      canvas.drawCircle(c, rr * 1.18, ring);
    } else if (state == _PegState.hint) {
      final double pulseAmt = 0.5 + 0.5 * wave;
      final Paint ring = Paint()
        ..color = Color.fromRGBO(93, 224, 108, 0.6 + pulseAmt * 0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = rr * 0.1;
      canvas.drawCircle(c, rr * (1.16 + pulseAmt * 0.08), ring);
    }
  }

  @override
  bool shouldRepaint(covariant BoardPainter old) =>
      old.slots != slots ||
      old.ropes != ropes ||
      old.selected != selected ||
      old.hint != hint ||
      old.move != move ||
      old.won != won ||
      old.pulse != pulse;
}

enum _HoleGlow { none, selectable, hint }

enum _PegState { normal, selected, hint, moving }

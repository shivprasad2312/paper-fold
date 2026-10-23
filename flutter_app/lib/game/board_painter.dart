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

Color _withAlpha(Color c, double a) =>
    Color.fromARGB((a.clamp(0, 1) * 255).round(), c.red, c.green, c.blue);

/// Stable pseudo-random in [0,1) so fiber texture doesn't flicker between frames.
double _hash01(double n) {
  final double x = math.sin(n * 127.1) * 43758.5453;
  return x - x.floorToDouble();
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
    final double angle = math.atan2(d.dy, d.dx);
    final double hw = w / 2;

    canvas.save();
    canvas.translate(p1.dx, p1.dy);
    canvas.rotate(angle); // rope now runs along the local x-axis, centered on y=0

    // soft drop shadow on the linen
    final Paint shadow = Paint()
      ..color = const Color(0x593A2612)
      ..strokeWidth = w * 1.12
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(0, w * 0.2), Offset(len, w * 0.2), shadow);

    // cotton fuzz halo (plus hint glow when highlighted)
    final Paint halo = Paint()
      ..color = _withAlpha(_shade(color, 0.32), 0.35)
      ..strokeWidth = w * 1.1
      ..strokeCap = StrokeCap.round
      ..maskFilter = highlight ? MaskFilter.blur(BlurStyle.normal, w * 1.1) : null;
    canvas.drawLine(Offset.zero, Offset(len, 0), halo);

    // stray cotton hairs poking past the rope edge
    final int hairCount = (len / (w * 0.9)).floor();
    for (int i = 0; i < hairCount; i++) {
      final double seed = (i * 17 + 3).toDouble();
      final double hx = _hash01(seed) * len;
      final double side = _hash01(seed + 2) > 0.5 ? 1 : -1;
      final double hy = side * hw * (0.8 + _hash01(seed + 4) * 0.25);
      final double hlen = w * (0.1 + _hash01(seed + 6) * 0.16);
      final double ha = side * (math.pi / 2 + (_hash01(seed + 8) - 0.5) * 0.9);
      final Paint hair = Paint()
        ..color = _withAlpha(_shade(color, 0.4), 0.18 + _hash01(seed + 1) * 0.12)
        ..strokeWidth = math.max(1, w * 0.028)
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(
        Offset(hx, hy),
        Offset(hx + math.cos(ha) * hlen, hy + math.sin(ha) * hlen),
        hair,
      );
    }

    // clip every interior detail to the rope's stadium-shaped body
    final Path body = Path()
      ..moveTo(0, -hw)
      ..lineTo(len, -hw)
      ..arcToPoint(Offset(len, hw), radius: Radius.circular(hw), clockwise: true)
      ..lineTo(0, hw)
      ..arcToPoint(Offset(0, -hw), radius: Radius.circular(hw), clockwise: true)
      ..close();
    canvas.clipPath(body);

    // cylindrical base shading: dark edges, light spine
    final Paint cyl = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[
          _shade(color, -0.22),
          _shade(color, 0.05),
          _shade(color, 0.26),
          _shade(color, 0.02),
          _shade(color, -0.24),
        ],
        stops: const <double>[0, 0.28, 0.5, 0.72, 1],
      ).createShader(Rect.fromLTRB(-w, -hw, len + w, hw));
    canvas.drawRect(Rect.fromLTWH(-w, -w, len + 2 * w, 2 * w), cyl);

    // spiral-wrapping plies (Z-twist): broad groove, lit ridge and soft midtone,
    // with slight spacing jitter so the lay feels hand-twisted rather than printed
    final double spacing = w * 0.82;
    final double ribRun = w * 0.66;
    int k = 0;
    double x = -w;
    while (x < len + w) {
      final double jitter = (_hash01(k * 7 + 1) - 0.5) * w * 0.12;
      final double gx = x + jitter;

      final Paint groove = Paint()
        ..color = _withAlpha(_shade(color, -0.24), 0.7)
        ..strokeWidth = w * 0.24
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(Offset(gx, -hw * 1.2), Offset(gx + ribRun, hw * 1.2), groove);

      final Paint ridge = Paint()
        ..color = _withAlpha(_shade(color, 0.38), 0.85)
        ..strokeWidth = w * 0.14
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(
        Offset(gx + w * 0.26, -hw * 1.2),
        Offset(gx + ribRun + w * 0.26, hw * 1.2),
        ridge,
      );

      final Paint midtone = Paint()
        ..color = _withAlpha(_shade(color, 0.12), 0.5)
        ..strokeWidth = w * 0.08
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(
        Offset(gx + w * 0.46, -hw * 1.2),
        Offset(gx + ribRun + w * 0.46, hw * 1.2),
        midtone,
      );

      x += spacing;
      k++;
    }

    // fine loose cotton fibers along the surface
    final int fiberCount = (len / (w * 0.32)).floor();
    for (int i = 0; i < fiberCount; i++) {
      final double seed = (i + k * 31).toDouble();
      final double fx = _hash01(seed) * len;
      final double fy = (_hash01(seed + 99) - 0.5) * w * 0.82;
      final double flen = w * (0.12 + _hash01(seed + 7) * 0.22);
      final double fa = (_hash01(seed + 3) - 0.5) * 0.5;
      final bool light = _hash01(seed + 5) > 0.5;
      final Paint fiber = Paint()
        ..color = _withAlpha(
          light ? _shade(color, 0.45) : _shade(color, -0.3),
          0.1 + _hash01(seed + 1) * 0.08,
        )
        ..strokeWidth = math.max(1, w * 0.03)
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(
        Offset(fx, fy),
        Offset(fx + math.cos(fa) * flen, fy + math.sin(fa) * flen),
        fiber,
      );
    }

    // top sheen and lower contact shade
    final Paint sheen = Paint()
      ..color = _withAlpha(_shade(color, 0.5), 0.55)
      ..strokeWidth = w * 0.1
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(0, -hw * 0.32), Offset(len, -hw * 0.32), sheen);
    final Paint contact = Paint()
      ..color = _withAlpha(_shade(color, -0.3), 0.5)
      ..strokeWidth = w * 0.08
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(0, hw * 0.82), Offset(len, hw * 0.82), contact);

    canvas.restore();
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

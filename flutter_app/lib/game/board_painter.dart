// ─────────────────────────────────────────────────────────────
// Board renderer: CustomPainter port of the web canvas renderer.
// Shape-aware wooden frame, realistic twisted cotton ropes with
// over/under weave at crossings, pegs, holes and animations.
// ─────────────────────────────────────────────────────────────

import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

import 'engine.dart';
import 'engine_core.dart';
import 'shapes.dart';

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
        outerR = size * 0.43,
        innerFactor = 0.59,
        pegR = size * 0.05,
        ropeW = size * 0.026;

  final double size;
  final double cx;
  final double cy;
  final double outerR;
  final double innerFactor;
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

double _hash01(double n) {
  final double x = math.sin(n * 127.1) * 43758.5453;
  return x - x.floorToDouble();
}

double _easeInOutCubic(double t) =>
    t < 0.5 ? 4 * t * t * t : 1 - math.pow(-2 * t + 2, 3) / 2;

Offset slotXY(int i, List<Offset> points, _Geom g) {
  final Offset p = points[i];
  return Offset(g.cx + p.dx * g.outerR, g.cy + p.dy * g.outerR);
}

/// Hit test: returns the slot index within tap range, or -1.
int hitSlot(Offset local, double size, List<Offset> points) {
  final _Geom g = _Geom(size);
  final double limit = g.pegR * 1.3;
  int best = -1;
  double bestD = limit;
  for (int i = 0; i < points.length; i++) {
    final double d = (local - slotXY(i, points, g)).distance;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

class BoardPainter extends CustomPainter {
  BoardPainter({
    required this.shape,
    required this.points,
    required this.slots,
    required this.ropes,
    required this.crossings,
    required this.selected,
    required this.hint,
    required this.move,
    required this.won,
    required this.pulse,
    Listenable? repaint,
  }) : super(repaint: repaint);

  final ShapeKind shape;
  final List<Offset> points;
  final Slots slots;
  final List<RopeDef> ropes;
  final List<Crossing> crossings;
  final int? selected;
  final Hint? hint;
  final PegMove? move;
  final bool won;
  final double pulse;

  Path _polylinePath(List<Offset> line, _Geom g) {
    final Path path = Path();
    for (int i = 0; i < line.length; i++) {
      final Offset p = Offset(g.cx + line[i].dx * g.outerR, g.cy + line[i].dy * g.outerR);
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }
    path.close();
    return path;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final _Geom g = _Geom(size.width);
    final double wave = math.sin(pulse * 2 * math.pi);

    double animT = 1;
    if (move != null) animT = math.min(1, move!.progress);
    final bool animActive = move != null && animT < 1;
    final double eased = _easeInOutCubic(animT);

    Offset xy(int slot) {
      final Offset base = slotXY(slot, points, g);
      if (move != null && animActive && slot == move!.to) {
        final Offset a = slotXY(move!.from, points, g);
        return Offset(a.dx + (base.dx - a.dx) * eased, a.dy + (base.dy - a.dy) * eased);
      }
      return base;
    }

    _drawBoard(canvas, g, wave);

    // empty holes
    for (int i = 0; i < slots.length; i++) {
      if (slots[i] != null) continue;
      final Offset p = slotXY(i, points, g);
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

    // endpoint lookup for weave bridges
    final Map<int, List<Offset>> endOf = <int, List<Offset>>{};
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
      if (a >= 0 && b >= 0) endOf[id] = <Offset>[xy(a), xy(b)];
    }

    final int? hintRope = hint != null ? slots[hint!.from] : null;

    // pass 1: every rope drawn underneath (hint rope glows)
    for (int id = 0; id < ropes.length; id++) {
      final List<Offset>? ep = endOf[id];
      if (ep == null) continue;
      _drawRope(canvas, ep[0], ep[1], ropes[id].color, g.ropeW, id == hintRope);
    }

    // pass 2: over/under weave — under-rope gap shading then the over bridge
    for (final Crossing c in crossings) {
      final List<Offset>? overEp = endOf[c.over];
      if (overEp == null) continue;
      final Offset a = overEp[0];
      final Offset b = overEp[1];
      final Offset d = b - a;
      final double len = d.distance == 0 ? 1 : d.distance;
      final Offset u = d / len;
      final double half = g.ropeW * 1.25;

      // dark gap on the under rope
      final Paint gap = Paint()..color = const Color(0x73301E0E);
      canvas.save();
      canvas.translate(c.point.dx * g.outerR + g.cx, c.point.dy * g.outerR + g.cy);
      canvas.rotate(math.atan2(u.dy, u.dx));
      canvas.drawOval(
        Rect.fromCenter(center: Offset.zero, width: g.ropeW * 2.1, height: g.ropeW * 1.44),
        gap,
      );
      canvas.restore();

      // over rope bridge with full twisted texture
      final Offset center = Offset(c.point.dx * g.outerR + g.cx, c.point.dy * g.outerR + g.cy);
      final Offset pA = center - u * half;
      final Offset pB = center + u * half;
      _drawRope(canvas, pA, pB, ropes[c.over].color, g.ropeW, c.over == hintRope);
    }

    // pegs
    for (int i = 0; i < slots.length; i++) {
      if (slots[i] == null) continue;
      if (animActive && move!.to == i) continue;
      final Offset p = slotXY(i, points, g);
      final _PegState state =
          selected == i ? _PegState.selected : hint?.from == i ? _PegState.hint : _PegState.normal;
      _drawPeg(canvas, p, g.pegR, state, wave);
    }

    if (move != null && animActive) {
      _drawPeg(canvas, xy(move!.to), g.pegR, _PegState.moving, wave);
    }
  }

  // ── board ─────────────────────────────────────────────────

  void _drawBoard(Canvas canvas, _Geom g, double wave) {
    final List<Offset> outerNorm = shapePolyline(shape);
    final List<Offset> innerNorm = scalePolyline(outerNorm, g.innerFactor);
    final Path outer = _polylinePath(outerNorm, g);
    final Path inner = _polylinePath(innerNorm, g);
    final Path annulus = Path()
      ..addPath(outer, Offset.zero)
      ..addPath(inner, Offset.zero)
      ..fillType = PathFillType.evenOdd;

    // soft drop shadow
    canvas.save();
    canvas.translate(0, g.outerR * 0.05);
    final Paint shadow = Paint()
      ..color = const Color(0x663C2612)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, g.outerR * 0.06);
    canvas.drawPath(outer, shadow);
    canvas.restore();

    // wood fill
    final Paint wood = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.4),
        radius: 1.25,
        colors: const <Color>[Color(0xFFF2D6AB), Color(0xFFDDB27C), Color(0xFFBD8750)],
        stops: const <double>[0, 0.55, 1],
      ).createShader(Rect.fromCircle(center: Offset(g.cx, g.cy), radius: g.outerR * 1.25));
    canvas.drawPath(annulus, wood);

    // grain — short tangent strokes inside the frame band
    canvas.save();
    canvas.clipPath(annulus);
    for (int i = 0; i < 95; i++) {
      final int idx = (_hash01(i * 3.1) * outerNorm.length).floor() % outerNorm.length;
      final double f = 0.63 + _hash01(i * 7.7) * 0.35;
      final Offset p = outerNorm[idx];
      final Offset q = outerNorm[(idx + 2) % outerNorm.length];
      final Offset tangent = q - p;
      final Offset base = Offset(g.cx + p.dx * g.outerR * f, g.cy + p.dy * g.outerR * f);
      final double len = g.outerR * (0.03 + _hash01(i * 11.3) * 0.05);
      final Paint gp = Paint()
        ..color = Color.fromRGBO(110, 70, 32, 0.04 + (i % 5) * 0.012)
        ..strokeWidth = 1 + (i % 3) * 0.7
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(base, base + tangent * len * 4, gp);
    }
    canvas.restore();

    // rims
    final Paint rim1 = Paint()
      ..color = const Color(0x8C7A4C22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = g.outerR * 0.018;
    canvas.drawPath(outer, rim1);
    final Paint rim2 = Paint()
      ..color = const Color(0x995A381A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = g.outerR * 0.012;
    canvas.drawPath(inner, rim2);

    // recessed inner edge shadow
    final Paint recess = Paint()
      ..color = const Color(0x8028180A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = g.outerR * 0.035
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, g.outerR * 0.05);
    canvas.drawPath(inner, recess);

    // win celebration ring
    if (won) {
      final double pulseAmt = 0.5 + 0.5 * wave;
      final Paint win = Paint()
        ..color = Color.fromRGBO(232, 195, 58, 0.35 + pulseAmt * 0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = g.outerR * 0.012;
      canvas.drawPath(_polylinePath(scalePolyline(outerNorm, 0.97 - pulseAmt * 0.02), g), win);
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
      canvas.drawLine(c + d * (R - gap * r), c + d * (R - gap * r - tick * r), p);
    }
    canvas.drawCircle(c, R - gap * r - tick * r - r * 0.12, p);
  }

  // ── realistic twisted cotton rope ─────────────────────────

  void _drawRope(Canvas canvas, Offset p1, Offset p2, Color color, double w, bool highlight) {
    final Offset d = p2 - p1;
    final double len = d.distance == 0 ? 1 : d.distance;
    final double angle = math.atan2(d.dy, d.dx);
    final double hw = w / 2;

    canvas.save();
    canvas.translate(p1.dx, p1.dy);
    canvas.rotate(angle);

    final Paint shadow = Paint()
      ..color = const Color(0x593A2612)
      ..strokeWidth = w * 1.12
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(0, w * 0.2), Offset(len, w * 0.2), shadow);

    final Paint halo = Paint()
      ..color = _withAlpha(_shade(color, 0.32), 0.35)
      ..strokeWidth = w * 1.1
      ..strokeCap = StrokeCap.round
      ..maskFilter = highlight ? MaskFilter.blur(BlurStyle.normal, w * 1.1) : null;
    canvas.drawLine(Offset.zero, Offset(len, 0), halo);

    // stray cotton hairs
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
      canvas.drawLine(Offset(hx, hy), Offset(hx + math.cos(ha) * hlen, hy + math.sin(ha) * hlen), hair);
    }

    // clip to the stadium-shaped body
    final Path body = Path()
      ..moveTo(0, -hw)
      ..lineTo(len, -hw)
      ..arcToPoint(Offset(len, hw), radius: Radius.circular(hw), clockwise: true)
      ..lineTo(0, hw)
      ..arcToPoint(Offset(0, -hw), radius: Radius.circular(hw), clockwise: true)
      ..close();
    canvas.clipPath(body);

    // cylindrical base shading
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

    // spiral-wrapping plies
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

    // fine loose cotton fibers
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
      canvas.drawLine(Offset(fx, fy), Offset(fx + math.cos(fa) * flen, fy + math.sin(fa) * flen), fiber);
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

    final Paint drop = Paint()
      ..color = const Color(0x46462C10)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, rr * 0.25);
    canvas.drawCircle(c.translate(0, rr * 0.16), rr * 0.98, drop);

    final Paint body = Paint()
      ..shader = RadialGradient(
        center: const Alignment(-0.35, -0.4),
        radius: 1.0,
        colors: const <Color>[Color(0xFFF4D49E), Color(0xFFCF9458), Color(0xFF96602C)],
        stops: const <double>[0.12, 0.55, 1],
      ).createShader(Rect.fromCircle(center: c, radius: rr));
    canvas.drawCircle(c, rr, body);

    final Paint rim = Paint()
      ..color = const Color(0xA66E441C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = rr * 0.1;
    canvas.drawCircle(c, rr - rim.strokeWidth / 2, rim);

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
      old.points != points ||
      old.shape != shape ||
      old.crossings != crossings ||
      old.selected != selected ||
      old.hint != hint ||
      old.move != move ||
      old.won != won ||
      old.pulse != pulse;
}

enum _HoleGlow { none, selectable, hint }

enum _PegState { normal, selected, hint, moving }

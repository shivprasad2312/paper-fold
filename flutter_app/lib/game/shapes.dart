// ─────────────────────────────────────────────────────────────
// Board shapes. Every shape is reduced to a dense, normalized
// closed polyline (fits inside the [-1,1] box, centroid at 0).
// Slot positions are even arc-length samples of that polyline.
// Port of src/game/shapes.ts.
// ─────────────────────────────────────────────────────────────

import 'dart:math' as math;
import 'dart:ui';

enum ShapeKind {
  circle,
  oval,
  square,
  roundedSquare,
  triangle,
  diamond,
  pentagon,
  hexagon,
  star5,
  star6,
  heart,
  arrow,
  plus,
}

const Map<ShapeKind, String> kShapeLabels = <ShapeKind, String>{
  ShapeKind.circle: 'Circle',
  ShapeKind.oval: 'Oval',
  ShapeKind.square: 'Square',
  ShapeKind.roundedSquare: 'Rounded Square',
  ShapeKind.triangle: 'Triangle',
  ShapeKind.diamond: 'Diamond',
  ShapeKind.pentagon: 'Pentagon',
  ShapeKind.hexagon: 'Hexagon',
  ShapeKind.star5: 'Star',
  ShapeKind.star6: 'Nova Star',
  ShapeKind.heart: 'Heart',
  ShapeKind.arrow: 'Arrow',
  ShapeKind.plus: 'Cross',
};

const List<ShapeKind> kAllShapes = <ShapeKind>[
  ShapeKind.circle,
  ShapeKind.oval,
  ShapeKind.square,
  ShapeKind.roundedSquare,
  ShapeKind.triangle,
  ShapeKind.diamond,
  ShapeKind.pentagon,
  ShapeKind.hexagon,
  ShapeKind.star5,
  ShapeKind.star6,
  ShapeKind.heart,
  ShapeKind.arrow,
  ShapeKind.plus,
];

const int _dense = 260;
final Map<ShapeKind, List<Offset>> _cache = <ShapeKind, List<Offset>>{};

List<Offset> _regularPolygon(int sides, {double rot = -math.pi / 2}) {
  return List<Offset>.generate(sides, (int i) {
    final double a = rot + (i / sides) * math.pi * 2;
    return Offset(math.cos(a), math.sin(a));
  });
}

List<Offset> _starPolygon(int points, {double outer = 1, double inner = 0.46}) {
  return List<Offset>.generate(points * 2, (int i) {
    final double r = i.isEven ? outer : inner;
    final double a = -math.pi / 2 + (i / (points * 2)) * math.pi * 2;
    return Offset(math.cos(a) * r, math.sin(a) * r);
  });
}

List<Offset> _roundedSquare({double corner = 0.28, int seg = 7}) {
  const double h = 1;
  final double c = h - corner;
  final List<Offset> pts = <Offset>[];
  final List<List<double>> corners = <List<double>>[
    <double>[c, -c, -math.pi / 2],
    <double>[c, c, 0],
    <double>[-c, c, math.pi / 2],
    <double>[-c, -c, math.pi],
  ];
  for (final List<double> cor in corners) {
    for (int s = 0; s <= seg; s++) {
      final double a = cor[2] + (s / seg) * (math.pi / 2);
      pts.add(Offset(cor[0] + math.cos(a) * corner, cor[1] + math.sin(a) * corner));
    }
  }
  return pts;
}

List<Offset> _heartCurve(int n) {
  return List<Offset>.generate(n, (int i) {
    final double t = (i / n) * math.pi * 2;
    final double x = 16 * math.pow(math.sin(t), 3).toDouble();
    final double y = 13 * math.cos(t) -
        5 * math.cos(2 * t) -
        2 * math.cos(3 * t) -
        math.cos(4 * t);
    return Offset(x, -y); // flip to y-down
  });
}

List<Offset> _arrowShape() {
  return const <Offset>[
    Offset(-1, -0.62),
    Offset(0.28, -0.62),
    Offset(0.28, -1),
    Offset(1, 0),
    Offset(0.28, 1),
    Offset(0.28, 0.62),
    Offset(-1, 0.62),
  ];
}

List<Offset> _plusShape() {
  const double a = 0.36;
  return const <Offset>[
    Offset(-a, -1),
    Offset(a, -1),
    Offset(a, -a),
    Offset(1, -a),
    Offset(1, a),
    Offset(a, a),
    Offset(a, 1),
    Offset(-a, 1),
    Offset(-a, a),
    Offset(-1, a),
    Offset(-1, -a),
    Offset(-a, -a),
  ];
}

List<Offset> _normalize(List<Offset> pts) {
  double max = 0;
  for (final Offset p in pts) {
    max = math.max(max, math.max(p.dx.abs(), p.dy.abs()));
  }
  final double s = max == 0 ? 1 : max;
  return pts.map((Offset p) => Offset(p.dx / s, p.dy / s)).toList();
}

/// Densify a closed polygon into roughly `n` evenly-arc-spaced points.
List<Offset> _densifyPolygon(List<Offset> vertices, int n) {
  final List<double> lens = <double>[];
  double perimeter = 0;
  for (int i = 0; i < vertices.length; i++) {
    final Offset a = vertices[i];
    final Offset b = vertices[(i + 1) % vertices.length];
    final double len = (b - a).distance;
    lens.add(len);
    perimeter += len;
  }
  final List<Offset> out = <Offset>[];
  int edgeIdx = 0;
  double acc = 0;
  for (int i = 0; i < n; i++) {
    final double target = (i / n) * perimeter;
    while (edgeIdx < lens.length - 1 && acc + lens[edgeIdx] < target) {
      acc += lens[edgeIdx];
      edgeIdx++;
    }
    final Offset a = vertices[edgeIdx];
    final Offset b = vertices[(edgeIdx + 1) % vertices.length];
    final double t = (target - acc) / lens[edgeIdx];
    out.add(Offset(
      a.dx + (b.dx - a.dx) * t,
      a.dy + (b.dy - a.dy) * t,
    ));
  }
  return out;
}

List<Offset> _ellipsePolyline(double rx, double ry, int n) {
  return List<Offset>.generate(n, (int i) {
    final double a = -math.pi / 2 + (i / n) * math.pi * 2;
    return Offset(math.cos(a) * rx, math.sin(a) * ry);
  });
}

/// Dense normalized closed polyline for a shape (cached).
List<Offset> shapePolyline(ShapeKind shape) {
  final List<Offset>? cached = _cache[shape];
  if (cached != null) return cached;

  List<Offset> pts;
  switch (shape) {
    case ShapeKind.circle:
      pts = _ellipsePolyline(1, 1, _dense);
      break;
    case ShapeKind.oval:
      pts = _ellipsePolyline(1, 0.72, _dense);
      break;
    case ShapeKind.square:
      pts = _densifyPolygon(const <Offset>[
        Offset(-1, -1),
        Offset(1, -1),
        Offset(1, 1),
        Offset(-1, 1),
      ], _dense);
      break;
    case ShapeKind.roundedSquare:
      pts = _densifyPolygon(_roundedSquare(), _dense);
      break;
    case ShapeKind.triangle:
      pts = _densifyPolygon(_regularPolygon(3), _dense);
      break;
    case ShapeKind.diamond:
      pts = _densifyPolygon(_regularPolygon(4), _dense);
      break;
    case ShapeKind.pentagon:
      pts = _densifyPolygon(_regularPolygon(5), _dense);
      break;
    case ShapeKind.hexagon:
      pts = _densifyPolygon(_regularPolygon(6), _dense);
      break;
    case ShapeKind.star5:
      pts = _densifyPolygon(_starPolygon(5), _dense);
      break;
    case ShapeKind.star6:
      pts = _densifyPolygon(_starPolygon(6, inner: 0.5), _dense);
      break;
    case ShapeKind.heart:
      pts = _normalize(_heartCurve(_dense));
      _cache[shape] = pts;
      return pts;
    case ShapeKind.arrow:
      pts = _densifyPolygon(_arrowShape(), _dense);
      break;
    case ShapeKind.plus:
      pts = _densifyPolygon(_plusShape(), _dense);
      break;
  }
  pts = _normalize(pts);
  _cache[shape] = pts;
  return pts;
}

/// Even arc-length samples of the shape polyline — the peg slots.
List<Offset> sampleSlots(ShapeKind shape, int total) {
  final List<Offset> line = shapePolyline(shape);
  final int n = line.length;
  final List<double> chord = <double>[];
  double perimeter = 0;
  for (int i = 0; i < n; i++) {
    final double len = (line[(i + 1) % n] - line[i]).distance;
    chord.add(len);
    perimeter += len;
  }
  final List<Offset> out = <Offset>[];
  int idx = 0;
  double acc = 0;
  for (int i = 0; i < total; i++) {
    final double target = (i / total) * perimeter;
    while (idx < n - 1 && acc + chord[idx] < target) {
      acc += chord[idx];
      idx++;
    }
    final Offset a = line[idx];
    final Offset b = line[(idx + 1) % n];
    final double t = (target - acc) / chord[idx];
    out.add(Offset(a.dx + (b.dx - a.dx) * t, a.dy + (b.dy - a.dy) * t));
  }
  return out;
}

List<Offset> scalePolyline(List<Offset> line, double factor) =>
    line.map((Offset p) => p * factor).toList();

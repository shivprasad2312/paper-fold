// ─────────────────────────────────────────────────────────────
// Pure puzzle logic — no level data, no Flutter widgets. Works on
// any set of 2D points, so it supports every board shape equally.
// Port of src/game/engine-core.ts.
// ─────────────────────────────────────────────────────────────

import 'dart:ui';

/// slot -> ropeId (or null = empty hole)
typedef Slots = List<int?>;

class Hint {
  const Hint(this.from, this.to);
  final int from;
  final int to;
}

class Crossing {
  const Crossing({required this.ropeA, required this.ropeB, required this.point, required this.over});
  final int ropeA;
  final int ropeB;
  final Offset point;

  /// rope id that visually passes OVER the other at this crossing
  final int over;
}

// ── geometry ─────────────────────────────────────────────────

int _orient(Offset p, Offset q, Offset r) {
  final double v = (q.dy - p.dy) * (r.dx - q.dx) - (q.dx - p.dx) * (r.dy - q.dy);
  if (v.abs() < 1e-12) return 0;
  return v > 0 ? 1 : 2;
}

bool _onSegment(Offset p, Offset q, Offset r) {
  return q.dx <= math_max(p.dx, r.dx) + 1e-12 &&
      q.dx >= math_min(p.dx, r.dx) - 1e-12 &&
      q.dy <= math_max(p.dy, r.dy) + 1e-12 &&
      q.dy >= math_min(p.dy, r.dy) - 1e-12;
}

// local tiny helpers to avoid importing dart:math at top for two names
double math_max(double a, double b) => a > b ? a : b;
double math_min(double a, double b) => a < b ? a : b;

bool _segmentsCross(Offset p1, Offset p2, Offset p3, Offset p4) {
  final int o1 = _orient(p1, p2, p3);
  final int o2 = _orient(p1, p2, p4);
  final int o3 = _orient(p3, p4, p1);
  final int o4 = _orient(p3, p4, p2);
  if (o1 != o2 && o3 != o4) return true;
  if (o1 == 0 && _onSegment(p1, p3, p2)) return true;
  if (o2 == 0 && _onSegment(p1, p4, p2)) return true;
  if (o3 == 0 && _onSegment(p3, p1, p4)) return true;
  if (o4 == 0 && _onSegment(p3, p2, p4)) return true;
  return false;
}

Offset _intersectionPoint(Offset p1, Offset p2, Offset p3, Offset p4) {
  final double d1x = p2.dx - p1.dx;
  final double d1y = p2.dy - p1.dy;
  final double d2x = p4.dx - p3.dx;
  final double d2y = p4.dy - p3.dy;
  final double denom = d1x * d2y - d1y * d2x;
  if (denom.abs() < 1e-12) return Offset((p2.dx + p3.dx) / 2, (p2.dy + p3.dy) / 2);
  final double t = ((p3.dx - p1.dx) * d2y - (p3.dy - p1.dy) * d2x) / denom;
  return Offset(p1.dx + d1x * t, p1.dy + d1y * t);
}

// ── crossings / twists ───────────────────────────────────────

List<int>? ropeEndpoints(int ropeId, Slots slots) {
  final List<int> found = <int>[];
  for (int i = 0; i < slots.length; i++) {
    if (slots[i] == ropeId) found.add(i);
  }
  return found.length == 2 ? found : null;
}

List<List<Offset>> _ropeSegments(Slots slots, int ropeCount, List<Offset> points) {
  final List<List<Offset>> out = <List<Offset>>[];
  for (int r = 0; r < ropeCount; r++) {
    final List<int>? ep = ropeEndpoints(r, slots);
    if (ep == null) continue;
    out.add(<Offset>[points[ep[0]], points[ep[1]]]);
  }
  return out;
}

int countCrossings(Slots slots, int ropeCount, List<Offset> points) {
  final List<List<Offset>> segs = _ropeSegments(slots, ropeCount, points);
  int n = 0;
  for (int i = 0; i < segs.length; i++) {
    for (int j = i + 1; j < segs.length; j++) {
      if (_segmentsCross(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) n++;
    }
  }
  return n;
}

/// All crossings with an over/under assignment (deterministic alternation).
List<Crossing> findCrossings(Slots slots, int ropeCount, List<Offset> points) {
  final List<Crossing> result = <Crossing>[];
  for (int i = 0; i < ropeCount; i++) {
    final List<int>? epA = ropeEndpoints(i, slots);
    if (epA == null) continue;
    for (int j = i + 1; j < ropeCount; j++) {
      final List<int>? epB = ropeEndpoints(j, slots);
      if (epB == null) continue;
      final Offset a1 = points[epA[0]];
      final Offset a2 = points[epA[1]];
      final Offset b1 = points[epB[0]];
      final Offset b2 = points[epB[1]];
      if (_segmentsCross(a1, a2, b1, b2)) {
        final int over = (i + j) % 2 == 0 ? i : j;
        result.add(Crossing(
          ropeA: i,
          ropeB: j,
          point: _intersectionPoint(a1, a2, b1, b2),
          over: over,
        ));
      }
    }
  }
  return result;
}

bool isSolved(Slots slots, int ropeCount, List<Offset> points) =>
    countCrossings(slots, ropeCount, points) == 0;

// ── moves ────────────────────────────────────────────────────

Slots applyMove(Slots slots, int from, int to) {
  if (slots[from] == null || slots[to] != null) return slots;
  final Slots next = Slots.from(slots);
  next[to] = next[from];
  next[from] = null;
  return next;
}

String _slotKey(Slots s) =>
    s.map((int? v) => v == null ? '_' : v.toString()).join(',');

/// BFS hint: first step of the shortest path toward a state with fewer
/// crossings. Falls back to the best greedy move if the budget is exhausted.
Hint? findHint(Slots slots, int ropeCount, List<Offset> points,
    {int maxDepth = 4, int nodeCap = 20000}) {
  final int current = countCrossings(slots, ropeCount, points);
  if (current == 0) return null;

  final List<int> empty = <int>[
    for (int i = 0; i < slots.length; i++)
      if (slots[i] == null) i,
  ];
  final List<int> occupied = <int>[
    for (int i = 0; i < slots.length; i++)
      if (slots[i] != null) i,
  ];
  if (empty.isEmpty || occupied.isEmpty) return null;

  final String rootKey = _slotKey(slots);
  final Map<String, _Parent> parents = <String, _Parent>{
    rootKey: const _Parent('', Hint(-1, -1)),
  };

  List<Slots> frontier = <Slots>[slots];
  String? targetKey;

  for (int depth = 0; depth < maxDepth && targetKey == null; depth++) {
    final List<Slots> next = <Slots>[];
    for (final Slots s in frontier) {
      if (depth > 0 && countCrossings(s, ropeCount, points) < current) {
        targetKey = _slotKey(s);
        break;
      }
      for (final int from in occupied) {
        if (s[from] == null) continue;
        for (final int to in empty) {
          if (s[to] != null) continue;
          final Slots child = applyMove(s, from, to);
          final String k = _slotKey(child);
          if (!parents.containsKey(k)) {
            parents[k] = _Parent(_slotKey(s), Hint(from, to));
            next.add(child);
          }
        }
      }
      if (parents.length > nodeCap) break;
    }
    frontier = next;
    if (parents.length > nodeCap || frontier.isEmpty) break;
  }

  if (targetKey != null) {
    String key = targetKey;
    _Parent node = parents[key]!;
    while (node.prev != rootKey) {
      key = node.prev;
      node = parents[key]!;
    }
    return node.move;
  }

  Hint? best;
  int bestScore = current;
  for (final int from in occupied) {
    for (final int to in empty) {
      final int score = countCrossings(applyMove(slots, from, to), ropeCount, points);
      if (score <= bestScore) {
        bestScore = score;
        best = Hint(from, to);
      }
    }
  }
  return best;
}

class _Parent {
  const _Parent(this.prev, this.move);
  final String prev;
  final Hint move;
}

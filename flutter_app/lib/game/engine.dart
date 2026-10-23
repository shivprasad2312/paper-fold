// ─────────────────────────────────────────────────────────────
// Rope Untangle — puzzle engine (pure logic, Flutter-free core
// except for dart:ui Color). Direct port of the web engine.ts.
// ─────────────────────────────────────────────────────────────

import 'dart:math' as math;
import 'dart:ui';

/// slot -> ropeId (or null = empty hole)
typedef Slots = List<int?>;

class RopeDef {
  const RopeDef(this.a, this.b, this.color);
  final int a;
  final int b;
  final Color color;
}

class LevelDef {
  const LevelDef({
    required this.name,
    required this.pegs,
    required this.total,
    required this.pairs,
    required this.palette,
    required this.par,
  });

  final String name;
  final int pegs; // occupied slots
  final int total; // total slots around the ring
  final List<List<int>> pairs; // non-crossing "solved" matching
  final List<Color> palette; // one color per rope
  final int par;
}

class Level {
  const Level({required this.def, required this.ropes, required this.start});
  final LevelDef def;
  final List<RopeDef> ropes;
  final Slots start;
}

class Hint {
  const Hint(this.from, this.to);
  final int from;
  final int to;
}

// ── palette ──────────────────────────────────────────────────

const Color _cream = Color(0xFFF1E9DC);
const Color _yellow = Color(0xFFE8C33A);
const Color _sage = Color(0xFF93A58C);
const Color _terracotta = Color(0xFFC98A5E);
const Color _blue = Color(0xFF7D98B5);
const Color _lavender = Color(0xFFB58FB0);

final List<LevelDef> kLevels = <LevelDef>[
  LevelDef(
    name: 'First Knot',
    pegs: 6,
    total: 8,
    pairs: [
      [0, 1],
      [2, 5],
      [3, 4],
    ],
    palette: const [_cream, _yellow, _cream],
    par: 7,
  ),
  LevelDef(
    name: 'Loose Threads',
    pegs: 8,
    total: 10,
    pairs: [
      [0, 1],
      [2, 7],
      [3, 4],
      [5, 6],
    ],
    palette: const [_cream, _cream, _yellow, _cream],
    par: 9,
  ),
  LevelDef(
    name: 'Tangled Web',
    pegs: 10,
    total: 12,
    pairs: [
      [0, 9],
      [1, 2],
      [3, 8],
      [4, 5],
      [6, 7],
    ],
    palette: const [_cream, _cream, _yellow, _sage, _cream],
    par: 12,
  ),
  LevelDef(
    name: 'Spindle Ring',
    pegs: 12,
    total: 14,
    pairs: [
      [0, 1],
      [2, 11],
      [3, 4],
      [5, 10],
      [6, 7],
      [8, 9],
    ],
    palette: const [_cream, _terracotta, _cream, _yellow, _cream, _sage],
    par: 15,
  ),
  LevelDef(
    name: "Weaver's Nightmare",
    pegs: 14,
    total: 16,
    pairs: [
      [0, 13],
      [1, 2],
      [3, 12],
      [4, 5],
      [6, 11],
      [7, 8],
      [9, 10],
    ],
    palette: const [_cream, _cream, _blue, _cream, _yellow, _lavender, _cream],
    par: 19,
  ),
];

/// Curated starting layouts (generated offline, see tool/ and web scripts).
/// Crossing counts / BFS-verified minimum solution depths:
/// L1: 2 / depth 2 · L2: 4 / 2 · L3: 6 / 3 · L4: 6 / 3 · L5: 8 / 4
final List<Slots> kCuratedStarts = <Slots>[
  <int?>[1, 2, null, null, 0, 1, 0, 2],
  <int?>[1, 0, 2, 3, 0, null, 2, null, 1, 3],
  <int?>[1, 3, 0, 4, null, 2, 1, null, 4, 2, 3, 0],
  <int?>[2, 1, 5, 0, 2, 5, 1, 4, null, 3, 4, null, 3, 0],
  <int?>[null, 2, 3, 1, 6, 2, 1, 6, 5, 3, 0, 4, 5, 0, 4, null],
];

// ── geometry ─────────────────────────────────────────────────

Offset slotPos(int i, int total) {
  final double ang = -math.pi / 2 + (i / total) * math.pi * 2;
  return Offset(math.cos(ang), math.sin(ang));
}

int _orient(Offset p, Offset q, Offset r) {
  final double v = (q.dy - p.dy) * (r.dx - q.dx) - (q.dx - p.dx) * (r.dy - q.dy);
  if (v.abs() < 1e-12) return 0;
  return v > 0 ? 1 : 2;
}

bool _onSegment(Offset p, Offset q, Offset r) {
  return q.dx <= math.max(p.dx, r.dx) + 1e-12 &&
      q.dx >= math.min(p.dx, r.dx) - 1e-12 &&
      q.dy <= math.max(p.dy, r.dy) + 1e-12 &&
      q.dy >= math.min(p.dy, r.dy) - 1e-12;
}

bool segmentsCross(Offset p1, Offset p2, Offset p3, Offset p4) {
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

// ── crossings ────────────────────────────────────────────────

List<int>? ropeEndpoints(int ropeId, Slots slots) {
  final List<int> found = <int>[];
  for (int i = 0; i < slots.length; i++) {
    if (slots[i] == ropeId) found.add(i);
  }
  return found.length == 2 ? found : null;
}

int countCrossings(Slots slots, int ropeCount, int total) {
  final List<List<Offset>> ends = <List<Offset>>[];
  for (int r = 0; r < ropeCount; r++) {
    final List<int>? ep = ropeEndpoints(r, slots);
    if (ep == null) continue;
    ends.add(<Offset>[slotPos(ep[0], total), slotPos(ep[1], total)]);
  }
  int n = 0;
  for (int i = 0; i < ends.length; i++) {
    for (int j = i + 1; j < ends.length; j++) {
      if (segmentsCross(ends[i][0], ends[i][1], ends[j][0], ends[j][1])) n++;
    }
  }
  return n;
}

bool isSolved(Slots slots, int ropeCount, int total) =>
    countCrossings(slots, ropeCount, total) == 0;

// ── level construction ───────────────────────────────────────

Level buildLevel(int index) {
  final LevelDef def = kLevels[index];
  final List<RopeDef> ropes = <RopeDef>[
    for (int i = 0; i < def.pairs.length; i++)
      RopeDef(def.pairs[i][0], def.pairs[i][1], def.palette[i]),
  ];
  return Level(def: def, ropes: ropes, start: List<int?>.from(kCuratedStarts[index]));
}

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

/// Breadth-first hint: first step of the shortest path toward a state with
/// fewer crossings (often fully solved), so it escapes local minima.
/// Falls back to the best greedy move if the search budget is exhausted.
Hint? findHint(Slots slots, int ropeCount, int total,
    {int maxDepth = 4, int nodeCap = 20000}) {
  final int current = countCrossings(slots, ropeCount, total);
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
      if (depth > 0 && countCrossings(s, ropeCount, total) < current) {
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

  // fallback: single legal move that minimizes crossings
  Hint? best;
  int bestScore = current;
  for (final int from in occupied) {
    for (final int to in empty) {
      final int score = countCrossings(applyMove(slots, from, to), ropeCount, total);
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

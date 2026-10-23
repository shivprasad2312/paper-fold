// ─────────────────────────────────────────────────────────────
// Local progress: stars earned per level, persisted with
// shared_preferences. Port of src/game/progress.ts.
// ─────────────────────────────────────────────────────────────

import 'package:shared_preferences/shared_preferences.dart';

class ProgressService {
  static const String _key = 'rope-untangle-progress-v1';

  Future<Map<int, int>> getStars() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final List<String> raw = prefs.getStringList(_key) ?? <String>[];
    final Map<int, int> map = <int, int>{};
    for (final String entry in raw) {
      final List<String> parts = entry.split(':');
      if (parts.length == 2) map[int.parse(parts[0])] = int.parse(parts[1]);
    }
    return map;
  }

  Future<Map<int, int>> saveStars(int levelId, int stars) async {
    final Map<int, int> map = await getStars();
    map[levelId] = (map[levelId] ?? 0) < stars ? stars : map[levelId]!;
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
      _key,
      map.entries.map((MapEntry<int, int> e) => '${e.key}:${e.value}').toList(),
    );
    return map;
  }

  /// Highest unlocked level id (level 0 always open).
  Future<int> maxUnlocked(int total) async {
    final Map<int, int> stars = await getStars();
    int max = 0;
    for (final MapEntry<int, int> e in stars.entries) {
      if (e.value > 0 && e.key + 1 > max) max = e.key + 1;
    }
    return max < total ? max : total - 1;
  }
}

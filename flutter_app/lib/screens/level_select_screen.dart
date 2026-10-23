import 'package:flutter/material.dart';

import '../game/engine.dart';
import '../game/progress_service.dart';
import 'game_screen.dart';

const List<String> kTierNames = <String>[
  'First Knots',
  'Loose Threads',
  'Loom Rings',
  'Star Spindle',
  'Heartstrings',
  'Arrow Weave',
  'Cross Stitch',
  'Grand Tangle',
  'Master Loom',
  "Weaver's Nightmare",
];

/// Screen 2 of 3 — the 100-level tier map.
class LevelSelectScreen extends StatefulWidget {
  const LevelSelectScreen({super.key});

  @override
  State<LevelSelectScreen> createState() => _LevelSelectScreenState();
}

class _LevelSelectScreenState extends State<LevelSelectScreen> {
  final ProgressService _progress = ProgressService();
  Map<int, int> _stars = <int, int>{};
  int _unlocked = 0;
  int _earned = 0;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final Map<int, int> stars = await _progress.getStars();
    final int u = await _progress.maxUnlocked(kLevelCount);
    if (!mounted) return;
    setState(() {
      _stars = stars;
      _unlocked = u;
      _earned = stars.values.fold(0, (int a, int b) => a + b);
    });
  }

  Future<void> _openLevel(int id) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => GameScreen(initialLevelId: id)),
    );
    _refresh(); // return from the game — reload stars/unlocks
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE6DCC6),
      body: Container(
        decoration: const BoxDecoration(
          image: DecorationImage(image: AssetImage('assets/images/bg.jpg'), fit: BoxFit.cover),
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
                constraints: const BoxConstraints(maxWidth: 620),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                  child: Column(
                    children: <Widget>[
                      _header(),
                      const SizedBox(height: 14),
                      Expanded(
                        child: ListView.separated(
                          itemCount: 10,
                          separatorBuilder: (BuildContext _, int __) => const SizedBox(height: 14),
                          itemBuilder: (BuildContext _, int tier) => _tierSection(tier),
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

  Widget _header() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xD1FFF9EE),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x8CFFFFFF)),
        boxShadow: const <BoxShadow>[
          BoxShadow(color: Color(0x2E4A3520), offset: Offset(0, 10), blurRadius: 30),
        ],
      ),
      child: Row(
        children: <Widget>[
          _BackButton(onTap: () => Navigator.of(context).maybePop()),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'CHOOSE A PUZZLE',
                  style: TextStyle(
                    fontSize: 10.5,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF7A5C3C),
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Level map',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF4A3520)),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0x59D6B587),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '⭐ $_earned / ${kLevelCount * 3}',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF4A3520)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tierSection(int tier) {
    final List<LevelData> levels =
        kLevelData.where((LevelData l) => l.tier == tier).toList(growable: false);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xD1FFF9EE),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x8CFFFFFF)),
        boxShadow: const <BoxShadow>[
          BoxShadow(color: Color(0x2E4A3520), offset: Offset(0, 10), blurRadius: 30),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: <Color>[Color(0xFFF2D274), Color(0xFFD9A92F)],
                  ),
                  borderRadius: BorderRadius.circular(13),
                  boxShadow: const <BoxShadow>[
                    BoxShadow(color: Color(0x597A4F24), offset: Offset(0, 2)),
                  ],
                ),
                child: Text(
                  '${tier + 1}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF4A3520)),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                kTierNames[tier],
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF4A3520)),
              ),
              Expanded(
                child: Text(
                  '${levels.first.pairs.length} ropes · ${kShapeLabels[levels.first.shape]}',
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                    color: Color(0xFF7A5C3C),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 5,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 0.92,
            children: <Widget>[
              for (final LevelData l in levels) _levelCard(l),
            ],
          ),
        ],
      ),
    );
  }

  Widget _levelCard(LevelData l) {
    final bool locked = l.id > _unlocked;
    final int s = _stars[l.id] ?? 0;
    return GestureDetector(
      onTap: locked ? null : () => _openLevel(l.id),
      child: Opacity(
        opacity: locked ? 0.55 : 1,
        child: Container(
          decoration: BoxDecoration(
            gradient: locked
                ? null
                : const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: <Color>[Color(0xFFF6E2C1), Color(0xFFE3C08E)],
                  ),
            color: locked ? const Color(0x59B4A082) : null,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x387A4F24)),
            boxShadow: locked
                ? null
                : const <BoxShadow>[BoxShadow(color: Color(0x4D7A4F24), offset: Offset(0, 3))],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Text(
                '${l.id + 1}',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF4A3520)),
              ),
              const SizedBox(height: 2),
              Text(
                kShapeLabels[l.shape] ?? '',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF7A5C3C)),
              ),
              const SizedBox(height: 2),
              Text(
                locked ? '🔒' : (s == 0 ? '☆☆☆' : '${'★' * s}${'☆' * (3 - s)}'),
                style: const TextStyle(fontSize: 10, color: Color(0xFFE8C33A), letterSpacing: -1),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: const Color(0xE6FFF9EE),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x407A4F24)),
          boxShadow: const <BoxShadow>[
            BoxShadow(color: Color(0x407A4F24), offset: Offset(0, 3)),
          ],
        ),
        child: const Icon(Icons.arrow_back_rounded, color: Color(0xFF4A3520), size: 22),
      ),
    );
  }
}

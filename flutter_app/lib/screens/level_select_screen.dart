import 'package:flutter/material.dart';

import '../game/engine.dart';
import '../game/progress_service.dart';

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

class LevelSelectScreen extends StatefulWidget {
  const LevelSelectScreen({super.key, required this.stars, required this.onPick});

  final Map<int, int> stars;
  final ValueChanged<int> onPick;

  @override
  State<LevelSelectScreen> createState() => _LevelSelectScreenState();
}

class _LevelSelectScreenState extends State<LevelSelectScreen> {
  final ProgressService _progress = ProgressService();
  int _unlocked = 0;
  int _earned = 0;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final int u = await _progress.maxUnlocked(kLevelCount);
    int earned = 0;
    widget.stars.values.forEach((int s) => earned += s);
    if (mounted) {
      setState(() {
        _unlocked = u;
        _earned = earned;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
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
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
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
    );
  }

  Widget _header() {
    return Container(
      padding: const EdgeInsets.all(16),
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
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'ROPE UNTANGLE',
                  style: TextStyle(
                    fontSize: 11,
                    letterSpacing: 1.4,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF7A5C3C),
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Choose a puzzle',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF4A3520)),
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
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF4A3520)),
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
    final int s = widget.stars[l.id] ?? 0;
    return GestureDetector(
      onTap: locked ? null : () => widget.onPick(l.id),
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

import 'package:flutter/material.dart';

import '../game/engine.dart';

class StatBox extends StatelessWidget {
  const StatBox({super.key, required this.value, required this.label, this.ok = false});

  final String value;
  final String label;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 4),
      decoration: BoxDecoration(
        color: const Color(0x47D6B587),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: ok ? const Color(0xFF2E9E44) : const Color(0xFF4A3520),
            ),
          ),
          const SizedBox(height: 1),
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 9,
              letterSpacing: 0.6,
              fontWeight: FontWeight.w700,
              color: Color(0xFF7A5C3C),
            ),
          ),
        ],
      ),
    );
  }
}

class Hud extends StatelessWidget {
  const Hud({
    super.key,
    required this.level,
    required this.levelId,
    required this.levelCount,
    required this.moves,
    required this.crossings,
    required this.muted,
    required this.onToggleMute,
    required this.onOpenLevels,
  });

  final Level level;
  final int levelId;
  final int levelCount;
  final int moves;
  final int crossings;
  final bool muted;
  final VoidCallback onToggleMute;
  final VoidCallback onOpenLevels;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      decoration: BoxDecoration(
        color: const Color(0xD1FFF9EE),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x8CFFFFFF)),
        boxShadow: const <BoxShadow>[
          BoxShadow(color: Color(0x2E4A3520), offset: Offset(0, 10), blurRadius: 30),
        ],
      ),
      child: Column(
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'TIER ${level.def.tier + 1} / 10 · LEVEL ${levelId + 1} / $levelCount',
                      style: const TextStyle(
                        fontSize: 10.5,
                        letterSpacing: 1.1,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF7A5C3C),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      level.def.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF4A3520),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${kShapeLabels[level.def.shape]} board · ${level.ropes.length} ropes'.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        letterSpacing: 0.6,
                        fontWeight: FontWeight.w700,
                        color: Color(0xBF8A6238),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerRight,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    _MuteButton(muted: muted, onTap: onToggleMute),
                    const SizedBox(width: 8),
                    StatBox(value: '$moves', label: 'Moves'),
                    const SizedBox(width: 6),
                    StatBox(value: '$crossings', label: 'Twists', ok: crossings == 0),
                    const SizedBox(width: 6),
                    StatBox(value: '${level.def.par}', label: 'Par'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              GestureDetector(
                onTap: onOpenLevels,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: const Color(0xE6FFF9EE),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0x407A4F24)),
                    boxShadow: const <BoxShadow>[
                      BoxShadow(color: Color(0x407A4F24), offset: Offset(0, 3)),
                    ],
                  ),
                  child: const Text(
                    '🗺 Levels',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF4A3520)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: <Widget>[
                    for (int t = 0; t < 10; t++)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        margin: const EdgeInsets.symmetric(horizontal: 3.5),
                        width: t == level.def.tier ? 12 : 8,
                        height: t == level.def.tier ? 12 : 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: t == level.def.tier ? const Color(0xFFA06C36) : const Color(0x4D7A5C3C),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MuteButton extends StatelessWidget {
  const _MuteButton({required this.muted, required this.onTap});

  final bool muted;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: const Color(0xE6FFF9EE),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x407A4F24)),
          boxShadow: const <BoxShadow>[
            BoxShadow(color: Color(0x407A4F24), offset: Offset(0, 3)),
          ],
        ),
        child: Text(muted ? '🔇' : '🔊', style: const TextStyle(fontSize: 17)),
      ),
    );
  }
}

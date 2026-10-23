import 'package:flutter/material.dart';

import 'wood_button.dart';

class WinOverlay extends StatelessWidget {
  const WinOverlay({
    super.key,
    required this.moves,
    required this.par,
    required this.stars,
    required this.isLast,
    required this.onReplay,
    required this.onNext,
  });

  final int moves;
  final int par;
  final int stars;
  final bool isLast;
  final VoidCallback onReplay;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 300),
        opacity: 1,
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0x593C2A16),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Center(
            child: TweenAnimationBuilder<double>(
              duration: const Duration(milliseconds: 350),
              curve: Curves.easeOutBack,
              tween: Tween<double>(begin: 0.82, end: 1),
              builder: (BuildContext context, double scale, Widget? child) {
                return Transform.scale(scale: scale, child: child);
              },
              child: Container(
                width: 280,
                padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 26),
                decoration: BoxDecoration(
                  color: const Color(0xFFFBF4E6),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const <BoxShadow>[
                    BoxShadow(color: 0x66281A0A, offset: Offset(0, 24), blurRadius: 60),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      isLast ? 'ALL LEVELS COMPLETE' : 'PUZZLE SOLVED',
                      style: const TextStyle(
                        fontSize: 11,
                        letterSpacing: 1.4,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF7A5C3C),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isLast ? 'Master Weaver! 🧶' : 'Untangled!',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF4A3520),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        for (int i = 0; i < 3; i++)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 3),
                            child: Text(
                              '★',
                              style: TextStyle(
                                fontSize: 30,
                                color: i < stars ? const Color(0xFFE8C33A) : const Color(0x407A5C3C),
                                shadows: i < stars
                                    ? const <Shadow>[Shadow(color: Color(0x80E8C33A), offset: Offset(0, 2), blurRadius: 6)]
                                    : null,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$moves moves · par $par',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF7A5C3C),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        WoodButton(label: 'Replay', ghost: true, onPressed: onReplay),
                        if (!isLast) ...<Widget>[
                          const SizedBox(width: 10),
                          WoodButton(label: 'Next level →', primary: true, onPressed: onNext),
                        ],
                      ],
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
}

import 'package:flutter/material.dart';

import '../game/engine.dart';
import '../game/progress_service.dart';
import '../game/sound_service.dart';
import '../widgets/home_hero.dart';
import '../widgets/wood_button.dart';
import 'level_select_screen.dart';

/// Screen 1 of 3 — landing / home.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ProgressService _progress = ProgressService();
  Map<int, int> _stars = <int, int>{};
  bool _muted = false;

  @override
  void initState() {
    super.initState();
    SoundService.instance.loadMuted();
    _refresh();
  }

  Future<void> _refresh() async {
    final Map<int, int> stars = await _progress.getStars();
    final bool muted = SoundService.instance.muted;
    if (!mounted) return;
    setState(() {
      _stars = stars;
      _muted = muted;
    });
  }

  int get _totalStars => _stars.values.fold(0, (int a, int b) => a + b);
  int get _solved => _stars.values.where((int s) => s > 0).length;

  Future<void> _openLevels() async {
    SoundService.instance.select();
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const LevelSelectScreen()),
    );
    _refresh(); // stars may have changed while playing
  }

  Future<void> _toggleMute() async {
    final bool muted = await SoundService.instance.toggleMuted();
    if (!mounted) return;
    setState(() => _muted = muted);
  }

  void _showHowTo() {
    showDialog<void>(
      context: context,
      builder: (BuildContext ctx) => AlertDialog(
        backgroundColor: const Color(0xFFFBF4E6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Text(
          'How to play',
          style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF4A3520)),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const <Widget>[
            _Rule(icon: '👆', text: 'Tap a wooden peg to lift it — empty holes glow.'),
            SizedBox(height: 10),
            _Rule(icon: '🕳', text: 'Tap an empty hole to move the peg there; its ropes follow.'),
            SizedBox(height: 10),
            _Rule(icon: '🧶', text: 'Keep moving pegs until the Twists counter reaches 0.'),
            SizedBox(height: 10),
            _Rule(icon: '💡', text: 'Stuck? Use a Hint — a green crosshair marks the target.'),
          ],
        ),
        actions: <Widget>[
          WoodButton(
            label: 'Got it!',
            primary: true,
            onPressed: () => Navigator.of(ctx).pop(),
          ),
        ],
      ),
    );
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
                constraints: const BoxConstraints(maxWidth: 540),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: <Widget>[
                      const Spacer(),
                      const HomeHero(),
                      const SizedBox(height: 18),
                      const Text(
                        'ROPE UNTANGLE',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 34,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                          color: Color(0xFF4A3520),
                          shadows: <Shadow>[
                            Shadow(color: Color(0x334A3520), offset: Offset(0, 2), blurRadius: 6),
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Untangle every thread',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF7A5C3C),
                          letterSpacing: 0.4,
                        ),
                      ),
                      const SizedBox(height: 22),
                      _progressPanel(),
                      const SizedBox(height: 22),
                      SizedBox(
                        height: 58,
                        child: WoodButton(label: '▶  PLAY', primary: true, onPressed: _openLevels),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: SizedBox(
                              height: 48,
                              child: WoodButton(label: '❔ How to play', ghost: true, onPressed: _showHowTo),
                            ),
                          ),
                          const SizedBox(width: 10),
                          GestureDetector(
                            onTap: _toggleMute,
                            child: Container(
                              width: 52,
                              height: 48,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: const Color(0xE6FFF9EE),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0x407A4F24)),
                                boxShadow: const <BoxShadow>[
                                  BoxShadow(color: Color(0x407A4F24), offset: Offset(0, 3)),
                                ],
                              ),
                              child: Text(_muted ? '🔇' : '🔊', style: const TextStyle(fontSize: 19)),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: Text(
                          '$kLevelCount puzzles · 13 board shapes · 10 tiers',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: Color(0x995A381A),
                          ),
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

  Widget _progressPanel() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xD1FFF9EE),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x8CFFFFFF)),
        boxShadow: const <BoxShadow>[
          BoxShadow(color: Color(0x2E4A3520), offset: Offset(0, 10), blurRadius: 30),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: <Widget>[
          _progressItem('⭐', '$_totalStars', 'of ${kLevelCount * 3} stars'),
          Container(width: 1, height: 34, color: const Color(0x337A4F24)),
          _progressItem('🧩', '$_solved', 'of $kLevelCount solved'),
        ],
      ),
    );
  }

  Widget _progressItem(String icon, String value, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Text(icon, style: const TextStyle(fontSize: 20)),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Text(
              value,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF4A3520)),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Color(0xFF7A5C3C)),
            ),
          ],
        ),
      ],
    );
  }
}

class _Rule extends StatelessWidget {
  const _Rule({required this.icon, required this.text});

  final String icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(icon, style: const TextStyle(fontSize: 18)),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 13.5, height: 1.4, color: Color(0xFF5A381A), fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';

import 'screens/game_screen.dart';

void main() {
  runApp(const RopeUntangleApp());
}

class RopeUntangleApp extends StatelessWidget {
  const RopeUntangleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rope Untangle',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFE6DCC6),
        fontFamily: 'Roboto',
      ),
      home: const GameScreen(),
    );
  }
}

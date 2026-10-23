import 'package:flutter/material.dart';

/// Chunky wooden button matching the web app's .btn style.
class WoodButton extends StatelessWidget {
  const WoodButton({
    super.key,
    required this.label,
    this.onPressed,
    this.primary = false,
    this.ghost = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool primary;
  final bool ghost;

  @override
  Widget build(BuildContext context) {
    final bool disabled = onPressed == null;
    final Color start = primary
        ? const Color(0xFFF2D274)
        : ghost
            ? const Color(0xE6FFF9EE)
            : const Color(0xFFF6E2C1);
    final Color end = primary
        ? const Color(0xFFD9A92F)
        : ghost
            ? const Color(0xE6FFF9EE)
            : const Color(0xFFE3C08E);

    return Opacity(
      opacity: disabled ? 0.42 : 1,
      child: GestureDetector(
        onTap: disabled ? null : onPressed,
        child: Container(
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: <Color>[start, end],
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x407A4F24)),
            boxShadow: disabled
                ? null
                : const <BoxShadow>[
                    BoxShadow(color: Color(0x597A4F24), offset: Offset(0, 4), blurRadius: 0),
                    BoxShadow(color: 0x264A3520, offset: Offset(0, 6), blurRadius: 14),
                  ],
          ),
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                label,
                style: const TextStyle(
                  color: Color(0xFF4A3520),
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

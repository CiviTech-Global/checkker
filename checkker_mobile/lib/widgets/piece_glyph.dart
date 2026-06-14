import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Renders a single chess piece as a solid silhouette with a contrasting
/// outline, so both armies share one consistent design and stay legible on any
/// square color. The glyph is always a filled glyph (see `pieceUnicode` in
/// theme/tokens.dart); white vs black is conveyed purely by [fill].
class PieceGlyph extends StatelessWidget {
  /// A solid chess glyph, e.g. U+265A–U+265F.
  final String glyph;

  /// Fill color for the silhouette (light for white pieces, dark for black).
  final Color fill;

  /// Square size; the glyph is rendered at ~65% of this.
  final double size;

  const PieceGlyph({
    super.key,
    required this.glyph,
    required this.fill,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    final fontSize = size * 0.65;
    // Outline contrasts with the fill: dark rim for light pieces, light rim for
    // dark pieces. This keeps a white piece visible on a light square and a
    // black piece visible on a dark square.
    final bool lightPiece = fill.computeLuminance() > 0.5;
    final Color outline =
        lightPiece ? const Color(0xCC0B0814) : const Color(0x99FFFFFF);
    final double strokeWidth = math.max(1.2, fontSize * 0.05);

    return Stack(
      alignment: Alignment.center,
      children: [
        // Outline (stroked silhouette) with a soft drop shadow for depth.
        Text(
          glyph,
          style: TextStyle(
            fontSize: fontSize,
            height: 1.0,
            shadows: const [
              Shadow(color: Color(0x66000000), offset: Offset(0, 1), blurRadius: 2),
            ],
            foreground: Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = strokeWidth
              ..strokeJoin = StrokeJoin.round
              ..color = outline,
          ),
        ),
        // Filled silhouette on top.
        Text(
          glyph,
          style: TextStyle(
            fontSize: fontSize,
            height: 1.0,
            color: fill,
          ),
        ),
      ],
    );
  }
}

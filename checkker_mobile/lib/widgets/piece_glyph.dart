import 'package:flutter/material.dart';

/// Renders a single chess piece as a solid silhouette in an exact color.
///
/// Crucially, the glyph is recolored by its alpha mask via
/// [ColorFilter.mode] + [BlendMode.srcIn] rather than relying on the text
/// `color`. Some platforms render the Unicode chess glyphs (U+265A–F) through a
/// fallback/emoji font that ignores the requested text color — which made white
/// pieces appear black. Masking by alpha forces the fill regardless of how the
/// font draws the glyph, so both armies share one design and the right color.
class PieceGlyph extends StatelessWidget {
  /// A solid chess glyph, e.g. U+265A–U+265F.
  final String glyph;

  /// Fill color for the silhouette (light for white pieces, dark for black).
  final Color fill;

  /// Square size; the glyph is rendered at ~66% of this.
  final double size;

  const PieceGlyph({
    super.key,
    required this.glyph,
    required this.fill,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    final fontSize = size * 0.66;
    // Contrasting rim: dark for light pieces, light for dark pieces — keeps a
    // white piece readable on a light square and a black piece on a dark one.
    final bool lightPiece = fill.computeLuminance() > 0.5;
    final Color outline =
        lightPiece ? const Color(0xF00B0814) : const Color(0xF0F2ECFF);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Soft drop shadow.
          _maskedGlyph(fontSize, const Color(0x55000000), scale: 1.12, dy: 1.5),
          // Outline rim (slightly larger silhouette behind the fill).
          _maskedGlyph(fontSize, outline, scale: 1.12),
          // Fill.
          _maskedGlyph(fontSize, fill, scale: 1.0),
        ],
      ),
    );
  }

  /// The glyph recolored to [color] via an alpha-mask blend, optionally scaled
  /// (for the rim) and nudged (for the shadow).
  Widget _maskedGlyph(double fontSize, Color color,
      {double scale = 1.0, double dy = 0}) {
    Widget child = ColorFiltered(
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      child: Text(
        glyph,
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: fontSize,
          height: 1.0,
          // Any fully-opaque color works; srcIn replaces it with [color].
          color: const Color(0xFF000000),
        ),
      ),
    );
    if (scale != 1.0) {
      child = Transform.scale(scale: scale, child: child);
    }
    if (dy != 0) {
      child = Transform.translate(offset: Offset(0, dy), child: child);
    }
    return child;
  }
}

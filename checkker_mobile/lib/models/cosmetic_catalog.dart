import 'package:flutter/material.dart';

/// Dart mirror of packages/shared/src/cosmetics.ts.
///
/// Each entry is keyed by the stable string stored in the server's
/// Cosmetic.assetUrl column, so a Cosmetic row maps back to its
/// color-based visual definition without shipping image assets.

class BoardTheme {
  final Color light;
  final Color dark;
  const BoardTheme(this.light, this.dark);
}

class PieceTheme {
  final Color white;
  final Color black;
  const PieceTheme(this.white, this.black);
}

class CardBackTheme {
  final Color primary;
  final Color accent;
  const CardBackTheme(this.primary, this.accent);
}

class CosmeticVisualDef {
  final String key;
  final String type; // 'board' | 'piece' | 'card_back'
  final bool isDefault;
  final BoardTheme? board;
  final PieceTheme? piece;
  final CardBackTheme? cardBack;

  const CosmeticVisualDef({
    required this.key,
    required this.type,
    this.isDefault = false,
    this.board,
    this.piece,
    this.cardBack,
  });
}

const Map<String, CosmeticVisualDef> cosmeticCatalog = {
  // Board themes
  'board_casino': CosmeticVisualDef(key: 'board_casino', type: 'board', isDefault: true, board: BoardTheme(Color(0xFFC8B078), Color(0xFF2A6830))),
  'board_walnut': CosmeticVisualDef(key: 'board_walnut', type: 'board', board: BoardTheme(Color(0xFFE8D0AA), Color(0xFF7A5230))),
  'board_marble': CosmeticVisualDef(key: 'board_marble', type: 'board', board: BoardTheme(Color(0xFFD8D8D8), Color(0xFF7E8A93))),
  'board_midnight': CosmeticVisualDef(key: 'board_midnight', type: 'board', board: BoardTheme(Color(0xFF9FB4CC), Color(0xFF27496D))),
  'board_rosewood': CosmeticVisualDef(key: 'board_rosewood', type: 'board', board: BoardTheme(Color(0xFFE3C1A0), Color(0xFF8B3A2F))),
  'board_emerald': CosmeticVisualDef(key: 'board_emerald', type: 'board', board: BoardTheme(Color(0xFFBFE3C0), Color(0xFF1F6F43))),
  'board_lapis': CosmeticVisualDef(key: 'board_lapis', type: 'board', board: BoardTheme(Color(0xFFE9E2CF), Color(0xFF1A3A6B))),
  'board_burgundy': CosmeticVisualDef(key: 'board_burgundy', type: 'board', board: BoardTheme(Color(0xFFDCB8A6), Color(0xFF6B1F2D))),
  'board_gold': CosmeticVisualDef(key: 'board_gold', type: 'board', board: BoardTheme(Color(0xFFF5D680), Color(0xFF2B2B2B))),
  'board_neon': CosmeticVisualDef(key: 'board_neon', type: 'board', board: BoardTheme(Color(0xFF3DD6C3), Color(0xFF23104A))),

  // Piece themes
  'piece_classic': CosmeticVisualDef(key: 'piece_classic', type: 'piece', isDefault: true, piece: PieceTheme(Color(0xFFFFFFFF), Color(0xFF111111))),
  'piece_bone': CosmeticVisualDef(key: 'piece_bone', type: 'piece', piece: PieceTheme(Color(0xFFEFE6D0), Color(0xFF2E2620))),
  'piece_navy': CosmeticVisualDef(key: 'piece_navy', type: 'piece', piece: PieceTheme(Color(0xFFF4EAD6), Color(0xFF16365C))),
  'piece_crimson': CosmeticVisualDef(key: 'piece_crimson', type: 'piece', piece: PieceTheme(Color(0xFFF5EFE0), Color(0xFF7A1622))),
  'piece_forest': CosmeticVisualDef(key: 'piece_forest', type: 'piece', piece: PieceTheme(Color(0xFFEEF2DD), Color(0xFF1D4A2C))),
  'piece_silver': CosmeticVisualDef(key: 'piece_silver', type: 'piece', piece: PieceTheme(Color(0xFFE8EEF2), Color(0xFF4D5A66))),
  'piece_amethyst': CosmeticVisualDef(key: 'piece_amethyst', type: 'piece', piece: PieceTheme(Color(0xFFF0E6F7), Color(0xFF4D2178))),
  'piece_bronze': CosmeticVisualDef(key: 'piece_bronze', type: 'piece', piece: PieceTheme(Color(0xFFE9CF9E), Color(0xFF6E4218))),
  'piece_gold': CosmeticVisualDef(key: 'piece_gold', type: 'piece', piece: PieceTheme(Color(0xFFF5D680), Color(0xFF8A6A1D))),
  'piece_neon': CosmeticVisualDef(key: 'piece_neon', type: 'piece', piece: PieceTheme(Color(0xFF7DF9FF), Color(0xFFFF4FD8))),

  // Card backs
  'back_casino': CosmeticVisualDef(key: 'back_casino', type: 'card_back', isDefault: true, cardBack: CardBackTheme(Color(0xFF18472A), Color(0xFFD4A843))),
  'back_crimson': CosmeticVisualDef(key: 'back_crimson', type: 'card_back', cardBack: CardBackTheme(Color(0xFF7A1622), Color(0xFFF5D680))),
  'back_navy': CosmeticVisualDef(key: 'back_navy', type: 'card_back', cardBack: CardBackTheme(Color(0xFF16365C), Color(0xFFC9D6E8))),
  'back_slate': CosmeticVisualDef(key: 'back_slate', type: 'card_back', cardBack: CardBackTheme(Color(0xFF3C454D), Color(0xFFAEB9C2))),
  'back_violet': CosmeticVisualDef(key: 'back_violet', type: 'card_back', cardBack: CardBackTheme(Color(0xFF3D1D63), Color(0xFFC9A7F0))),
  'back_paisley': CosmeticVisualDef(key: 'back_paisley', type: 'card_back', cardBack: CardBackTheme(Color(0xFF1A3A6B), Color(0xFFD4A843))),
  'back_ember': CosmeticVisualDef(key: 'back_ember', type: 'card_back', cardBack: CardBackTheme(Color(0xFF5C2510), Color(0xFFFF8C42))),
  'back_jade': CosmeticVisualDef(key: 'back_jade', type: 'card_back', cardBack: CardBackTheme(Color(0xFF0F5132), Color(0xFF9BE8C0))),
  'back_gold': CosmeticVisualDef(key: 'back_gold', type: 'card_back', cardBack: CardBackTheme(Color(0xFF2B2B2B), Color(0xFFF5D680))),
  'back_neon': CosmeticVisualDef(key: 'back_neon', type: 'card_back', cardBack: CardBackTheme(Color(0xFF0D0D2B), Color(0xFF3DD6C3))),
};

CosmeticVisualDef? getCosmeticVisualDef(String? key) {
  if (key == null) return null;
  return cosmeticCatalog[key];
}

import 'package:flutter/foundation.dart';

import '../models/cosmetic_catalog.dart';
import 'socket_service.dart';

/// Reactive store for the player's equipped cosmetic visuals, derived from
/// the server's cosmetics payloads. Game widgets listen via
/// ValueListenableBuilder(valueListenable: equippedVisuals, ...) so equipped
/// themes apply live. Updated from the socket cosmetics stream (see
/// socket_provider.dart).
class EquippedVisuals {
  final BoardTheme? board;
  final PieceTheme? piece;
  final CardBackTheme? cardBack;

  const EquippedVisuals({this.board, this.piece, this.cardBack});
}

final ValueNotifier<EquippedVisuals> equippedVisuals =
    ValueNotifier(const EquippedVisuals());

void updateEquippedVisuals(CosmeticsData data) {
  BoardTheme? board;
  PieceTheme? piece;
  CardBackTheme? cardBack;

  for (final uc in data.userCosmetics) {
    if (!uc.equipped) continue;
    String? key = uc.cosmetic?.assetUrl;
    if (key == null) {
      for (final c in data.cosmetics) {
        if (c.id == uc.cosmeticId) {
          key = c.assetUrl;
          break;
        }
      }
    }
    final def = getCosmeticVisualDef(key);
    // Defaults match the base theme tokens; leave them null so widgets
    // keep their built-in styling (notably untinted piece glyphs).
    if (def == null || def.isDefault) continue;
    if (def.type == 'board') {
      board = def.board;
    } else if (def.type == 'piece') {
      piece = def.piece;
    } else if (def.type == 'card_back') {
      cardBack = def.cardBack;
    }
  }

  equippedVisuals.value =
      EquippedVisuals(board: board, piece: piece, cardBack: cardBack);
}

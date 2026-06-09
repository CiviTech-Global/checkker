import 'package:flutter/material.dart';

import '../models/card.dart';
import '../models/poker.dart';
import '../theme/tokens.dart';
import 'card_hand.dart';
import 'player_profile_card.dart';
import 'score_pile.dart';

class PlayerPanel extends StatelessWidget {
  final String name;
  final int? rating;
  final String? avatarId;
  final bool isActive;
  final List<PlayingCard> hand;
  final int? selectedCardIndex;
  final ValueChanged<int>? onCardSelected;
  final List<PlayingCard> captured;
  final PokerResult? poker;
  final int? totalScore;
  final bool isOpponent;

  const PlayerPanel({
    super.key,
    required this.name,
    this.rating,
    this.avatarId,
    this.isActive = false,
    required this.hand,
    this.selectedCardIndex,
    this.onCardSelected,
    required this.captured,
    this.poker,
    this.totalScore,
    this.isOpponent = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Profile + score row
          Row(
            children: [
              PlayerProfileCard(
                name: name,
                rating: rating,
                avatarId: avatarId,
                isActive: isActive,
              ),
              const Spacer(),
              if (totalScore != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.bg.secondary,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(color: AppColors.border.subtle),
                  ),
                  child: Text(
                    '$totalScore',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.accent.gold,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          // Hand
          if (!isOpponent)
            CardHand(
              cards: hand,
              selectedIndex: selectedCardIndex,
              onCardTap: onCardSelected ?? (_) {},
            ),
          // Captured cards
          if (captured.isNotEmpty) ...[
            const SizedBox(height: 4),
            ScorePile(cards: captured),
          ],
        ],
      ),
    );
  }
}

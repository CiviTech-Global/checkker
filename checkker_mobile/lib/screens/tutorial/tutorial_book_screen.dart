import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/tokens.dart';

const _sections = <_BookSection>[
  _BookSection(
    title: 'Overview',
    body: 'Checkker is a hybrid game that fuses the strategic depth of chess with the scoring excitement of poker. '
        'Each player controls a full set of chess pieces on a standard 8x8 board, but instead of moving freely, '
        'you must play a card from your hand to authorize each move. The card you play determines which piece type '
        'you can move that turn.\n\n'
        'Games end via checkmate, resignation, timeout, or deck exhaustion. After the game concludes, both players\' '
        'captured-card piles are evaluated for poker hands, and the combined chess + poker score determines the final result.',
  ),
  _BookSection(
    title: 'Card Types',
    body: 'Checkker uses a standard 52-card deck with four suits (hearts, diamonds, clubs, spades) and thirteen ranks '
        '(2 through Ace). Cards serve two purposes:\n\n'
        '1. Movement authorization: The rank of a card determines which chess piece you can move.\n'
        '2. Scoring: Cards collected through captures form poker hands at the end of the game.\n\n'
        'Card-to-piece mapping:\n'
        '  2, 3, 4 - Pawns\n'
        '  5, 6 - Knights\n'
        '  7, 8 - Bishops\n'
        '  9, 10 - Rooks\n'
        '  Jack, Queen - Queen\n'
        '  King, Ace - King\n\n'
        'Each player is dealt a hand of cards at the start, and draws a replacement card after each move.',
  ),
  _BookSection(
    title: 'Chess Pieces',
    body: 'All standard chess pieces and rules apply:\n\n'
        'King: Moves one square in any direction. Cannot move into check. Can castle with a rook under standard conditions.\n\n'
        'Queen: Moves any number of squares horizontally, vertically, or diagonally. The most powerful piece.\n\n'
        'Rook: Moves any number of squares horizontally or vertically. Participates in castling.\n\n'
        'Bishop: Moves any number of squares diagonally. Each bishop is bound to one square color.\n\n'
        'Knight: Moves in an L-shape (two squares + one square perpendicular). Can jump over other pieces.\n\n'
        'Pawn: Moves forward one square (or two from starting rank). Captures diagonally. Promotes upon reaching the back rank.',
  ),
  _BookSection(
    title: 'Poker Hands',
    body: 'At the end of the game, your score pile is evaluated for the best possible poker hands. '
        'Hand rankings from highest to lowest:\n\n'
        'Royal Flush (A-K-Q-J-10 of one suit): 100 points\n'
        'Straight Flush (five sequential same-suit cards): 75 points\n'
        'Four of a Kind (four cards of same rank): 50 points\n'
        'Full House (three of a kind + pair): 35 points\n'
        'Flush (five cards of same suit): 30 points\n'
        'Straight (five sequential cards, any suit): 25 points\n'
        'Three of a Kind: 15 points\n'
        'Two Pair: 10 points\n'
        'One Pair: 5 points\n'
        'High Card: 1 point\n\n'
        'Multiple hands can be scored from the same pile. Cards are used optimally to maximize total points.',
  ),
  _BookSection(
    title: 'Scoring',
    body: 'Final scores combine chess result points and poker points:\n\n'
        'Chess result points:\n'
        '  Checkmate winner: 30 pts (loser: 0)\n'
        '  Resignation winner: 25 pts (loser: 0)\n'
        '  Timeout winner: 25 pts (loser: 0)\n'
        '  Draw: 10 pts each\n'
        '  Deck exhausted: 0 pts each\n\n'
        'Poker points are calculated from each player\'s score pile as described in the Poker Hands section.\n\n'
        'The player with the higher combined score wins. In ranked play, scores also affect your rating.',
  ),
  _BookSection(
    title: 'Strategy',
    body: 'Key strategic principles for Checkker:\n\n'
        'Hand management: Your hand is limited. Save powerful cards (King, Ace) for critical endgame moves. '
        'Use low-value pawn cards for development.\n\n'
        'Capture planning: Every capture adds cards to your score pile. Try to capture in a way that builds '
        'strong poker hands (flushes, straights, pairs).\n\n'
        'Suit tracking: Pay attention to which suits you are accumulating. Focusing on one or two suits '
        'increases your chances of making flushes.\n\n'
        'Card counting: Keep track of what has been played. If many high cards are gone, your opponent '
        'may struggle to move their queen or king.\n\n'
        'Tempo vs. score: Sometimes the best chess move does not yield the best card reward. Learning '
        'when to prioritize position versus score is the key to mastering Checkker.\n\n'
        'Bot difficulty: Practice against Beginner bots to learn the basics, then progress through '
        'Intermediate, Advanced, and Master difficulty to sharpen your skills.',
  ),
];

class _BookSection {
  final String title;
  final String body;
  const _BookSection({required this.title, required this.body});
}

class TutorialBookScreen extends ConsumerWidget {
  const TutorialBookScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: const Text('Reference Book'),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: _sections.length,
        itemBuilder: (context, index) {
          final section = _sections[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.lg),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.bg.secondary,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: AppColors.border.subtle),
              ),
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 4,
                        height: 24,
                        decoration: BoxDecoration(
                          color: AppColors.accent.gold,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        section.title,
                        style: TextStyle(
                          fontSize: AppTypography.lg,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    section.body,
                    style: TextStyle(
                      fontSize: AppTypography.sm,
                      color: AppColors.text.secondary,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

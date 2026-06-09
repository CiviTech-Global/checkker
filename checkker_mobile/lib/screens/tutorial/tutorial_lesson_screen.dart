import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/tokens.dart';

const _prefsKey = 'tutorial_completed_lessons';

const _lessonContent = <int, _LessonData>{
  1: _LessonData(
    title: 'Chess Basics',
    body: 'Checkker uses a standard 8x8 chess board with all the traditional chess pieces. '
        'Each player starts with 16 pieces: one king, one queen, two rooks, two bishops, two knights, and eight pawns. '
        'The goal is still to checkmate your opponent\'s king, but in Checkker you also collect cards and score poker points along the way.',
  ),
  2: _LessonData(
    title: 'Card Types',
    body: 'In Checkker, a standard 52-card deck is used. Each card has a suit (hearts, diamonds, clubs, spades) '
        'and a rank (2 through Ace). Cards are drawn from a shared deck and dealt to both players. '
        'You must play a card each turn to authorize your chess move. Different cards allow different pieces to move.',
  ),
  3: _LessonData(
    title: 'Pawn Moves',
    body: 'Pawns move forward one square, or two squares from their starting position. '
        'They capture diagonally one square forward. In Checkker, pawns are associated with low-rank cards (2-4). '
        'When a pawn reaches the opposite end of the board it promotes, just like in standard chess.',
  ),
  4: _LessonData(
    title: 'Knight Moves',
    body: 'Knights move in an L-shape: two squares in one direction and one square perpendicular. '
        'They are the only piece that can jump over other pieces. '
        'Knights are associated with cards ranked 5 and 6 in the Checkker card system.',
  ),
  5: _LessonData(
    title: 'Bishop Moves',
    body: 'Bishops move diagonally any number of squares. Each bishop stays on its starting color for the entire game. '
        'Bishops are associated with cards ranked 7 and 8. '
        'Having the bishop pair is a strategic advantage in both chess and Checkker.',
  ),
  6: _LessonData(
    title: 'Rook Moves',
    body: 'Rooks move horizontally or vertically any number of squares. '
        'They are powerful pieces, especially in the endgame. Rooks are associated with cards ranked 9 and 10. '
        'Rooks also participate in castling with the king.',
  ),
  7: _LessonData(
    title: 'Queen Moves',
    body: 'The queen combines the power of a rook and bishop, moving any number of squares '
        'horizontally, vertically, or diagonally. The queen is associated with Jack and Queen cards. '
        'She is the most powerful piece on the board.',
  ),
  8: _LessonData(
    title: 'King & Castling',
    body: 'The king moves one square in any direction. Castling is a special move where the king moves '
        'two squares toward a rook, and that rook moves to the other side of the king. '
        'The king is associated with King and Ace cards. Protecting your king is always the top priority.',
  ),
  9: _LessonData(
    title: 'Card-Piece Mapping',
    body: 'Each card rank maps to specific chess pieces you can move:\n\n'
        '2-4: Pawns\n5-6: Knights\n7-8: Bishops\n9-10: Rooks\nJ-Q: Queen\nK-A: King\n\n'
        'This mapping is the core mechanic of Checkker. You can only move a piece if you have a matching card in hand.',
  ),
  10: _LessonData(
    title: 'Making Moves',
    body: 'On your turn, select a card from your hand, then make a legal chess move with a matching piece. '
        'The card is consumed when you play it. After your move, you draw a new card from the deck. '
        'If you have no valid moves with your current hand, you must pass your turn.',
  ),
  11: _LessonData(
    title: 'Captures & Bonus Cards',
    body: 'When you capture an opponent\'s piece, you earn bonus cards added to your score pile. '
        'Higher-value captures grant more bonus cards. Your score pile cards are used at the end of the game '
        'to form poker hands and earn points. Aggressive play is rewarded!',
  ),
  12: _LessonData(
    title: 'Poker Scoring',
    body: 'At the end of the game, each player\'s score pile is evaluated for poker hands:\n\n'
        'Royal Flush: 100 pts\nStraight Flush: 75 pts\nFour of a Kind: 50 pts\n'
        'Full House: 35 pts\nFlush: 30 pts\nStraight: 25 pts\n'
        'Three of a Kind: 15 pts\nTwo Pair: 10 pts\nOne Pair: 5 pts\n\n'
        'Chess result points are added to poker points for the final score.',
  ),
  13: _LessonData(
    title: 'Time Control',
    body: 'Checkker supports four time controls:\n\n'
        'Bullet: 3 minutes per player\nBlitz: 7 minutes per player\n'
        'Rapid: 15 minutes per player\nClassical: 25 minutes per player\n\n'
        'If your time runs out, you lose the game on time. Choose a time control that suits your play style.',
  ),
  14: _LessonData(
    title: 'Strategy Basics',
    body: 'Key strategies in Checkker:\n\n'
        '1. Hand management: Save high-value cards for critical moments.\n'
        '2. Capture wisely: Prioritize captures that build strong poker hands.\n'
        '3. Suit awareness: Track which suits you are collecting.\n'
        '4. Card counting: Keep track of what has been played from the deck.\n'
        '5. Balance chess and poker: Sometimes a weaker chess move gives better cards.',
  ),
  15: _LessonData(
    title: 'Advanced Tactics',
    body: 'Advanced Checkker tactics include:\n\n'
        '- Card trapping: Forcing your opponent to waste high-value cards on defensive moves.\n'
        '- Suit stacking: Deliberately collecting one suit to build flushes.\n'
        '- Tempo cards: Using low-value pawn moves to maintain tempo while saving better cards.\n'
        '- Sacrifice plays: Trading a piece for bonus cards that complete a poker hand.\n'
        '- Endgame planning: Ensuring you have king/ace cards available for the endgame.',
  ),
  16: _LessonData(
    title: 'Putting It Together',
    body: 'To master Checkker, combine chess skill with card strategy:\n\n'
        '1. Open with a plan for both your chess position and card collection.\n'
        '2. In the middlegame, look for captures that serve both chess and poker goals.\n'
        '3. In the endgame, manage your remaining cards carefully.\n'
        '4. Always consider the trade-off between a strong chess move and a strong poker score.\n\n'
        'Practice against bots at increasing difficulty to hone your skills. Good luck!',
  ),
};

class _LessonData {
  final String title;
  final String body;
  const _LessonData({required this.title, required this.body});
}

class TutorialLessonScreen extends ConsumerStatefulWidget {
  final String id;
  const TutorialLessonScreen({super.key, required this.id});

  @override
  ConsumerState<TutorialLessonScreen> createState() => _TutorialLessonScreenState();
}

class _TutorialLessonScreenState extends ConsumerState<TutorialLessonScreen> {
  bool _isComplete = false;

  int get _lessonNum => int.tryParse(widget.id) ?? 1;

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_prefsKey) ?? [];
    setState(() {
      _isComplete = list.contains('$_lessonNum');
    });
  }

  Future<void> _markComplete() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_prefsKey) ?? [];
    final set = list.toSet()..add('$_lessonNum');
    await prefs.setStringList(_prefsKey, set.toList());
    setState(() {
      _isComplete = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final lesson = _lessonContent[_lessonNum];
    final title = lesson?.title ?? 'Lesson $_lessonNum';
    final body = lesson?.body ?? 'Content for lesson $_lessonNum coming soon.';

    return Scaffold(
      backgroundColor: AppColors.bg.primary,
      appBar: AppBar(
        title: Text(title),
        backgroundColor: AppColors.bg.secondary,
        foregroundColor: AppColors.text.primary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _isComplete ? AppColors.accent.green : AppColors.bg.tertiary,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: _isComplete
                      ? Icon(Icons.check, size: 20, color: AppColors.bg.primary)
                      : Text(
                          '$_lessonNum',
                          style: TextStyle(
                            fontSize: AppTypography.md,
                            fontWeight: FontWeight.bold,
                            color: AppColors.text.primary,
                          ),
                        ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'Lesson $_lessonNum',
                    style: TextStyle(
                      fontSize: AppTypography.sm,
                      color: AppColors.text.muted,
                    ),
                  ),
                ),
                if (_isComplete)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xxs,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.accent.green.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    child: Text(
                      'Completed',
                      style: TextStyle(
                        fontSize: AppTypography.xs,
                        color: AppColors.accent.green,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Expanded(
              child: SingleChildScrollView(
                child: Text(
                  body,
                  style: TextStyle(
                    fontSize: AppTypography.body,
                    color: AppColors.text.secondary,
                    height: 1.6,
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            if (!_isComplete)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _markComplete,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent.primary,
                    foregroundColor: AppColors.text.primary,
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                    ),
                  ),
                  child: const Text(
                    'Mark Complete',
                    style: TextStyle(fontSize: AppTypography.body, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

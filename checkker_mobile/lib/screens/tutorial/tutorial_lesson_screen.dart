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
        'Checkmating your opponent\'s king is still the biggest prize, but in Checkker you also collect cards into a '
        'score pile and earn poker points along the way — the player with the higher TOTAL score wins.',
  ),
  2: _LessonData(
    title: 'Card Types',
    body: 'Checkker uses a standard 52-card deck. Each card has a suit (hearts, diamonds, clubs, spades) '
        'and a rank (2 through Ace). On your turn you draw 3 cards and must play ONE of them to authorize your chess move — '
        'the card\'s rank decides which piece you may move. Played cards go to the discard pile, '
        'unless your move was a capture, in which case the card joins your score pile.',
  ),
  3: _LessonData(
    title: 'Pawn Moves',
    body: 'Pawns move forward one square, or two squares from their starting position. '
        'They capture diagonally one square forward. In Checkker, any card ranked 3 through 9 moves a pawn, '
        'so pawn cards are by far the most common in the deck. '
        'When a pawn reaches the opposite end of the board it promotes, just like in standard chess.',
  ),
  4: _LessonData(
    title: 'Knight Moves',
    body: 'Knights move in an L-shape: two squares in one direction and one square perpendicular. '
        'They are the only piece that can jump over other pieces. '
        'In Checkker, the Jack (J) is the knight card — there are only four in the deck, so use them well.',
  ),
  5: _LessonData(
    title: 'Bishop Moves',
    body: 'Bishops move diagonally any number of squares. Each bishop stays on its starting color for the entire game. '
        'In Checkker, the 2 is the bishop card. '
        'Having the bishop pair is a strategic advantage in both chess and Checkker.',
  ),
  6: _LessonData(
    title: 'Rook Moves',
    body: 'Rooks move horizontally or vertically any number of squares. '
        'They are powerful pieces, especially in the endgame. In Checkker, the 10 is the rook card. '
        'Rooks also participate in castling with the king.',
  ),
  7: _LessonData(
    title: 'Queen Moves',
    body: 'The queen combines the power of a rook and bishop, moving any number of squares '
        'horizontally, vertically, or diagonally. In Checkker, the Queen (Q) card moves your queen — '
        'a natural match. She is the most powerful piece on the board.',
  ),
  8: _LessonData(
    title: 'King & Castling',
    body: 'The king moves one square in any direction. Castling is a special move where the king moves '
        'two squares toward a rook, and that rook moves to the other side of the king. '
        'In Checkker, the King (K) card moves your king. The Ace is special: it is a WILD card that can move '
        'ANY piece — but capturing with an Ace earns no bonus card draw. Protecting your king is always the top priority.',
  ),
  9: _LessonData(
    title: 'Card-Piece Mapping',
    body: 'Each card rank maps to a chess piece you can move:\n\n'
        'K: King\nQ: Queen\nJ: Knight\n10: Rook\n2: Bishop\n3-9: Pawns\nA: Wild (any piece)\n\n'
        'This mapping is the core mechanic of Checkker. You can only move a piece if you have a matching card '
        '(or an Ace) in hand.',
  ),
  10: _LessonData(
    title: 'Making Moves',
    body: 'On your turn, you draw 3 cards, then select one and make a legal chess move with a matching piece. '
        'The played card is consumed: it goes to the discard pile on a quiet move, or to your SCORE PILE if the move '
        'captured a piece. Your score pile is what gets scored as poker hands at the end of the game. '
        'If none of your cards allow a legal move, you discard your hand and draw fresh cards.',
  ),
  11: _LessonData(
    title: 'Captures & Bonus Cards',
    body: 'Capturing does two things. First, the card you played goes to your score pile instead of the discard pile. '
        'Second, you draw BONUS cards based on what you captured:\n\n'
        'Pawn: 1 card\nKnight / Bishop / Rook: 2 cards\nQueen: 3 cards\nGiving check: +1 card\n\n'
        'Captures made with an Ace earn no bonus draw. Aggressive, well-timed captures build both your position '
        'and your poker hand.',
  ),
  12: _LessonData(
    title: 'Poker Scoring',
    body: 'At game end, your best 5-card poker hand from your score pile is scored:\n\n'
        'Royal Flush: 25 pts\nStraight Flush: 18 pts\nFour of a Kind: 14 pts\n'
        'Full House: 10 pts\nFlush: 8 pts\nStraight: 6 pts\n'
        'Three of a Kind: 4 pts\nTwo Pair: 3 pts\nOne Pair: 1 pt\nHigh Card: 0 pts\n\n'
        'Chess result points are added on top: Checkmate is worth 30, resignation or timeout gives the winner 25, '
        'and a draw gives each player 10. Highest total wins.',
  ),
  13: _LessonData(
    title: 'Time Control',
    body: 'Checkker supports four time controls:\n\n'
        'Bullet: 3 minutes per player\nBlitz: 7 minutes per player\n'
        'Rapid: 15 minutes per player\nClassical: 25 minutes per player\n\n'
        'If your time runs out, your opponent wins 25 points on time. Choose a time control that suits your play style.',
  ),
  14: _LessonData(
    title: 'Strategy Basics',
    body: 'Key strategies in Checkker:\n\n'
        '1. Hand management: K, Q, J and 10 cards are scarce — don\'t burn them on moves a pawn card could make.\n'
        '2. Capture wisely: captures send your played card to the score pile, so capture with cards that build a poker hand.\n'
        '3. Suit awareness: track which suits you are collecting toward a flush.\n'
        '4. Card counting: only four of each non-pawn rank exist; remember what has been played.\n'
        '5. Balance chess and poker: sometimes a slightly weaker chess move scores far better.',
  ),
  15: _LessonData(
    title: 'Advanced Tactics',
    body: 'Advanced Checkker tactics include:\n\n'
        '- Card trapping: forcing your opponent to spend scarce K/Q/J/10 cards on defensive moves.\n'
        '- Suit stacking: capturing with one suit deliberately to assemble flushes.\n'
        '- Tempo pawns: using plentiful pawn cards (3-9) to keep the initiative while saving stronger cards.\n'
        '- Check bonuses: a capture that also gives check draws an extra bonus card.\n'
        '- Ace discipline: the wild Ace is flexible but earns no bonus draw on capture — spend it on mobility, not greed.\n'
        '- Endgame planning: keep a King card (or an Ace) in reserve so your king is never stranded.',
  ),
  16: _LessonData(
    title: 'Putting It Together',
    body: 'To master Checkker, combine chess skill with card strategy:\n\n'
        '1. Open with a plan for both your chess position and your card collection.\n'
        '2. In the middlegame, look for captures that serve both chess and poker goals.\n'
        '3. In the endgame, manage your remaining cards carefully.\n'
        '4. Always weigh a strong chess move against a strong poker score — 30 points for checkmate usually wins, '
        'but a Royal Flush (25) plus a draw (10) beats it.\n\n'
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

enum PuzzleCategory {
  daily,
  tactics,
  cardPlay,
  endgame,
  weakness,
}

class PuzzleCategoryData {
  final PuzzleCategory category;
  final String title;
  final String description;
  final String symbol;
  final int count;
  final String colorHex;

  const PuzzleCategoryData({
    required this.category,
    required this.title,
    required this.description,
    required this.symbol,
    required this.count,
    required this.colorHex,
  });
}

const List<PuzzleCategoryData> puzzleCategories = [
  PuzzleCategoryData(
    category: PuzzleCategory.daily,
    title: 'Daily Puzzle',
    description: 'A fresh challenge every day',
    symbol: '\u2606',
    count: 1,
    colorHex: '#D4A843',
  ),
  PuzzleCategoryData(
    category: PuzzleCategory.tactics,
    title: 'Tactical Puzzles',
    description: 'Sharpen your chess vision',
    symbol: '\u2694',
    count: 50,
    colorHex: '#E04040',
  ),
  PuzzleCategoryData(
    category: PuzzleCategory.cardPlay,
    title: 'Card Management',
    description: 'Optimal card selection puzzles',
    symbol: '\u2666',
    count: 30,
    colorHex: '#22944F',
  ),
  PuzzleCategoryData(
    category: PuzzleCategory.endgame,
    title: 'Endgame Training',
    description: 'Master the final phase',
    symbol: '\u265A',
    count: 25,
    colorHex: '#CD7F32',
  ),
  PuzzleCategoryData(
    category: PuzzleCategory.weakness,
    title: 'Weakness Training',
    description: 'Puzzles targeting your weak spots',
    symbol: '\u2605',
    count: 0,
    colorHex: '#34D058',
  ),
];

String categoryToServerValue(PuzzleCategory category) {
  switch (category) {
    case PuzzleCategory.daily:
      return 'daily';
    case PuzzleCategory.tactics:
      return 'tactics';
    case PuzzleCategory.cardPlay:
      return 'card_management';
    case PuzzleCategory.endgame:
      return 'endgame';
    case PuzzleCategory.weakness:
      return 'weakness';
  }
}

class Puzzle {
  final String id;
  final String fen;
  final String solution; // UCI best move
  final String hint;
  final String difficulty;
  final String category;
  final int rating;

  const Puzzle({
    required this.id,
    required this.fen,
    required this.solution,
    required this.hint,
    required this.difficulty,
    required this.category,
    required this.rating,
  });

  factory Puzzle.fromJson(Map<String, dynamic> json) {
    final solutionRaw = json['solution'];
    String solution;
    if (solutionRaw is String) {
      solution = solutionRaw;
    } else if (solutionRaw is List && solutionRaw.isNotEmpty) {
      solution = solutionRaw.first as String;
    } else {
      solution = '';
    }
    return Puzzle(
      id: json['id'] as String? ?? '',
      fen: json['fen'] as String? ?? '',
      solution: solution,
      hint: json['hint'] as String? ?? json['description'] as String? ?? '',
      difficulty: json['difficulty'] as String? ?? 'beginner',
      category: json['category'] as String? ?? 'tactics',
      rating: json['rating'] as int? ?? 1500,
    );
  }
}

class PuzzleResult {
  final bool correct;
  final String solution;
  final String hint;
  final int streak;
  final int solved;
  final String? error;

  const PuzzleResult({
    required this.correct,
    required this.solution,
    required this.hint,
    this.streak = 0,
    this.solved = 0,
    this.error,
  });

  factory PuzzleResult.fromJson(Map<String, dynamic> json) {
    return PuzzleResult(
      correct: json['correct'] as bool? ?? false,
      solution: json['solution'] as String? ?? '',
      hint: json['hint'] as String? ?? '',
      streak: (json['stats']?['streak'] as num?)?.toInt() ?? 0,
      solved: (json['stats']?['solved'] as num?)?.toInt() ?? 0,
      error: json['error'] as String?,
    );
  }
}

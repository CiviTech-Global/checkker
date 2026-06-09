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

class Puzzle {
  final String id;
  final String fen;
  final List<String> solution;
  final String difficulty;
  final String description;
  final String category;
  final int rating;

  const Puzzle({
    required this.id,
    required this.fen,
    required this.solution,
    required this.difficulty,
    required this.description,
    required this.category,
    required this.rating,
  });

  factory Puzzle.fromJson(Map<String, dynamic> json) {
    return Puzzle(
      id: json['id'] as String,
      fen: json['fen'] as String,
      solution: (json['solution'] as List).cast<String>(),
      difficulty: json['difficulty'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      rating: json['rating'] as int,
    );
  }
}

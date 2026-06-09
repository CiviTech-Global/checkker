/// Playing card types for the Checkker card system.
/// Port of packages/shared/src/cards.ts

enum Suit { clubs, diamonds, hearts, spades }

const List<String> suitNames = ['clubs', 'diamonds', 'hearts', 'spades'];

enum Rank { two, three, four, five, six, seven, eight, nine, ten, jack, queen, king, ace }

const Map<Rank, String> rankLabels = {
  Rank.two: '2',
  Rank.three: '3',
  Rank.four: '4',
  Rank.five: '5',
  Rank.six: '6',
  Rank.seven: '7',
  Rank.eight: '8',
  Rank.nine: '9',
  Rank.ten: '10',
  Rank.jack: 'J',
  Rank.queen: 'Q',
  Rank.king: 'K',
  Rank.ace: 'A',
};

enum PieceType { king, queen, rook, bishop, knight, pawn, wild }

const Map<Rank, PieceType> cardToPieceMap = {
  Rank.king: PieceType.king,
  Rank.queen: PieceType.queen,
  Rank.jack: PieceType.knight,
  Rank.ten: PieceType.rook,
  Rank.two: PieceType.bishop,
  Rank.three: PieceType.pawn,
  Rank.four: PieceType.pawn,
  Rank.five: PieceType.pawn,
  Rank.six: PieceType.pawn,
  Rank.seven: PieceType.pawn,
  Rank.eight: PieceType.pawn,
  Rank.nine: PieceType.pawn,
  Rank.ace: PieceType.wild,
};

class PlayingCard {
  final Suit suit;
  final Rank rank;

  const PlayingCard({required this.suit, required this.rank});

  PieceType get pieceType => cardToPieceMap[rank]!;
  String get rankLabel => rankLabels[rank]!;
  String get suitName => suit.name;
  String get id => '${rankLabel}${suitName[0]}';

  String get suitSymbol {
    switch (suit) {
      case Suit.clubs: return '\u2663';
      case Suit.diamonds: return '\u2666';
      case Suit.hearts: return '\u2665';
      case Suit.spades: return '\u2660';
    }
  }

  bool get isRed => suit == Suit.diamonds || suit == Suit.hearts;

  factory PlayingCard.fromJson(Map<String, dynamic> json) {
    final suitStr = json['suit'] as String;
    final rankStr = json['rank'] as String;
    return PlayingCard(
      suit: Suit.values.firstWhere((s) => s.name == suitStr),
      rank: rankLabels.entries.firstWhere((e) => e.value == rankStr).key,
    );
  }

  Map<String, dynamic> toJson() => {'suit': suitName, 'rank': rankLabel};

  @override
  String toString() => '$rankLabel of $suitName';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PlayingCard && suit == other.suit && rank == other.rank;

  @override
  int get hashCode => Object.hash(suit, rank);
}

PieceType cardToPiece(PlayingCard card) => card.pieceType;

String cardIdStr(PlayingCard card) => card.id;

List<PlayingCard> createDeck() {
  final deck = <PlayingCard>[];
  for (final suit in Suit.values) {
    for (final rank in Rank.values) {
      deck.add(PlayingCard(suit: suit, rank: rank));
    }
  }
  return deck;
}

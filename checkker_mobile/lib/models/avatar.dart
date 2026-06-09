class AvatarDef {
  final String id;
  final String label;
  final String symbol;

  const AvatarDef({required this.id, required this.label, required this.symbol});
}

const List<AvatarDef> avatars = [
  AvatarDef(id: 'king_white', label: 'White King', symbol: '\u2654'),
  AvatarDef(id: 'queen_white', label: 'White Queen', symbol: '\u2655'),
  AvatarDef(id: 'rook_white', label: 'White Rook', symbol: '\u2656'),
  AvatarDef(id: 'bishop_white', label: 'White Bishop', symbol: '\u2657'),
  AvatarDef(id: 'knight_white', label: 'White Knight', symbol: '\u2658'),
  AvatarDef(id: 'pawn_white', label: 'White Pawn', symbol: '\u2659'),
  AvatarDef(id: 'king_black', label: 'Black King', symbol: '\u265A'),
  AvatarDef(id: 'queen_black', label: 'Black Queen', symbol: '\u265B'),
  AvatarDef(id: 'rook_black', label: 'Black Rook', symbol: '\u265C'),
  AvatarDef(id: 'bishop_black', label: 'Black Bishop', symbol: '\u265D'),
  AvatarDef(id: 'knight_black', label: 'Black Knight', symbol: '\u265E'),
  AvatarDef(id: 'pawn_black', label: 'Black Pawn', symbol: '\u265F'),
  AvatarDef(id: 'diamond', label: 'Diamond', symbol: '\u2666'),
  AvatarDef(id: 'club', label: 'Club', symbol: '\u2663'),
  AvatarDef(id: 'heart', label: 'Heart', symbol: '\u2665'),
  AvatarDef(id: 'spade', label: 'Spade', symbol: '\u2660'),
];

AvatarDef getAvatar(String? id) {
  if (id == null) return avatars[0];
  return avatars.firstWhere((a) => a.id == id, orElse: () => avatars[0]);
}

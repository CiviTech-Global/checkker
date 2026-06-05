export interface AvatarDef {
  id: string;
  label: string;
  symbol: string;
}

export const AVATARS: AvatarDef[] = [
  { id: "king_white", label: "White King", symbol: "\u2654" },
  { id: "queen_white", label: "White Queen", symbol: "\u2655" },
  { id: "rook_white", label: "White Rook", symbol: "\u2656" },
  { id: "bishop_white", label: "White Bishop", symbol: "\u2657" },
  { id: "knight_white", label: "White Knight", symbol: "\u2658" },
  { id: "pawn_white", label: "White Pawn", symbol: "\u2659" },
  { id: "king_black", label: "Black King", symbol: "\u265A" },
  { id: "queen_black", label: "Black Queen", symbol: "\u265B" },
  { id: "rook_black", label: "Black Rook", symbol: "\u265C" },
  { id: "bishop_black", label: "Black Bishop", symbol: "\u265D" },
  { id: "knight_black", label: "Black Knight", symbol: "\u265E" },
  { id: "pawn_black", label: "Black Pawn", symbol: "\u265F" },
  { id: "diamond", label: "Diamond", symbol: "\u2666" },
  { id: "club", label: "Club", symbol: "\u2663" },
  { id: "heart", label: "Heart", symbol: "\u2665" },
  { id: "spade", label: "Spade", symbol: "\u2660" },
];

export function getAvatar(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

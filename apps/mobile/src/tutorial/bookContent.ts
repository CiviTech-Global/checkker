import type { GalleryImageKey } from "../../assets/gallery";

export interface BookPage {
  title: string;
  image: GalleryImageKey;
  cardRank: string;
  pieceType: string;
  description: string;
  flavorText: string;
}

export const BOOK_PAGES: BookPage[] = [
  {
    title: "The King",
    image: "king",
    cardRank: "K",
    pieceType: "King",
    description:
      "The King moves one square in any direction — horizontally, vertically, or diagonally. Protect your King at all costs; if it falls, the game is lost.",
    flavorText:
      "The Shah sits upon his throne, surveying the battlefield one step at a time. Slow, deliberate, yet the heart of the empire.",
  },
  {
    title: "The Queen",
    image: "queen",
    cardRank: "Q",
    pieceType: "Queen",
    description:
      "The Queen is the most powerful piece on the board. She moves any number of squares horizontally, vertically, or diagonally.",
    flavorText:
      "The Vizier commands the court with unmatched authority — sweeping across the board like a desert wind, no corner beyond her reach.",
  },
  {
    title: "The Knight",
    image: "knight",
    cardRank: "J (Jack)",
    pieceType: "Knight",
    description:
      "The Knight moves in an L-shape: two squares in one direction and one square perpendicular. It is the only piece that can jump over others.",
    flavorText:
      "The mounted warrior leaps over walls and allies alike. Unpredictable and cunning, the Knight strikes where least expected.",
  },
  {
    title: "The Rook",
    image: "rook",
    cardRank: "10",
    pieceType: "Rook",
    description:
      "The Rook moves any number of squares horizontally or vertically. It excels in open files and ranks, dominating straight lines.",
    flavorText:
      "The war tower stands resolute on the horizon, commanding roads and rivers with unyielding strength.",
  },
  {
    title: "The Bishop",
    image: "bishop",
    cardRank: "2",
    pieceType: "Bishop",
    description:
      "The Bishop moves any number of squares diagonally. Each Bishop is bound to one color of square for the entire game.",
    flavorText:
      "The court advisor moves through shadows and light, always at an angle — a whisper of counsel that crosses the board unseen.",
  },
  {
    title: "The Pawns",
    image: "pawns",
    cardRank: "3–9",
    pieceType: "Pawns",
    description:
      "Pawns move forward one square (or two on their first move). They capture diagonally. A pawn that reaches the far rank promotes to any piece.",
    flavorText:
      "The foot soldiers of the empire march forward with quiet determination. Humble yet numerous, a single pawn can change the fate of kingdoms.",
  },
  {
    title: "The Ace — Wild Card",
    image: "aceWild",
    cardRank: "A (Ace)",
    pieceType: "Any piece",
    description:
      "The Ace is a wild card — play it to move any one of your pieces. It gives you freedom to respond to any situation on the board.",
    flavorText:
      "The joker of the royal court bows to no rule. When the Ace appears, any piece may answer the call.",
  },
];

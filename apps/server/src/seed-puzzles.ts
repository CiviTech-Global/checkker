import { PuzzleRepository } from "@checkker/database";

const seedPuzzles = [
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    solution: "f1c4",
    hint: "Deliver mate in one by moving the bishop to c4. Scholar's mate pattern.",
    difficulty: "beginner",
    category: "tactics",
    rating: 400,
  },
  {
    fen: "r1bqk2r/ppp2ppp/2np1n2/1B2p3/1b2P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6",
    solution: "d3d4",
    hint: "Open lines by pushing the d-pawn. Center break.",
    difficulty: "beginner",
    category: "tactics",
    rating: 600,
  },
  {
    fen: "r3k2r/ppp2ppp/2n1pn2/1B2Nb2/1b2P3/2N2P2/PPP3PP/R1BQK2R w KQkq - 0 9",
    solution: "c3d5",
    hint: "A knight outpost on d5 creates pressure. Knight outpost.",
    difficulty: "intermediate",
    category: "card_management",
    rating: 1200,
  },
  {
    fen: "8/8/4k3/4p3/4K3/8/8/8 w - - 0 1",
    solution: "e4e5",
    hint: "Seize the opposition and push the pawn. King and pawn endgame.",
    difficulty: "beginner",
    category: "endgame",
    rating: 500,
  },
  {
    fen: "8/2k5/8/8/8/8/3K4/8 w - - 0 1",
    solution: "d2c3",
    hint: "Move the king towards the center to gain the opposition.",
    difficulty: "intermediate",
    category: "endgame",
    rating: 900,
  },
  {
    fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 0 4",
    solution: "c4d5",
    hint: "Take the center with the c-pawn. Queen's Gambit exchange.",
    difficulty: "beginner",
    category: "tactics",
    rating: 700,
  },
  {
    fen: "r2qkb1r/ppp2ppp/2n1pn2/1B2Nb2/1b2P3/2N2P2/PPP3PP/R1BQK2R b KQkq - 0 9",
    solution: "f6d5",
    hint: "Eliminate the strong knight on d5. Trade the knight.",
    difficulty: "intermediate",
    category: "card_management",
    rating: 1100,
  },
  {
    fen: "8/5pk1/4p1p1/8/8/1P4P1/5PK1/8 w - - 0 1",
    solution: "g3g4",
    hint: "Create a passed pawn on the kingside. Create a passer.",
    difficulty: "advanced",
    category: "endgame",
    rating: 1600,
  },
];

export async function seedPuzzlesIntoDb(): Promise<number> {
  let created = 0;
  for (const data of seedPuzzles) {
    try {
      await PuzzleRepository.create(data as any);
      created++;
    } catch (err) {
      console.error("[seed] Failed to create puzzle:", err);
    }
  }
  return created;
}

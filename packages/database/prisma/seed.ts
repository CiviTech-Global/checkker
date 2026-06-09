import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Hand-curated puzzle positions for Checkker / Gambit
// Each puzzle includes a FEN, the best move in UCI, a hint, difficulty, and category.
const rawPuzzles = [
  // --- Daily / Tactics ---
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solution: "f3e5",
    hint: "The knight on f3 can jump to a strong central outpost.",
    difficulty: "beginner",
    category: "tactics",
    rating: 1200,
  },
  {
    fen: "rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solution: "d1h5",
    hint: "Queen and bishop can team up on f7.",
    difficulty: "beginner",
    category: "tactics",
    rating: 1300,
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
    solution: "c6e7",
    hint: "Regroup the knight to a safer square and protect f7.",
    difficulty: "beginner",
    category: "tactics",
    rating: 1250,
  },
  {
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    solution: "e7e5",
    hint: "Open the game by claiming the center.",
    difficulty: "beginner",
    category: "tactics",
    rating: 1000,
  },
  {
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
    solution: "g8f6",
    hint: "Develop a piece and attack the center.",
    difficulty: "beginner",
    category: "tactics",
    rating: 1100,
  },
  {
    fen: "rnbqkb1r/ppp2ppp/3p1n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
    solution: "f1c4",
    hint: "Keep the bishop aimed at f7 after Black played ...d6.",
    difficulty: "intermediate",
    category: "tactics",
    rating: 1450,
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4",
    solution: "d8g5",
    hint: "Counterattack the knight — Black wins a tempo.",
    difficulty: "intermediate",
    category: "tactics",
    rating: 1500,
  },
  {
    fen: "rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPPQPPP/RNB1K2R b KQkq - 4 5",
    solution: "f6e4",
    hint: "The knight can occupy the central outpost with tempo.",
    difficulty: "intermediate",
    category: "tactics",
    rating: 1550,
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4",
    solution: "f6e4",
    hint: "Use the central outpost and challenge the bishop pair.",
    difficulty: "advanced",
    category: "tactics",
    rating: 1700,
  },
  {
    fen: "r1bq1rk1/pppp1ppp/2n2n2/1B2p3/1b2P3/5N2/PPPP1PPP/RNBQ1RK1 w - - 6 5",
    solution: "d2d4",
    hint: "Strike in the center and gain space.",
    difficulty: "advanced",
    category: "tactics",
    rating: 1750,
  },
  // --- Card Management ---
  {
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    solution: "d7d5",
    hint: "Your hand favors pawns — counter in the center.",
    difficulty: "beginner",
    category: "card_management",
    rating: 1100,
  },
  {
    fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    solution: "g1f3",
    hint: "Develop a knight to prepare kingside castling.",
    difficulty: "beginner",
    category: "card_management",
    rating: 1150,
  },
  {
    fen: "rnbqkb1r/pppppppp/5n2/8/2P1P3/8/PP1P1PPP/RNBQKBNR b KQkq - 0 2",
    solution: "g7g6",
    hint: "Prepare fianchetto since your bishop card is strong.",
    difficulty: "intermediate",
    category: "card_management",
    rating: 1500,
  },
  // --- Endgame ---
  {
    fen: "8/8/4k3/4K3/4P3/8/8/8 w - - 0 1",
    solution: "e4e5",
    hint: "Gain opposition and push the pawn forward.",
    difficulty: "beginner",
    category: "endgame",
    rating: 1000,
  },
  {
    fen: "8/3k4/8/3K4/3P4/8/8/8 b - - 0 1",
    solution: "d7d8",
    hint: "Stay in front of the pawn to stop its advance.",
    difficulty: "beginner",
    category: "endgame",
    rating: 1100,
  },
  {
    fen: "8/8/8/3k4/8/3K4/8/3Q4 w - - 0 1",
    solution: "d3d4",
    hint: "Use the queen and king together to force mate.",
    difficulty: "intermediate",
    category: "endgame",
    rating: 1400,
  },
  {
    fen: "8/8/8/4k3/8/8/3K4/3R4 w - - 0 1",
    solution: "d1e1",
    hint: "Check the king and restrict its escape squares.",
    difficulty: "intermediate",
    category: "endgame",
    rating: 1450,
  },
  // --- Weakness Training (captures / score pile) ---
  {
    fen: "rnbqkbnr/pppp1ppp/8/4p3/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2",
    solution: "e5d4",
    hint: "Capture in the center and add a pawn card to your score pile.",
    difficulty: "beginner",
    category: "weakness",
    rating: 1100,
  },
  {
    fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    solution: "e4d5",
    hint: "Take the pawn to build your capture pile.",
    difficulty: "beginner",
    category: "weakness",
    rating: 1050,
  },
  {
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solution: "c4f7",
    hint: "A tactical shot wins material and a valuable card.",
    difficulty: "intermediate",
    category: "weakness",
    rating: 1600,
  },
];

async function main() {
  // Seed puzzles
  const now = new Date();
  const puzzles = rawPuzzles.map((p) => ({ ...p }));

  // Assign daily puzzles for the next 30 days from the pool
  const dailyCount = Math.min(30, puzzles.length);
  for (let i = 0; i < dailyCount; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    puzzles[i].isDaily = true;
    puzzles[i].dailyDate = d;
  }

  await prisma.puzzle.createMany({
    data: puzzles,
    skipDuplicates: true,
  });

  // Seed default cosmetics (1 free per category for v1)
  await prisma.cosmetic.createMany({
    data: [
      {
        type: "board",
        name: "Classic Board",
        description: "The timeless chessboard look.",
        price: 0,
        rarity: "common",
        isDefault: true,
      },
      {
        type: "piece",
        name: "Standard Pieces",
        description: "Traditional Staunton-style pieces.",
        price: 0,
        rarity: "common",
        isDefault: true,
      },
      {
        type: "card_back",
        name: "Default Back",
        description: "Classic navy and gold card back.",
        price: 0,
        rarity: "common",
        isDefault: true,
      },
      {
        type: "board",
        name: "Emerald Board",
        description: "A rich green board for a fresh perspective.",
        price: 100,
        rarity: "rare",
      },
      {
        type: "piece",
        name: "Neo Pieces",
        description: "Sleek modern piece set.",
        price: 150,
        rarity: "rare",
      },
      {
        type: "card_back",
        name: "Royal Flush",
        description: "Show your poker flair.",
        price: 120,
        rarity: "rare",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded ${puzzles.length} puzzles and cosmetics.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

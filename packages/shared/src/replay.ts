/**
 * Checkker game export ("CKN" — Checkker Notation): a PGN-like text format
 * that annotates each chess move with the card that was played.
 */

export interface ReplayMoveLike {
  moveUci: string;
  san?: string | null;
  cardRank?: string | null;
  cardSuit?: string | null;
  color?: string | null;
}

export interface ReplayMeta {
  gameId?: string;
  white?: string;
  black?: string;
  result?: string; // "1-0" | "0-1" | "1/2-1/2" | "*"
  mode?: string;
  timeControl?: string;
  playedAt?: string | Date;
}

const SUIT_LETTERS: Record<string, string> = {
  clubs: "c",
  diamonds: "d",
  hearts: "h",
  spades: "s",
};

function cardTag(move: ReplayMoveLike): string {
  if (!move.cardRank) return "";
  const suit = move.cardSuit ? SUIT_LETTERS[move.cardSuit] ?? move.cardSuit[0] : "";
  return ` {${move.cardRank}${suit}}`;
}

/** Format a finished game as Checkker Notation text. */
export function formatCheckkerGame(moves: ReplayMoveLike[], meta: ReplayMeta = {}): string {
  const lines: string[] = [];
  const date = meta.playedAt ? new Date(meta.playedAt) : new Date();
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  lines.push(`[Event "Checkker ${meta.mode ?? "game"}"]`);
  lines.push(`[Date "${dateStr}"]`);
  if (meta.white) lines.push(`[White "${meta.white}"]`);
  if (meta.black) lines.push(`[Black "${meta.black}"]`);
  if (meta.timeControl) lines.push(`[TimeControl "${meta.timeControl}"]`);
  if (meta.gameId) lines.push(`[GameId "${meta.gameId}"]`);
  lines.push(`[Result "${meta.result ?? "*"}"]`);
  lines.push(`[Variant "Checkker (card-driven chess + poker scoring)"]`);
  lines.push("");

  const tokens: string[] = [];
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (i % 2 === 0) tokens.push(`${Math.floor(i / 2) + 1}.`);
    tokens.push(`${move.san || move.moveUci}${cardTag(move)}`);
  }
  if (meta.result) tokens.push(meta.result);

  // Wrap move text at ~80 columns like standard PGN.
  let line = "";
  for (const token of tokens) {
    if (line.length + token.length + 1 > 80) {
      lines.push(line);
      line = token;
    } else {
      line = line ? `${line} ${token}` : token;
    }
  }
  if (line) lines.push(line);

  return lines.join("\n");
}

/** Deep link to a replay, openable by the mobile apps. */
export function buildReplayLink(gameId: string): string {
  return `checkker://replay/${gameId}`;
}

import { Chess } from "chess.js";
import type { Color, Card } from "@checkker/shared";
import type { MoveExplanation } from "../types";
import { MoveExplainer } from "./MoveExplainer";

export type LLMProvider = "openai" | "anthropic" | "none";

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export class LLMCoach {
  private config: LLMConfig;
  private fallback: MoveExplainer;
  private cache: Map<string, { text: string; type: MoveExplanation["type"] }> = new Map();
  private requestCount = 0;
  private readonly MAX_CACHE_SIZE = 200;
  private readonly RATE_LIMIT = 10;

  constructor() {
    this.fallback = new MoveExplainer();
    this.config = this.loadConfig();
  }

  private loadConfig(): LLMConfig {
    const provider = (process.env.AI_COACH_PROVIDER ?? "none") as LLMProvider;
    const apiKey = process.env.AI_COACH_API_KEY ?? "";
    const model = process.env.AI_COACH_MODEL ?? "gpt-4o-mini";
    const baseUrl = process.env.AI_COACH_BASE_URL ?? "https://api.openai.com/v1";

    return { provider, apiKey, model, baseUrl };
  }

  configure(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  isAvailable(): boolean {
    return this.config.provider !== "none" && this.config.apiKey.length > 0;
  }

  async explainMove(fen: string, move: string, cardId: string, color: Color): Promise<MoveExplanation> {
    const cacheKey = `${fen}|${move}|${color}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { text: cached.text, type: cached.type, priority: 5 };
    }

    if (!this.isAvailable()) {
      return this.fallback.explainMove(fen, move, cardId, color);
    }

    if (this.requestCount >= this.RATE_LIMIT) {
      return this.fallback.explainMove(fen, move, cardId, color);
    }

    try {
      this.requestCount++;
      const explanation = await this.queryLLM(fen, move, color);
      const text = explanation.text;

      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, { text, type: explanation.type });

      return { text, type: explanation.type, priority: 5 };
    } catch {
      return this.fallback.explainMove(fen, move, cardId, color);
    }
  }

  async generateCoachingTip(fen: string, hand: Card[], color: Color, moveNumber: number): Promise<string | null> {
    if (!this.isAvailable()) return null;

    try {
      const chess = new Chess(fen);
      const legalCount = chess.moves().length;

      const prompt = `You are a chess+poker hybrid game coach. The game Checkker combines chess with a 52-card deck where each rank maps to a piece.

Current position (FEN): ${fen}
Player color: ${color}
Cards in hand: ${hand.map((c) => `${c.rank}${c.suit[0]}`).join(", ")}
Legal moves available: ${legalCount}
Move number: ~${moveNumber}

Give ONE short coaching tip (1 sentence, under 120 chars) about what the player should think about in this position. Focus on chess principles or card management.`;

      const response = await this.callAPI([
        { role: "system", content: "You are a concise chess coach. Give short, actionable tips." },
        { role: "user", content: prompt },
      ]);

      const text = response.choices?.[0]?.message?.content?.trim() ?? null;
      return text?.length ? text.slice(0, 120) : null;
    } catch {
      return null;
    }
  }

  async generatePostGameSummary(
    moveHistory: Array<{ move: string; fen: string; color: Color }>,
    playerColor: Color,
    result: string,
  ): Promise<string> {
    if (!this.isAvailable()) return "";

    try {
      const lastMoves = moveHistory.slice(-5).map((m) => `${m.color}: ${m.move}`).join(", ");

      const prompt = `A Checkker (chess+poker) game just ended.
Result: ${result}
Player played as: ${playerColor}
Last moves: ${lastMoves}
Total moves: ${moveHistory.length}

Give a short 2-sentence summary of how the game went for ${playerColor}.`;

      const response = await this.callAPI([
        { role: "system", content: "You are a chess commentator. Give brief, insightful summaries." },
        { role: "user", content: prompt },
      ]);

      return response.choices?.[0]?.message?.content?.trim() ?? "";
    } catch {
      return "";
    }
  }

  private async queryLLM(fen: string, move: string, color: Color): Promise<{ text: string; type: MoveExplanation["type"] }> {
    const chess = new Chess(fen);
    let isCapture = false;
    let isCheck = false;
    let capturedPiece = "";

    const fromSq = move.slice(0, 2);
    const toSq = move.slice(2, 4);
    const movingPiece = chess.get(fromSq as any);
    const captured = chess.get(toSq as any);
    isCapture = captured !== null;
    capturedPiece = captured?.type ?? "";

    try {
      const clone = new Chess(fen);
      clone.move(move);
      isCheck = clone.isCheck();
    } catch {}

    const prompt = `In the game Checkker (chess + poker card game), ${color} plays ${move}.
${isCapture ? `This captures a ${capturedPiece}.` : ""}
${isCheck ? "This gives check!" : ""}

Explain this move in 1 short sentence (max 100 chars). Be specific about the piece movement.`;

    const response = await this.callAPI([
      { role: "system", content: "You explain chess moves concisely. Max 100 characters. Don't use markdown." },
      { role: "user", content: prompt },
    ]);

    const text = response.choices?.[0]?.message?.content?.trim() ?? "";

    let type: MoveExplanation["type"] = "strategy";
    if (isCheck) type = "tactical";
    else if (isCapture) type = "tactical";
    else if (movingPiece && (movingPiece.type === "n" || movingPiece.type === "b")) type = "positional";

    return { text, type };
  }

  private async callAPI(messages: Array<{ role: string; content: string }>): Promise<any> {
    const isAnthropic = this.config.provider === "anthropic";

    if (isAnthropic) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.config.model ?? "claude-3-haiku-20240307",
          max_tokens: 150,
          messages: messages.map((m) => ({ role: m.role as any, content: m.content })),
        }),
      });
      const data = await resp.json() as any;
      return {
        choices: [{ message: { content: data.content?.[0]?.text ?? "" } }],
      };
    }

    const resp = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model ?? "gpt-4o-mini",
        messages,
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    return resp.json();
  }

  async generateSpectatorComment(fen: string, moveNumber: number): Promise<string | null> {
    if (!this.isAvailable()) return null;

    try {
      const prompt = `You are a flamboyant casino announcer commentating on a Checkker (chess + poker) game.
The game is at move ${moveNumber}. The position (FEN): ${fen}

Give ONE dramatic, short (under 80 chars) casino-style comment about the current state. Be entertaining!`;

      const response = await this.callAPI([
        { role: "system", content: "You are a dramatic casino announcer. Max 80 characters. No markdown." },
        { role: "user", content: prompt },
      ]);

      const text = response.choices?.[0]?.message?.content?.trim() ?? null;
      return text?.length ? text.slice(0, 80) : null;
    } catch {
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  resetRateLimit(): void {
    this.requestCount = 0;
  }
}

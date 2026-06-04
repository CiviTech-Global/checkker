import * as fs from "fs";
import * as path from "path";
import type { PlayerModel } from "../types";
import { AdaptiveBot } from "./AdaptiveBot";

export interface StoredPlayerData {
  id: string;
  estimatedSkill: number;
  playStyle: PlayerModel["playStyle"];
  aggressionIndex: number;
  cardConservationIndex: number;
  weaknesses: string[];
  gamesPlayed: number;
  lastPlayed: number;
  moveHistory: Array<{
    fen: string;
    move: string;
    cardRank: string;
    cardSuit: string;
    color: "white" | "black";
    wasGood: boolean;
  }>;
}

export class PlayerRepository {
  private storageDir: string;
  private adaptiveBot: AdaptiveBot;
  private cache: Map<string, StoredPlayerData> = new Map();
  private dirty: Set<string> = new Set();
  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private readonly SAVE_INTERVAL_MS = 30000;

  constructor(storageDir: string, adaptiveBot: AdaptiveBot) {
    this.storageDir = storageDir;
    this.adaptiveBot = adaptiveBot;
    this.ensureDir();

    this.saveTimer = setInterval(() => {
      this.flushDirty();
    }, this.SAVE_INTERVAL_MS);
  }

  private ensureDir(): void {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch (err) {
      console.warn(`[PlayerRepository] Cannot create storage directory ${this.storageDir}: ${err}`);
    }
  }

  private getFilePath(playerId: string): string {
    const safe = playerId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.storageDir, `${safe}.json`);
  }

  load(playerId: string): StoredPlayerData | null {
    const cached = this.cache.get(playerId);
    if (cached) return cached;

    try {
      const fp = this.getFilePath(playerId);
      if (!fs.existsSync(fp)) return null;
      const raw = fs.readFileSync(fp, "utf-8");
      const data = JSON.parse(raw) as StoredPlayerData;
      this.cache.set(playerId, data);
      return data;
    } catch {
      return null;
    }
  }

  save(playerId: string, data: StoredPlayerData): void {
    this.cache.set(playerId, data);
    this.dirty.add(playerId);
  }

  async flushDirty(): Promise<void> {
    if (this.dirty.size === 0) return;

    const toSave = new Set(this.dirty);
    this.dirty.clear();

    for (const playerId of toSave) {
      const data = this.cache.get(playerId);
      if (!data) continue;
      try {
        const fp = this.getFilePath(playerId);
        fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf-8");
      } catch (err) {
        console.error(`[PlayerRepository] Failed to save ${playerId}: ${err}`);
        this.dirty.add(playerId);
      }
    }
  }

  restoreModel(playerId: string): void {
    const stored = this.load(playerId);
    if (!stored) return;

    const model = this.adaptiveBot.getOrCreateModel(playerId);
    model.estimatedSkill = stored.estimatedSkill;
    model.playStyle = stored.playStyle;
    model.aggressionIndex = stored.aggressionIndex;
    model.cardConservationIndex = stored.cardConservationIndex;
    model.weaknesses = stored.weaknesses;

    for (const entry of stored.moveHistory) {
      this.adaptiveBot.observeMove(
        playerId,
        entry.move,
        entry.fen,
        { rank: entry.cardRank as any, suit: entry.cardSuit as any },
        entry.color,
        entry.wasGood,
      );
    }
  }

  persistModel(playerId: string): void {
    const model = this.adaptiveBot.getOrCreateModel(playerId);
    const loaded = this.load(playerId);
    const existing: StoredPlayerData = loaded ?? {
      id: playerId,
      estimatedSkill: 1000,
      playStyle: "unknown",
      aggressionIndex: 0.5,
      cardConservationIndex: 0.5,
      weaknesses: [],
      gamesPlayed: 0,
      lastPlayed: 0,
      moveHistory: [],
    };

    existing.estimatedSkill = model.estimatedSkill;
    existing.playStyle = model.playStyle;
    existing.aggressionIndex = model.aggressionIndex;
    existing.cardConservationIndex = model.cardConservationIndex;
    existing.weaknesses = model.weaknesses;
    existing.gamesPlayed += 1;
    existing.lastPlayed = Date.now();

    this.save(playerId, existing);
  }

  recordMove(
    playerId: string,
    move: string,
    fen: string,
    cardRank: string,
    cardSuit: string,
    color: "white" | "black",
    wasGood: boolean,
  ): void {
    const loaded = this.load(playerId);
    const existing: StoredPlayerData = loaded ?? {
      id: playerId,
      estimatedSkill: 1000,
      playStyle: "unknown",
      aggressionIndex: 0.5,
      cardConservationIndex: 0.5,
      weaknesses: [],
      gamesPlayed: 0,
      lastPlayed: 0,
      moveHistory: [],
    };

    existing.moveHistory.push({ fen, move, cardRank, cardSuit, color, wasGood });
    if (existing.moveHistory.length > 200) {
      existing.moveHistory = existing.moveHistory.slice(-200);
    }

    this.save(playerId, existing);

    this.adaptiveBot.observeMove(
      playerId,
      move,
      fen,
      { rank: cardRank as any, suit: cardSuit as any },
      color,
      wasGood,
    );
  }

  getActivePlayerCount(hours: number = 24): number {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    let count = 0;

    try {
      const files = fs.readdirSync(this.storageDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = fs.readFileSync(path.join(this.storageDir, file), "utf-8");
          const data = JSON.parse(raw) as StoredPlayerData;
          if (data.lastPlayed >= cutoff) count++;
        } catch {}
      }
    } catch {}

    return count;
  }

  getAllPlayerModels(): PlayerModel[] {
    const models: PlayerModel[] = [];
    try {
      const files = fs.readdirSync(this.storageDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = fs.readFileSync(path.join(this.storageDir, file), "utf-8");
          const data = JSON.parse(raw) as StoredPlayerData;
          models.push({
            id: data.id,
            estimatedSkill: data.estimatedSkill,
            playStyle: data.playStyle,
            aggressionIndex: data.aggressionIndex,
            cardConservationIndex: data.cardConservationIndex,
            weaknesses: data.weaknesses,
          });
        } catch {}
      }
    } catch {}

    return models;
  }

  dispose(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    this.flushDirty();
  }
}

import type { PlayerModel } from "../types";

export interface PlayerCluster {
  id: string;
  name: string;
  centroid: PlayerModel;
  members: string[];
  description: string;
}

export interface MatchSuggestion {
  playerA: string;
  playerB: string;
  compatibility: number;
  reason: string;
}

export class PlayerClusterer {
  private clusters: PlayerCluster[] = [];
  private lastClustered: number = 0;
  private readonly RECLUSTER_INTERVAL = 60000;

  private readonly CLUSTER_TEMPLATES: Array<{
    name: string;
    description: string;
    skillRange: [number, number];
    stylePref: PlayerModel["playStyle"];
    aggressionRange: [number, number];
  }> = [
    { name: "Rookies", description: "New players learning the game", skillRange: [0, 700], stylePref: "unknown", aggressionRange: [0, 1] },
    { name: "Casual Defenders", description: "Low-skill defensive players", skillRange: [700, 1200], stylePref: "defensive", aggressionRange: [0, 0.35] },
    { name: "Casual Aggressors", description: "Low-skill aggressive players", skillRange: [700, 1200], stylePref: "aggressive", aggressionRange: [0.35, 1] },
    { name: "Intermediate Balanced", description: "Mid-skill all-rounders", skillRange: [1200, 1700], stylePref: "balanced", aggressionRange: [0.3, 0.6] },
    { name: "Intermediate Aggressors", description: "Mid-skill attackers", skillRange: [1200, 1700], stylePref: "aggressive", aggressionRange: [0.5, 1] },
    { name: "Advanced Defenders", description: "High-skill positional players", skillRange: [1700, 2200], stylePref: "defensive", aggressionRange: [0, 0.4] },
    { name: "Advanced Aggressors", description: "High-skill tacticians", skillRange: [1700, 2200], stylePref: "aggressive", aggressionRange: [0.4, 1] },
    { name: "Masters", description: "Top-tier players", skillRange: [2200, 3000], stylePref: "balanced", aggressionRange: [0, 1] },
  ];

  clusterPlayers(players: PlayerModel[]): PlayerCluster[] {
    if (players.length === 0) return [];

    const now = Date.now();
    if (this.clusters.length > 0 && now - this.lastClustered < this.RECLUSTER_INTERVAL) {
      return this.clusters;
    }

    const clusters: PlayerCluster[] = this.CLUSTER_TEMPLATES.map((t, i) => ({
      id: `cluster-${i}`,
      name: t.name,
      centroid: {
        id: t.name,
        estimatedSkill: (t.skillRange[0] + t.skillRange[1]) / 2,
        playStyle: t.stylePref,
        aggressionIndex: (t.aggressionRange[0] + t.aggressionRange[1]) / 2,
        cardConservationIndex: 0.5,
        weaknesses: [],
      },
      members: [],
      description: t.description,
    }));

    for (const player of players) {
      const cluster = this.findBestCluster(player, clusters);
      if (cluster) {
        cluster.members.push(player.id);
      }
    }

    this.clusters = clusters;
    this.lastClustered = now;

    return clusters;
  }

  private findBestCluster(player: PlayerModel, clusters: PlayerCluster[]): PlayerCluster | null {
    let bestCluster: PlayerCluster | null = null;
    let bestScore = Infinity;

    for (const cluster of clusters) {
      const dist = this.distance(player, cluster.centroid);
      if (dist < bestScore) {
        bestScore = dist;
        bestCluster = cluster;
      }
    }

    return bestCluster;
  }

  private distance(a: PlayerModel, b: PlayerModel): number {
    const skillDiff = Math.abs(a.estimatedSkill - b.estimatedSkill) / 500;

    const styleMap: Record<string, number> = { defensive: 0, balanced: 1, aggressive: 2, unknown: 1 };
    const styleDiff = Math.abs((styleMap[a.playStyle] ?? 1) - (styleMap[b.playStyle] ?? 1));

    const aggrDiff = Math.abs(a.aggressionIndex - b.aggressionIndex);

    return skillDiff * 2 + styleDiff + aggrDiff * 3;
  }

  findMatch(player: PlayerModel, available: PlayerModel[]): MatchSuggestion | null {
    if (available.length === 0) return null;

    let bestMatch: PlayerModel | null = null;
    let bestCompat = Infinity;

    for (const candidate of available) {
      if (candidate.id === player.id) continue;

      const skillGap = Math.abs(player.estimatedSkill - candidate.estimatedSkill);
      if (skillGap > 500) continue;

      const d = this.distance(player, candidate);
      if (d < bestCompat) {
        bestCompat = d;
        bestMatch = candidate;
      }
    }

    if (!bestMatch) return null;

    const compatibility = Math.max(0, Math.round(100 - bestCompat * 20));

    let reason = "Good match";
    if (compatibility > 80) reason = "Excellent match — similar skill and style";
    else if (compatibility > 60) reason = "Good match — close skill rating";
    else reason = "Decent match — some differences in playstyle";

    return {
      playerA: player.id,
      playerB: bestMatch.id,
      compatibility,
      reason,
    };
  }

  getClusterStats(clusters: PlayerCluster[]): Array<{ name: string; count: number; description: string }> {
    return clusters.map((c) => ({
      name: c.name,
      count: c.members.length,
      description: c.description,
    }));
  }
}

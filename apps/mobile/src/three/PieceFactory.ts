import {
  Group,
  CylinderGeometry,
  SphereGeometry,
  ConeGeometry,
  BoxGeometry,
  LatheGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  Mesh,
  Vector2,
  type BufferGeometry,
} from "three";
import type { PieceType, PieceColor, SceneConfig } from "./types";

/**
 * Procedural chess pieces designed to be visually distinct from a 30° tilted
 * top-down camera. Pieces are TALL with bold, exaggerated features so their
 * silhouettes are recognizable:
 *
 *   Pawn   — 0.40  short cylinder + round head (smallest, most generic)
 *   Rook   — 0.65  wide cylinder + flat square battlement top
 *   Knight — 0.80  angled forward-leaning head with ear
 *   Bishop — 0.85  tall tapered body + pointed tip + ball
 *   Queen  — 1.00  elegant body + crown ring with spikes
 *   King   — 1.10  tall body + BOLD wide cross on top
 *
 * Base fills ~75% of the square. All pieces bottom-grounded at y=0.
 */
export class PieceFactory {
  private config: SceneConfig;
  private geoCache: Map<string, BufferGeometry> = new Map();
  private whiteMaterial: MeshStandardMaterial;
  private blackMaterial: MeshStandardMaterial;

  constructor(config: SceneConfig) {
    this.config = config;
    this.whiteMaterial = new MeshStandardMaterial({
      color: config.whitePieceColor,
      roughness: 0.25,
      metalness: 0.15,
    });
    this.blackMaterial = new MeshStandardMaterial({
      color: config.blackPieceColor,
      roughness: 0.2,
      metalness: 0.25,
    });
  }

  createPiece(type: PieceType, color: PieceColor): Group {
    const group = new Group();
    const material =
      color === "white" ? this.whiteMaterial : this.blackMaterial;

    const parts = this.buildParts(type);
    for (const { geometry, y } of parts) {
      const mesh = new Mesh(geometry, material);
      mesh.position.y = y;
      group.add(mesh);
    }

    return group;
  }

  private buildParts(
    type: PieceType
  ): { geometry: BufferGeometry; y: number }[] {
    const s = this.config.squareSize;
    switch (type) {
      case "p": return this.pawn(s);
      case "r": return this.rook(s);
      case "n": return this.knight(s);
      case "b": return this.bishop(s);
      case "q": return this.queen(s);
      case "k": return this.king(s);
    }
  }

  private geo(key: string, factory: () => BufferGeometry): BufferGeometry {
    let g = this.geoCache.get(key);
    if (!g) {
      g = factory();
      this.geoCache.set(key, g);
    }
    return g;
  }

  // ── Shared base ────────────────────────────────────────────────

  private base(s: number): { geometry: BufferGeometry; y: number } {
    const h = s * 0.08;
    return {
      geometry: this.geo("base", () =>
        new CylinderGeometry(s * 0.34, s * 0.38, h, 24)
      ),
      y: h / 2,
    };
  }

  // ── PAWN: short, simple, rounded — the "default" piece shape ──

  private pawn(s: number) {
    const bH = s * 0.08;
    const stemH = s * 0.16;
    const headR = s * 0.15;
    return [
      this.base(s),
      {
        geometry: this.geo("p-stem", () =>
          new CylinderGeometry(s * 0.15, s * 0.22, stemH, 14)
        ),
        y: bH + stemH / 2,
      },
      {
        geometry: this.geo("p-head", () =>
          new SphereGeometry(headR, 16, 16)
        ),
        y: bH + stemH + headR * 0.85,
      },
    ];
  }

  // ── ROOK: blocky, square battlement top — clearly not round ───

  private rook(s: number) {
    const bH = s * 0.08;
    const bodyH = s * 0.36;
    const topH = s * 0.14;
    const topW = s * 0.32;
    return [
      this.base(s),
      {
        geometry: this.geo("r-body", () =>
          new CylinderGeometry(s * 0.24, s * 0.30, bodyH, 18)
        ),
        y: bH + bodyH / 2,
      },
      {
        // Flat rim below battlement
        geometry: this.geo("r-rim", () =>
          new CylinderGeometry(s * 0.30, s * 0.24, s * 0.04, 18)
        ),
        y: bH + bodyH + s * 0.02,
      },
      {
        // Square battlement top — BoxGeometry makes it clearly rectangular
        geometry: this.geo("r-top", () =>
          new BoxGeometry(topW, topH, topW)
        ),
        y: bH + bodyH + s * 0.04 + topH / 2,
      },
      {
        // Center notch (subtracted visually with a smaller top block)
        geometry: this.geo("r-notch", () =>
          new BoxGeometry(topW * 0.4, topH * 0.5, topW * 0.4)
        ),
        y: bH + bodyH + s * 0.04 + topH + topH * 0.25 * 0,
      },
    ];
  }

  // ── KNIGHT: forward-leaning head, most distinctive silhouette ──

  private knight(s: number) {
    const bH = s * 0.08;
    return [
      this.base(s),
      {
        // Neck
        geometry: this.geo("n-neck", () =>
          new CylinderGeometry(s * 0.14, s * 0.26, s * 0.28, 14)
        ),
        y: bH + s * 0.14,
      },
      {
        // Head — asymmetric horse profile via LatheGeometry
        geometry: this.geo("n-head", () => {
          const pts = [
            new Vector2(0, 0),
            new Vector2(s * 0.22, s * 0.03),
            new Vector2(s * 0.24, s * 0.12),
            new Vector2(s * 0.18, s * 0.26),
            new Vector2(s * 0.08, s * 0.36),
            new Vector2(s * 0.15, s * 0.42),
            new Vector2(s * 0.12, s * 0.52),
            new Vector2(0.02, s * 0.56),
            new Vector2(0, s * 0.56),
          ];
          return new LatheGeometry(pts, 14);
        }),
        y: bH + s * 0.2,
      },
      {
        // Ear/mane — small cone tilted forward to break symmetry
        geometry: this.geo("n-ear", () => {
          const g = new ConeGeometry(s * 0.06, s * 0.18, 6);
          g.translate(s * 0.06, 0, -s * 0.04);
          return g;
        }),
        y: bH + s * 0.64,
      },
    ];
  }

  // ── BISHOP: tall tapered spire + ball on top ──────────────────

  private bishop(s: number) {
    const bH = s * 0.08;
    const bodyH = s * 0.48;
    const tipH = s * 0.22;
    const ballR = s * 0.065;
    return [
      this.base(s),
      {
        geometry: this.geo("b-body", () =>
          new CylinderGeometry(s * 0.08, s * 0.28, bodyH, 16)
        ),
        y: bH + bodyH / 2,
      },
      {
        // Pointed mitre tip
        geometry: this.geo("b-tip", () =>
          new ConeGeometry(s * 0.12, tipH, 12)
        ),
        y: bH + bodyH + tipH / 2,
      },
      {
        // Ball on very top
        geometry: this.geo("b-ball", () =>
          new SphereGeometry(ballR, 10, 10)
        ),
        y: bH + bodyH + tipH + ballR * 0.5,
      },
    ];
  }

  // ── QUEEN: elegant body + crown with torus ring + spikes ──────

  private queen(s: number) {
    const bH = s * 0.08;
    const bodyH = s * 0.48;
    const crownR = s * 0.16;
    const spikeH = s * 0.2;
    return [
      this.base(s),
      {
        // Elegant tapered body
        geometry: this.geo("q-body", () =>
          new CylinderGeometry(s * 0.12, s * 0.30, bodyH, 18)
        ),
        y: bH + bodyH / 2,
      },
      {
        // Crown ring (torus) — visible from top as a circle
        geometry: this.geo("q-ring", () =>
          new TorusGeometry(crownR, s * 0.035, 10, 20)
        ),
        y: bH + bodyH + s * 0.02,
      },
      {
        // Central crown spike
        geometry: this.geo("q-spike-c", () =>
          new ConeGeometry(s * 0.055, spikeH, 6)
        ),
        y: bH + bodyH + spikeH / 2,
      },
      {
        // Front spike
        geometry: this.geo("q-spike-f", () => {
          const g = new ConeGeometry(s * 0.04, spikeH * 0.7, 6);
          g.translate(0, 0, crownR);
          return g;
        }),
        y: bH + bodyH + spikeH * 0.35,
      },
      {
        // Back spike
        geometry: this.geo("q-spike-b", () => {
          const g = new ConeGeometry(s * 0.04, spikeH * 0.7, 6);
          g.translate(0, 0, -crownR);
          return g;
        }),
        y: bH + bodyH + spikeH * 0.35,
      },
      {
        // Left spike
        geometry: this.geo("q-spike-l", () => {
          const g = new ConeGeometry(s * 0.04, spikeH * 0.7, 6);
          g.translate(-crownR, 0, 0);
          return g;
        }),
        y: bH + bodyH + spikeH * 0.35,
      },
      {
        // Right spike
        geometry: this.geo("q-spike-r", () => {
          const g = new ConeGeometry(s * 0.04, spikeH * 0.7, 6);
          g.translate(crownR, 0, 0);
          return g;
        }),
        y: bH + bodyH + spikeH * 0.35,
      },
      {
        // Top ball
        geometry: this.geo("q-ball", () =>
          new SphereGeometry(s * 0.05, 10, 10)
        ),
        y: bH + bodyH + spikeH + s * 0.02,
      },
    ];
  }

  // ── KING: tallest piece + BOLD wide cross — unmistakable ──────

  private king(s: number) {
    const bH = s * 0.08;
    const bodyH = s * 0.55;
    const collarH = s * 0.06;
    // Cross dimensions — deliberately WIDE and THICK
    const crossVH = s * 0.30; // vertical bar height
    const crossHW = s * 0.28; // horizontal bar width
    const crossT = s * 0.06;  // bar thickness
    return [
      this.base(s),
      {
        // Tall tapered body
        geometry: this.geo("k-body", () =>
          new CylinderGeometry(s * 0.15, s * 0.30, bodyH, 18)
        ),
        y: bH + bodyH / 2,
      },
      {
        // Collar / rim at top of body
        geometry: this.geo("k-collar", () =>
          new CylinderGeometry(s * 0.20, s * 0.15, collarH, 18)
        ),
        y: bH + bodyH + collarH / 2,
      },
      {
        // Cross — vertical bar (tall, thick, unmissable)
        geometry: this.geo("k-crossV", () =>
          new BoxGeometry(crossT, crossVH, crossT)
        ),
        y: bH + bodyH + collarH + crossVH / 2,
      },
      {
        // Cross — horizontal bar (wide, thick)
        geometry: this.geo("k-crossH", () =>
          new BoxGeometry(crossHW, crossT, crossT)
        ),
        y: bH + bodyH + collarH + crossVH * 0.65,
      },
    ];
  }

  dispose(): void {
    this.whiteMaterial.dispose();
    this.blackMaterial.dispose();
    for (const geo of this.geoCache.values()) {
      geo.dispose();
    }
    this.geoCache.clear();
  }
}

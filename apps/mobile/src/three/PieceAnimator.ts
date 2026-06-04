import type { Object3D } from "three";
import type { SceneConfig } from "./types";

interface TweenAnimation {
  target: Object3D;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  duration: number;
  elapsed: number;
  type: "move" | "capture";
  startScaleY?: number;
  onComplete?: () => void;
}

export class PieceAnimator {
  private config: SceneConfig;
  private animations: TweenAnimation[] = [];
  private reducedMotion = false;

  constructor(config: SceneConfig) {
    this.config = config;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  animateMove(
    piece: Object3D,
    target: { x: number; z: number },
    durationMs: number
  ): void {
    if (this.reducedMotion) {
      piece.position.x = target.x;
      piece.position.z = target.z;
      return;
    }

    // Remove any existing animation on this piece
    this.animations = this.animations.filter((a) => a.target !== piece);

    this.animations.push({
      target: piece,
      startX: piece.position.x,
      startZ: piece.position.z,
      endX: target.x,
      endZ: target.z,
      duration: durationMs / 1000,
      elapsed: 0,
      type: "move",
    });
  }

  animateCapture(piece: Object3D): void {
    if (this.reducedMotion) {
      piece.parent?.remove(piece);
      return;
    }

    // Remove any existing animation on this piece
    this.animations = this.animations.filter((a) => a.target !== piece);

    this.animations.push({
      target: piece,
      startX: piece.position.x,
      startZ: piece.position.z,
      endX: piece.position.x,
      endZ: piece.position.z,
      duration: 0.3,
      elapsed: 0,
      type: "capture",
      startScaleY: piece.scale.y,
      onComplete: () => {
        piece.parent?.remove(piece);
      },
    });
  }

  update(dt: number): void {
    const completed: TweenAnimation[] = [];

    for (const anim of this.animations) {
      anim.elapsed += dt;
      const t = Math.min(anim.elapsed / anim.duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);

      if (anim.type === "move") {
        anim.target.position.x =
          anim.startX + (anim.endX - anim.startX) * eased;
        anim.target.position.z =
          anim.startZ + (anim.endZ - anim.startZ) * eased;

        // Slight arc: lift piece up during middle of move
        const arcHeight = 0.2 * Math.sin(t * Math.PI);
        anim.target.position.y = arcHeight;
      } else if (anim.type === "capture") {
        // Scale down and fade
        const scale = 1 - eased;
        anim.target.scale.set(scale, scale, scale);
      }

      if (t >= 1) {
        if (anim.type === "move") {
          anim.target.position.y = 0;
        }
        completed.push(anim);
      }
    }

    for (const anim of completed) {
      anim.onComplete?.();
      this.animations = this.animations.filter((a) => a !== anim);
    }
  }
}

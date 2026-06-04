import { OrthographicCamera, Vector3 } from "three";
import type { SceneConfig } from "./types";

/**
 * OrthographicCamera with ~30° tilt for 3D piece profile visibility.
 * Frustum is asymmetric — extra space on top to prevent back-rank
 * pieces from overflowing above the board frame.
 */
export class CameraController {
  private camera: OrthographicCamera;
  private config: SceneConfig;
  private orientation: "white" | "black" = "white";
  private reducedMotion = false;

  // More tilt (atan(6/10) ≈ 31°) so piece silhouettes are visible
  private readonly whitePos = new Vector3(0, 10, 6);
  private readonly blackPos = new Vector3(0, 10, -6);
  private readonly lookAt = new Vector3(0, 0, 0);

  // Animation state
  private isAnimating = false;
  private animElapsed = 0;
  private animDuration = 0.5;
  private startPos = new Vector3();
  private targetPos = new Vector3();

  constructor(camera: OrthographicCamera, config: SceneConfig) {
    this.camera = camera;
    this.config = config;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  getCurrentOrientation(): "white" | "black" {
    return this.orientation;
  }

  setOrientation(orientation: "white" | "black", instant = false): void {
    if (this.orientation === orientation && !instant) return;
    this.orientation = orientation;

    const targetPos =
      orientation === "white" ? this.whitePos : this.blackPos;

    if (instant || this.reducedMotion) {
      this.camera.position.copy(targetPos);
      this.camera.lookAt(this.lookAt);
      this.isAnimating = false;
      return;
    }

    this.startPos.copy(this.camera.position);
    this.targetPos.copy(targetPos);
    this.animElapsed = 0;
    this.isAnimating = true;
  }

  /**
   * Update frustum to match viewport aspect ratio.
   * Uses asymmetric top/bottom to give extra headroom for
   * back-rank pieces whose 3D height projects above the board.
   */
  updateFrustum(aspect: number): void {
    const boardExtent = (this.config.boardSize * this.config.squareSize) / 2;
    // Base padding for border
    const basePad = 0.4;
    // Extra top padding for piece height projection (tallest piece ~1.2, tilt ~31°)
    // In camera space, piece tops shift upward by height * sin(tiltAngle) ≈ 1.2 * 0.51 ≈ 0.62
    const topExtra = 1.8;
    const bottomExtra = 0.6;

    const halfWidth = boardExtent + basePad;
    const top = boardExtent + basePad + topExtra;
    const bottom = -(boardExtent + basePad + bottomExtra);

    if (aspect >= 1) {
      this.camera.top = top;
      this.camera.bottom = bottom;
      this.camera.left = -halfWidth * aspect;
      this.camera.right = halfWidth * aspect;
    } else {
      // Portrait: scale height to fill, expand width
      const heightRange = top - bottom;
      const halfH = heightRange / 2;
      const centerY = (top + bottom) / 2;
      this.camera.top = centerY + halfH;
      this.camera.bottom = centerY - halfH;
      this.camera.left = -halfWidth;
      this.camera.right = halfWidth;
    }
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    if (!this.isAnimating) return;

    this.animElapsed += dt;
    const t = Math.min(this.animElapsed / this.animDuration, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.camera.position.lerpVectors(this.startPos, this.targetPos, eased);
    this.camera.lookAt(this.lookAt);

    if (t >= 1) {
      this.isAnimating = false;
    }
  }
}

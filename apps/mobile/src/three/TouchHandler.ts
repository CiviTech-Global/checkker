import { OrthographicCamera, Raycaster, Vector2 } from "three";
import type { BoardBuilder } from "./BoardBuilder";
import type { SceneConfig } from "./types";

export class TouchHandler {
  private camera: OrthographicCamera;
  private boardBuilder: BoardBuilder;
  private config: SceneConfig;
  private raycaster: Raycaster;
  private ndcCoords: Vector2;

  constructor(
    camera: OrthographicCamera,
    boardBuilder: BoardBuilder,
    config: SceneConfig
  ) {
    this.camera = camera;
    this.boardBuilder = boardBuilder;
    this.config = config;
    this.raycaster = new Raycaster();
    this.ndcCoords = new Vector2();
  }

  /**
   * Convert touch coordinates to a chess square name.
   * @param localX Touch X relative to GLView left edge
   * @param localY Touch Y relative to GLView top edge
   * @param viewWidth GLView width in points
   * @param viewHeight GLView height in points
   * @param orientation Current board orientation (unused — raycasting handles it)
   * @returns Square name (e.g. "e4") or null if no square hit
   */
  getSquareFromTouch(
    localX: number,
    localY: number,
    viewWidth: number,
    viewHeight: number,
    _orientation: "white" | "black"
  ): string | null {
    // Convert to NDC (-1 to 1)
    this.ndcCoords.x = (localX / viewWidth) * 2 - 1;
    this.ndcCoords.y = -(localY / viewHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.ndcCoords, this.camera);

    const squareMeshes = this.boardBuilder.getSquareMeshes();
    const meshArray = Array.from(squareMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshArray);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const square = hit.userData.square as string | undefined;
      if (square) {
        return square;
      }
    }

    return null;
  }
}

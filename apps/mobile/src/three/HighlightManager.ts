import {
  Group,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  DoubleSide,
} from "three";
import { squareTo3D, type SceneConfig } from "./types";

export class HighlightManager {
  private group: Group;
  private config: SceneConfig;
  private highlightMeshes: Map<string, Mesh> = new Map();
  private selectedMesh: Mesh | null = null;
  private lastMoveMeshes: Mesh[] = [];
  private geometry: PlaneGeometry;
  private legalMaterial: MeshBasicMaterial;
  private selectedMaterial: MeshBasicMaterial;
  private lastMoveMaterial: MeshBasicMaterial;
  private pulseTime = 0;
  private currentLegalSquares: string[] = [];

  constructor(group: Group, config: SceneConfig) {
    this.group = group;
    this.config = config;

    this.geometry = new PlaneGeometry(
      config.squareSize * 0.9,
      config.squareSize * 0.9
    );
    this.geometry.rotateX(-Math.PI / 2);

    this.legalMaterial = new MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.53,
      side: DoubleSide,
      depthWrite: false,
    });

    this.selectedMaterial = new MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.53,
      side: DoubleSide,
      depthWrite: false,
    });

    this.lastMoveMaterial = new MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.4,
      side: DoubleSide,
      depthWrite: false,
    });
  }

  update(
    legalSquares: string[],
    selectedSquare: string | null,
    lastMove: { from: string; to: string } | null
  ): void {
    // Clear previous highlights
    this.clearHighlights();
    this.currentLegalSquares = legalSquares;

    // Legal move highlights
    for (const sq of legalSquares) {
      const mesh = this.createHighlightMesh(sq, this.legalMaterial);
      this.highlightMeshes.set(sq, mesh);
      this.group.add(mesh);
    }

    // Selected square
    if (selectedSquare) {
      this.selectedMesh = this.createHighlightMesh(
        selectedSquare,
        this.selectedMaterial
      );
      this.group.add(this.selectedMesh);
    }

    // Last move
    if (lastMove) {
      for (const sq of [lastMove.from, lastMove.to]) {
        const mesh = this.createHighlightMesh(sq, this.lastMoveMaterial);
        this.lastMoveMeshes.push(mesh);
        this.group.add(mesh);
      }
    }
  }

  /** Animate legal move highlight opacity pulsing */
  update_pulse(dt: number): void {
    if (this.currentLegalSquares.length === 0) return;
    this.pulseTime += dt * 3;
    const opacity = 0.35 + Math.sin(this.pulseTime) * 0.18;
    this.legalMaterial.opacity = opacity;
  }

  private createHighlightMesh(
    square: string,
    material: MeshBasicMaterial
  ): Mesh {
    const mesh = new Mesh(this.geometry, material);
    const coords = squareTo3D(square, this.config);
    mesh.position.set(coords.x, 0.02, coords.z); // Slightly above board
    return mesh;
  }

  private clearHighlights(): void {
    for (const mesh of this.highlightMeshes.values()) {
      this.group.remove(mesh);
    }
    this.highlightMeshes.clear();

    if (this.selectedMesh) {
      this.group.remove(this.selectedMesh);
      this.selectedMesh = null;
    }

    for (const mesh of this.lastMoveMeshes) {
      this.group.remove(mesh);
    }
    this.lastMoveMeshes = [];
    this.currentLegalSquares = [];
    this.pulseTime = 0;
  }

  dispose(): void {
    this.clearHighlights();
    this.geometry.dispose();
    this.legalMaterial.dispose();
    this.selectedMaterial.dispose();
    this.lastMoveMaterial.dispose();
  }
}

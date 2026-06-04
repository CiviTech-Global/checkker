import {
  Group,
  RingGeometry,
  MeshBasicMaterial,
  Mesh,
  DoubleSide,
} from "three";
import { squareTo3D, type SceneConfig } from "./types";
import { ParticleSystem } from "./ParticleSystem";

export class CheckEffects {
  private group: Group;
  private config: SceneConfig;
  private ringMesh: Mesh | null = null;
  private ringMaterial: MeshBasicMaterial;
  private ringGeometry: RingGeometry;
  private reducedMotion = false;
  private pulseTime = 0;
  private isCheckmate = false;
  private particleSystem: ParticleSystem | null = null;
  private checkSquare: string | null = null;
  private autoDismissTimer = 0;

  constructor(group: Group, config: SceneConfig) {
    this.group = group;
    this.config = config;

    this.ringGeometry = new RingGeometry(
      config.squareSize * 0.35,
      config.squareSize * 0.5,
      24
    );
    this.ringGeometry.rotateX(-Math.PI / 2);

    this.ringMaterial = new MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.7,
      side: DoubleSide,
      depthWrite: false,
    });
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) this.clear();
  }

  /** Pass a reference to the particle system for checkmate shower */
  setParticleSystem(ps: ParticleSystem): void {
    this.particleSystem = ps;
  }

  showCheck(square: string, checkmate: boolean): void {
    this.clear();
    if (this.reducedMotion) return;

    this.checkSquare = square;
    this.isCheckmate = checkmate;
    this.pulseTime = 0;
    this.autoDismissTimer = 0;

    const coords = squareTo3D(square, this.config);
    this.ringMesh = new Mesh(this.ringGeometry, this.ringMaterial);
    this.ringMesh.position.set(coords.x, 0.03, coords.z);
    this.group.add(this.ringMesh);

    if (checkmate) {
      this.ringMaterial.color.set(0xffd700); // Gold for checkmate
      this.particleSystem?.emitCheckmateShower(square);
    } else {
      this.ringMaterial.color.set(0xff4444); // Red for check
    }
  }

  clear(): void {
    if (this.ringMesh) {
      this.group.remove(this.ringMesh);
      this.ringMesh = null;
    }
    this.checkSquare = null;
    this.isCheckmate = false;
    this.autoDismissTimer = 0;
  }

  update(dt: number): void {
    if (!this.ringMesh) return;

    this.pulseTime += dt * 4;
    const intensity = 0.5 + Math.sin(this.pulseTime) * 0.3;
    this.ringMaterial.opacity = intensity;

    // Scale pulse
    const scale = 1.0 + Math.sin(this.pulseTime * 0.5) * 0.1;
    this.ringMesh.scale.set(scale, scale, scale);

    // Auto dismiss after 2 seconds
    this.autoDismissTimer += dt;
    if (this.autoDismissTimer > 2.0) {
      this.clear();
    }
  }

  dispose(): void {
    this.clear();
    this.ringGeometry.dispose();
    this.ringMaterial.dispose();
  }
}

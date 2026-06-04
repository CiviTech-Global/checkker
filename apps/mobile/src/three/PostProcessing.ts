/**
 * Post-processing module placeholder.
 *
 * UnrealBloomPass from three/examples/jsm requires EffectComposer which isn't
 * well-supported in expo-three's GL context. Instead, we achieve a bloom-like
 * effect using emissive materials on highlighted elements.
 *
 * This module provides a simple emissive glow controller that can be applied
 * to materials for a bloom-like appearance without actual post-processing.
 */
import type { MeshStandardMaterial } from "three";

export class PostProcessing {
  private glowMaterials: Set<MeshStandardMaterial> = new Set();
  private enabled = true;
  private glowIntensity = 0.3;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      for (const mat of this.glowMaterials) {
        mat.emissiveIntensity = 0;
      }
    }
  }

  registerGlowMaterial(material: MeshStandardMaterial): void {
    this.glowMaterials.add(material);
    if (this.enabled) {
      material.emissiveIntensity = this.glowIntensity;
    }
  }

  unregisterGlowMaterial(material: MeshStandardMaterial): void {
    this.glowMaterials.delete(material);
    material.emissiveIntensity = 0;
  }

  update(dt: number): void {
    if (!this.enabled) return;
    // Subtle pulsing glow
    this.glowIntensity = 0.2 + Math.sin(performance.now() / 500) * 0.1;
    for (const mat of this.glowMaterials) {
      mat.emissiveIntensity = this.glowIntensity;
    }
  }

  dispose(): void {
    this.glowMaterials.clear();
  }
}

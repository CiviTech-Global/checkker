import {
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  Points,
  Color,
} from "three";
import { squareTo3D, type SceneConfig } from "./types";

const POOL_SIZE = 200;
const PARTICLE_LIFETIME = 1.5;

interface Particle {
  alive: boolean;
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export class ParticleSystem {
  private group: Group;
  private config: SceneConfig;
  private particles: Particle[] = [];
  private geometry: BufferGeometry;
  private material: PointsMaterial;
  private points: Points;
  private positions: Float32Array;
  private reducedMotion = false;

  constructor(group: Group, config: SceneConfig) {
    this.group = group;
    this.config = config;

    // Pre-allocate particle pool
    for (let i = 0; i < POOL_SIZE; i++) {
      this.particles.push({
        alive: false,
        life: 0,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }

    this.positions = new Float32Array(POOL_SIZE * 3);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(this.positions, 3)
    );

    this.material = new PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    this.points = new Points(this.geometry, this.material);
    this.group.add(this.points);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  emitCapture(square: string, color: number): void {
    if (this.reducedMotion) return;

    const coords = squareTo3D(square, this.config);
    this.material.color.set(new Color(color));

    let emitted = 0;
    for (const p of this.particles) {
      if (emitted >= 50) break;
      if (p.alive) continue;

      p.alive = true;
      p.life = PARTICLE_LIFETIME;
      p.x = coords.x + (Math.random() - 0.5) * 0.3;
      p.y = 0.3;
      p.z = coords.z + (Math.random() - 0.5) * 0.3;
      p.vx = (Math.random() - 0.5) * 2;
      p.vy = 1.5 + Math.random() * 2;
      p.vz = (Math.random() - 0.5) * 2;
      emitted++;
    }
  }

  emitCheckmateShower(square: string): void {
    if (this.reducedMotion) return;

    const coords = squareTo3D(square, this.config);
    this.material.color.set(new Color(0xffd700));

    let emitted = 0;
    for (const p of this.particles) {
      if (emitted >= 100) break;
      if (p.alive) continue;

      p.alive = true;
      p.life = 2.0;
      p.x = coords.x + (Math.random() - 0.5) * 2;
      p.y = 4 + Math.random() * 2;
      p.z = coords.z + (Math.random() - 0.5) * 2;
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = -0.5 - Math.random();
      p.vz = (Math.random() - 0.5) * 0.5;
      emitted++;
    }
  }

  update(dt: number): void {
    const gravity = -4;
    let activeCount = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.alive) {
        // Hide inactive particles far away
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -100;
        this.positions[i * 3 + 2] = 0;
        continue;
      }

      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this.positions[i * 3 + 1] = -100;
        continue;
      }

      // Physics
      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Floor bounce
      if (p.y < 0) {
        p.y = 0;
        p.vy = Math.abs(p.vy) * 0.3;
        p.vx *= 0.8;
        p.vz *= 0.8;
      }

      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;
      activeCount++;
    }

    // Fade based on remaining life
    this.material.opacity = activeCount > 0 ? 0.8 : 0;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.setDrawRange(0, POOL_SIZE);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.group.remove(this.points);
  }
}

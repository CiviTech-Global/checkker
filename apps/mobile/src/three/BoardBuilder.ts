import {
  Group,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  BoxGeometry,
  type Material,
} from "three";
import { type SceneConfig, indicesToSquare } from "./types";

export class BoardBuilder {
  private group: Group;
  private config: SceneConfig;
  private materials: Material[] = [];
  private squareMeshes: Map<string, Mesh> = new Map();

  constructor(group: Group, config: SceneConfig) {
    this.group = group;
    this.config = config;
  }

  build(): void {
    this.buildBase();
    this.buildSquares();
    this.buildBorder();
  }

  getSquareMeshes(): Map<string, Mesh> {
    return this.squareMeshes;
  }

  /** Solid base slab under the board so it doesn't float */
  private buildBase(): void {
    const { boardSize, squareSize } = this.config;
    const totalSize = boardSize * squareSize;
    const baseH = 0.12;

    const baseMat = new MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.5,
      metalness: 0.05,
    });
    this.materials.push(baseMat);

    const baseGeo = new BoxGeometry(totalSize + 0.3, baseH, totalSize + 0.3);
    const baseMesh = new Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -baseH / 2, 0);
    this.group.add(baseMesh);
  }

  private buildSquares(): void {
    const { boardSize, squareSize, lightColor, darkColor } = this.config;
    const half = (boardSize * squareSize) / 2;

    const lightMat = new MeshStandardMaterial({
      color: lightColor,
      roughness: 0.55,
      metalness: 0.0,
    });
    const darkMat = new MeshStandardMaterial({
      color: darkColor,
      roughness: 0.55,
      metalness: 0.0,
    });
    this.materials.push(lightMat, darkMat);

    const geo = new PlaneGeometry(squareSize * 0.98, squareSize * 0.98);
    geo.rotateX(-Math.PI / 2);

    for (let file = 0; file < boardSize; file++) {
      for (let rank = 0; rank < boardSize; rank++) {
        const isLight = (file + rank) % 2 === 0;
        const mesh = new Mesh(geo, isLight ? lightMat : darkMat);
        mesh.position.set(
          file * squareSize - half + squareSize / 2,
          0.001, // Sit just above the base
          -(rank * squareSize - half + squareSize / 2)
        );
        const square = indicesToSquare(file, rank);
        mesh.userData.square = square;
        this.squareMeshes.set(square, mesh);
        this.group.add(mesh);
      }
    }
  }

  private buildBorder(): void {
    const { boardSize, squareSize } = this.config;
    const totalSize = boardSize * squareSize;
    const borderWidth = 0.2;
    const borderHeight = 0.1;

    const borderMat = new MeshStandardMaterial({
      color: 0x4a3520,
      roughness: 0.35,
      metalness: 0.1,
    });
    this.materials.push(borderMat);

    const sides: { size: [number, number, number]; pos: [number, number, number] }[] = [
      {
        size: [totalSize + borderWidth * 2, borderHeight, borderWidth],
        pos: [0, borderHeight / 2, -(totalSize / 2 + borderWidth / 2)],
      },
      {
        size: [totalSize + borderWidth * 2, borderHeight, borderWidth],
        pos: [0, borderHeight / 2, totalSize / 2 + borderWidth / 2],
      },
      {
        size: [borderWidth, borderHeight, totalSize],
        pos: [-(totalSize / 2 + borderWidth / 2), borderHeight / 2, 0],
      },
      {
        size: [borderWidth, borderHeight, totalSize],
        pos: [totalSize / 2 + borderWidth / 2, borderHeight / 2, 0],
      },
    ];

    for (const side of sides) {
      const geo = new BoxGeometry(side.size[0], side.size[1], side.size[2]);
      const mesh = new Mesh(geo, borderMat);
      mesh.position.set(side.pos[0], side.pos[1], side.pos[2]);
      this.group.add(mesh);
    }
  }

  dispose(): void {
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.squareMeshes.clear();
  }
}

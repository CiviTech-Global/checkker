import { Renderer } from "expo-three";
import {
  Scene,
  OrthographicCamera,
  AmbientLight,
  DirectionalLight,
  WebGLRenderer,
  Group,
  Color,
} from "three";
import type { ExpoWebGLRenderingContext } from "expo-gl";
import { AppState, type AppStateStatus } from "react-native";
import { BoardBuilder } from "./BoardBuilder";
import { PieceFactory } from "./PieceFactory";
import { SceneSync } from "./SceneSync";
import { HighlightManager } from "./HighlightManager";
import { TouchHandler } from "./TouchHandler";
import { PieceAnimator } from "./PieceAnimator";
import { CameraController } from "./CameraController";
import { ParticleSystem } from "./ParticleSystem";
import { CheckEffects } from "./CheckEffects";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { DEFAULT_CONFIG, type SceneConfig } from "./types";

export class ChessScene3D {
  readonly scene: Scene;
  readonly camera: OrthographicCamera;
  readonly renderer: WebGLRenderer;
  readonly gl: ExpoWebGLRenderingContext;

  readonly boardGroup: Group;
  readonly piecesGroup: Group;
  readonly effectsGroup: Group;

  readonly boardBuilder: BoardBuilder;
  readonly pieceFactory: PieceFactory;
  readonly sceneSync: SceneSync;
  readonly highlightManager: HighlightManager;
  readonly touchHandler: TouchHandler;
  readonly pieceAnimator: PieceAnimator;
  readonly cameraController: CameraController;
  readonly particleSystem: ParticleSystem;
  readonly checkEffects: CheckEffects;
  readonly performanceMonitor: PerformanceMonitor;

  private animationFrameId: number | null = null;
  private disposed = false;
  private lastTime = 0;
  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private paused = false;
  private config: SceneConfig;
  private reducedMotion = false;

  constructor(
    gl: ExpoWebGLRenderingContext,
    width: number,
    height: number,
    config: SceneConfig = DEFAULT_CONFIG
  ) {
    this.gl = gl;
    this.config = config;

    // Renderer
    this.renderer = new Renderer({ gl }) as unknown as WebGLRenderer;
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(new Color(0x1a1a2e), 1);
    this.renderer.setPixelRatio(1);

    // Scene
    this.scene = new Scene();

    // OrthographicCamera — frustum will be set by CameraController
    this.camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 100);

    // Lights — brighter for better piece visibility
    const ambient = new AmbientLight(0xc0c0e0, 0.6);
    const directional = new DirectionalLight(0xffffff, 0.9);
    directional.position.set(4, 12, 6);
    // Second fill light from the other side to reduce harsh shadows
    const fill = new DirectionalLight(0xffffff, 0.3);
    fill.position.set(-4, 8, -4);
    this.scene.add(ambient, directional, fill);

    // Groups
    this.boardGroup = new Group();
    this.piecesGroup = new Group();
    this.effectsGroup = new Group();
    this.scene.add(this.boardGroup, this.piecesGroup, this.effectsGroup);

    // Sub-systems
    this.boardBuilder = new BoardBuilder(this.boardGroup, config);
    this.pieceFactory = new PieceFactory(config);
    this.pieceAnimator = new PieceAnimator(config);
    this.sceneSync = new SceneSync(
      this.piecesGroup,
      this.pieceFactory,
      this.pieceAnimator,
      config
    );
    this.highlightManager = new HighlightManager(this.boardGroup, config);
    this.touchHandler = new TouchHandler(this.camera, this.boardBuilder, config);
    this.cameraController = new CameraController(this.camera, config);
    this.particleSystem = new ParticleSystem(this.effectsGroup, config);
    this.checkEffects = new CheckEffects(this.effectsGroup, config);
    this.performanceMonitor = new PerformanceMonitor();

    // Build board
    this.boardBuilder.build();

    // Set camera frustum and position
    this.cameraController.updateFrustum(width / height);
    this.cameraController.setOrientation("white", true);

    // App state listener
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppState
    );

    // Start render loop
    this.lastTime = performance.now();
    this.startLoop();
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.pieceAnimator.setReducedMotion(reduced);
    this.particleSystem.setReducedMotion(reduced);
    this.checkEffects.setReducedMotion(reduced);
    this.cameraController.setReducedMotion(reduced);
  }

  updatePosition(fen: string): void {
    const events = this.sceneSync.syncToFen(fen);
    for (const evt of events) {
      if (evt.type === "capture" && !this.reducedMotion) {
        this.particleSystem.emitCapture(
          evt.square,
          evt.capturedColor === "white" ? 0xf5f5f0 : 0x2a2a3a
        );
      }
    }
  }

  setHighlights(
    squares: string[],
    selectedSquare?: string | null,
    lastMove?: { from: string; to: string } | null
  ): void {
    this.highlightManager.update(squares, selectedSquare ?? null, lastMove ?? null);
  }

  setCheck(kingSquare: string | null, isCheckmate: boolean): void {
    if (kingSquare && !this.reducedMotion) {
      this.checkEffects.showCheck(kingSquare, isCheckmate);
    } else {
      this.checkEffects.clear();
    }
  }

  setOrientation(orientation: "white" | "black"): void {
    this.cameraController.setOrientation(orientation, this.reducedMotion);
  }

  handleTouch(
    pageX: number,
    pageY: number,
    viewX: number,
    viewY: number,
    viewWidth: number,
    viewHeight: number
  ): string | null {
    return this.touchHandler.getSquareFromTouch(
      pageX - viewX,
      pageY - viewY,
      viewWidth,
      viewHeight,
      this.cameraController.getCurrentOrientation()
    );
  }

  resize(width: number, height: number): void {
    this.cameraController.updateFrustum(width / height);
    this.renderer.setSize(width, height);
  }

  private handleAppState = (state: AppStateStatus): void => {
    if (state === "active") {
      this.paused = false;
      this.lastTime = performance.now();
      this.startLoop();
    } else {
      this.paused = true;
    }
  };

  private startLoop(): void {
    if (this.animationFrameId !== null) return;
    const loop = (): void => {
      if (this.disposed || this.paused) {
        this.animationFrameId = null;
        return;
      }
      this.animationFrameId = requestAnimationFrame(loop);

      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      this.performanceMonitor.beginFrame();

      this.pieceAnimator.update(dt);
      this.cameraController.update(dt);
      if (!this.reducedMotion) {
        this.particleSystem.update(dt);
        this.checkEffects.update(dt);
        this.highlightManager.update_pulse(dt);
      }

      this.renderer.render(this.scene, this.camera);
      this.gl.endFrameEXP();

      this.performanceMonitor.endFrame();
    };
    loop();
  }

  dispose(): void {
    this.disposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.boardBuilder.dispose();
    this.pieceFactory.dispose();
    this.sceneSync.dispose();
    this.highlightManager.dispose();
    this.particleSystem.dispose();
    this.checkEffects.dispose();
    this.renderer.dispose();
  }
}

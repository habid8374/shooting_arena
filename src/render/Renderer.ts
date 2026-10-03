import * as THREE from 'three';
import { ENGINE, WORLD } from '../config/engine';
import { PALETTE } from '../config/palette';
import type { Settings } from '../config/schema';
import { Chunk } from '../world/Chunk';
import type { World } from '../world/World';
import { WorldView } from './WorldView';

/**
 * Renderer: prepara Three.js (escena, cámara, cielo, niebla) y dibuja cada
 * fotograma. El mundo de bloques lo dibuja `WorldView`.
 */
export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private worldView: WorldView | null = null;
  private skyColor = new THREE.Color(PALETTE.sky);
  private renderDistance: number;
  private fogEnabled: boolean;
  /**
   * Punto desde el que se mide la distancia de render. En la vista de
   * exhibición es el centro del mundo (la cámara está lejos); en primera
   * persona será la propia cámara (null).
   */
  private focusPoint: THREE.Vector3 | null = null;
  /** Distancia extra que se suma a la niebla (la cámara de exhibición está lejos). */
  private fogOffset = 0;

  constructor(
    readonly canvas: HTMLCanvasElement,
    settings: Readonly<Settings>,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, ENGINE.maxPixelRatio));
    this.scene.background = this.skyColor;
    this.camera = new THREE.PerspectiveCamera(settings.graphics.fov, 1, 0.1, 1000);
    this.renderDistance = settings.graphics.renderDistance;
    this.fogEnabled = settings.graphics.fog;

    this.applySettings(settings);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Cambia el mundo que se dibuja (libera la memoria del anterior). */
  setWorld(world: World): WorldView {
    if (this.worldView) {
      this.scene.remove(this.worldView.group);
      this.worldView.dispose();
    }
    this.worldView = new WorldView(world);
    this.scene.add(this.worldView.group);
    this.skyColor.set(this.worldView.palette.sky);
    this.updateFog();
    return this.worldView;
  }

  get view(): WorldView | null {
    return this.worldView;
  }

  /** Define desde dónde se mide la distancia de render y cuánto alejar la niebla. */
  setViewFocus(point: THREE.Vector3 | null, fogOffset: number): void {
    this.focusPoint = point;
    this.fogOffset = fogOffset;
    this.updateFog();
  }

  /** Aplica en vivo los ajustes gráficos. */
  applySettings(settings: Readonly<Settings>): void {
    this.camera.fov = settings.graphics.fov;
    this.camera.updateProjectionMatrix();
    this.renderDistance = settings.graphics.renderDistance;
    this.fogEnabled = settings.graphics.fog;
    this.updateFog();
  }

  render(): void {
    if (this.worldView) {
      // Reconstruye pocas mallas por fotograma para no causar tirones.
      this.worldView.rebuildDirty(2);
      this.worldView.updateVisibility(this.focusPoint ?? this.camera.position, this.renderDistance);
    }
    this.renderer.render(this.scene, this.camera);
  }

  private updateFog(): void {
    const far = this.renderDistance * Chunk.SIZE;
    this.camera.far = far * 2 + Chunk.HEIGHT + this.fogOffset;
    this.camera.updateProjectionMatrix();
    this.scene.fog = this.fogEnabled
      ? new THREE.Fog(
          this.skyColor,
          far * WORLD.fogStartFraction + this.fogOffset,
          far + this.fogOffset,
        )
      : null;
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

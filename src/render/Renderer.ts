import * as THREE from 'three';
import { ENGINE } from '../config/engine';
import { PALETTE } from '../config/palette';
import type { Settings } from '../config/schema';

/**
 * Renderer: prepara Three.js (escena, cámara, luces) y dibuja cada fotograma.
 *
 * En la Fase 1 solo muestra una escena de prueba (un cubo pastel girando sobre
 * una isla) para comprobar que el loop, los estados y la configuración
 * funcionan. En la Fase 2 aquí se dibujarán los chunks del mundo.
 */
export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly demoCube: THREE.Mesh;
  private previousAngle = 0;
  private angle = 0;

  constructor(canvas: HTMLCanvasElement, settings: Readonly<Settings>) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, ENGINE.maxPixelRatio));
    this.scene.background = new THREE.Color(PALETTE.sky);

    this.camera = new THREE.PerspectiveCamera(settings.graphics.fov, 1, 0.1, 500);
    this.camera.position.set(3.5, 2.5, 4.5);
    this.camera.lookAt(0, 0.5, 0);

    // Luz suave del cielo + luz de "sol" pastel.
    this.scene.add(new THREE.AmbientLight(PALETTE.snow, 1.2));
    this.scene.add(new THREE.HemisphereLight(PALETTE.snow, PALETTE.sunset, 0.8));
    const sun = new THREE.DirectionalLight(PALETTE.snow, 1.6);
    sun.position.set(5, 10, 7);
    this.scene.add(sun);

    // Cubo de prueba con las 6 caras de colores de la paleta.
    const faceColors = [
      PALETTE.accentPink,
      PALETTE.accentLilac,
      PALETTE.grass,
      PALETTE.accentPeach,
      PALETTE.water,
      PALETTE.accentMint,
    ];
    const materials = faceColors.map((c) => new THREE.MeshLambertMaterial({ color: c }));
    this.demoCube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), materials);
    this.demoCube.position.y = 1.2;
    this.scene.add(this.demoCube);

    // Islita de pasto y tierra debajo.
    const island = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.5, 4),
      new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
    );
    island.position.y = -0.25;
    const dirt = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1, 3.6),
      new THREE.MeshLambertMaterial({ color: PALETTE.dirt }),
    );
    dirt.position.y = -1;
    this.scene.add(island, dirt);

    this.applySettings(settings);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Aplica en vivo los ajustes gráficos. */
  applySettings(settings: Readonly<Settings>): void {
    this.camera.fov = settings.graphics.fov;
    this.camera.updateProjectionMatrix();
    this.scene.fog = settings.graphics.fog ? new THREE.Fog(PALETTE.sky, 8, 30) : null;
  }

  /** Paso fijo de lógica de la escena de prueba (gira el cubo). */
  update(dt: number): void {
    this.previousAngle = this.angle;
    this.angle += dt * 0.8;
  }

  /** Dibuja, interpolando entre el paso anterior y el actual con `alpha`. */
  render(alpha: number): void {
    const a = this.previousAngle + (this.angle - this.previousAngle) * alpha;
    this.demoCube.rotation.set(a * 0.5, a, 0);
    this.demoCube.position.y = 1.2 + Math.sin(a * 2) * 0.15;
    this.renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

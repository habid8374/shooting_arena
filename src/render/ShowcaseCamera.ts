import type * as THREE from 'three';

/**
 * Cámara de exhibición (solo para la Fase 2): gira lentamente alrededor del
 * mundo. Con el ratón o el dedo se puede arrastrar para girar y la rueda
 * acerca o aleja. En la Fase 3 la reemplaza la cámara en primera persona.
 */
export interface ShowcaseOptions {
  /** Velocidad de giro automático (radianes por segundo). */
  autoSpeed: number;
  /** Radianes por píxel arrastrado. */
  dragSpeed: number;
  minRadius: number;
  maxRadius: number;
}

export const SHOWCASE_DEFAULTS: ShowcaseOptions = {
  autoSpeed: 0.08,
  dragSpeed: 0.005,
  minRadius: 20,
  maxRadius: 160,
};

export class ShowcaseCamera {
  private angle = 0;
  private previousAngle = 0;
  private pitch = 0.55;
  private radius = 80;
  private readonly center = { x: 0, y: 0, z: 0 };
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    element: HTMLElement,
    private readonly options: ShowcaseOptions = SHOWCASE_DEFAULTS,
    private readonly isActive: () => boolean = () => true,
  ) {
    element.addEventListener('pointerdown', (e) => {
      if (!this.isActive()) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    window.addEventListener('pointerup', () => (this.dragging = false));
    window.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.angle -= (e.clientX - this.lastX) * this.options.dragSpeed;
      this.previousAngle = this.angle;
      this.pitch = Math.min(
        1.35,
        Math.max(0.1, this.pitch + (e.clientY - this.lastY) * this.options.dragSpeed),
      );
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    element.addEventListener(
      'wheel',
      (e) => {
        if (!this.isActive()) return;
        this.radius = Math.min(
          this.options.maxRadius,
          Math.max(this.options.minRadius, this.radius * (1 + Math.sign(e.deltaY) * 0.1)),
        );
      },
      { passive: true },
    );
  }

  /** Centra la cámara sobre un punto (el centro del mundo). */
  focus(x: number, y: number, z: number, radius: number): void {
    this.center.x = x;
    this.center.y = y;
    this.center.z = z;
    this.radius = Math.min(this.options.maxRadius, Math.max(this.options.minRadius, radius));
  }

  update(dt: number): void {
    this.previousAngle = this.angle;
    if (!this.dragging) this.angle += dt * this.options.autoSpeed;
  }

  apply(alpha: number): void {
    const a = this.previousAngle + (this.angle - this.previousAngle) * alpha;
    const flat = Math.cos(this.pitch) * this.radius;
    this.camera.position.set(
      this.center.x + Math.cos(a) * flat,
      this.center.y + Math.sin(this.pitch) * this.radius,
      this.center.z + Math.sin(a) * flat,
    );
    this.camera.lookAt(this.center.x, this.center.y, this.center.z);
  }
}

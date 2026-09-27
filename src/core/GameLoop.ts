/**
 * Game loop de PASO FIJO.
 *
 * Idea: la lógica (física, IA, disparos) avanza siempre en pasitos del mismo
 * tamaño (ej. 1/60 s). El dibujo ocurre cada vez que el navegador pinta la
 * pantalla. Si el celular va lento, se hacen varios pasitos seguidos para
 * "ponerse al día"; si va rápido, a veces se dibuja sin avanzar la lógica.
 *
 * `alpha` (0..1) indica qué tan cerca estamos del siguiente paso, para que el
 * dibujo pueda suavizar (interpolar) el movimiento.
 */

export interface GameLoopOptions {
  /** Pasos de lógica por segundo (ej. 60). */
  stepsPerSecond: number;
  /** Máximo de pasos por fotograma, evita la "espiral de la muerte" si el aparato se congela. */
  maxStepsPerFrame: number;
  /** Se llama en cada paso fijo con dt en segundos. */
  update: (dt: number) => void;
  /** Se llama una vez por fotograma. */
  render: (alpha: number, frameDt: number) => void;
  /** Fuente de tiempo en milisegundos (inyectable para pruebas). */
  now?: () => number;
  /** Pide el siguiente fotograma (inyectable para pruebas). */
  requestFrame?: (cb: () => void) => number;
  /** Cancela un fotograma pedido. */
  cancelFrame?: (id: number) => void;
}

export class GameLoop {
  private readonly stepMs: number;
  private accumulator = 0;
  private lastTime = 0;
  private frameId: number | null = null;
  private running = false;
  private readonly now: () => number;
  private readonly requestFrame: (cb: () => void) => number;
  private readonly cancelFrame: (id: number) => void;

  constructor(private readonly options: GameLoopOptions) {
    if (options.stepsPerSecond <= 0) throw new Error('stepsPerSecond debe ser mayor que 0');
    this.stepMs = 1000 / options.stepsPerSecond;
    this.now = options.now ?? (() => performance.now());
    this.requestFrame = options.requestFrame ?? ((cb) => requestAnimationFrame(cb));
    this.cancelFrame = options.cancelFrame ?? ((id) => cancelAnimationFrame(id));
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.accumulator = 0;
    this.lastTime = this.now();
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
  }

  /**
   * Avanza un fotograma. Es público para poder probar el loop sin navegador.
   * Devuelve cuántos pasos fijos se ejecutaron.
   */
  tick(): number {
    const current = this.now();
    const frameMs = Math.max(0, current - this.lastTime);
    this.lastTime = current;
    this.accumulator += frameMs;

    let steps = 0;
    const dt = this.stepMs / 1000;
    while (this.accumulator >= this.stepMs && steps < this.options.maxStepsPerFrame) {
      this.options.update(dt);
      this.accumulator -= this.stepMs;
      steps++;
    }
    // Si llegamos al límite, descartamos el tiempo sobrante en lugar de acumularlo.
    if (steps >= this.options.maxStepsPerFrame) this.accumulator = 0;

    this.options.render(this.accumulator / this.stepMs, frameMs / 1000);
    return steps;
  }

  private scheduleNext(): void {
    this.frameId = this.requestFrame(() => {
      if (!this.running) return;
      this.tick();
      this.scheduleNext();
    });
  }
}

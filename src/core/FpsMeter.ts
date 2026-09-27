/**
 * Cuenta fotogramas y cada cierto tiempo calcula los FPS promedio.
 * Devuelve el número nuevo solo cuando termina una medición.
 */
export class FpsMeter {
  private frames = 0;
  private elapsedMs = 0;

  constructor(private readonly sampleMs: number) {}

  /** Registra un fotograma de `frameMs` milisegundos. */
  frame(frameMs: number): number | null {
    this.frames++;
    this.elapsedMs += frameMs;
    if (this.elapsedMs < this.sampleMs) return null;
    const fps = Math.round((this.frames * 1000) / this.elapsedMs);
    this.frames = 0;
    this.elapsedMs = 0;
    return fps;
  }
}

/**
 * Constantes técnicas del motor (no aparecen en el menú de Ajustes, pero
 * tampoco están "quemadas" dentro de los módulos: todo se lee de aquí).
 */
export const ENGINE = {
  /** Pasos de lógica por segundo del loop fijo. */
  stepsPerSecond: 60,
  /** Máximo de pasos de lógica por fotograma (si el aparato se congela). */
  maxStepsPerFrame: 5,
  /** Cada cuántos milisegundos se recalcula el contador de FPS. */
  fpsSampleMs: 500,
  /** Tiempo mínimo que se muestra la pantalla de carga (ms). */
  minLoadingMs: 600,
  /** Límite de resolución (devicePixelRatio) para cuidar el rendimiento. */
  maxPixelRatio: 2,
} as const;

/** Medidas del mundo de bloques. */
export const WORLD = {
  /** Ancho y largo de un chunk en bloques. */
  chunkSize: 16,
  /** Alto de un chunk (y del mundo) en bloques. */
  chunkHeight: 64,
  /** Tamaño en píxeles de cada textura del atlas. */
  tileSize: 16,
  /** Cuántos chunks se generan antes de dejar respirar a la pantalla de carga. */
  chunksPerLoadingSlice: 4,
  /** Sombreado por cara (simula luz sin cálculos costosos). */
  faceShade: { top: 1, bottom: 0.62, x: 0.84, z: 0.92 },
  /** Opacidad del agua. */
  waterOpacity: 0.72,
  /** La niebla empieza en esta fracción de la distancia de render. */
  fogStartFraction: 0.6,
} as const;

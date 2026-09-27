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

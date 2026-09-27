import type { GameStateName } from './GameStateMachine';
import type { Settings } from '../config/schema';

/**
 * Catálogo de TODOS los eventos del juego y los datos que lleva cada uno.
 *
 * Como TypeScript conoce este mapa, si alguien escribe mal el nombre de un
 * evento o manda datos equivocados, el editor lo marca en rojo antes de jugar.
 * Las fases siguientes irán agregando más eventos aquí
 * (ej. `enemy:defeated`, `bonus:collected`, `player:lifeLost`, `world:completed`).
 */
export interface GameEvents {
  /** La máquina de estados cambió de estado. */
  'state:changed': { from: GameStateName; to: GameStateName };
  /** Algún ajuste cambió (se envía la configuración completa ya validada). */
  'config:changed': { settings: Settings };
  /** Se midió el rendimiento (fotogramas por segundo). */
  'perf:fps': { fps: number };
}

/** Nombre de cualquier evento válido. */
export type GameEventName = keyof GameEvents;

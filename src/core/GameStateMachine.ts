import type { EventBus } from './EventBus';
import type { GameEvents } from './events';

/**
 * Máquina de estados del juego.
 *
 * El juego siempre está en UN solo estado. Solo se permiten ciertas
 * transiciones (por ejemplo, no se puede ir de "menu" a "summary" directo).
 * Eso evita errores como disparar mientras el juego está en pausa.
 */
export type GameStateName =
  | 'loading' // pantalla de carga
  | 'menu' // menú principal
  | 'worldMap' // mapa de selección de mundos
  | 'playing' // jugando (modo aventura o creativo)
  | 'paused' // pausa
  | 'summary' // resumen de bonus al completar un mundo
  | 'gameOver'; // sin vidas

/** Transiciones permitidas desde cada estado. */
export const TRANSITIONS: Readonly<Record<GameStateName, readonly GameStateName[]>> = {
  loading: ['menu'],
  menu: ['worldMap', 'playing'],
  worldMap: ['menu', 'playing'],
  playing: ['paused', 'summary', 'gameOver'],
  paused: ['playing', 'worldMap', 'menu'],
  summary: ['worldMap', 'playing', 'menu'],
  gameOver: ['playing', 'worldMap', 'menu'],
};

/** Acciones opcionales al entrar o salir de un estado. */
export interface StateHooks {
  enter?: (from: GameStateName) => void;
  exit?: (to: GameStateName) => void;
}

export class GameStateMachine {
  private current: GameStateName = 'loading';
  private readonly hooks = new Map<GameStateName, StateHooks>();

  constructor(private readonly bus: EventBus<GameEvents>) {}

  get state(): GameStateName {
    return this.current;
  }

  /** Registra qué hacer al entrar/salir de un estado. */
  register(state: GameStateName, hooks: StateHooks): void {
    this.hooks.set(state, hooks);
  }

  canTransition(to: GameStateName): boolean {
    return TRANSITIONS[this.current].includes(to);
  }

  /**
   * Cambia de estado. Devuelve `false` (y no hace nada) si la transición no
   * está permitida.
   */
  transition(to: GameStateName): boolean {
    if (!this.canTransition(to)) {
      console.warn(`[Estados] Transición no permitida: ${this.current} → ${to}`);
      return false;
    }
    const from = this.current;
    this.hooks.get(from)?.exit?.(to);
    this.current = to;
    this.hooks.get(to)?.enter?.(from);
    this.bus.emit('state:changed', { from, to });
    return true;
  }

  is(state: GameStateName): boolean {
    return this.current === state;
  }
}

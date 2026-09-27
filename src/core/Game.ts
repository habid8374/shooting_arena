import { ConfigStore } from '../config/ConfigStore';
import { ENGINE } from '../config/engine';
import { Renderer } from '../render/Renderer';
import { Screens } from '../ui/Screens';
import { applyTheme } from '../ui/theme';
import { EventBus } from './EventBus';
import type { GameEvents } from './events';
import { FpsMeter } from './FpsMeter';
import { GameLoop } from './GameLoop';
import { GameStateMachine } from './GameStateMachine';

/**
 * Game: el "director de orquesta". Crea los módulos, los conecta por el
 * EventBus y arranca el loop. No contiene lógica de juego propia.
 */
export class Game {
  readonly bus = new EventBus<GameEvents>();
  readonly states = new GameStateMachine(this.bus);
  readonly config: ConfigStore;
  private readonly renderer: Renderer;
  private readonly screens: Screens;
  private readonly loop: GameLoop;
  private readonly fpsMeter = new FpsMeter(ENGINE.fpsSampleMs);

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.config = new ConfigStore(this.bus, safeLocalStorage());
    const settings = this.config.get();

    applyTheme(settings.theme.variant);
    this.renderer = new Renderer(canvas, settings);
    this.screens = new Screens(uiRoot, this.states, this.bus);
    this.screens.setFpsVisible(settings.graphics.showFps);

    // Cambios de ajustes → se aplican en vivo.
    this.bus.on('config:changed', ({ settings: s }) => {
      applyTheme(s.theme.variant);
      this.renderer.applySettings(s);
    });

    this.loop = new GameLoop({
      stepsPerSecond: ENGINE.stepsPerSecond,
      maxStepsPerFrame: ENGINE.maxStepsPerFrame,
      update: (dt) => this.update(dt),
      render: (alpha, frameDt) => this.render(alpha, frameDt),
    });

    this.bindKeys();
  }

  /** Arranca el loop y simula la carga inicial. */
  async start(): Promise<void> {
    this.loop.start();
    const begin = performance.now();
    // En fases futuras aquí se cargan mundos, texturas y sonidos.
    const tasks: (() => Promise<void>)[] = [async () => undefined];
    for (let i = 0; i < tasks.length; i++) {
      await tasks[i]?.();
      this.screens.setLoadingProgress((i + 1) / tasks.length);
    }
    const remaining = ENGINE.minLoadingMs - (performance.now() - begin);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    this.states.transition('menu');
  }

  private update(dt: number): void {
    // La lógica solo avanza si se está jugando (la pausa congela todo).
    if (this.states.is('playing') || this.states.is('menu')) this.renderer.update(dt);
  }

  private render(alpha: number, frameDt: number): void {
    this.renderer.render(alpha);
    const fps = this.fpsMeter.frame(frameDt * 1000);
    if (fps !== null) this.bus.emit('perf:fps', { fps });
  }

  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyP' && e.code !== 'Escape') return;
      if (this.states.is('playing')) this.states.transition('paused');
      else if (this.states.is('paused')) this.states.transition('playing');
    });
    // Si el jugador cambia de pestaña, el juego se pausa solo.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.states.is('playing')) this.states.transition('paused');
    });
  }
}

/** localStorage puede fallar (modo privado); en ese caso no guardamos nada. */
function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

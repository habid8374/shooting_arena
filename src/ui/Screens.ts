import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import type { GameStateMachine, GameStateName } from '../core/GameStateMachine';
import { el } from './dom';

/**
 * Pantallas básicas de la Fase 1: carga, menú principal y pausa, más el
 * contador de FPS. Muestra u oculta cada pantalla según el estado del juego.
 * (En la Fase 9 se reemplazan por los menús completos.)
 */
export class Screens {
  private readonly loading: HTMLElement;
  private readonly loadingFill: HTMLElement;
  private readonly menu: HTMLElement;
  private readonly pause: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly fps: HTMLElement;

  constructor(
    root: HTMLElement,
    private readonly states: GameStateMachine,
    bus: EventBus<GameEvents>,
  ) {
    // Pantalla de carga
    this.loadingFill = el('div');
    this.loading = el('section', { className: 'screen screen--solid' }, [
      el('h1', { className: 'logo-title', text: 'Shooting Arenas' }),
      el('div', { className: 'loading-bar' }, [this.loadingFill]),
      el('p', { className: 'subtitle', text: 'Inflando burbujas…' }),
    ]);

    // Menú principal
    const playBtn = el('button', { className: 'btn', text: '▶ Jugar' });
    playBtn.addEventListener('click', () => this.states.transition('playing'));
    const settingsBtn = el('button', {
      className: 'btn btn--secondary',
      text: '⚙ Ajustes (Fase 9)',
    });
    settingsBtn.disabled = true;
    this.menu = el('section', { className: 'screen screen--menu', attrs: { hidden: '' } }, [
      el('h1', { className: 'logo-title', text: 'Shooting Arenas' }),
      el('p', { className: 'subtitle', text: 'Aventura de bloques y burbujas' }),
      el('div', { className: 'panel' }, [playBtn, settingsBtn]),
    ]);

    // Pausa
    const resumeBtn = el('button', { className: 'btn', text: '▶ Continuar' });
    resumeBtn.addEventListener('click', () => this.states.transition('playing'));
    const menuBtn = el('button', { className: 'btn btn--secondary', text: '🏠 Menú principal' });
    menuBtn.addEventListener('click', () => this.states.transition('menu'));
    this.pause = el('section', { className: 'screen screen--overlay', attrs: { hidden: '' } }, [
      el('div', { className: 'panel' }, [el('h2', { text: 'Pausa' }), resumeBtn, menuBtn]),
    ]);

    // Ayuda mientras se juega
    this.hint = el('div', {
      className: 'hint',
      text: 'Pausa: tecla P o Esc',
      attrs: { hidden: '' },
    });

    // Contador de FPS
    this.fps = el('div', { className: 'fps-counter', attrs: { hidden: '' } });

    root.append(this.loading, this.menu, this.pause, this.hint, this.fps);

    bus.on('state:changed', ({ to }) => this.show(to));
    bus.on('world:loaded', ({ name, emoji }) => this.setHint(`${emoji} ${name}`));
    bus.on('perf:fps', ({ fps }) => (this.fps.textContent = `${fps} FPS`));
    bus.on('config:changed', ({ settings }) => this.setFpsVisible(settings.graphics.showFps));
  }

  setLoadingProgress(fraction: number): void {
    this.loadingFill.style.width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
  }

  /** Texto de ayuda que se ve mientras se juega. */
  setHint(worldLabel: string): void {
    const parts = [worldLabel, 'Arrastra para girar · Rueda: zoom · 1–5: cambiar mundo · P: pausa'];
    this.hint.textContent = parts.filter(Boolean).join('  ·  ');
  }

  setFpsVisible(visible: boolean): void {
    this.fps.hidden = !visible;
  }

  private show(state: GameStateName): void {
    this.loading.hidden = state !== 'loading';
    this.menu.hidden = state !== 'menu';
    this.pause.hidden = state !== 'paused';
    this.hint.hidden = state !== 'playing';
  }
}

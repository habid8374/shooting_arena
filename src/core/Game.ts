import { Vector3 } from 'three';
import { ConfigStore } from '../config/ConfigStore';
import { ENGINE } from '../config/engine';
import { WORLDS } from '../data/worlds';
import type { WorldDefinition } from '../data/worlds/types';
import { Renderer } from '../render/Renderer';
import { ShowcaseCamera } from '../render/ShowcaseCamera';
import { Screens } from '../ui/Screens';
import { applyTheme } from '../ui/theme';
import { Chunk } from '../world/Chunk';
import { loadWorld } from '../world/loadWorld';
import type { World } from '../world/World';
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
  private readonly showcase: ShowcaseCamera;
  private readonly screens: Screens;
  private readonly loop: GameLoop;
  private readonly fpsMeter = new FpsMeter(ENGINE.fpsSampleMs);
  private world: World | null = null;
  private loadingWorld = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.config = new ConfigStore(this.bus, safeLocalStorage());
    const settings = this.config.get();

    applyTheme(settings.theme.variant);
    this.renderer = new Renderer(canvas, settings);
    this.showcase = new ShowcaseCamera(this.renderer.camera, canvas, undefined, () =>
      this.states.is('playing'),
    );
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

  /** Arranca el loop, carga el primer mundo y muestra el menú. */
  async start(): Promise<void> {
    this.loop.start();
    const begin = performance.now();
    const first = worldFromUrl() ?? WORLDS[0];
    if (!first) throw new Error('No hay mundos en src/data/worlds');
    await this.showWorld(first, (f) => this.screens.setLoadingProgress(f));
    const remaining = ENGINE.minLoadingMs - (performance.now() - begin);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    this.states.transition('menu');
  }

  /** Genera y muestra un mundo definido en JSON. */
  async showWorld(
    def: WorldDefinition,
    onProgress: (f: number) => void = () => undefined,
  ): Promise<void> {
    if (this.loadingWorld) return;
    this.loadingWorld = true;
    try {
      const world = await loadWorld(def, onProgress);
      this.world = world;
      this.renderer.setWorld(world);
      const S = Chunk.SIZE;
      const midX = world.widthBlocks / 2;
      const midZ = world.depthBlocks / 2;
      const groundY = Math.max(
        def.terrain.baseHeight,
        world.surfaceY(Math.floor(midX), Math.floor(midZ)),
      );
      const radius = Math.max(world.widthBlocks, world.depthBlocks) * 0.5 + S;
      this.showcase.focus(midX, groundY, midZ, radius);
      // La cámara de exhibición mira desde lejos: medimos la distancia desde el centro.
      this.renderer.setViewFocus(new Vector3(midX, groundY, midZ), radius);
      this.bus.emit('world:loaded', { id: def.id, name: def.name, emoji: def.emoji });
    } finally {
      this.loadingWorld = false;
    }
  }

  get currentWorld(): World | null {
    return this.world;
  }

  private update(dt: number): void {
    // La pausa congela todo; en el menú la cámara sigue girando de fondo.
    if (this.states.is('playing') || this.states.is('menu')) this.showcase.update(dt);
  }

  private render(alpha: number, frameDt: number): void {
    this.showcase.apply(alpha);
    this.renderer.render();
    const fps = this.fpsMeter.frame(frameDt * 1000);
    if (fps !== null) this.bus.emit('perf:fps', { fps });
  }

  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.states.is('playing')) this.states.transition('paused');
        else if (this.states.is('paused')) this.states.transition('playing');
        return;
      }
      // Fase 2: teclas 1–5 para ver cada mundo (luego serán la hotbar).
      const match = /^Digit([1-9])$/.exec(e.code);
      if (match && this.states.is('playing')) {
        const def = WORLDS[Number(match[1]) - 1];
        if (def) void this.showWorld(def);
      }
    });
    // Si el jugador cambia de pestaña, el juego se pausa solo.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.states.is('playing')) this.states.transition('paused');
    });
  }
}

/** Permite abrir un mundo directo con ?world=id (útil para probar). */
function worldFromUrl(): WorldDefinition | undefined {
  const id = new URLSearchParams(window.location.search).get('world');
  return id ? WORLDS.find((w) => w.id === id) : undefined;
}

/** localStorage puede fallar (modo privado); en ese caso no guardamos nada. */
function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

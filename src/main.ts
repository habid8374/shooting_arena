import './styles/base.css';
import './styles/screens.css';
import { Game } from './core/Game';

// Punto de entrada: busca el canvas y la capa de interfaz, y arranca el juego.
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const uiRoot = document.querySelector<HTMLElement>('#ui-root');

if (!canvas || !uiRoot) {
  throw new Error('No se encontró #game-canvas o #ui-root en index.html');
}

const game = new Game(canvas, uiRoot);
void game.start();

// En desarrollo dejamos el juego accesible desde la consola para experimentar,
// por ejemplo: __game.config.set('graphics', 'showFps', true)
if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}

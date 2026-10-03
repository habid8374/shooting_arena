import { WORLD } from '../config/engine';
import type { WorldDefinition } from '../data/worlds/types';
import { World } from './World';

/**
 * Genera todos los chunks de un mundo poco a poco, dejando que la pantalla se
 * actualice entre tandas (así la barra de carga se mueve y nada se congela).
 * `onProgress` recibe un número entre 0 y 1.
 */
export async function loadWorld(
  def: WorldDefinition,
  onProgress: (fraction: number) => void,
): Promise<World> {
  const world = new World(def);
  const coords = world.allChunkCoords();
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    if (c) world.ensureChunk(c[0], c[1]);
    if ((i + 1) % WORLD.chunksPerLoadingSlice === 0) {
      onProgress((i + 1) / coords.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  onProgress(1);
  return world;
}

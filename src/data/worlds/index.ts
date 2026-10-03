import { parseWorld } from './validate';
import type { WorldDefinition } from './types';

/**
 * Carga AUTOMÁTICAMENTE todos los archivos .json de esta carpeta.
 * Para crear un mundo nuevo solo agrega un archivo aquí: no hay que tocar código.
 */
const modules = import.meta.glob<{ default: unknown }>('./*.json', { eager: true });

export const WORLDS: readonly WorldDefinition[] = Object.entries(modules)
  .map(([path, mod]) => parseWorld(mod.default, path))
  .sort((a, b) => a.order - b.order);

export function getWorld(id: string): WorldDefinition | undefined {
  return WORLDS.find((w) => w.id === id);
}

import type { WorldDefinition } from '../data/worlds/types';
import { AIR } from './BlockRegistry';
import { Chunk } from './Chunk';
import { TerrainGenerator } from './TerrainGenerator';

/**
 * World: el conjunto de chunks de un mundo. Traduce posiciones del mundo
 * (wx, wy, wz) a "qué chunk y qué posición dentro de él".
 *
 * Los mundos de Shooting Arenas tienen tamaño fijo (lo dice el JSON). Fuera
 * de sus límites todo es aire.
 */
export class World {
  private readonly chunks = new Map<string, Chunk>();
  readonly generator: TerrainGenerator;
  /** Tamaño en bloques. */
  readonly widthBlocks: number;
  readonly depthBlocks: number;

  constructor(readonly def: WorldDefinition) {
    this.generator = new TerrainGenerator(def);
    this.widthBlocks = def.size.chunksX * Chunk.SIZE;
    this.depthBlocks = def.size.chunksZ * Chunk.SIZE;
  }

  static key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  /** Lista de coordenadas de todos los chunks del mundo. */
  allChunkCoords(): [number, number][] {
    const coords: [number, number][] = [];
    for (let cz = 0; cz < this.def.size.chunksZ; cz++)
      for (let cx = 0; cx < this.def.size.chunksX; cx++) coords.push([cx, cz]);
    return coords;
  }

  isChunkInside(cx: number, cz: number): boolean {
    return cx >= 0 && cz >= 0 && cx < this.def.size.chunksX && cz < this.def.size.chunksZ;
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(World.key(cx, cz));
  }

  /** Genera (si hace falta) y devuelve un chunk. */
  ensureChunk(cx: number, cz: number): Chunk | undefined {
    if (!this.isChunkInside(cx, cz)) return undefined;
    const key = World.key(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generator.generateChunk(cx, cz);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  /** Recorre todos los chunks ya generados. */
  loadedChunks(): IterableIterator<Chunk> {
    return this.chunks.values();
  }

  getBlock(wx: number, wy: number, wz: number): number {
    const S = Chunk.SIZE;
    const chunk = this.chunks.get(World.key(Math.floor(wx / S), Math.floor(wz / S)));
    if (!chunk) return AIR;
    return chunk.get(wx - chunk.cx * S, wy, wz - chunk.cz * S);
  }

  /**
   * Cambia un bloque y marca para redibujar su chunk. Si el bloque está en el
   * borde, también el chunk vecino (porque sus caras visibles cambian).
   * Devuelve false si la posición está fuera del mundo.
   */
  setBlock(wx: number, wy: number, wz: number, id: number): boolean {
    const S = Chunk.SIZE;
    const cx = Math.floor(wx / S);
    const cz = Math.floor(wz / S);
    const chunk = this.chunks.get(World.key(cx, cz));
    if (!chunk || wy < 0 || wy >= Chunk.HEIGHT) return false;
    const lx = wx - cx * S;
    const lz = wz - cz * S;
    chunk.set(lx, wy, lz, id);
    const markDirty = (ncx: number, ncz: number) => {
      const n = this.chunks.get(World.key(ncx, ncz));
      if (n) n.dirty = true;
    };
    if (lx === 0) markDirty(cx - 1, cz);
    if (lx === S - 1) markDirty(cx + 1, cz);
    if (lz === 0) markDirty(cx, cz - 1);
    if (lz === S - 1) markDirty(cx, cz + 1);
    return true;
  }

  /** Altura del bloque más alto en una columna del mundo (o -1). */
  surfaceY(wx: number, wz: number): number {
    const S = Chunk.SIZE;
    const chunk = this.chunks.get(World.key(Math.floor(wx / S), Math.floor(wz / S)));
    if (!chunk) return -1;
    return chunk.topY(wx - chunk.cx * S, wz - chunk.cz * S);
  }
}

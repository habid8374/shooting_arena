import { WORLD } from '../config/engine';
import { AIR } from './BlockRegistry';

/**
 * Chunk: un trozo del mundo de 16 × 64 × 16 bloques.
 *
 * Los bloques se guardan en un solo arreglo de bytes (Uint8Array): cada
 * posición (x, y, z) se convierte en un número de índice. Es muy rápido y
 * ocupa poca memoria (16 KB por chunk).
 */
export class Chunk {
  static readonly SIZE = WORLD.chunkSize;
  static readonly HEIGHT = WORLD.chunkHeight;

  readonly blocks: Uint8Array;
  /** Indica que hay que volver a construir su malla 3D. */
  dirty = true;

  constructor(
    readonly cx: number,
    readonly cz: number,
  ) {
    this.blocks = new Uint8Array(Chunk.SIZE * Chunk.SIZE * Chunk.HEIGHT);
  }

  /** ¿La posición local está dentro del chunk? */
  static inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < Chunk.SIZE && z >= 0 && z < Chunk.SIZE && y >= 0 && y < Chunk.HEIGHT;
  }

  /** Convierte (x, y, z) local en la posición dentro del arreglo. */
  static index(x: number, y: number, z: number): number {
    return (y * Chunk.SIZE + z) * Chunk.SIZE + x;
  }

  get(x: number, y: number, z: number): number {
    if (!Chunk.inBounds(x, y, z)) return AIR;
    return this.blocks[Chunk.index(x, y, z)] ?? AIR;
  }

  set(x: number, y: number, z: number, id: number): void {
    if (!Chunk.inBounds(x, y, z)) return;
    this.blocks[Chunk.index(x, y, z)] = id;
    this.dirty = true;
  }

  /** Altura del bloque sólido más alto en una columna (o -1 si está vacía). */
  topY(x: number, z: number): number {
    for (let y = Chunk.HEIGHT - 1; y >= 0; y--) {
      if (this.get(x, y, z) !== AIR) return y;
    }
    return -1;
  }
}

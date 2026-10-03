import type { TerrainDefinition, WorldDefinition } from '../data/worlds/types';
import { AIR, blockIdByName } from './BlockRegistry';
import { Chunk } from './Chunk';
import { fbm2, random3, valueNoise3 } from './noise';

/** Busca un bloque por nombre (los JSON ya fueron validados, así que existe). */
function id(name: string): number {
  const found = blockIdByName(name);
  if (found === undefined) throw new Error(`Bloque desconocido: ${name}`);
  return found;
}

/**
 * Generador de terreno con semilla. Recibe la definición del mundo (JSON) y
 * rellena chunks. Mismo JSON + misma semilla = mismo mundo, siempre.
 */
export class TerrainGenerator {
  private readonly t: TerrainDefinition;
  private readonly seed: number;
  private readonly water: number;
  private readonly surface: number;
  private readonly subsurface: number;
  private readonly deep: number;
  private readonly shore: number;
  private readonly snowSurface: number;
  private readonly trunk: number;
  private readonly leaves: number;

  constructor(def: WorldDefinition) {
    this.t = def.terrain;
    this.seed = def.seed | 0;
    const layers = this.t.layers;
    this.water = id('water');
    this.surface = id(layers.surface);
    this.subsurface = id(layers.subsurface);
    this.deep = id(layers.deep);
    this.shore = id(layers.shore);
    this.snowSurface = this.t.snowLine ? id(this.t.snowLine.surface) : this.surface;
    this.trunk = this.t.trees ? id(this.t.trees.trunk) : AIR;
    this.leaves = this.t.trees ? id(this.t.trees.leaves) : AIR;
  }

  /**
   * Altura del suelo en la columna (wx, wz), o -1 si ahí no hay suelo
   * (entre islas flotantes).
   */
  heightAt(wx: number, wz: number): number {
    const t = this.t;
    const n = fbm2(wx, wz, this.seed, t.octaves, t.frequency);
    let h = t.baseHeight + (n - 0.5) * 2 * t.amplitude;

    if (t.islands) {
      // Una segunda capa de ruido decide dónde hay isla y dónde mar/vacío.
      const mask = fbm2(wx, wz, this.seed + 7777, 2, t.islands.frequency);
      const edge = mask - t.islands.threshold;
      if (edge < 0) {
        if (t.floating) return -1;
        // Fuera de la isla el suelo baja bajo el agua.
        h = Math.min(h, t.waterLevel - 3 + edge * 20);
      } else if (!t.floating) {
        // Borde suave: la isla crece desde la orilla.
        h = t.waterLevel + Math.min(1, edge * 8) * (h - t.waterLevel + 2);
      }
    }
    return Math.max(1, Math.min(Chunk.HEIGHT - 12, Math.round(h)));
  }

  /** Genera un chunk completo. */
  generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);
    const S = Chunk.SIZE;
    const t = this.t;
    const ox = cx * S;
    const oz = cz * S;

    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) {
        const wx = ox + x;
        const wz = oz + z;
        const h = this.heightAt(wx, wz);
        if (h < 0) continue; // columna vacía (islas flotantes)

        const isShore = t.waterLevel >= 0 && h <= t.waterLevel + 1;
        const isSnow = t.snowLine !== undefined && h >= t.snowLine.height;
        // En islas flotantes, la parte de abajo forma una "gota" que cuelga.
        const bottom = t.floating
          ? Math.max(1, h - 3 - Math.floor(random3(wx, 1, wz, this.seed) * 4))
          : 0;

        for (let y = bottom; y <= h; y++) {
          let block: number;
          if (y === h) block = isShore ? this.shore : isSnow ? this.snowSurface : this.surface;
          else if (y >= h - t.layers.subsurfaceDepth)
            block = isShore ? this.shore : this.subsurface;
          else block = this.deep;
          chunk.blocks[Chunk.index(x, y, z)] = block;
        }

        // Agua hasta el nivel del mar.
        if (!t.floating && t.waterLevel >= 0) {
          for (let y = h + 1; y <= t.waterLevel; y++)
            chunk.blocks[Chunk.index(x, y, z)] = this.water;
        }

        // Cuevas: se excavan huecos donde el ruido 3D supera el umbral.
        if (t.caves) {
          const c = t.caves;
          const top = Math.min(c.maxY, h - 1);
          for (let y = Math.max(1, c.minY); y <= top; y++) {
            const v = valueNoise3(
              wx * c.frequency,
              y * c.frequency * 1.6,
              wz * c.frequency,
              this.seed + 99,
            );
            if (v > c.threshold) chunk.blocks[Chunk.index(x, y, z)] = AIR;
          }
        }
      }
    }

    if (t.trees) this.placeTrees(chunk, ox, oz);
    chunk.dirty = true;
    return chunk;
  }

  /**
   * Árboles: solo se colocan en el interior del chunk (a 2 bloques del borde)
   * para que nunca queden cortados entre dos chunks.
   */
  private placeTrees(chunk: Chunk, ox: number, oz: number): void {
    const trees = this.t.trees;
    if (!trees) return;
    const S = Chunk.SIZE;
    for (let z = 2; z < S - 2; z++) {
      for (let x = 2; x < S - 2; x++) {
        const wx = ox + x;
        const wz = oz + z;
        if (random3(wx, 2, wz, this.seed) >= trees.density) continue;
        const ground = chunk.topY(x, z);
        if (ground < 0 || chunk.get(x, ground, z) !== this.surface) continue;

        const span = Math.max(0, trees.maxHeight - trees.minHeight);
        const height = trees.minHeight + Math.floor(random3(wx, 3, wz, this.seed) * (span + 1));
        const top = ground + height;
        if (top + 2 >= Chunk.HEIGHT) continue;

        for (let y = ground + 1; y <= top; y++) chunk.blocks[Chunk.index(x, y, z)] = this.trunk;
        // Copa redondeada de hojas alrededor de la punta.
        for (let dy = -1; dy <= 2; dy++) {
          const r = dy === 2 ? 1 : 2;
          for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.abs(dx) === r && Math.abs(dz) === r && dy !== 0) continue; // esquinas
              const y = top + dy;
              if (chunk.get(x + dx, y, z + dz) === AIR)
                chunk.blocks[Chunk.index(x + dx, y, z + dz)] = this.leaves;
            }
          }
        }
      }
    }
  }
}

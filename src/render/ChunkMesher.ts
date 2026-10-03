import { WORLD } from '../config/engine';
import { AIR, BLOCKS, IS_TRANSPARENT } from '../world/BlockRegistry';
import { Chunk } from '../world/Chunk';
import type { TileName } from '../world/BlockRegistry';
import type { TileUv } from './TextureAtlas';

/**
 * CHUNK MESHER: convierte los bloques de un chunk en triángulos para dibujar.
 *
 * Técnica actual: OCULTACIÓN DE CARAS. Una cara de un bloque solo se dibuja
 * si toca aire (o agua). Las caras entre dos bloques sólidos nunca se ven,
 * así que las saltamos: ¡eso ahorra más del 90 % de los triángulos!
 * (En la Fase 12 se agrega "greedy meshing", que une caras iguales.)
 */

/** Devuelve el bloque en coordenadas LOCALES del chunk (pueden salirse: -1 o 16). */
export type BlockSampler = (x: number, y: number, z: number) => number;

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  faceCount: number;
}

export interface ChunkMeshes {
  /** Bloques normales. */
  opaque: MeshData;
  /** Bloques transparentes (agua), se dibujan aparte y semitransparentes. */
  transparent: MeshData;
}

type FaceSide = 'top' | 'bottom' | 'side';

interface FaceDef {
  dir: [number, number, number];
  /** 4 esquinas en orden antihorario visto desde fuera (abajo-izq, abajo-der, arriba-der, arriba-izq). */
  corners: [number, number, number][];
  side: FaceSide;
  shade: number;
}

const SHADE = WORLD.faceShade;

export const FACES: readonly FaceDef[] = [
  {
    dir: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    side: 'side',
    shade: SHADE.x,
  },
  {
    dir: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    side: 'side',
    shade: SHADE.x,
  },
  {
    dir: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    side: 'top',
    shade: SHADE.top,
  },
  {
    dir: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    side: 'bottom',
    shade: SHADE.bottom,
  },
  {
    dir: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    side: 'side',
    shade: SHADE.z,
  },
  {
    dir: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    side: 'side',
    shade: SHADE.z,
  },
];

/** Acumula vértices en arreglos normales y al final los convierte a arreglos tipados. */
class MeshBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  faceCount = 0;

  addFace(x: number, y: number, z: number, face: FaceDef, uv: TileUv): void {
    const base = this.positions.length / 3;
    const uvCorners = [
      [uv.u0, uv.v0],
      [uv.u1, uv.v0],
      [uv.u1, uv.v1],
      [uv.u0, uv.v1],
    ];
    face.corners.forEach(([cx, cy, cz], i) => {
      this.positions.push(x + cx, y + cy, z + cz);
      this.normals.push(face.dir[0], face.dir[1], face.dir[2]);
      const c = uvCorners[i] ?? [0, 0];
      this.uvs.push(c[0] ?? 0, c[1] ?? 0);
      this.colors.push(face.shade, face.shade, face.shade);
    });
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.faceCount++;
  }

  build(): MeshData {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      uvs: new Float32Array(this.uvs),
      colors: new Float32Array(this.colors),
      indices: new Uint32Array(this.indices),
      faceCount: this.faceCount,
    };
  }
}

/**
 * Decide si se dibuja la cara entre `self` y su vecino.
 * - Bloque opaco: se ve si el vecino es aire o transparente (agua).
 * - Bloque transparente (agua): solo se ve si el vecino es aire.
 */
export function isFaceVisible(self: number, neighbor: number): boolean {
  if (IS_TRANSPARENT[self]) return neighbor === AIR;
  return IS_TRANSPARENT[neighbor] === 1;
}

export function meshChunk(
  chunk: Chunk,
  sample: BlockSampler,
  uvs: Record<TileName, TileUv>,
): ChunkMeshes {
  const opaque = new MeshBuilder();
  const transparent = new MeshBuilder();
  const S = Chunk.SIZE;
  const H = Chunk.HEIGHT;
  const blocks = chunk.blocks;

  // Busca un vecino: rápido si está dentro del chunk, si no pregunta al mundo.
  const neighborAt = (x: number, y: number, z: number): number => {
    if (y < 0) return -1; // bajo el mundo: nunca se ve, cuenta como sólido
    if (y >= H) return AIR;
    if (x >= 0 && x < S && z >= 0 && z < S) return blocks[Chunk.index(x, y, z)] ?? AIR;
    return sample(x, y, z);
  };

  for (let y = 0; y < H; y++) {
    for (let z = 0; z < S; z++) {
      for (let x = 0; x < S; x++) {
        const id = blocks[Chunk.index(x, y, z)] ?? AIR;
        if (id === AIR) continue;
        const def = BLOCKS[id];
        if (!def) continue;
        const target = def.transparent ? transparent : opaque;
        for (const face of FACES) {
          const n = neighborAt(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
          if (n === -1 || !isFaceVisible(id, n)) continue;
          target.addFace(x, y, z, face, uvs[def.tiles[face.side]]);
        }
      }
    }
  }
  return { opaque: opaque.build(), transparent: transparent.build() };
}

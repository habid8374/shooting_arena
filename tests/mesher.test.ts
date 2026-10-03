import { describe, expect, it } from 'vitest';
import { meshChunk, isFaceVisible } from '../src/render/ChunkMesher';
import { buildAtlas, buildMipmaps } from '../src/render/TextureAtlas';
import { resolvePalette } from '../src/render/color';
import { AIR, blockIdByName } from '../src/world/BlockRegistry';
import { Chunk } from '../src/world/Chunk';

const atlas = buildAtlas(resolvePalette(), 1);
const airAround = () => AIR;
const STONE = blockIdByName('stone') as number;
const WATER = blockIdByName('water') as number;

describe('ChunkMesher (ocultación de caras)', () => {
  it('un bloque solo tiene 6 caras = 24 vértices y 12 triángulos', () => {
    const c = new Chunk(0, 0);
    c.set(4, 4, 4, STONE);
    const { opaque } = meshChunk(c, airAround, atlas.uvs);
    expect(opaque.faceCount).toBe(6);
    expect(opaque.positions.length).toBe(24 * 3);
    expect(opaque.indices.length).toBe(36);
  });

  it('dos bloques pegados esconden las 2 caras que se tocan', () => {
    const c = new Chunk(0, 0);
    c.set(4, 4, 4, STONE);
    c.set(5, 4, 4, STONE);
    expect(meshChunk(c, airAround, atlas.uvs).opaque.faceCount).toBe(10);
  });

  it('un cubo sólido 3×3×3 solo dibuja su superficie', () => {
    const c = new Chunk(0, 0);
    for (let x = 1; x <= 3; x++)
      for (let y = 1; y <= 3; y++) for (let z = 1; z <= 3; z++) c.set(x, y, z, STONE);
    expect(meshChunk(c, airAround, atlas.uvs).opaque.faceCount).toBe(6 * 9);
  });

  it('no dibuja la cara de abajo en el fondo del mundo (y = 0)', () => {
    const c = new Chunk(0, 0);
    c.set(4, 0, 4, STONE);
    expect(meshChunk(c, airAround, atlas.uvs).opaque.faceCount).toBe(5);
  });

  it('consulta a los chunks vecinos en los bordes', () => {
    const c = new Chunk(0, 0);
    c.set(Chunk.SIZE - 1, 4, 4, STONE);
    // El vecino dice que hay piedra a la derecha → esa cara se oculta.
    const solidRight = (x: number) => (x === Chunk.SIZE ? STONE : AIR);
    expect(meshChunk(c, solidRight, atlas.uvs).opaque.faceCount).toBe(5);
  });

  it('el agua va en la malla transparente y no dibuja caras entre agua', () => {
    const c = new Chunk(0, 0);
    c.set(4, 4, 4, WATER);
    c.set(5, 4, 4, WATER);
    const { opaque, transparent } = meshChunk(c, airAround, atlas.uvs);
    expect(opaque.faceCount).toBe(0);
    expect(transparent.faceCount).toBe(10);
  });

  it('un bloque sólido bajo el agua muestra su cara superior', () => {
    expect(isFaceVisible(STONE, WATER)).toBe(true);
    expect(isFaceVisible(WATER, STONE)).toBe(false);
    expect(isFaceVisible(STONE, STONE)).toBe(false);
  });

  it('las normales apuntan hacia fuera de cada cara', () => {
    const c = new Chunk(0, 0);
    c.set(4, 4, 4, STONE);
    const { positions, normals, indices } = meshChunk(c, airAround, atlas.uvs).opaque;
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, d] = [indices[t], indices[t + 1], indices[t + 2]].map((i) => (i ?? 0) * 3) as [
        number,
        number,
        number,
      ];
      const p = (i: number) => [positions[i] ?? 0, positions[i + 1] ?? 0, positions[i + 2] ?? 0];
      const [p0, p1, p2] = [p(a), p(b), p(d)] as [number[], number[], number[]];
      const e1 = p1.map((v, i) => v - (p0[i] ?? 0));
      const e2 = p2.map((v, i) => v - (p0[i] ?? 0));
      const cross = [
        (e1[1] ?? 0) * (e2[2] ?? 0) - (e1[2] ?? 0) * (e2[1] ?? 0),
        (e1[2] ?? 0) * (e2[0] ?? 0) - (e1[0] ?? 0) * (e2[2] ?? 0),
        (e1[0] ?? 0) * (e2[1] ?? 0) - (e1[1] ?? 0) * (e2[0] ?? 0),
      ];
      const n = [normals[a] ?? 0, normals[a + 1] ?? 0, normals[a + 2] ?? 0];
      const dot = cross.reduce((s, v, i) => s + v * (n[i] ?? 0), 0);
      expect(dot).toBeGreaterThan(0); // triángulo visto de frente desde fuera
    }
  });
});

describe('TextureAtlas', () => {
  it('genera píxeles opacos y coordenadas dentro de 0..1', () => {
    expect(atlas.pixels.length).toBe(atlas.width * atlas.height * 4);
    for (const uv of Object.values(atlas.uvs)) {
      expect(uv.u0).toBeGreaterThanOrEqual(0);
      expect(uv.u1).toBeLessThanOrEqual(1);
      expect(uv.v0).toBeLessThan(uv.v1);
    }
  });

  it('es determinista y cambia con la paleta', () => {
    const again = buildAtlas(resolvePalette(), 1);
    expect(again.pixels).toEqual(atlas.pixels);
    const pink = buildAtlas(resolvePalette({ grass: '#FFAFCC' }), 1);
    expect(pink.pixels).not.toEqual(atlas.pixels);
  });
});

describe('Mipmaps del atlas', () => {
  it('bajan hasta 1×1 promediando cuadritos de 2×2', () => {
    const levels = buildMipmaps(atlas);
    expect(levels.at(-1)?.width).toBe(1);
    expect(levels[1]?.width).toBe(atlas.width / 2);
    // El primer píxel del nivel 1 es el promedio de los 4 primeros del nivel 0.
    const w = atlas.width;
    const p = (x: number, y: number) => atlas.pixels[(y * w + x) * 4] ?? 0;
    const avg = Math.round((p(0, 0) + p(1, 0) + p(0, 1) + p(1, 1)) / 4);
    expect(levels[1]?.data[0]).toBe(avg);
  });
});

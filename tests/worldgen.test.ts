import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/data/worlds';
import type { WorldDefinition } from '../src/data/worlds/types';
import { AIR, blockIdByName } from '../src/world/BlockRegistry';
import { Chunk } from '../src/world/Chunk';
import { TerrainGenerator } from '../src/world/TerrainGenerator';
import { World } from '../src/world/World';

const base = (): WorldDefinition => structuredClone(WORLDS[0] as WorldDefinition);

describe('Chunk', () => {
  it('guarda y lee bloques, y marca que hay que redibujar', () => {
    const c = new Chunk(0, 0);
    c.dirty = false;
    c.set(3, 10, 5, 2);
    expect(c.get(3, 10, 5)).toBe(2);
    expect(c.dirty).toBe(true);
  });

  it('fuera de los límites devuelve aire y no escribe', () => {
    const c = new Chunk(0, 0);
    c.set(-1, 0, 0, 3);
    expect(c.get(-1, 0, 0)).toBe(AIR);
    expect(c.get(0, Chunk.HEIGHT, 0)).toBe(AIR);
  });

  it('topY encuentra el bloque más alto', () => {
    const c = new Chunk(0, 0);
    expect(c.topY(0, 0)).toBe(-1);
    c.set(0, 7, 0, 1);
    expect(c.topY(0, 0)).toBe(7);
  });
});

describe('Generación con semilla', () => {
  it('la misma semilla genera exactamente el mismo chunk', () => {
    const a = new TerrainGenerator(base()).generateChunk(1, 2);
    const b = new TerrainGenerator(base()).generateChunk(1, 2);
    expect(a.blocks).toEqual(b.blocks);
  });

  it('otra semilla genera un terreno distinto', () => {
    const other = base();
    other.seed += 1;
    const a = new TerrainGenerator(base()).generateChunk(0, 0);
    const b = new TerrainGenerator(other).generateChunk(0, 0);
    expect(a.blocks).not.toEqual(b.blocks);
  });

  it('respeta las capas: pasto arriba, piedra abajo', () => {
    const def = base();
    delete def.terrain.trees;
    def.terrain.waterLevel = -1;
    const gen = new TerrainGenerator(def);
    const chunk = gen.generateChunk(0, 0);
    const top = chunk.topY(5, 5);
    expect(chunk.get(5, top, 5)).toBe(blockIdByName('grass'));
    expect(chunk.get(5, 0, 5)).toBe(blockIdByName('stone'));
    expect(top).toBe(gen.heightAt(5, 5));
  });

  it('llena con agua hasta el nivel del mar', () => {
    const def = base();
    def.terrain.baseHeight = 5;
    def.terrain.amplitude = 0;
    def.terrain.waterLevel = 10;
    delete def.terrain.trees;
    const chunk = new TerrainGenerator(def).generateChunk(0, 0);
    expect(chunk.get(0, 10, 0)).toBe(blockIdByName('water'));
    expect(chunk.get(0, 11, 0)).toBe(AIR);
    expect(chunk.get(0, 5, 0)).toBe(blockIdByName('sand')); // orilla bajo el agua
  });

  it('las islas flotantes dejan columnas vacías', () => {
    const def = WORLDS.find((w) => w.terrain.floating) as WorldDefinition;
    const gen = new TerrainGenerator(def);
    let empty = 0;
    for (let x = 0; x < 96; x += 3)
      for (let z = 0; z < 96; z += 3) if (gen.heightAt(x, z) < 0) empty++;
    expect(empty).toBeGreaterThan(0);
  });

  it('los árboles nunca quedan cortados en el borde del chunk', () => {
    const def = base();
    def.terrain.trees = { density: 1, trunk: 'wood', leaves: 'leaves', minHeight: 3, maxHeight: 3 };
    const chunk = new TerrainGenerator(def).generateChunk(0, 0);
    const wood = blockIdByName('wood');
    for (let y = 0; y < Chunk.HEIGHT; y++)
      for (let i = 0; i < Chunk.SIZE; i++) {
        expect(chunk.get(0, y, i)).not.toBe(wood);
        expect(chunk.get(Chunk.SIZE - 1, y, i)).not.toBe(wood);
      }
  });
});

describe('World', () => {
  it('solo genera chunks dentro de su tamaño', () => {
    const world = new World(base());
    expect(world.ensureChunk(0, 0)).toBeDefined();
    expect(world.ensureChunk(-1, 0)).toBeUndefined();
    expect(world.ensureChunk(99, 0)).toBeUndefined();
    expect(world.allChunkCoords()).toHaveLength(base().size.chunksX * base().size.chunksZ);
  });

  it('lee y cambia bloques usando coordenadas del mundo', () => {
    const world = new World(base());
    world.ensureChunk(1, 0);
    expect(world.setBlock(20, 50, 3, 13)).toBe(true);
    expect(world.getBlock(20, 50, 3)).toBe(13);
    expect(world.getChunk(1, 0)?.get(4, 50, 3)).toBe(13);
    expect(world.setBlock(-5, 10, 0, 1)).toBe(false);
  });

  it('cambiar un bloque en el borde marca también al chunk vecino', () => {
    const world = new World(base());
    const a = world.ensureChunk(0, 0) as Chunk;
    const b = world.ensureChunk(1, 0) as Chunk;
    a.dirty = false;
    b.dirty = false;
    world.setBlock(15, 40, 4, 2);
    expect(a.dirty).toBe(true);
    expect(b.dirty).toBe(true);
  });
});

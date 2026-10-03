import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/data/worlds';
import { validateWorld } from '../src/data/worlds/validate';

describe('Mundos en JSON', () => {
  it('hay al menos 5 mundos y todos son válidos', () => {
    expect(WORLDS.length).toBeGreaterThanOrEqual(5);
    for (const w of WORLDS) expect(validateWorld(w, w.id)).toEqual([]);
  });

  it('los ids y el orden no se repiten', () => {
    expect(new Set(WORLDS.map((w) => w.id)).size).toBe(WORLDS.length);
    expect(new Set(WORLDS.map((w) => w.order)).size).toBe(WORLDS.length);
  });

  it('el primero es la Pradera Rosa y el último el Castillo de Nubes', () => {
    expect(WORLDS[0]?.id).toBe('pradera-rosa');
    expect(WORLDS[WORLDS.length - 1]?.id).toBe('castillo-nubes');
  });

  it('explica los errores en español', () => {
    const broken = structuredClone(WORLDS[0]) as unknown as Record<string, unknown>;
    broken.id = 'Con Espacios';
    (broken.terrain as Record<string, unknown>).octaves = 99;
    ((broken.terrain as Record<string, unknown>).layers as Record<string, unknown>).surface =
      'lava';
    (broken.palette as Record<string, unknown>).sky = 'azul';
    const errors = validateWorld(broken, 'prueba');
    expect(errors.join('\n')).toMatch(/minúsculas/);
    expect(errors.join('\n')).toMatch(/octaves/);
    expect(errors.join('\n')).toMatch(/bloque válido/);
    expect(errors.join('\n')).toMatch(/palette.sky/);
    expect(validateWorld(null)).toHaveLength(1);
  });
});

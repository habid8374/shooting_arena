import { describe, expect, it } from 'vitest';
import { createRng, fbm2, hash3, valueNoise2, valueNoise3 } from '../src/world/noise';

describe('Ruido con semilla', () => {
  it('el mismo hash sale igual siempre y cambia con la semilla', () => {
    expect(hash3(1, 2, 3, 42)).toBe(hash3(1, 2, 3, 42));
    expect(hash3(1, 2, 3, 42)).not.toBe(hash3(1, 2, 3, 43));
  });

  it('createRng repite la misma secuencia con la misma semilla', () => {
    const a = createRng(7);
    const b = createRng(7);
    const seqA = Array.from({ length: 5 }, a);
    const seqB = Array.from({ length: 5 }, b);
    expect(seqA).toEqual(seqB);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('los ruidos se mantienen entre 0 y 1', () => {
    for (let i = 0; i < 200; i++) {
      const x = i * 0.37;
      const z = i * 0.91;
      for (const v of [valueNoise2(x, z, 1), valueNoise3(x, z, x, 2), fbm2(x, z, 3, 4, 0.05)]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('el ruido es suave: puntos vecinos tienen valores parecidos', () => {
    const a = valueNoise2(10.5, 3.5, 9);
    const b = valueNoise2(10.51, 3.5, 9);
    expect(Math.abs(a - b)).toBeLessThan(0.05);
  });
});

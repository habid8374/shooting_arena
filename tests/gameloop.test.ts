import { describe, expect, it } from 'vitest';
import { GameLoop } from '../src/core/GameLoop';

/** Crea un loop con reloj falso que controlamos a mano. */
function makeLoop(maxSteps = 5) {
  let time = 0;
  const dts: number[] = [];
  const alphas: number[] = [];
  const loop = new GameLoop({
    stepsPerSecond: 60,
    maxStepsPerFrame: maxSteps,
    update: (dt) => dts.push(dt),
    render: (alpha) => alphas.push(alpha),
    now: () => time,
    requestFrame: () => 0,
    cancelFrame: () => undefined,
  });
  loop.start();
  return { loop, dts, alphas, advance: (ms: number) => (time += ms) };
}

describe('GameLoop de paso fijo', () => {
  it('ejecuta pasos de tamaño fijo sin importar el tamaño del fotograma', () => {
    const { loop, dts, advance } = makeLoop();
    advance(51); // 51 ms = 3 pasos de 16.67 ms (+ sobrante)
    expect(loop.tick()).toBe(3);
    expect(dts.every((d) => Math.abs(d - 1 / 60) < 1e-9)).toBe(true);
  });

  it('acumula el tiempo sobrante para el siguiente fotograma', () => {
    const { loop, advance } = makeLoop();
    advance(10);
    expect(loop.tick()).toBe(0);
    advance(10); // total 20 ms → 1 paso
    expect(loop.tick()).toBe(1);
  });

  it('entrega alpha entre 0 y 1 para interpolar', () => {
    const { loop, alphas, advance } = makeLoop();
    advance(25); // 1 paso + 8.33 ms sobrantes → alpha ≈ 0.5
    loop.tick();
    expect(alphas[0]).toBeGreaterThan(0.45);
    expect(alphas[0]).toBeLessThan(0.55);
  });

  it('limita los pasos por fotograma si el aparato se congela', () => {
    const { loop, advance } = makeLoop(5);
    advance(5000);
    expect(loop.tick()).toBe(5);
    advance(0);
    expect(loop.tick()).toBe(0); // no arrastra el tiempo congelado
  });

  it('rechaza stepsPerSecond inválido', () => {
    expect(
      () =>
        new GameLoop({ stepsPerSecond: 0, maxStepsPerFrame: 1, update: () => 0, render: () => 0 }),
    ).toThrow();
  });
});

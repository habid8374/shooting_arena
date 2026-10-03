/**
 * Ruido con SEMILLA: números "aleatorios" que siempre salen iguales para la
 * misma semilla. Así el mismo mundo se genera idéntico en cualquier aparato.
 *
 * Usamos "value noise": ponemos un valor aleatorio en cada punto de una
 * cuadrícula y mezclamos suavemente entre ellos. Sumando varias capas
 * ("octavas") de distinto tamaño se obtienen colinas naturales (fBm).
 */

/** Mezcla enteros en un número de 32 bits bien revuelto (función hash). */
export function hash3(x: number, y: number, z: number, seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (x | 0), 0x27d4eb2d);
  h = Math.imul(h ^ (y | 0), 0x165667b1);
  h = Math.imul(h ^ (z | 0), 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

/** Hash convertido a un número entre 0 (incluido) y 1 (excluido). */
export function random3(x: number, y: number, z: number, seed: number): number {
  return hash3(x, y, z, seed) / 4294967296;
}

/** Generador pseudoaleatorio secuencial con semilla (mulberry32). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curva suave para que la mezcla no tenga "esquinas". */
const fade = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Ruido 2D suave con valores entre 0 y 1. */
export function valueNoise2(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const a = random3(x0, 0, z0, seed);
  const b = random3(x0 + 1, 0, z0, seed);
  const c = random3(x0, 0, z0 + 1, seed);
  const d = random3(x0 + 1, 0, z0 + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

/** Ruido 3D suave con valores entre 0 y 1 (para cuevas). */
export function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const tz = fade(z - z0);
  const corner = (dx: number, dy: number, dz: number) => random3(x0 + dx, y0 + dy, z0 + dz, seed);
  const x00 = lerp(corner(0, 0, 0), corner(1, 0, 0), tx);
  const x10 = lerp(corner(0, 1, 0), corner(1, 1, 0), tx);
  const x01 = lerp(corner(0, 0, 1), corner(1, 0, 1), tx);
  const x11 = lerp(corner(0, 1, 1), corner(1, 1, 1), tx);
  return lerp(lerp(x00, x10, ty), lerp(x01, x11, ty), tz);
}

/**
 * fBm 2D: suma de octavas. Cada octava tiene el doble de detalle y la mitad
 * de fuerza. Resultado normalizado entre 0 y 1.
 */
export function fbm2(
  x: number,
  z: number,
  seed: number,
  octaves: number,
  frequency: number,
): number {
  let total = 0;
  let amplitude = 1;
  let max = 0;
  let f = frequency;
  for (let i = 0; i < octaves; i++) {
    // Cada octava usa una semilla distinta para no repetir el mismo dibujo.
    total += valueNoise2(x * f, z * f, seed + i * 1013) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    f *= 2;
  }
  return total / max;
}

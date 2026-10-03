import { PALETTE, type PaletteColor } from '../config/palette';

export type Rgb = [number, number, number];

/** Convierte "#FFAFCC" en [255, 175, 204]. */
export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mezcla dos colores: t = 0 → a, t = 1 → b. */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Aclara (>1) u oscurece (<1) un color. */
export function scaleRgb(c: Rgb, k: number): Rgb {
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** Paleta final de un mundo: la base pastel + los cambios que pide su JSON. */
export type ResolvedPalette = Record<PaletteColor, string>;

export function resolvePalette(
  overrides: Partial<Record<PaletteColor, string>> = {},
): ResolvedPalette {
  return { ...PALETTE, ...overrides };
}

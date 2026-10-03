import { WORLD } from '../config/engine';
import { createRng } from '../world/noise';
import { TILES, type TileName, type TilePattern } from '../world/BlockRegistry';
import { hexToRgb, mixRgb, scaleRgb, type ResolvedPalette, type Rgb } from './color';

/**
 * ATLAS DE TEXTURAS: una sola imagen con todas las texturas de bloques en
 * cuadritos (tiles). Se genera por código, píxel a píxel, con la paleta
 * pastel del mundo y un ruido suave. Usar una sola imagen es mucho más
 * rápido para la tarjeta gráfica que usar una imagen por bloque.
 *
 * Esta parte no usa el navegador (solo números), así que se puede probar.
 */

/** Rectángulo de coordenadas de textura (0..1) de un tile. */
export interface TileUv {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

export interface AtlasData {
  width: number;
  height: number;
  /** Píxeles RGBA, fila 0 = abajo (como espera WebGL sin voltear). */
  pixels: Uint8Array;
  uvs: Record<TileName, TileUv>;
}

const TILE_NAMES = Object.keys(TILES) as TileName[];

/** Genera el atlas completo para una paleta y una semilla. */
export function buildAtlas(
  palette: ResolvedPalette,
  seed: number,
  tileSize: number = WORLD.tileSize,
): AtlasData {
  // Cuadrícula de lado potencia de 2 (4×4, 8×8...) para que funcionen los mipmaps.
  const columns = 2 ** Math.ceil(Math.log2(Math.ceil(Math.sqrt(TILE_NAMES.length))));
  const rows = columns;
  const width = columns * tileSize;
  const height = rows * tileSize;
  const pixels = new Uint8Array(width * height * 4);
  const uvs = {} as Record<TileName, TileUv>;
  // Pequeño margen para que un tile no "sangre" color del vecino.
  const inset = 0.05;

  TILE_NAMES.forEach((name, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const rng = createRng(seed * 31 + i * 977);
    const pattern: TilePattern = TILES[name];
    for (let py = 0; py < tileSize; py++) {
      for (let px = 0; px < tileSize; px++) {
        const c = tilePixel(pattern, palette, px, py, tileSize, rng);
        // py = 0 es la fila de ARRIBA del tile; en el atlas la fila 0 es abajo.
        const ax = col * tileSize + px;
        const ay = height - 1 - (row * tileSize + py);
        const o = (ay * width + ax) * 4;
        pixels[o] = clampByte(c[0]);
        pixels[o + 1] = clampByte(c[1]);
        pixels[o + 2] = clampByte(c[2]);
        pixels[o + 3] = 255;
      }
    }
    uvs[name] = {
      u0: (col * tileSize + inset) / width,
      u1: ((col + 1) * tileSize - inset) / width,
      v1: 1 - (row * tileSize + inset) / height, // borde de arriba
      v0: 1 - ((row + 1) * tileSize - inset) / height, // borde de abajo
    };
  });

  return { width, height, pixels, uvs };
}

/** Un nivel de mipmap: la misma imagen a la mitad de tamaño. */
export interface MipLevel {
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * MIPMAPS: versiones cada vez más pequeñas del atlas (64, 32, 16...). La
 * tarjeta gráfica usa la pequeña cuando un bloque se ve lejos, así la textura
 * no "parpadea" ni se ve granulada.
 * Cada pixel nuevo es el promedio de un cuadrito de 2×2. Como los tiles miden
 * una potencia de 2, ese cuadrito nunca mezcla dos tiles distintos (hasta que
 * un tile queda de 1 píxel).
 */
export function buildMipmaps(atlas: AtlasData): MipLevel[] {
  const levels: MipLevel[] = [{ data: atlas.pixels, width: atlas.width, height: atlas.height }];
  let prev = levels[0] as MipLevel;
  while (prev.width > 1 || prev.height > 1) {
    const w = Math.max(1, prev.width >> 1);
    const h = Math.max(1, prev.height >> 1);
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let c = 0; c < 4; c++) {
          let sum = 0;
          for (let dy = 0; dy < 2; dy++)
            for (let dx = 0; dx < 2; dx++) {
              const sx = Math.min(prev.width - 1, x * 2 + dx);
              const sy = Math.min(prev.height - 1, y * 2 + dy);
              sum += prev.data[(sy * prev.width + sx) * 4 + c] ?? 0;
            }
          data[(y * w + x) * 4 + c] = Math.round(sum / 4);
        }
      }
    }
    prev = { data, width: w, height: h };
    levels.push(prev);
  }
  return levels;
}

const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Variación de brillo aleatoria: 1 ± variation. */
const jitter = (rng: () => number, variation: number) => 1 + (rng() - 0.5) * 2 * variation;

/** Calcula el color de un píxel según el dibujo del tile. */
function tilePixel(
  p: TilePattern,
  palette: ResolvedPalette,
  px: number,
  py: number,
  size: number,
  rng: () => number,
): Rgb {
  const col = (k: keyof ResolvedPalette) => hexToRgb(palette[k]);
  switch (p.kind) {
    case 'noise':
      return scaleRgb(col(p.color), jitter(rng, p.variation));
    case 'band': {
      // Borde irregular: algunas columnas tienen la franja 1 píxel más larga.
      const edge = p.bandHeight + (rng() < 0.4 ? 1 : 0);
      const base = py < edge ? col(p.band) : col(p.base);
      return scaleRgb(base, jitter(rng, p.variation));
    }
    case 'stripes': {
      const on = Math.floor((px + py) / p.width) % 2 === 0;
      return scaleRgb(on ? col(p.a) : col(p.b), jitter(rng, 0.03));
    }
    case 'rings': {
      const c = (size - 1) / 2;
      const d = Math.hypot(px - c, py - c);
      const ring = Math.floor(d / 2) % 2 === 1;
      return scaleRgb(
        ring ? mixRgb(col(p.base), col(p.ring), 0.45) : col(p.base),
        jitter(rng, 0.03),
      );
    }
    case 'vstripes': {
      const line = px % 4 === 0;
      return scaleRgb(
        line ? mixRgb(col(p.base), col(p.line), 0.4) : col(p.base),
        jitter(rng, 0.04),
      );
    }
    case 'bricks': {
      const brickH = 4;
      const row = Math.floor(py / brickH);
      const offset = (row % 2) * 4;
      const mortar = py % brickH === brickH - 1 || (px + offset) % 8 === 7;
      return mortar
        ? mixRgb(col(p.base), col(p.mortar), 0.7)
        : scaleRgb(col(p.base), jitter(rng, 0.04));
    }
    case 'speckle': {
      const dot = rng() < p.density;
      return scaleRgb(dot ? mixRgb(col(p.base), col(p.dot), 0.6) : col(p.base), jitter(rng, 0.04));
    }
  }
}

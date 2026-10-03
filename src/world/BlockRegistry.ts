import type { PaletteColor } from '../config/palette';

/**
 * REGISTRO DE BLOQUES: la lista de todos los tipos de bloque del juego.
 *
 * Cada bloque tiene un número (id) que es lo que se guarda en los chunks
 * (ocupa solo 1 byte). ¡No cambies los ids existentes! Las partidas guardadas
 * dependen de ellos. Para agregar un bloque, usa un id nuevo al final.
 */

/** Dibujos posibles para las texturas generadas por código. */
export type TilePattern =
  | { kind: 'noise'; color: PaletteColor; variation: number }
  | { kind: 'band'; base: PaletteColor; band: PaletteColor; bandHeight: number; variation: number }
  | { kind: 'stripes'; a: PaletteColor; b: PaletteColor; width: number }
  | { kind: 'rings'; base: PaletteColor; ring: PaletteColor }
  | { kind: 'vstripes'; base: PaletteColor; line: PaletteColor }
  | { kind: 'bricks'; base: PaletteColor; mortar: PaletteColor }
  | { kind: 'speckle'; base: PaletteColor; dot: PaletteColor; density: number };

/** Nombres de todas las texturas (tiles) del atlas. */
export const TILES = {
  grass_top: { kind: 'noise', color: 'grass', variation: 0.06 },
  grass_side: { kind: 'band', base: 'dirt', band: 'grass', bandHeight: 4, variation: 0.05 },
  dirt: { kind: 'noise', color: 'dirt', variation: 0.06 },
  stone: { kind: 'speckle', base: 'stone', dot: 'accentLilac', density: 0.08 },
  sand: { kind: 'speckle', base: 'sand', dot: 'accentPeach', density: 0.1 },
  water: { kind: 'noise', color: 'water', variation: 0.03 },
  wood_side: { kind: 'vstripes', base: 'wood', line: 'dirt' },
  wood_top: { kind: 'rings', base: 'wood', ring: 'dirt' },
  leaves: { kind: 'speckle', base: 'leaves', dot: 'accentMint', density: 0.25 },
  snow: { kind: 'noise', color: 'snow', variation: 0.02 },
  snow_side: { kind: 'band', base: 'dirt', band: 'snow', bandHeight: 5, variation: 0.03 },
  candy: { kind: 'stripes', a: 'accentPink', b: 'snow', width: 3 },
  caramel: { kind: 'speckle', base: 'accentPeach', dot: 'sunset', density: 0.15 },
  cloud: { kind: 'noise', color: 'snow', variation: 0.04 },
  brick: { kind: 'bricks', base: 'accentLilac', mortar: 'snow' },
} as const satisfies Record<string, TilePattern>;

export type TileName = keyof typeof TILES;

export interface BlockDef {
  id: number;
  /** Nombre que se usa en los JSON de mundos. */
  name: string;
  /** ¿El jugador choca con él? */
  solid: boolean;
  /** ¿Deja ver a través (agua)? Se dibuja aparte, semitransparente. */
  transparent: boolean;
  /** ¿Se puede romper? */
  breakable: boolean;
  /** Textura de cada lado. */
  tiles: { top: TileName; side: TileName; bottom: TileName };
}

const all = (tile: TileName) => ({ top: tile, side: tile, bottom: tile });
const solidBlock = (id: number, name: string, tiles: BlockDef['tiles']): BlockDef => ({
  id,
  name,
  solid: true,
  transparent: false,
  breakable: true,
  tiles,
});

export const AIR = 0;

export const BLOCKS: readonly BlockDef[] = [
  { id: AIR, name: 'air', solid: false, transparent: true, breakable: false, tiles: all('cloud') },
  solidBlock(1, 'grass', { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }),
  solidBlock(2, 'dirt', all('dirt')),
  solidBlock(3, 'stone', all('stone')),
  solidBlock(4, 'sand', all('sand')),
  { id: 5, name: 'water', solid: false, transparent: true, breakable: false, tiles: all('water') },
  solidBlock(6, 'wood', { top: 'wood_top', side: 'wood_side', bottom: 'wood_top' }),
  solidBlock(7, 'leaves', all('leaves')),
  solidBlock(8, 'snow', all('snow')),
  solidBlock(9, 'snow_grass', { top: 'snow', side: 'snow_side', bottom: 'dirt' }),
  solidBlock(10, 'candy', all('candy')),
  solidBlock(11, 'caramel', all('caramel')),
  solidBlock(12, 'cloud', all('cloud')),
  solidBlock(13, 'brick', all('brick')),
];

// Tablas rápidas para buscar por id o por nombre.
const byName = new Map(BLOCKS.map((b) => [b.name, b]));

export function getBlock(id: number): BlockDef {
  const block = BLOCKS[id];
  if (!block) throw new Error(`Bloque desconocido con id ${id}`);
  return block;
}

export function blockIdByName(name: string): number | undefined {
  return byName.get(name)?.id;
}

export const BLOCK_NAMES = BLOCKS.map((b) => b.name);

/** Tablas planas (más rápidas que buscar objetos) para el mallado. */
export const IS_SOLID = Uint8Array.from(BLOCKS, (b) => (b.solid ? 1 : 0));
export const IS_TRANSPARENT = Uint8Array.from(BLOCKS, (b) => (b.transparent ? 1 : 0));

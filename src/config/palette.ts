import type { ThemeName } from './schema';

/**
 * Paleta pastel oficial de Shooting Arenas. Todo el arte del juego sale de aquí.
 */
export const PALETTE = {
  sky: '#BDE0FE',
  sunset: '#FFC8DD',
  grass: '#B9E4C9',
  dirt: '#E8C8A9',
  stone: '#D3D3E0',
  sand: '#FFF1C1',
  water: '#A2D2FF',
  wood: '#E6BEAE',
  leaves: '#CDEAC0',
  snow: '#FDFDFF',
  accentPink: '#FFAFCC',
  accentLilac: '#CDB4DB',
  accentPeach: '#FFD6A5',
  accentMint: '#CAFFBF',
  uiBackground: '#FFF8F0',
  uiText: '#5A5A7A',
} as const;

export type PaletteColor = keyof typeof PALETTE;

/** Colores de la interfaz que cambian según el tema elegido. */
export interface UiTheme {
  label: string;
  background: string;
  panel: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const UI_THEMES: Readonly<Record<ThemeName, UiTheme>> = {
  algodon: {
    label: 'Algodón de azúcar',
    background: PALETTE.uiBackground,
    panel: '#FFFFFF',
    text: PALETTE.uiText,
    primary: PALETTE.accentPink,
    secondary: PALETTE.sky,
    accent: PALETTE.accentPeach,
  },
  menta: {
    label: 'Menta',
    background: '#F3FFF6',
    panel: '#FFFFFF',
    text: '#4F6B63',
    primary: '#9EE6C0',
    secondary: PALETTE.accentMint,
    accent: PALETTE.sky,
  },
  lavanda: {
    label: 'Lavanda',
    background: '#F8F4FF',
    panel: '#FFFFFF',
    text: '#5E5A80',
    primary: PALETTE.accentLilac,
    secondary: '#E2D6F5',
    accent: PALETTE.accentPink,
  },
};

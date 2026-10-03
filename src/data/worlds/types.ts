import type { PaletteColor } from '../../config/palette';

/**
 * Formato de los archivos JSON de mundos (ver README → "Crear un mundo nuevo").
 * Las fases siguientes agregarán enemigos, bonus y objetivos.
 */
export interface WorldDefinition {
  /** Identificador único, en minúsculas y con guiones (ej. "pradera-rosa"). */
  id: string;
  /** Orden en el mapa de mundos (1, 2, 3...). */
  order: number;
  name: string;
  emoji: string;
  description: string;
  /** Semilla: el mismo número genera siempre el mismo terreno. */
  seed: number;
  /** Tamaño del mundo en chunks (cada chunk mide 16 × 16 bloques). */
  size: { chunksX: number; chunksZ: number };
  /** Cambios de color respecto a la paleta pastel base. */
  palette: Partial<Record<PaletteColor, string>>;
  terrain: TerrainDefinition;
}

export interface TerrainDefinition {
  /** Altura media del suelo (en bloques). */
  baseHeight: number;
  /** Cuánto suben y bajan las colinas. */
  amplitude: number;
  /** Tamaño de las colinas: menor = colinas más anchas. */
  frequency: number;
  /** Capas de detalle del ruido (1–6). */
  octaves: number;
  /** Nivel del agua; bajo esta altura se llena de agua. Usa -1 para no tener agua. */
  waterLevel: number;
  /** Bloques de cada capa (por nombre, ver BlockRegistry). */
  layers: {
    surface: string;
    subsurface: string;
    subsurfaceDepth: number;
    deep: string;
    /** Bloque de las orillas y del fondo del agua. */
    shore: string;
  };
  /** Desde esta altura la superficie se cubre de nieve (opcional). */
  snowLine?: { height: number; surface: string };
  /** Convierte el terreno en islas separadas por agua o vacío (opcional). */
  islands?: { frequency: number; threshold: number };
  /** Excava cuevas con ruido 3D (opcional). */
  caves?: { frequency: number; threshold: number; minY: number; maxY: number };
  /** Si es true, fuera de las islas no hay suelo: islas flotando en el cielo. */
  floating?: boolean;
  /** Árboles o "columnas" decorativas (opcional). */
  trees?: { density: number; trunk: string; leaves: string; minHeight: number; maxHeight: number };
}

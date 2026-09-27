/**
 * ESQUEMA de ajustes: la "ficha técnica" de cada opción configurable.
 *
 * Cada ajuste dice su tipo, su valor por defecto y sus límites. De aquí salen:
 *  - el tipo TypeScript `Settings` (automáticamente, sin escribirlo dos veces),
 *  - los valores por defecto,
 *  - la validación (números fuera de rango se corrigen solos),
 *  - y más adelante el menú de Ajustes, que se dibuja leyendo este esquema.
 */

export interface NumberField {
  readonly type: 'number';
  readonly default: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly label: string;
}
export interface BooleanField {
  readonly type: 'boolean';
  readonly default: boolean;
  readonly label: string;
}
export interface EnumField<T extends string = string> {
  readonly type: 'enum';
  readonly default: T;
  readonly options: readonly T[];
  readonly label: string;
}
export interface StringField {
  readonly type: 'string';
  readonly default: string;
  readonly maxLength: number;
  readonly label: string;
}
export type Field = NumberField | BooleanField | EnumField | StringField;
export type SectionSchema = Readonly<Record<string, Field>>;
export type SettingsSchema = Readonly<Record<string, SectionSchema>>;

// Pequeñas funciones de ayuda para escribir el esquema más corto.
const num = (label: string, def: number, min: number, max: number, step: number): NumberField => ({
  type: 'number',
  label,
  default: def,
  min,
  max,
  step,
});
const bool = (label: string, def: boolean): BooleanField => ({
  type: 'boolean',
  label,
  default: def,
});
const choice = <const T extends string>(
  label: string,
  def: T,
  options: readonly T[],
): EnumField<T> => ({
  type: 'enum',
  label,
  default: def,
  options,
});
const text = (label: string, def: string, maxLength: number): StringField => ({
  type: 'string',
  label,
  default: def,
  maxLength,
});

export const DIFFICULTY_PRESETS = ['facil', 'normal', 'dificil', 'personalizado'] as const;
export const THEMES = ['algodon', 'menta', 'lavanda'] as const;

export const settingsSchema = {
  controls: {
    sensitivity: num('Sensibilidad', 1, 0.1, 3, 0.05),
    invertY: bool('Invertir eje Y', false),
    buttonSize: num('Tamaño de botones', 1, 0.6, 1.6, 0.05),
    buttonOpacity: num('Opacidad de botones', 0.7, 0.2, 1, 0.05),
    joystickSize: num('Tamaño del joystick', 1, 0.6, 1.6, 0.05),
    leftHanded: bool('Modo zurdo', false),
    vibration: bool('Vibración', true),
    autoFire: bool('Disparo automático al apuntar', false),
  },
  difficulty: {
    preset: choice('Dificultad', 'normal', DIFFICULTY_PRESETS),
    startingLives: num('Vidas iniciales', 3, 1, 9, 1),
    healthPerLife: num('Salud por vida', 100, 20, 300, 10),
    enemyDamage: num('Daño de enemigos (x)', 1, 0.25, 3, 0.05),
    enemySpeed: num('Velocidad de enemigos (x)', 1, 0.25, 2.5, 0.05),
    enemyCount: num('Cantidad de enemigos (x)', 1, 0.25, 3, 0.05),
    extraLifeEvery: num('Puntos para vida extra', 5000, 500, 50000, 500),
    powerUpDuration: num('Duración de power-ups (s)', 10, 3, 60, 1),
    timeLimit: bool('Tiempo límite por mundo', true),
  },
  weapon: {
    fireRate: num('Cadencia (disparos/s)', 4, 1, 15, 0.5),
    bubbleSpeed: num('Velocidad de burbuja', 25, 5, 80, 1),
    bubbleDamage: num('Daño de burbuja', 10, 1, 100, 1),
  },
  graphics: {
    renderDistance: num('Distancia de render (chunks)', 4, 2, 12, 1),
    fov: num('Campo de visión (FOV)', 75, 50, 110, 1),
    quality: choice('Calidad', 'auto', ['auto', 'baja', 'media', 'alta'] as const),
    particles: bool('Partículas', true),
    fog: bool('Niebla', true),
    showFps: bool('Mostrar FPS', false),
    dayNight: bool('Ciclo día/noche', true),
  },
  player: {
    moveSpeed: num('Velocidad', 5, 2, 12, 0.5),
    jumpStrength: num('Fuerza de salto', 8, 4, 16, 0.5),
    gravity: num('Gravedad', 24, 8, 50, 1),
  },
  audio: {
    master: num('Volumen general', 0.8, 0, 1, 0.05),
    music: num('Música', 0.6, 0, 1, 0.05),
    sfx: num('Efectos', 0.8, 0, 1, 0.05),
  },
  theme: {
    variant: choice('Tema de colores', 'algodon', THEMES),
  },
  profile: {
    playerName: text('Nombre del jugador', 'Jugador', 16),
  },
} as const satisfies SettingsSchema;

// --- Tipos derivados automáticamente del esquema ---

/** Convierte la descripción de un campo en su tipo real (number, boolean, etc.). */
type FieldValue<F> = F extends NumberField
  ? number
  : F extends BooleanField
    ? boolean
    : F extends EnumField<infer T>
      ? T
      : F extends StringField
        ? string
        : never;

type Schema = typeof settingsSchema;

/** Tipo completo de la configuración, ej. `settings.player.gravity: number`. */
export type Settings = {
  -readonly [S in keyof Schema]: { -readonly [K in keyof Schema[S]]: FieldValue<Schema[S][K]> };
};
export type SectionName = keyof Settings;
export type DifficultyPreset = (typeof DIFFICULTY_PRESETS)[number];
export type ThemeName = (typeof THEMES)[number];

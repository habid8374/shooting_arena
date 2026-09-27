import type { DifficultyPreset, Settings } from './schema';

/**
 * Valores de cada nivel de dificultad. Al elegir "fácil", "normal" o "difícil"
 * se copian estos números a los ajustes finos. Si luego el jugador cambia un
 * ajuste fino a mano, la dificultad pasa a "personalizado".
 */
export type DifficultyValues = Omit<Settings['difficulty'], 'preset' | 'timeLimit'>;

export const DIFFICULTY_VALUES: Readonly<
  Record<Exclude<DifficultyPreset, 'personalizado'>, DifficultyValues>
> = {
  facil: {
    startingLives: 5,
    healthPerLife: 150,
    enemyDamage: 0.5,
    enemySpeed: 0.75,
    enemyCount: 0.75,
    extraLifeEvery: 3000,
    powerUpDuration: 15,
  },
  normal: {
    startingLives: 3,
    healthPerLife: 100,
    enemyDamage: 1,
    enemySpeed: 1,
    enemyCount: 1,
    extraLifeEvery: 5000,
    powerUpDuration: 10,
  },
  dificil: {
    startingLives: 2,
    healthPerLife: 80,
    enemyDamage: 1.5,
    enemySpeed: 1.3,
    enemyCount: 1.5,
    extraLifeEvery: 8000,
    powerUpDuration: 7,
  },
};

/** Claves que, al cambiarlas a mano, convierten la dificultad en "personalizado". */
export const DIFFICULTY_FINE_KEYS = Object.keys(
  DIFFICULTY_VALUES.normal,
) as (keyof DifficultyValues)[];

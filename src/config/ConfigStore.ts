import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { createDefaultSettings } from './defaults';
import {
  DIFFICULTY_FINE_KEYS,
  DIFFICULTY_VALUES,
  type DifficultyValues,
} from './difficultyPresets';
import { settingsSchema, type Field, type SectionName, type Settings } from './schema';
import { sanitizeField, validateSettings } from './validate';

/** Interfaz mínima de almacenamiento (localStorage la cumple; en pruebas usamos una falsa). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const CONFIG_STORAGE_KEY = 'shooting-arenas:settings';

/**
 * Guarda la configuración actual, la valida, la persiste en localStorage y
 * avisa por el EventBus cada vez que cambia (así los cambios se aplican en vivo).
 */
export class ConfigStore {
  private settings: Settings;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly storage: KeyValueStorage | null,
  ) {
    this.settings = this.load();
  }

  /** Copia de la configuración actual (solo lectura para quien la pide). */
  get(): Readonly<Settings> {
    return this.settings;
  }

  /** Cambia UN ajuste. El valor se valida antes de guardarse. */
  set<S extends SectionName, K extends keyof Settings[S]>(
    section: S,
    key: K,
    value: Settings[S][K],
  ): void {
    const field = (settingsSchema[section] as Record<string, Field>)[key as string];
    if (!field) return;
    const { value: clean } = sanitizeField(field, value);
    if (clean === undefined) return;

    const next = structuredClone(this.settings);
    (next[section] as Record<string, unknown>)[key as string] = clean;

    if (section === 'difficulty') {
      if (key === 'preset' && clean !== 'personalizado') {
        // Elegir un nivel copia sus valores a los ajustes finos.
        Object.assign(next.difficulty, DIFFICULTY_VALUES[clean as keyof typeof DIFFICULTY_VALUES]);
      } else if (DIFFICULTY_FINE_KEYS.includes(key as keyof DifficultyValues)) {
        // Tocar un ajuste fino convierte la dificultad en "personalizado".
        next.difficulty.preset = 'personalizado';
      }
    }
    this.commit(next);
  }

  /** Vuelve todo a los valores por defecto. */
  reset(): void {
    this.commit(createDefaultSettings());
  }

  /** Exporta la configuración como texto JSON bonito. */
  exportJson(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Importa una configuración desde texto JSON. Devuelve los problemas
   * encontrados; si el texto ni siquiera es JSON, no cambia nada.
   */
  importJson(json: string): string[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return ['El archivo no es un JSON válido.'];
    }
    const { settings, issues } = validateSettings(parsed);
    this.commit(settings);
    return issues;
  }

  private commit(next: Settings): void {
    this.settings = next;
    this.save();
    this.bus.emit('config:changed', { settings: this.settings });
  }

  private load(): Settings {
    const raw = this.safeGet();
    if (raw === null) return createDefaultSettings();
    try {
      const { settings, issues } = validateSettings(JSON.parse(raw));
      if (issues.length) console.warn('[Config] Se corrigieron ajustes guardados:', issues);
      return settings;
    } catch {
      console.warn('[Config] Ajustes guardados dañados; se usan los valores por defecto.');
      return createDefaultSettings();
    }
  }

  private safeGet(): string | null {
    try {
      return this.storage?.getItem(CONFIG_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Modo privado o almacenamiento lleno: el juego sigue funcionando sin guardar.
    }
  }
}

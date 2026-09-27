import { describe, expect, it, vi } from 'vitest';
import { ConfigStore, CONFIG_STORAGE_KEY, type KeyValueStorage } from '../src/config/ConfigStore';
import { createDefaultSettings } from '../src/config/defaults';
import { DIFFICULTY_VALUES } from '../src/config/difficultyPresets';
import { settingsSchema } from '../src/config/schema';
import { validateSettings } from '../src/config/validate';
import { EventBus } from '../src/core/EventBus';
import type { GameEvents } from '../src/core/events';

/** Almacenamiento falso en memoria (como localStorage). */
function memoryStorage(
  initial: Record<string, string> = {},
): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void Reflect.deleteProperty(data, k),
  };
}

describe('Valores por defecto', () => {
  it('cada valor por defecto respeta su propio rango', () => {
    for (const section of Object.values(settingsSchema)) {
      for (const field of Object.values(section)) {
        if (field.type === 'number') {
          expect(field.default).toBeGreaterThanOrEqual(field.min);
          expect(field.default).toBeLessThanOrEqual(field.max);
        }
        if (field.type === 'enum') expect(field.options).toContain(field.default);
      }
    }
  });

  it('empieza con 3 vidas', () => {
    expect(createDefaultSettings().difficulty.startingLives).toBe(3);
  });

  it('los valores de "normal" coinciden con los por defecto', () => {
    const d = createDefaultSettings().difficulty;
    for (const [k, v] of Object.entries(DIFFICULTY_VALUES.normal)) {
      expect(d[k as keyof typeof d]).toBe(v);
    }
  });
});

describe('validateSettings', () => {
  it('devuelve los valores por defecto si la entrada no es un objeto', () => {
    const { settings, issues } = validateSettings('hola');
    expect(settings).toEqual(createDefaultSettings());
    expect(issues.length).toBe(1);
  });

  it('ajusta números fuera de rango al mínimo/máximo', () => {
    const { settings, issues } = validateSettings({
      graphics: { fov: 500 },
      player: { gravity: -3 },
    });
    expect(settings.graphics.fov).toBe(settingsSchema.graphics.fov.max);
    expect(settings.player.gravity).toBe(settingsSchema.player.gravity.min);
    expect(issues).toHaveLength(2);
  });

  it('ignora tipos equivocados, opciones desconocidas y claves extra', () => {
    const { settings } = validateSettings({
      controls: { invertY: 'sí' },
      theme: { variant: 'neón' },
      audio: { master: Number.NaN },
      secreto: { x: 1 },
    });
    const d = createDefaultSettings();
    expect(settings.controls.invertY).toBe(d.controls.invertY);
    expect(settings.theme.variant).toBe(d.theme.variant);
    expect(settings.audio.master).toBe(d.audio.master);
    expect(settings).not.toHaveProperty('secreto');
  });

  it('recorta nombres largos y rechaza nombres vacíos', () => {
    const long = validateSettings({ profile: { playerName: 'A'.repeat(40) } }).settings;
    expect(long.profile.playerName).toHaveLength(settingsSchema.profile.playerName.maxLength);
    const empty = validateSettings({ profile: { playerName: '   ' } }).settings;
    expect(empty.profile.playerName).toBe(settingsSchema.profile.playerName.default);
  });

  it('conserva valores válidos', () => {
    const { settings, issues } = validateSettings({
      controls: { sensitivity: 2 },
      theme: { variant: 'menta' },
    });
    expect(settings.controls.sensitivity).toBe(2);
    expect(settings.theme.variant).toBe('menta');
    expect(issues).toEqual([]);
  });
});

describe('ConfigStore', () => {
  it('guarda cada cambio y avisa por el EventBus', () => {
    const bus = new EventBus<GameEvents>();
    const storage = memoryStorage();
    const store = new ConfigStore(bus, storage);
    const fn = vi.fn();
    bus.on('config:changed', fn);
    store.set('graphics', 'showFps', true);
    expect(store.get().graphics.showFps).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.data[CONFIG_STORAGE_KEY] ?? '{}').graphics.showFps).toBe(true);
  });

  it('carga los ajustes guardados y corrige los dañados', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = memoryStorage({
      [CONFIG_STORAGE_KEY]: JSON.stringify({ player: { moveSpeed: 999 } }),
    });
    const store = new ConfigStore(new EventBus<GameEvents>(), storage);
    expect(store.get().player.moveSpeed).toBe(settingsSchema.player.moveSpeed.max);
    const broken = new ConfigStore(
      new EventBus<GameEvents>(),
      memoryStorage({ [CONFIG_STORAGE_KEY]: '{roto' }),
    );
    expect(broken.get()).toEqual(createDefaultSettings());
    warn.mockRestore();
  });

  it('elegir un nivel de dificultad copia sus valores', () => {
    const store = new ConfigStore(new EventBus<GameEvents>(), null);
    store.set('difficulty', 'preset', 'facil');
    expect(store.get().difficulty.startingLives).toBe(DIFFICULTY_VALUES.facil.startingLives);
    expect(store.get().difficulty.enemyDamage).toBe(DIFFICULTY_VALUES.facil.enemyDamage);
  });

  it('tocar un ajuste fino cambia la dificultad a "personalizado"', () => {
    const store = new ConfigStore(new EventBus<GameEvents>(), null);
    store.set('difficulty', 'startingLives', 7);
    expect(store.get().difficulty.preset).toBe('personalizado');
    expect(store.get().difficulty.startingLives).toBe(7);
  });

  it('exporta e importa JSON', () => {
    const a = new ConfigStore(new EventBus<GameEvents>(), null);
    a.set('audio', 'music', 0.25);
    const json = a.exportJson();
    const b = new ConfigStore(new EventBus<GameEvents>(), null);
    expect(b.importJson(json)).toEqual([]);
    expect(b.get().audio.music).toBe(0.25);
    expect(b.importJson('no es json')).toEqual(['El archivo no es un JSON válido.']);
    expect(b.get().audio.music).toBe(0.25);
  });

  it('restablece los valores por defecto', () => {
    const store = new ConfigStore(new EventBus<GameEvents>(), null);
    store.set('graphics', 'fov', 100);
    store.reset();
    expect(store.get()).toEqual(createDefaultSettings());
  });

  it('funciona aunque el almacenamiento falle', () => {
    const failing: KeyValueStorage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
      removeItem: () => undefined,
    };
    const store = new ConfigStore(new EventBus<GameEvents>(), failing);
    expect(() => store.set('graphics', 'fog', false)).not.toThrow();
    expect(store.get().graphics.fog).toBe(false);
  });
});

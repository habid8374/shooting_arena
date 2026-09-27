import { settingsSchema, type Settings } from './schema';

/**
 * Construye la configuración por defecto leyendo el `default` de cada campo
 * del esquema. Siempre devuelve un objeto NUEVO.
 */
export function createDefaultSettings(): Settings {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [sectionName, section] of Object.entries(settingsSchema)) {
    const values: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(section)) values[key] = field.default;
    result[sectionName] = values;
  }
  return result as Settings;
}

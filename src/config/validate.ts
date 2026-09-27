import { settingsSchema, type Field, type Settings } from './schema';
import { createDefaultSettings } from './defaults';

/**
 * Valida datos desconocidos (de localStorage o de un JSON importado) y
 * devuelve SIEMPRE una configuración correcta:
 *  - valores que faltan → valor por defecto (o el de `base`)
 *  - números fuera de rango → se ajustan al mínimo/máximo
 *  - tipos equivocados u opciones desconocidas → se ignoran
 *  - claves que no existen en el esquema → se ignoran
 * También devuelve la lista de problemas encontrados (en español).
 */
export interface ValidationResult {
  settings: Settings;
  issues: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Valida un solo valor según su campo. Devuelve `undefined` si no sirve. */
export function sanitizeField(field: Field, value: unknown): { value: unknown; issue?: string } {
  switch (field.type) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { value: undefined, issue: 'no es un número' };
      }
      const clamped = Math.min(field.max, Math.max(field.min, value));
      return clamped === value
        ? { value }
        : { value: clamped, issue: `fuera de rango, ajustado a ${clamped}` };
    }
    case 'boolean':
      return typeof value === 'boolean' ? { value } : { value: undefined, issue: 'no es sí/no' };
    case 'enum':
      return typeof value === 'string' && field.options.includes(value)
        ? { value }
        : { value: undefined, issue: 'opción desconocida' };
    case 'string': {
      if (typeof value !== 'string') return { value: undefined, issue: 'no es texto' };
      const trimmed = value.trim().slice(0, field.maxLength);
      if (trimmed.length === 0) return { value: undefined, issue: 'texto vacío' };
      return trimmed === value ? { value } : { value: trimmed, issue: 'texto recortado' };
    }
  }
}

export function validateSettings(
  input: unknown,
  base: Settings = createDefaultSettings(),
): ValidationResult {
  const issues: string[] = [];
  // Partimos de una copia de `base` para no modificarla.
  const out = structuredClone(base) as unknown as Record<string, Record<string, unknown>>;

  if (!isRecord(input)) {
    if (input !== undefined)
      issues.push('La configuración no es un objeto; se usan valores por defecto.');
    return { settings: out as unknown as Settings, issues };
  }

  for (const [sectionName, section] of Object.entries(settingsSchema)) {
    const rawSection = input[sectionName];
    if (rawSection === undefined) continue;
    if (!isRecord(rawSection)) {
      issues.push(`Sección "${sectionName}" inválida.`);
      continue;
    }
    const target = out[sectionName];
    if (!target) continue;
    for (const [key, field] of Object.entries(section) as [string, Field][]) {
      if (!(key in rawSection)) continue;
      const { value, issue } = sanitizeField(field, rawSection[key]);
      if (issue) issues.push(`${sectionName}.${key}: ${issue}.`);
      if (value !== undefined) target[key] = value;
    }
  }
  return { settings: out as unknown as Settings, issues };
}

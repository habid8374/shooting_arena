import { WORLD } from '../../config/engine';
import { PALETTE } from '../../config/palette';
import { blockIdByName } from '../../world/BlockRegistry';
import type { WorldDefinition } from './types';

/**
 * Revisa que un JSON de mundo esté bien escrito. Devuelve la lista de errores
 * en español (vacía si todo está bien), para que quien cree un mundo nuevo
 * sepa exactamente qué corregir.
 */
export function validateWorld(data: unknown, source = 'mundo'): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(`[${source}] ${msg}`);
  const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);
  const num = (
    obj: Record<string, unknown>,
    key: string,
    min: number,
    max: number,
    path: string,
  ) => {
    const v = obj[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) err(`"${path}${key}" debe ser un número.`);
    else if (v < min || v > max)
      err(`"${path}${key}" debe estar entre ${min} y ${max} (tiene ${v}).`);
  };
  const str = (obj: Record<string, unknown>, key: string, path: string) => {
    if (typeof obj[key] !== 'string' || (obj[key] as string).length === 0)
      err(`"${path}${key}" debe ser un texto.`);
  };
  const block = (obj: Record<string, unknown>, key: string, path: string) => {
    const v = obj[key];
    if (typeof v !== 'string' || blockIdByName(v) === undefined)
      err(`"${path}${key}" debe ser un bloque válido (tiene ${JSON.stringify(v)}).`);
  };

  if (!isObj(data)) {
    err('El archivo debe contener un objeto JSON.');
    return errors;
  }
  const H = WORLD.chunkHeight;

  str(data, 'id', '');
  if (typeof data.id === 'string' && !/^[a-z0-9-]+$/.test(data.id))
    err('"id" solo puede tener minúsculas, números y guiones.');
  num(data, 'order', 1, 999, '');
  str(data, 'name', '');
  str(data, 'emoji', '');
  if (typeof data.description !== 'string') err('"description" debe ser un texto.');
  num(data, 'seed', -2147483648, 4294967295, '');

  if (!isObj(data.size)) err('Falta "size" con chunksX y chunksZ.');
  else {
    num(data.size, 'chunksX', 1, 32, 'size.');
    num(data.size, 'chunksZ', 1, 32, 'size.');
  }

  if (!isObj(data.palette)) err('"palette" debe ser un objeto (puede estar vacío: {}).');
  else {
    for (const [key, value] of Object.entries(data.palette)) {
      if (!(key in PALETTE)) err(`"palette.${key}" no es un color conocido de la paleta.`);
      if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value))
        err(`"palette.${key}" debe ser un color como "#FFAFCC".`);
    }
  }

  const t = data.terrain;
  if (!isObj(t)) {
    err('Falta "terrain".');
    return errors;
  }
  num(t, 'baseHeight', 1, H - 2, 'terrain.');
  num(t, 'amplitude', 0, H, 'terrain.');
  num(t, 'frequency', 0.0001, 1, 'terrain.');
  num(t, 'octaves', 1, 6, 'terrain.');
  num(t, 'waterLevel', -1, H - 1, 'terrain.');

  if (!isObj(t.layers)) err('Falta "terrain.layers".');
  else {
    for (const key of ['surface', 'subsurface', 'deep', 'shore'])
      block(t.layers, key, 'terrain.layers.');
    num(t.layers, 'subsurfaceDepth', 0, H, 'terrain.layers.');
  }
  if (t.snowLine !== undefined) {
    if (!isObj(t.snowLine)) err('"terrain.snowLine" debe ser un objeto.');
    else {
      num(t.snowLine, 'height', 0, H, 'terrain.snowLine.');
      block(t.snowLine, 'surface', 'terrain.snowLine.');
    }
  }
  if (t.islands !== undefined) {
    if (!isObj(t.islands)) err('"terrain.islands" debe ser un objeto.');
    else {
      num(t.islands, 'frequency', 0.0001, 1, 'terrain.islands.');
      num(t.islands, 'threshold', 0, 1, 'terrain.islands.');
    }
  }
  if (t.caves !== undefined) {
    if (!isObj(t.caves)) err('"terrain.caves" debe ser un objeto.');
    else {
      num(t.caves, 'frequency', 0.0001, 1, 'terrain.caves.');
      num(t.caves, 'threshold', 0, 1, 'terrain.caves.');
      num(t.caves, 'minY', 0, H, 'terrain.caves.');
      num(t.caves, 'maxY', 0, H, 'terrain.caves.');
    }
  }
  if (t.floating !== undefined && typeof t.floating !== 'boolean')
    err('"terrain.floating" debe ser true o false.');
  if (t.trees !== undefined) {
    if (!isObj(t.trees)) err('"terrain.trees" debe ser un objeto.');
    else {
      num(t.trees, 'density', 0, 1, 'terrain.trees.');
      block(t.trees, 'trunk', 'terrain.trees.');
      block(t.trees, 'leaves', 'terrain.trees.');
      num(t.trees, 'minHeight', 1, 20, 'terrain.trees.');
      num(t.trees, 'maxHeight', 1, 20, 'terrain.trees.');
    }
  }
  return errors;
}

/** Valida y devuelve el mundo ya tipado, o lanza un error con la lista de problemas. */
export function parseWorld(data: unknown, source?: string): WorldDefinition {
  const errors = validateWorld(data, source);
  if (errors.length > 0) throw new Error(`Mundo inválido:\n${errors.join('\n')}`);
  return data as WorldDefinition;
}

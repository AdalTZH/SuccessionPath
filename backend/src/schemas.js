import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.join(here, 'schemas');

// The entity schemas travel with the backend so imported data keeps its real types:
// a personnel number like "074" stays a string, while a count like 40 becomes a number.
const SCHEMAS = new Map();

for (const file of fs.readdirSync(schemaDir).filter(name => name.endsWith('.json'))) {
  const name = path.basename(file, '.json');
  const raw = fs.readFileSync(path.join(schemaDir, file), 'utf8');
  const schema = JSON.parse(raw);
  SCHEMAS.set(name, schema);
}

export function getSchema(entity) {
  return SCHEMAS.get(entity) || null;
}

export function listSchemas() {
  return [...SCHEMAS.entries()].map(([name, schema]) => ({
    name,
    properties: Object.keys(schema.properties || {}),
  }));
}

function fieldType(entity, field) {
  const schema = SCHEMAS.get(entity);
  const definition = schema?.properties?.[field];
  return definition?.type || null;
}

function looksLikeJson(value) {
  const trimmed = String(value).trim();
  if (!/^[[{]/.test(trimmed)) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function coerceValue(entity, field, value) {
  if (value === '' || value === undefined) return null;
  const type = fieldType(entity, field);

  if (type === 'number' || type === 'integer') {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  }

  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  }

  if (type === 'object' || type === 'array') {
    if (typeof value !== 'string') return value;
    if (!looksLikeJson(value)) return type === 'array' ? [] : null;
    try {
      return JSON.parse(value);
    } catch {
      return type === 'array' ? [] : null;
    }
  }

  // Everything else (string, date, date-time) keeps its exact text.
  return typeof value === 'string' ? value : String(value);
}

// Shapes a row of incoming data (CSV cell or API body) into the record's declared types.
export function coerceRecord(entity, record) {
  const out = {};
  for (const [field, value] of Object.entries(record || {})) {
    if (value === null || value === undefined) continue;
    out[field] = coerceValue(entity, field, value);
  }
  return out;
}
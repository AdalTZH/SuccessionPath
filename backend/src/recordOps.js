// Record shaping shared by both stores: every entity record keeps its own fields in `doc`,
// while the columns the app sorts and paginates by live outside it.
import crypto from 'node:crypto';
import { HttpError } from './query.js';

export const MAX_LIMIT = 1000;
export const DEFAULT_LIMIT = 100;
export const UPDATE_MANY_CAP = 500;

const BASE_KEYS = ['id', 'created_date', 'updated_date', 'created_by_id'];

export function rowToRecord(row) {
  if (!row) return null;
  let doc = {};
  try {
    doc = typeof row.doc === 'string' ? JSON.parse(row.doc) : (row.doc || {});
  } catch {
    doc = {};
  }
  return {
    id: row.id,
    created_date: row.created_date,
    updated_date: row.updated_date,
    created_by_id: row.created_by_id,
    ...doc,
  };
}

export function splitRecord(data) {
  const doc = { ...(data || {}) };
  BASE_KEYS.forEach(key => delete doc[key]);
  return doc;
}

export function recordId(data) {
  const supplied = data?.id;
  return supplied && String(supplied).trim() ? String(supplied) : crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function clampLimit(limit) {
  const value = Number(limit);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(value), MAX_LIMIT);
}

export function cursorOffset(cursor) {
  return Number.isFinite(Number(cursor)) && Number(cursor) > 0 ? Math.floor(Number(cursor)) : 0;
}

// Normalises a record's columns for an insert/upsert.
export function insertRow(entity, data, userId) {
  const timestamp = nowIso();
  return {
    entity,
    id: recordId(data),
    created_date: data?.created_date || timestamp,
    updated_date: data?.updated_date || timestamp,
    created_by_id: userId || data?.created_by_id || null,
    doc: splitRecord(data),
  };
}

export function applyUpdateOperators(record, update) {
  const looksLikeOperators = update && typeof update === 'object' && Object.keys(update).some(key => key.startsWith('$'));
  if (!looksLikeOperators) return { ...record, ...splitRecord(update) };

  let next = { ...record };
  for (const [op, operand] of Object.entries(update)) {
    if (op === '$set') next = { ...next, ...splitRecord(operand) };
    else if (op === '$unset') Object.keys(operand || {}).forEach(key => delete next[key]);
    else if (op === '$inc') Object.entries(operand || {}).forEach(([key, by]) => { next[key] = (Number(next[key]) || 0) + Number(by); });
    else if (op === '$addToSet') {
      Object.entries(operand || {}).forEach(([key, value]) => {
        const list = Array.isArray(next[key]) ? next[key] : [];
        if (!list.some(item => JSON.stringify(item) === JSON.stringify(value))) next[key] = [...list, value];
      });
    } else if (op === '$push') {
      Object.entries(operand || {}).forEach(([key, value]) => {
        const list = Array.isArray(next[key]) ? next[key] : [];
        next[key] = [...list, value];
      });
    } else if (op === '$pull') {
      Object.entries(operand || {}).forEach(([key, value]) => {
        const list = Array.isArray(next[key]) ? next[key] : [];
        next[key] = list.filter(item => JSON.stringify(item) !== JSON.stringify(value));
      });
    } else {
      throw new HttpError(400, `Unsupported update operator: ${op}`);
    }
  }
  return next;
}

export function aggregateAlias(kind, field) {
  if (!/^[A-Za-z0-9_]+$/.test(field)) throw new HttpError(400, `Invalid field name: ${field}`);
  return `${kind}_${field}`;
}

export function listOf(value) {
  return Array.isArray(value) ? value : [];
}
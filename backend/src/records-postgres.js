import { pool, describeTarget } from './db-postgres.js';
import { buildWhere, buildOrder, POSTGRES, HttpError } from './query.js';
import {
  aggregateAlias, applyUpdateOperators, clampLimit, cursorOffset, insertRow,
  listOf, nowIso, rowToRecord, splitRecord, UPDATE_MANY_CAP,
} from './recordOps.js';

// PostgreSQL store (Aurora, RDS, or local PostgreSQL).
// Records live in `records.doc jsonb`; the app's own fields are read with ->?>>, so no schema
// migration is needed when a field is added to the workbook.

const DDL = `
  CREATE TABLE IF NOT EXISTS records (
    entity        text NOT NULL,
    id            text NOT NULL,
    created_date  text NOT NULL,
    updated_date  text NOT NULL,
    created_by_id text,
    doc           jsonb NOT NULL,
    PRIMARY KEY (entity, id)
  );
  CREATE INDEX IF NOT EXISTS idx_records_entity_created ON records (entity, created_date);
  CREATE INDEX IF NOT EXISTS idx_records_entity_updated ON records (entity, updated_date);
  CREATE INDEX IF NOT EXISTS idx_records_doc ON records USING gin (doc jsonb_path_ops);

  CREATE TABLE IF NOT EXISTS users (
    id            text PRIMARY KEY,
    email         text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    full_name     text,
    role          text NOT NULL DEFAULT 'user',
    created_date  text NOT NULL
  );
`;

// node-postgres uses $1, $2…; the query builder emits ? so both dialects stay identical.
function toPositional(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function query(sql, params = []) {
  return pool.query(toPositional(sql), params.map(POSTGRES.bind));
}

export async function initStore() {
  await pool.query(DDL);
  return { dialect: 'postgres', location: describeTarget() };
}

export async function listRecords(entity, { query: filter, sort, limit, cursor } = {}) {
  const where = buildWhere(filter, POSTGRES);
  const pageSize = clampLimit(limit);
  const offset = cursorOffset(cursor);

  const { rows } = await query(
    `SELECT * FROM records
      WHERE entity = ?${where.sql ? ` AND ${where.sql}` : ''}
      ${buildOrder(sort, POSTGRES)}
      LIMIT ? OFFSET ?`,
    [entity, ...where.params, pageSize + 1, offset]
  );

  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize).map(rowToRecord);

  return {
    items,
    next_cursor: hasMore ? String(offset + pageSize) : null,
    has_more: hasMore,
  };
}

export async function countRecords(entity, filter) {
  const where = buildWhere(filter, POSTGRES);
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM records WHERE entity = ?${where.sql ? ` AND ${where.sql}` : ''}`,
    [entity, ...where.params]
  );
  return rows[0] ? Number(rows[0].total) : 0;
}

export async function getRecord(entity, id) {
  const { rows } = await query('SELECT * FROM records WHERE entity = ? AND id = ?', [entity, id]);
  return rowToRecord(rows[0]);
}

export async function createRecord(entity, data, userId) {
  const row = insertRow(entity, data, userId);
  await query(
    `INSERT INTO records (entity, id, created_date, updated_date, created_by_id, doc)
     VALUES (?, ?, ?, ?, ?, ?::jsonb)`,
    [row.entity, row.id, row.created_date, row.updated_date, row.created_by_id, JSON.stringify(row.doc)]
  );
  return getRecord(entity, row.id);
}

export async function bulkCreateRecords(entity, items, userId) {
  const rows = (items || []).map(data => insertRow(entity, data, userId));
  if (!rows.length) return [];

  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?::jsonb)').join(', ');
  const params = rows.flatMap(row => [row.entity, row.id, row.created_date, row.updated_date, row.created_by_id, JSON.stringify(row.doc)]);

  const { rows: inserted } = await query(
    `INSERT INTO records (entity, id, created_date, updated_date, created_by_id, doc)
     VALUES ${placeholders}
     RETURNING *`,
    params
  );
  return inserted.map(rowToRecord);
}

// Keyed by (entity, id): re-importing the same CSV replaces rows instead of duplicating them.
export async function upsertRecords(entity, items, userId) {
  const rows = (items || []).map(data => insertRow(entity, data, userId));
  if (!rows.length) return 0;

  const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?::jsonb)').join(', ');
  const params = rows.flatMap(row => [row.entity, row.id, row.created_date, row.updated_date, row.created_by_id, JSON.stringify(row.doc)]);

  await query(
    `INSERT INTO records (entity, id, created_date, updated_date, created_by_id, doc)
     VALUES ${placeholders}
     ON CONFLICT (entity, id) DO UPDATE SET
       created_date = EXCLUDED.created_date,
       updated_date = EXCLUDED.updated_date,
       created_by_id = EXCLUDED.created_by_id,
       doc = EXCLUDED.doc`,
    params
  );
  return rows.length;
}

export async function updateRecord(entity, id, patch) {
  const existing = await getRecord(entity, id);
  if (!existing) throw new HttpError(404, `Record not found: ${id}`);

  const merged = { ...existing, ...splitRecord(patch) };
  await query('UPDATE records SET doc = ?::jsonb, updated_date = ? WHERE entity = ? AND id = ?', [
    JSON.stringify(splitRecord(merged)),
    nowIso(),
    entity,
    id,
  ]);

  return getRecord(entity, id);
}

export async function bulkUpdateRecords(entity, items) {
  const updated = [];
  for (const item of items || []) {
    updated.push(await updateRecord(entity, item.id, item));
  }
  return updated;
}

// Applies one change to every matching record. Capped so a single call stays bounded.
export async function updateManyRecords(entity, filter, update) {
  const where = buildWhere(filter, POSTGRES);
  const { rows } = await query(
    `SELECT * FROM records WHERE entity = ?${where.sql ? ` AND ${where.sql}` : ''} LIMIT ${UPDATE_MANY_CAP}`,
    [entity, ...where.params]
  );

  for (const row of rows) {
    const record = rowToRecord(row);
    const next = applyUpdateOperators(record, update);
    await query('UPDATE records SET doc = ?::jsonb, updated_date = ? WHERE entity = ? AND id = ?', [
      JSON.stringify(splitRecord(next)),
      nowIso(),
      entity,
      record.id,
    ]);
  }

  return { updated: rows.length, has_more: rows.length === UPDATE_MANY_CAP };
}

export async function deleteRecord(entity, id) {
  const result = await query('DELETE FROM records WHERE entity = ? AND id = ?', [entity, id]);
  return result.rowCount > 0;
}

export async function deleteManyRecords(entity, filter) {
  const where = buildWhere(filter, POSTGRES);
  const result = await query(
    `DELETE FROM records WHERE entity = ?${where.sql ? ` AND ${where.sql}` : ''}`,
    [entity, ...where.params]
  );
  return result.rowCount;
}

export async function aggregateRecords(entity, { query: filter, groupBy, sum, avg, min, max } = {}) {
  const where = buildWhere(filter, POSTGRES);
  const groupExpr = POSTGRES.field(groupBy);
  const aggregations = ['COUNT(*)::int AS count'];

  listOf(sum).forEach(field => aggregations.push(`SUM(${POSTGRES.numeric(POSTGRES.field(field))}) AS ${aggregateAlias('sum', field)}`));
  listOf(avg).forEach(field => aggregations.push(`AVG(${POSTGRES.numeric(POSTGRES.field(field))}) AS ${aggregateAlias('avg', field)}`));
  listOf(min).forEach(field => aggregations.push(`MIN(${POSTGRES.numeric(POSTGRES.field(field))}) AS ${aggregateAlias('min', field)}`));
  listOf(max).forEach(field => aggregations.push(`MAX(${POSTGRES.numeric(POSTGRES.field(field))}) AS ${aggregateAlias('max', field)}`));

  const { rows } = await query(
    `SELECT ${groupExpr} AS grp, ${aggregations.join(', ')}
       FROM records
      WHERE entity = ?${where.sql ? ` AND ${where.sql}` : ''}
      GROUP BY grp
      ORDER BY count DESC`,
    [entity, ...where.params]
  );

  return {
    rows: rows.map(row => {
      const { grp, ...rest } = row;
      return { [groupBy]: grp, ...rest };
    }),
  };
}

export async function distinctValues(entity, field, filter) {
  const where = buildWhere(filter, POSTGRES);
  const expr = POSTGRES.field(field);
  const { rows } = await query(
    `SELECT DISTINCT ${expr} AS value
       FROM records
      WHERE entity = ?${where.sql ? ` AND ${where.sql}` : ''} AND ${expr} IS NOT NULL
      ORDER BY value ASC`,
    [entity, ...where.params]
  );
  return rows.map(row => row.value);
}

// Translates the query objects the frontend already uses into PostgreSQL over the JSON document.
// Supported operators: $in, $nin, $gt, $gte, $lt, $lte, $ne, $exists, $regex, $or, $and.

const FIELD_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function checkedField(field) {
  if (!FIELD_RE.test(String(field || ''))) {
    throw new HttpError(400, `Invalid field name: ${field}`);
  }
  return field;
}

export const POSTGRES = {
  name: 'postgres',
  // Dotted names read a nested key the same way json_extract's '$.a.b' does.
  field: field => {
    const path = checkedField(field).split('.');
    return path.length === 1 ? `(doc->>'${path[0]}')` : `(doc#>>'{${path.join(',')}}')`;
  },
  // doc->>'field' is always text; numeric comparisons must cast explicitly.
  numeric: expr => `(${expr})::double precision`,
  like: expr => `${expr} ILIKE ?`,
  bind: value => (value === undefined ? null : value),
};

// Default dialect expression, for callers that do not pass one.
export function fieldExpr(field) {
  return POSTGRES.field(field);
}

function operandExpr(expr, value, d) {
  return typeof value === 'number' ? d.numeric(expr) : expr;
}

function condition(expr, value, d) {
  // Operator object, e.g. { $in: [...] } — a plain object as a value is not supported.
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const parts = [];
    const params = [];

    for (const [op, operand] of Object.entries(value)) {
      if (op === '$in') {
        const list = Array.isArray(operand) ? operand.map(d.bind) : [];
        if (!list.length) return { sql: '0 = 1', params: [] };
        const left = list.every(item => typeof item === 'number') ? d.numeric(expr) : expr;
        parts.push(`${left} IN (${list.map(() => '?').join(',')})`);
        params.push(...list);
      } else if (op === '$nin') {
        const list = Array.isArray(operand) ? operand.map(d.bind) : [];
        if (!list.length) continue;
        const left = list.every(item => typeof item === 'number') ? d.numeric(expr) : expr;
        parts.push(`(${expr} IS NULL OR ${left} NOT IN (${list.map(() => '?').join(',')}))`);
        params.push(...list);
      } else if (op === '$gt' || op === '$gte' || op === '$lt' || op === '$lte') {
        const symbol = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' }[op];
        parts.push(`${operandExpr(expr, operand, d)} ${symbol} ?`);
        params.push(d.bind(operand));
      } else if (op === '$ne') {
        if (operand === null) {
          parts.push(`${expr} IS NOT NULL`);
        } else {
          parts.push(`(${expr} IS NULL OR ${operandExpr(expr, operand, d)} <> ?)`);
          params.push(d.bind(operand));
        }
      } else if (op === '$exists') {
        parts.push(operand ? `${expr} IS NOT NULL` : `${expr} IS NULL`);
      } else if (op === '$regex') {
        // The app uses $regex only for case-insensitive substring search.
        parts.push(d.like(expr));
        params.push(`%${String(operand)}%`);
      } else {
        throw new HttpError(400, `Unsupported query operator: ${op}`);
      }
    }

    if (!parts.length) return { sql: '1 = 1', params: [] };
    return { sql: parts.join(' AND '), params };
  }

  if (value === null) return { sql: `${expr} IS NULL`, params: [] };
  return { sql: `${operandExpr(expr, value, d)} = ?`, params: [d.bind(value)] };
}

// Returns { sql, params } where sql is a bare predicate (no WHERE keyword), or '' when empty.
export function buildWhere(query, d = POSTGRES) {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return { sql: '', params: [] };

  const clauses = [];
  const params = [];

  for (const [key, value] of Object.entries(query)) {
    if (key === '$or' || key === '$and') {
      if (!Array.isArray(value) || !value.length) continue;
      const subs = value.map(entry => buildWhere(entry, d)).filter(sub => sub.sql);
      if (!subs.length) continue;
      const joiner = key === '$or' ? ' OR ' : ' AND ';
      clauses.push(`(${subs.map(sub => sub.sql).join(joiner)})`);
      subs.forEach(sub => params.push(...sub.params));
      continue;
    }

    const { sql, params: values } = condition(d.field(key), value, d);
    clauses.push(sql);
    params.push(...values);
  }

  return { sql: clauses.join(' AND '), params };
}

const COLUMN_SORTS = new Set(['created_date', 'updated_date', 'id', 'entity']);

// 'name' ascending, '-created_date' descending, nulls always last.
export function buildOrder(sort, d = POSTGRES) {
  const raw = String(sort || '-created_date').trim();
  const descending = raw.startsWith('-');
  const field = (descending ? raw.slice(1) : raw) || 'created_date';

  if (COLUMN_SORTS.has(field)) {
    return `ORDER BY ${field} ${descending ? 'DESC' : 'ASC'}, id ASC`;
  }

  const expr = d.field(field);
  return `ORDER BY (${expr} IS NULL) ASC, ${expr} ${descending ? 'DESC' : 'ASC'}, id ASC`;
}

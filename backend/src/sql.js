// Minimal PostgreSQL runner shared by the account store and the CSV scripts.
import { pool } from './db-postgres.js';

function toPositional(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export async function all(sql, params = []) {
  const result = await pool.query(toPositional(sql), params);
  return result.rows;
}

export async function get(sql, params = []) {
  const result = await pool.query(toPositional(sql), params);
  return result.rows[0] || undefined;
}

export async function run(sql, params = []) {
  const result = await pool.query(toPositional(sql), params);
  return { changes: result.rowCount };
}

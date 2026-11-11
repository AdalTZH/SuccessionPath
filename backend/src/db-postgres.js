import pg from 'pg';

// One pool for the whole process. Aurora requires TLS; set PGSSL=false only for a plain local
// PostgreSQL server. The URL is never logged with its password.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new pg.Pool({
  connectionString,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 5),
  idleTimeoutMillis: 30_000,
});

export function describeTarget() {
  return connectionString.replace(/:\/\/([^:/@]+):[^@]*@/, '://$1:***@');
}

export function closePool() {
  return pool.end();
}

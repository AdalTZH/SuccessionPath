import 'dotenv/config';
import { ENTITIES } from '../src/entities.js';
import { closePool } from '../src/db-postgres.js';
import { initStore, countRecords } from '../src/store.js';
import { countUsers } from '../src/usersStore.js';

// Creates the tables where needed (Postgres) and reports what the database now holds.
const store = await initStore();
console.log(`[migrate] ${store.dialect} ready — ${store.location}`);

let total = 0;
for (const entity of ENTITIES) {
  const rows = await countRecords(entity);
  total += rows;
  console.log(`[migrate] ${entity.padEnd(24)} ${String(rows).padStart(6)} records`);
}

const accounts = await countUsers();
console.log(`[migrate] ${'User accounts'.padEnd(24)} ${String(accounts).padStart(6)}`);
console.log(`[migrate] ${total} records in total`);
await closePool();

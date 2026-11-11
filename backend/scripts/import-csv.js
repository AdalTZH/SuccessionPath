import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../src/csv.js';
import { closePool } from '../src/db-postgres.js';
import { coerceRecord } from '../src/schemas.js';
import { ENTITIES } from '../src/entities.js';
import { initStore, upsertRecords } from '../src/store.js';

// Loads the exported CSVs into PostgreSQL. Safe to re-run: rows are keyed by id, so an import
// replaces the same record instead of duplicating it.

const CHUNK = 250;

const dirArgIndex = process.argv.indexOf('--dir');
const sourceDir = dirArgIndex > -1
  ? path.resolve(process.argv[dirArgIndex + 1])
  : path.resolve(process.cwd(), '..', 'exports');

if (!fs.existsSync(sourceDir)) {
  console.error(`[import] No CSV folder at ${sourceDir}`);
  process.exit(1);
}

const store = await initStore();
console.log(`[import] Target: ${store.dialect} — ${store.location}`);

let totalRows = 0;

for (const entity of ENTITIES) {
  const file = path.join(sourceDir, `${entity}.csv`);
  if (!fs.existsSync(file)) {
    console.log(`[import] ${entity}: no CSV, skipped`);
    continue;
  }

  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (rows.length < 2) {
    console.log(`[import] ${entity}: empty file, skipped`);
    continue;
  }

  const [header, ...body] = rows;
  const records = [];

  for (const cells of body) {
    if (!cells.length || (cells.length === 1 && cells[0] === '')) continue;

    const raw = {};
    header.forEach((key, index) => {
      const value = cells[index];
      if (value !== '' && value !== undefined) raw[key] = value;
    });

    const record = coerceRecord(entity, raw);
    if (!record.id) continue;
    records.push(record);
  }

  for (let start = 0; start < records.length; start += CHUNK) {
    await upsertRecords(entity, records.slice(start, start + CHUNK));
  }

  totalRows += records.length;
  console.log(`[import] ${entity}: ${records.length} rows`);
}

console.log(`[import] Done — ${totalRows} rows from ${sourceDir}`);
await closePool();

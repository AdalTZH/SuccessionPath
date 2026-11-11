import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { toCsv } from '../src/csv.js';
import { closePool } from '../src/db-postgres.js';
import { ENTITIES } from '../src/entities.js';
import { initStore, listRecords } from '../src/store.js';

// Writes every table back out to CSV — the mirror image of scripts/import-csv.js.
const outIndex = process.argv.indexOf('--out');
const outDir = outIndex > -1 ? path.resolve(process.argv[outIndex + 1]) : path.resolve(process.cwd(), 'data', 'export');

fs.mkdirSync(outDir, { recursive: true });

const store = await initStore();
console.log(`[export] Source: ${store.dialect} — ${store.location}`);

for (const entity of ENTITIES) {
  const records = [];
  let cursor = null;

  do {
    const page = await listRecords(entity, { sort: 'created_date', limit: 1000, cursor });
    records.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);

  if (!records.length) continue;

  const keySet = new Set();
  records.forEach(record => Object.keys(record).forEach(key => keySet.add(key)));
  const lead = ['id', 'created_date', 'updated_date', 'created_by_id'].filter(key => keySet.has(key));
  const columns = [...lead, ...[...keySet].filter(key => !lead.includes(key)).sort()];

  fs.writeFileSync(path.join(outDir, `${entity}.csv`), toCsv(records, columns), 'utf8');
  console.log(`[export] ${entity}: ${records.length} rows`);
}

console.log(`[export] Written to ${outDir}`);
await closePool();

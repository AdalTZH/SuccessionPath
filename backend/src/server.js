import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initStore } from './store.js';
import { closePool } from './db-postgres.js';
import { listSchemas } from './schemas.js';
import { requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import functionRoutes from './routes/assistant.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendDist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: false }));
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Shape of the published data model, for the admin screens and for integrators.
app.get('/api/schema', requireAuth, (req, res) => res.json({ entities: listSchemas() }));

app.use('/api/auth', authRoutes);
app.use('/api/entities', requireAuth, entityRoutes);
app.use('/api/functions', requireAuth, functionRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
} else {
  app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` }));
}

// Every thrown error reaches here, so a bad filter comes back as a readable message.
app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) console.error('[error]', error);
  res.status(status).json({ error: error.message || 'Unexpected server error' });
});

// Creates the PostgreSQL tables and indexes when they do not exist yet.
const store = await initStore();
console.log(`[store] ${store.dialect} — ${store.location}`);

const server = app.listen(port, () => {
  console.log(`[api] SuccessionPath backend listening on http://localhost:${port}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  });
}

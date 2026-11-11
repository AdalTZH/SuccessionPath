import { Router } from 'express';
import { assertEntity } from '../entities.js';
import { coerceRecord } from '../schemas.js';
import * as repo from '../store.js';
import { HttpError } from '../query.js';

const router = Router();

// Express 4 does not forward rejected promises, so async handlers are wrapped.
const route = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

// Resolves and validates the entity name once per request that carries it.
router.param('entity', (req, res, next, name) => {
  try {
    req.entityName = assertEntity(name);
    next();
  } catch (error) {
    next(error);
  }
});

function parseQuery(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new HttpError(400, 'Malformed query');
  }
}

// --- Collection reads: count / aggregate / distinct come before the /:id route ---

router.get('/:entity/count', route(async (req, res) => {
  res.json({ count: await repo.countRecords(req.entityName, parseQuery(req.query.query)) });
}));

router.get('/:entity/aggregate', route(async (req, res) => {
  const groupBy = req.query.groupBy;
  if (!groupBy) throw new HttpError(400, 'groupBy is required');
  res.json(
    await repo.aggregateRecords(req.entityName, {
      query: parseQuery(req.query.query),
      groupBy,
      sum: parseQuery(req.query.sum),
      avg: parseQuery(req.query.avg),
      min: parseQuery(req.query.min),
      max: parseQuery(req.query.max),
    })
  );
}));

router.get('/:entity/distinct', route(async (req, res) => {
  if (!req.query.field) throw new HttpError(400, 'field is required');
  const items = await repo.distinctValues(req.entityName, req.query.field, parseQuery(req.query.query));
  res.json({ items });
}));

router.get('/:entity', route(async (req, res) => {
  res.json(
    await repo.listRecords(req.entityName, {
      query: parseQuery(req.query.query),
      sort: req.query.sort,
      limit: req.query.limit,
      cursor: req.query.cursor,
    })
  );
}));

// --- Writes ---

router.post('/:entity/bulk', route(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) throw new HttpError(400, 'items is required');
  const prepared = items.map(item => coerceRecord(req.entityName, item));
  res.status(201).json(await repo.bulkCreateRecords(req.entityName, prepared, req.user?.id));
}));

router.post('/:entity/update-many', route(async (req, res) => {
  res.json(await repo.updateManyRecords(req.entityName, req.body?.query || {}, req.body?.update || {}));
}));

router.post('/:entity/bulk-update', route(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) throw new HttpError(400, 'items is required');
  res.json(await repo.bulkUpdateRecords(req.entityName, items));
}));

router.post('/:entity', route(async (req, res) => {
  const record = await repo.createRecord(req.entityName, coerceRecord(req.entityName, req.body || {}), req.user?.id);
  res.status(201).json(record);
}));

router.delete('/:entity', route(async (req, res) => {
  if (req.query.query === undefined) throw new HttpError(400, 'A query is required to delete records');
  const query = parseQuery(req.query.query);
  res.json({ deleted: await repo.deleteManyRecords(req.entityName, query) });
}));

router.get('/:entity/:id', route(async (req, res) => {
  const record = await repo.getRecord(req.entityName, req.params.id);
  if (!record) throw new HttpError(404, 'Record not found');
  res.json(record);
}));

router.put('/:entity/:id', route(async (req, res) => {
  const patch = coerceRecord(req.entityName, req.body || {});
  res.json(await repo.updateRecord(req.entityName, req.params.id, patch));
}));

router.delete('/:entity/:id', route(async (req, res) => {
  const removed = await repo.deleteRecord(req.entityName, req.params.id);
  if (!removed) throw new HttpError(404, 'Record not found');
  res.json({ deleted: 1 });
}));

export default router;
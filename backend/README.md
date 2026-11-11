# SuccessionPath — Backend

Node.js + Express API backed exclusively by **PostgreSQL**, including Amazon Aurora PostgreSQL.
No Base44 dependency: it runs anywhere Node 20+ runs.

```
backend/
  src/
    server.js            Express app, error handling, store bootstrap
    store.js             PostgreSQL store exports
    records-postgres.js  PostgreSQL record store (jsonb)
    recordOps.js         Record shaping, update operators, limits
    db-postgres.js       PostgreSQL pool (TLS, pool size)
    query.js             Query object → PostgreSQL
    entities.js          The entity names the API accepts
    schemas.js           Entity schemas + CSV type coercion
    auth.js              Password hashing, JWT issuing, guards
    sql.js               Small PostgreSQL runner used by accounts + scripts
    csv.js               CSV reader / writer
    routes/
      auth.js            Register, login, me, user administration
      entities.js        Generic REST surface for every table
      assistant.js       AI Career Assistant (chat completions)
    schemas/             The 17 entity schemas, used for type coercion
  scripts/
    import-csv.js        Load the exported CSVs into the database
    export-csv.js        Dump every table back to CSV
    migrate.js           Create tables (Postgres) and report row counts
```

## Run against PostgreSQL / Aurora

1. Create an Aurora PostgreSQL cluster or another PostgreSQL database and obtain its connection URI.
2. In `backend/.env`:

```
DATABASE_URL=postgresql://USER:YOUR-PASSWORD@AURORA-WRITER-ENDPOINT:5432/DATABASE
PGSSL=true
JWT_SECRET=some-long-random-string
```

3. Install, create the tables, load the data, start:

```bash
npm install
npm run migrate        # CREATE TABLE IF NOT EXISTS records / users (+ indexes)
npm run import:csv     # loads ../exports/*.csv, keyed by id so it is safe to re-run
npm start              # http://localhost:4000
```

Tables are created automatically on first start as well, so `npm run migrate` is only needed if you
want to verify before importing. The password in `DATABASE_URL` must be URL-encoded (`@` → `%40`).

The database uses one document table, so no schema migration is needed when a workbook field is
added. Postgres stores each record as `jsonb` (`records.doc`), queried with `->>`; the fields the app
sorts by (`created_date`, `updated_date`) are real indexed columns. A GIN index is created on `doc`
for the containment-style filters; delete it if you prefer to keep the database smaller.

Expected size: 17,104 records. The CSVs are sensitive local-only data and are excluded from Git and
the application image. In a container, mount them separately and pass `--dir /data` to the import
script. `DATABASE_URL` is required; startup fails rather than falling back to a local database.

## Accounts

The first account you register becomes the administrator; everyone after that is a standard user.
There is no password-reset email — an administrator sets a new password:

```
PUT /api/auth/users/:id/password     { "password": "new-password" }
```

Administrators can also list, create and remove accounts:

```
GET    /api/auth/users
POST   /api/auth/users               { "email", "password", "full_name", "role" }
DELETE /api/auth/users/:id
```

## API

All `/api/entities` and `/api/functions` routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/entities/:entity?query=&sort=&limit=&cursor=` | Page of records (`{items, next_cursor, has_more}`) |
| GET | `/api/entities/:entity/count?query=` | Matching record count |
| GET | `/api/entities/:entity/aggregate?query=&groupBy=&sum=&avg=&min=&max=` | Grouped counts and totals |
| GET | `/api/entities/:entity/distinct?field=&query=` | Distinct values for a field |
| GET | `/api/entities/:entity/:id` | One record |
| POST | `/api/entities/:entity` | Create |
| POST | `/api/entities/:entity/bulk` | Create many |
| PUT | `/api/entities/:entity/:id` | Update (merge) |
| POST | `/api/entities/:entity/update-many` | `{query, update: {$set: {...}}}` |
| POST | `/api/entities/:entity/bulk-update` | `{items: [{id, ...}]}` |
| DELETE | `/api/entities/:entity?query=` | Delete many |
| DELETE | `/api/entities/:entity/:id` | Delete one |
| POST | `/api/functions/careerAssistant` | `{question}` → `{answer}` |

`query` is a JSON object using `$in`, `$nin`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`, `$exists`,
`$regex` (substring, case-insensitive) and `$or` / `$and`.

## Deployment

- **Container:** build the root `Dockerfile`; it serves both the compiled frontend and API on port
  `4000`.
- **Aurora:** inject `DATABASE_URL` and `JWT_SECRET` from AWS Secrets Manager. Keep the service and
  Aurora in connected VPC subnets and allow port `5432` between their security groups.
- **Connection count:** set `PG_POOL_MAX` per task so the aggregate stays below Aurora's connection
  limit. Add RDS Proxy if connection churn becomes material.

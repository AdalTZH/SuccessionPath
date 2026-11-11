# SuccessionPath — standalone build

A full copy of the SuccessionPath HR Practitioners Workbench. The
production container serves the React application and Express API from one port and stores all
application data in **PostgreSQL**, including Amazon Aurora PostgreSQL.

```
SuccessionPath/
  Dockerfile    Multi-stage production image (React build + Express runtime)
  frontend/     React 18 + Vite + Tailwind (static build)
  backend/      Node.js 20 + Express (REST API, auth, AI assistant) — PostgreSQL
  exports/      Local-only CSV data, intentionally excluded from Git and container images
```

## Container deployment

Build the image from the repository root:

```bash
docker build -t successionpath .
```

Run it with a PostgreSQL connection string and a long random JWT secret:

```bash
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE" \
  -e PGSSL=true \
  -e PG_POOL_MAX=5 \
  -e JWT_SECRET="REPLACE_WITH_A_LONG_RANDOM_VALUE" \
  successionpath
```

Open `http://localhost:4000`. The frontend and API use the same origin. `DATABASE_URL` and
`JWT_SECRET` are required; the container exits at startup when either is missing.

The CSV exports are intentionally excluded from Git and the image. Mount an approved local copy
read-only when running the one-off import:

```bash
docker run --rm --env-file backend/.env successionpath npm run migrate
docker run --rm --env-file backend/.env \
  --mount type=bind,source="$(pwd)/exports",target=/data,readonly \
  successionpath npm run import:csv -- --dir /data
```

The import is idempotent: records are keyed by `(entity, id)` and replaced rather than duplicated.

## Amazon Aurora PostgreSQL

Use the Aurora cluster writer endpoint in `DATABASE_URL`. For ECS/Fargate or App Runner:

1. Put the application in a VPC that can reach Aurora, and allow the application security group to
   reach the Aurora security group on port 5432.
2. Store `DATABASE_URL` and `JWT_SECRET` in AWS Secrets Manager and inject them into the container.
3. Expose container port `4000` and configure the health check path as `/api/health`.
4. Run `npm run migrate` as a one-off task. Transfer the CSVs through an approved encrypted channel,
   mount or download them only in a controlled import task, then run
   `npm run import:csv -- --dir /data`.
5. Start with `PG_POOL_MAX=5` per task and adjust it so the total across all tasks stays below the
   Aurora connection limit. Use RDS Proxy if connection churn becomes material.

TLS terminates at the load balancer for HTTP traffic. Database TLS remains enabled with
`PGSSL=true`. URL-encode special characters in the database password (`@` becomes `%40`).

## Local development

Create `backend/.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
PGSSL=true
JWT_SECRET=<long random string>
```

```bash
cd backend
npm install
npm run migrate
npm run import:csv
npm start
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

Open the app and register: **the first account created becomes the administrator.** Everyone
after that is a standard user; an administrator can add accounts or reset a password.

## Data

The 16 exported tables (17 CSV files incl. the raw appointment-history extract) carry the full
production content. They are local-only sensitive data and are not committed or baked into the
application image:

| Table | Rows | Table | Rows |
| --- | --- | --- | --- |
| AppointmentHistory | 5,359 | AppointmentHistoryRaw | 5,359 |
| SupervisorAssessment | 2,768 | AppointmentCatalogue | 1,279 |
| AppointmentPathway | 1,279 | DevelopmentPlan | 589 |
| Employee | 347 | Action | 40 |
| AuditRecord | 27 | SuccessionPlan | 20 |
| Skill | 12 | Course | 10 |
| Appointment | 8 | PostingAssignment | 7 |
| Assessment | 0 | CalibrationSession | 0 |

`npm run export:csv` in `backend/` writes the database back out to CSV at any time.

## Feature parity

Every page of the workbench is the same code as the published app (verified file-for-file):

| Tab | Route | Included |
| --- | --- | --- |
| Dashboard | `/` | Workload and trigger counters, grooming counts |
| People | `/people` | Population table, search, filters, HR tags, grooming tiers |
| Person profile | `/people/:employeeId` | Overview, career history, skills, assessments, aspirations, development, succession, eHR data, audit trail |
| Appointments | `/appointments` | Catalogue cards, incumbents, pathway stats, grooming P1/P2, speciality tags, mismatch panel |
| Posting Workbench | `/posting-workbench` | Both matching directions, filter funnel, candidate explainability, overrides, rotation timeline, dropout impact |
| Succession | `/succession` | Succession chains, depth, history-derived candidates |
| Pathways | `/pathways` | Career pathway view, impact/cascade projection |
| Pathway Explorer | `/pathway-explorer` | Individual and appointment-centric history |
| Career Assistant | `/career-assistant` | AI answers over the live records |
| Skills | `/skills` | Skills map |
| Development | `/development` | Development plans and gaps |
| Actions | `/actions` | HR action queue |
| Migration Validation | `/migration-validation` | Data-quality checks |

Deliberately not carried over (they were Base44 platform services, not app logic):
Google sign-in, emailed one-time codes, MFA, hosted email, and live record subscriptions.
Password resets are handled by an administrator.

## PostgreSQL notes

- **Storage:** `records` is a single `jsonb` document table plus indexed date columns, so workbook
  field changes do not require schema migrations. `PG_POOL_MAX` and `PGSSL` control the pool.
- **Scaling:** `backend/src/records-postgres.js` contains the record-store SQL.
- **Same origin:** the production image serves the frontend and API together, so no production
  CORS configuration is required.
- **Secrets:** `DATABASE_URL` and `JWT_SECRET` belong in the platform's secret manager, not git.

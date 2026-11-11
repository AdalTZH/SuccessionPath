# SuccessionPath — standalone frontend

React 18 + Vite + Tailwind. No Base44 dependency: it talks to the Node API in `../backend`
through `src/api/base44Client.js`, which keeps the call style the pages already use.

## Run

```bash
cd frontend
cp .env.example .env      # set VITE_API_URL if the API is not on localhost:4000
npm install
npm run dev               # http://localhost:5173
```

Production build: `npm run build` writes `dist/`. The root Dockerfile copies that build into the
Express image, which serves the frontend and API from the same origin. `VITE_API_URL` is needed only
when intentionally hosting the production frontend and API on different origins.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Posting dashboard — workload, triggers and grooming counters |
| `/people` | Consolidated personnel population |
| `/people/:employeeId` | Individual profile: history, skills, assessments, development, succession |
| `/appointments` | Appointment catalogue with incumbents, grooming tiers and speciality tags |
| `/posting-workbench` | Matching workbench (appointment → candidate and individual → appointment) |
| `/succession` | Succession chains and depth |
| `/pathways` | Career pathway views and impact/cascade projection |
| `/pathway-explorer` | Historical career pathway explorer |
| `/career-assistant` | AI Career Assistant (needs `LLM_API_KEY` on the backend) |
| `/skills`, `/development`, `/actions` | Skills map, development plans, HR action queue |
| `/migration-validation` | Data-quality checks on the imported records |
| `/login`, `/register` | Email + password sign-in |

## What changed from the hosted build

- `@base44/sdk` is replaced by `src/api/base44Client.js` (same `base44.entities` / `base44.auth` /
  `base44.functions` surface, backed by REST).
- Auth is email + password against the local backend. Google sign-in, email OTP and MFA were
  platform features and are not part of this build; an administrator resets passwords.
- `src/lib/AuthContext.jsx` was simplified to the local session.
- Everything else — pages, components, matching and pathway engines, styling — is the same code.

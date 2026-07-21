# Smart Expiry & Pantry Tracker

Full-stack app for tracking groceries, expiry dates, and reducing food waste.

**Live app:** https://smart-pantry-tracker-389.netlify.app — fully working, talking to a real deployed backend + database. Register your own account, or ask whoever set this up for the seeded demo credentials.

- Frontend: Netlify (`smart-pantry-tracker-389`), deployed via CLI (no git connection). Redeploy: `cd frontend && npm run build && npx netlify-cli deploy --prod --dir dist --site 376acdf4-dda7-4a83-bf81-375e0e3a900f`
- Backend: Railway project `smart-pantry-tracker-backend`, service `backend`, at https://backend-production-4a60.up.railway.app. Redeploy: `cd backend && npx @railway/cli up --detach -y --service backend` (CLI must be logged in — `npx @railway/cli login`)
- Database: Railway Postgres (service `Postgres` in the same project), migrated via `npx @railway/cli run --service backend -- npx prisma migrate deploy` (temporarily needs `DATABASE_URL` pointed at `${{Postgres.DATABASE_PUBLIC_URL}}` instead of the internal hostname, since migrations run from a local machine, not from inside Railway's network — see the "Deployment" section)

## Stack

- **Frontend**: React + TypeScript + Vite, Tailwind CSS v4, hand-built shadcn-style UI components (Radix UI primitives), React Router, Axios, React Hook Form + Zod, Framer Motion, Recharts, Sonner (toasts), `@zxing/browser` (barcode scanning).
- **Backend**: Node.js + Express + TypeScript, JWT auth (access + refresh tokens), bcryptjs, Multer, Nodemailer, node-cron.
- **Database**: PostgreSQL via Prisma ORM (pinned to Prisma 6.x, which uses the classic `datasource.url` schema config — Prisma 7 changed this to a driver-adapter model).

## What's implemented (MVP core + "reduce friction" features)

- Registration, login, logout, JWT + refresh token rotation, email verification, forgot/reset password, profile & settings management.
- Full pantry CRUD: create/edit/delete/duplicate/archive/restore, image upload with live preview, search/filter/sort/pagination.
- **Smart expiry estimation**: a built-in shelf-life knowledge base (milk, eggs, chicken, produce, pantry staples, etc.) auto-suggests an expiry date as you type an item name — editable, never overrides a date you set yourself.
- Color-coded expiry system (Fresh / Soon / Urgent / Expired) computed server-side.
- **Low-friction entry**: barcode camera scanning (one-click quick-add — no form — using the shelf-life estimate and, if configured, the barcode lookup's product photo), voice quick-add ("add two cartons of milk" via the Web Speech API, no key needed), and a receipt-scan review screen with per-line quick-add or bulk import.
- **AI Assistant**: a floating chat panel (every authenticated page) with proactive insights — expiry warnings, monthly waste summary, most-wasted-item pattern, predictive restock ("you usually buy milk every ~8 days"), spending trend, recipe nudges — each with a one-click "Add to shopping list" where relevant, plus free-text Q&A (upgrades to OpenAI if `OPENAI_API_KEY` is set; sensible canned answers otherwise).
- **Pantry Score**: gamified 0–100 freshness score shown on the dashboard.
- Dashboard leads with "N foods expiring this week — here's what to cook" (recipe suggestions prioritized by soonest-expiring ingredient) instead of raw inventory counts.
- Recipe suggestions work with **zero API keys** via a small built-in recipe matcher; automatically upgrades to OpenAI or Spoonacular if configured.
- "Where to buy" deep links (Instacart/Walmart/Amazon search pages) on assistant suggestions and shopping list items — a convenience search link, not a real ordering/cart integration.
- Analytics charts (categories, storage usage, monthly waste vs. savings, spending, waste-reduction trend, most purchased, expiry trends).
- Shopping lists: create/rename/delete, add/edit/remove items, mark purchased, auto-add expired pantry items, shareable read-only link, print (browser print).
- Calendar view of expiry dates.
- Notifications: in-app + daily/weekly email digests via cron (`node-cron`).
- Settings: theme (now actually syncs from your account on login/reload, not just a local cache), language, timezone, currency, measurement units, notification preferences.

## What needs API keys to activate (built, but gated behind config)

These endpoints are fully wired up — they just return `501 Not Implemented` with a clear message until you add the relevant key to `backend/.env`:

| Feature | Env var | Endpoint |
|---|---|---|
| AI recipe suggestions (smarter than the built-in matcher) | `OPENAI_API_KEY` or `SPOONACULAR_API_KEY` | `POST /api/integrations/recipes/suggest`, `GET /api/integrations/recipes/from-pantry` |
| Assistant free-form chat (smarter than the canned replies) | `OPENAI_API_KEY` | `POST /api/assistant/ask` |
| Barcode product lookup (name/brand/photo from a scanned code) | `BARCODE_LOOKUP_API_KEY` | `GET /api/integrations/barcode/:code` |
| Receipt OCR scanning | `GOOGLE_VISION_API_KEY` | `POST /api/integrations/receipts/scan` |
| Product image hosting | `CLOUDINARY_*` | Falls back to local disk (`/uploads`) until set — see `backend/src/middleware/upload.middleware.ts` |

Email (verification, password reset, reminders) requires `SMTP_USER`/`SMTP_PASSWORD` in `backend/.env`; without it, emails are skipped and logged to the console instead of failing.

## Getting started

### 1. Database

You need a PostgreSQL database. Easiest options:
- Install PostgreSQL locally, or
- Create a free instance at [Neon](https://neon.tech) and copy its connection string.

### 2. Backend

```
cd backend
copy .env.example .env      # then edit DATABASE_URL and any API keys you have
npm install
npm run prisma:migrate      # creates tables
npm run prisma:seed         # optional: seeds a demo user (demo@pantrytracker.app / Password123!)
npm run dev                 # starts API on http://localhost:4000
```

### 3. Frontend

```
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173, proxies /api and /uploads to the backend
```

Open http://localhost:5173 and register an account (or log in with the seeded demo user).

## Deployment (already live — here's how it's wired up)

**Frontend → Netlify** (`smart-pantry-tracker-389`). Redeploy after changes:
```
cd frontend
npm run build
npx netlify-cli deploy --prod --dir dist --site 376acdf4-dda7-4a83-bf81-375e0e3a900f
```
`frontend/.env.production` sets `VITE_API_URL=https://backend-production-4a60.up.railway.app`, baked into the build at build time (Vite env vars aren't runtime-configurable) — update that file and rebuild if the backend URL ever changes.

**Backend → Railway** (project `smart-pantry-tracker-backend`, service `backend`). Redeploy:
```
cd backend
npx @railway/cli up --detach -y --service backend
```
Why Railway and not Netlify: this backend needs a persistent Node process (`node-cron` for the daily/weekly email reminders — a serverless function has no persistent process for a cron job to live in) and writes uploaded images to local disk (ephemeral on most serverless platforms; swap in Cloudinary, already stubbed, if this ever moves to one). Railway's env vars for the `backend` service: `NODE_ENV=production`, `DATABASE_URL=${{Postgres.DATABASE_URL}}` (internal network reference), `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (freshly generated, not the local dev ones), `CLIENT_URL` (the Netlify URL, for CORS), `APP_URL` (the Railway domain). No SMTP/API keys are set in production yet — same fallback behavior as local dev (emails skipped/logged, AI features degrade to their zero-key fallbacks).

**Database → Railway Postgres** (service `Postgres`, same project, persistent volume). To run migrations against it from a local machine (not from inside Railway's network), the internal hostname (`postgres.railway.internal`) isn't reachable — temporarily point the backend service's `DATABASE_URL` at the public one first:
```
cd backend
npx @railway/cli variables --service backend --set "DATABASE_URL=${{Postgres.DATABASE_PUBLIC_URL}}" --skip-deploys
npx @railway/cli run --service backend -- npx prisma migrate deploy
npx @railway/cli variables --service backend --set "DATABASE_URL=${{Postgres.DATABASE_URL}}" --skip-deploys
```
`--skip-deploys` matters here — without it, each variable change restarts the live backend.

**Cross-origin cookie gotcha (already fixed, worth knowing about):** the frontend and backend are on different domains, so the refresh-token cookie is cross-site. `SameSite=Lax` (fine for same-origin local dev, where Vite's proxy makes it look same-origin) is **not sent on cross-site fetch/XHR at all** — only on top-level navigations. `backend/src/modules/auth/auth.controller.ts` uses `SameSite=None; Secure` in production instead. If auth seems to silently fail to persist after a deploy, check this first.

**Watch out for this Railway CLI footgun:** `railway up` deploys to whatever service is currently *linked* to the local directory — if only one service exists (e.g. just added a Postgres database), it'll deploy your app code onto that database service and can take it offline. Always run `railway status` to confirm which service is linked before `railway up`, and use `railway add --service <name>` to create a distinct empty service first.

There's no git repository for this project, so nothing here is connected to GitHub/continuous deployment — every deploy above is a manual CLI push.

## Project structure

```
backend/
  prisma/schema.prisma       # User, PantryItem, ShoppingList, Notification, DispositionLog, etc.
  src/modules/                # one folder per feature: auth, users, pantry, dashboard,
                               # analytics, shopping-list, notifications, integrations, assistant
  src/lib/                    # prisma client, jwt, mailer, expiry-status logic, shelf-life estimator
frontend/
  src/pages/                  # one file per route
  src/components/ui/          # hand-built shadcn-style primitives
  src/components/pantry/      # item card, add/edit dialog, barcode/receipt scan dialogs, voice add
  src/components/assistant/   # AI assistant panel + insight cards
  src/lib/api/                # thin typed wrappers around each backend module
  src/lib/env.ts              # VITE_API_URL / resolveBackendUrl for deployed environments
  src/context/                # AuthContext, ThemeContext
```

## Not yet built (future work per the original spec)

Household/multi-user shared pantry (would need a schema + permissions rework), real grocery
delivery/ordering integration (needs official retailer partner APIs — the "where to buy" links are a
practical substitute), admin panel, PWA/offline support, React Native app, IoT/smart-fridge integration,
i18n, CSV/PDF export, Google Calendar sync, 2FA.


demo@pantrytracker.app 
Password123!
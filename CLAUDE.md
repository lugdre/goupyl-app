# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Goupyl Sport — a B2B/B2C platform connecting sport & wellness professionals (INTERVENANT) with individual clients and companies. Companies (ENTREPRISE) buy per-collaborator subscriptions; their employees (CLIENT with `employerCompanyId`) book sessions covered by the plan; independent clients (CLIENT without employer) pay per session via Stripe.

Full-stack monorepo, no shared workspace tooling — two independent npm projects:
- `backend/` — Express 5 REST API (CommonJS), Prisma + PostgreSQL, Redis, Stripe, Resend
- `frontend/` — React 19 SPA (ESM), Vite 8, Tailwind CSS v4, axios, react-router v7

## Running the project

Both services run simultaneously in separate terminals.

```bash
cd backend && npm run dev     # nodemon, port 3000
cd frontend && npm run dev    # Vite, port 5173
```

The Vite dev server proxies `/api` and `/uploads` → `localhost:3000` (see `frontend/vite.config.js`), so no CORS config is needed in development.

## Commands

All Prisma commands need the explicit schema path (non-standard location `src/prisma/schema.prisma`; also set via the `prisma.schema` key in `backend/package.json`):

```bash
# backend/
npm run db:generate   # regenerate Prisma client after schema changes
npm run db:seed       # ⚠️ DESTRUCTIVE: truncates every table, reseeds demo data
npm run db:studio     # Prisma Studio GUI
npm run test          # jest --verbose
npm run lint          # eslint src/
npx jest tests/unit/auth.test.js --verbose   # single test file

# frontend/
npm run build         # vite build → dist/
npm run lint          # eslint
```

**Local schema sync — do not rely on migrations.** The committed migrations in `src/prisma/migrations/` lag behind `schema.prisma`. Push the schema directly instead of `prisma migrate dev`:

```bash
cd backend && npx prisma db push --schema=src/prisma/schema.prisma
```

Tests: `backend/tests/unit/` mocks `../../src/config/database` and `../../src/config/redis` via `jest.mock`; `backend/tests/integration/` needs a real DB.

## Environment variables

`backend/.env` (local dev):

```
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/goupyl_sport"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="..."                # read by config/jwt.js
JWT_REFRESH_SECRET="..."
JWT_ACCESS_SECRET="..."         # read by utils/encryption.js — keep in sync with JWT_SECRET
PARQ_ENCRYPTION_KEY="..."       # AES key for PARQ answers at rest (falls back to JWT_ACCESS_SECRET, then JWT_SECRET)
CORS_ORIGIN="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"   # used in Stripe redirect URLs and email links
RESEND_API_KEY="re_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
PASSKEY_RP_ID="localhost"
PASSKEY_ORIGIN="http://localhost:5173"
```

`frontend/.env` (**committed to git**, unusual): `VITE_STRIPE_PUBLISHABLE_KEY` — baked into the bundle at build time (`import.meta.env`).

**Graceful-degradation trap (has caused production 500s):** several configs degrade silently instead of failing at boot, so a missing var only surfaces at runtime:
- missing `REDIS_URL` → `config/redis.js` falls back to an in-process `MemoryStore` → all refresh tokens/sessions lost on every restart
- missing `RESEND_API_KEY` → `config/email.js` becomes a no-op, emails silently disabled
- missing `PARQ_ENCRYPTION_KEY` **and** both JWT fallbacks → PARQ submit throws 500
- missing `STRIPE_SECRET_KEY` → `getStripe()` is lazy; payment endpoints throw on first use, nothing at boot

## Deployment

Production is split across two hosts:

- **Frontend → Netlify.** `frontend/netlify.toml`: build `npm run build`, publish `dist/`; proxies `/api/*` and `/uploads/*` server-side to the Render backend (`https://goupyl-app.onrender.com`) with `status = 200` rewrites, SPA-fallback everything else to `index.html`. The browser always calls same-origin `/api` — no CORS in prod either.
- **Backend → Render** (Web Service, free tier: sleeps on idle, Start Command re-runs on every wake). Env vars come from the Render dashboard, not a `.env` file.

**Render command discipline (has wiped production data):** never put `npm run db:seed`, `prisma migrate reset`, or `prisma db push --accept-data-loss` in the Start Command — `seed.js` truncates every table and the Start Command re-runs on every wake-from-sleep. Correct setup:
- Build: `npm install && npx prisma generate --schema=src/prisma/schema.prisma && npx prisma db push --schema=src/prisma/schema.prisma`
- Start: `npm start` (only)

`server.js` eagerly connects Prisma (fatal on failure) and Redis (non-fatal, warns) before `app.listen` to avoid cold-start 504s on the first request.

To diagnose production 500s: the errorHandler hides messages behind `Erreur interne.` outside development — read the Render logs for the `Erreur:` line with the real stack trace.

## Backend architecture

### Layered request flow

```
app.js (helmet → cors → morgan → rateLimit) → routes/index.js (mounts under /api)
  → route file → authenticate (JWT) → authorize(...roles) → validate (Zod)
  → controller (thin try/catch, calls service) → service (business logic: Prisma + Redis + Stripe)
```

Every domain follows the same file triple: `routes/X.routes.js` + `controllers/X.controller.js` + `services/X.service.js`, plus `validators/X.validator.js` (Zod schemas). 16 domains mounted in `routes/index.js`: auth, users, services, appointments, subscriptions, session-reports, documents, companies, payments, analytics, reviews, coach-services, passkeys, notifications, parq, products.

Key cross-cutting files:
- `src/app.js` — global rate limit 100/min; stricter 10/min on `/api/auth/login` and `/api/auth/register`; `express.raw` mounted on `/api/payments/webhook` **before** `express.json` (Stripe signature needs the raw body); serves `/uploads/avatars` statically; `trust proxy 1`
- `src/utils/apiError.js` — `ApiError` with static helpers (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`); `isOperational` errors get their real message, everything else → 500
- `src/middlewares/errorHandler.middleware.js` — maps `ApiError`, Prisma `P2002`→409 / `P2025`→404, JWT errors→401
- `src/middlewares/validate.middleware.js` — **Zod 4**: reads `error.issues` (not the Zod-3 `error.errors`); returns `400 VALIDATION_ERROR` with joined messages
- `src/middlewares/auth.middleware.js` — sets `req.user = { userId, role }` from the Bearer token
- `src/config/jwt.js` — access token 15 min (`JWT_SECRET`, fallback `JWT_ACCESS_SECRET`), refresh token 7 days (`JWT_REFRESH_SECRET`, stored in Redis under `refresh_token:<userId>`)
- `server.js` also runs a **PENDING-expiry sweep** (boot + every 10 min, skipped when `NODE_ENV==='test'`): PENDING appointments older than 24 h or past their `scheduledAt` are CANCELLED with `cancelledBy:'system'`; busy/overlap queries additionally ignore stale PENDINGs before the sweep runs
- `src/utils/encryption.js` — AES-256-GCM envelope (`iv:authTag:ciphertext` base64) for PARQ answers; key derived via scrypt from `PARQ_ENCRYPTION_KEY` → `JWT_ACCESS_SECRET` → `JWT_SECRET`

Backend is **CommonJS** (`require`/`module.exports`).

### Data model (Prisma, 17 models)

`User` is the hub — one table for all four roles, self-relation `employerCompany`/`employees` links salaried CLIENTs to their ENTREPRISE. Key fields: `verificationStatus` (PENDING/VERIFIED/REJECTED), `joinCode` (unique per company, employees register with it), `stripeAccountId`/`stripeAccountStatus` (Connect, intervenants).

- `Profile` — 1:1 with User; coach data (bio, specialties/diplomas as Json, hourlyRate, city, courseLocations…) and client data (level, objectives)
- `Service` — **legacy** platform-defined B2B offerings (`availableInPlans` gating); no longer part of the booking UX — all bookings go through CoachService, coverage is quota-based
- `CoachService` — coach-defined offerings, the **single booking channel** for everyone; `sessionType` SOLO/DUO/GROUP + `maxParticipants`; soft-delete via `active`
- `Appointment` — points to **either** `serviceId` (B2B) **or** `coachServiceId` (B2C), both nullable; status PENDING→CONFIRMED→DONE/CANCELLED; `paymentStatus` string ('unpaid'/'paid'/'refunded'); `coveredByCompany` (set at booking, drives the payment gate and quota), `qrToken` (unique, generated at creation), `validatedByQr`, `attendanceStatus` (PRESENT/ABSENT), `disputeStatus` (OPEN/REJECTED/RESOLVED_CLIENT) + `disputeReason/disputedAt/disputeResolvedAt`
- `AppointmentStatusHistory` — audit log of every status transition (`changedBy`: client/intervenant/admin/system); written fire-and-forget, no UI
- `Product` / `ProductOrder` — marketplace produits (dropshipping-lite): admin-managed catalog (soft-delete via `active`), orders paid by one-shot Stripe Checkout (platform sale, **not** Connect), `metadata.type='product_order'` distinguishes them in the shared webhook
- `Payment` — 1:1 with Appointment; cents; `platformFee` + `intervenantShare`; refund fields
- `Subscription` — ENTREPRISE plans (`ESSENTIEL_ENTREPRISE`/`BOOST_ENTREPRISE`/`ULTRA_ENTREPRISE`), MONTHLY/YEARLY
- `Review` — 1:1 with Appointment; `coachReply` editable max 3 times (`coachReplyEdits`)
- `SessionReport` — 1:1 with Appointment, written by the intervenant
- `Document` — verification uploads (identity/diploma) with admin status
- `CompanyInvite` — tokenized email invites to join a company
- `Passkey`, `Notification`, `PARQQuestionnaire`

**Dual service type rule:** anywhere an appointment's service is displayed or serialized, use null-safe fallback `appt.coachService?.name || appt.service?.name`.

### Booking & scheduling

No availability model — scheduling works on **busy intervals + business hours**:
- `GET /api/appointments/busy/:intervenantId` (public) returns `{start,end}` intervals for PENDING/CONFIRMED appointments; the frontend `SlotPicker` renders a Doctolib-style week grid between **07:00 and 21:00** and greys out overlaps (optionally also the client's own busy slots via `/appointments/me/busy-slots`)
- `appointment.service.create` re-validates server-side: business hours 7h–21h, overlap detection for both intervenant and client, service belongs to the intervenant, and for B2B services that the employee's company plan includes the service (`availableInPlans`)
- Status transitions are whitelisted (`PENDING→CONFIRMED|CANCELLED`, `CONFIRMED→DONE|CANCELLED`); CLIENT cancellations are **rejected on the generic `PATCH /:id/status`** (403 `USE_CANCEL_ENDPOINT`) — they must go through `POST /:id/cancel` which applies the refund policy
- **Single booking channel + company coverage:** everyone (particulier AND salarié) books the coach's own `CoachService`. At creation, if the client is an employee whose employer has an active subscription and remaining monthly quota (`PLAN_LIMITS.maxSessions` = sessions **per collaborator per calendar month of the session date**: Essentiel 4 / Boost 8 / Ultra 16), the appointment is created with `coveredByCompany: true` (no payment needed); otherwise it is simply payable — **no blocking, no separate flow**. Disputes resolved in the client's favour restore quota (mind the **Prisma `not`-excludes-NULL trap**: dispute filters use `OR: [{disputeStatus: null}, {disputeStatus: {not: 'RESOLVED_CLIENT'}}]`). The legacy platform-`serviceId` path (plan gating via `availableInPlans`, hard 403 `QUOTA_EXHAUSTED`) still exists server-side but is no longer used by the frontend
- **Payment gate:** CONFIRMED→DONE requires `paymentStatus === 'paid'` unless `appointment.coveredByCompany` (NOT the client's employee status — a salarié over quota booking personally must pay)
- **QR validation:** every appointment gets a `qrToken` (uuid) at creation; the client shows it (`QrCodeModal`) and the coach validates via `POST /appointments/validate-qr` with the full uuid (camera scan, `html5-qrcode`) or the first-8-chars short code → DONE + `attendanceStatus: PRESENT` + `validatedByQr`, same payment gate as manual DONE (manual "Terminer" still works)
- **Absence & disputes:** coach can `POST /:id/absent` on a CONFIRMED session whose start time passed (no payment gate — deliberate) → DONE + ABSENT, client notified; client can `POST /:id/dispute` (reason 10–500 chars) → `disputeStatus: OPEN`, all admins notified, the coach's earnings for that session are **frozen** (excluded from `/payments/earnings` totals as `frozen`/`totalFrozen`); admin resolves via `PATCH /:id/dispute` (`REJECTED` unfreezes; `RESOLVED_CLIENT` full Stripe refund with `reverse_transfer` + `refund_application_fee`, sets `paymentStatus: 'refunded'`). Admin UI: `/dashboard/admin/disputes`
- **Degressive cancellation policy** (client, `POST /:id/cancel`): ≥ 7 days → 100% refund; 48 h–7 d → 50% refund (Stripe `reverse_transfer`+`refund_application_fee` reclaim coach/platform shares pro-rata → coach keeps 35%, platform 15%); < 48 h → cancellation **allowed**, zero refund. Full refund also sets `paymentStatus: 'refunded'`. Constants at top of `appointment.service.js`; tiers mirrored in `CancellationModal`

### Payments (Stripe, two distinct flows)

1. **ENTREPRISE subscriptions** — one-shot Checkout Session (`mode: 'payment'`, not Stripe subscriptions). Priced **per collaborator/month**: Essentiel 5 400 cents, Boost 12 200 cents; YEARLY = monthly −20% × 12; `quantity` = attached collaborators (min 1). `ULTRA_ENTREPRISE` is sur devis — no online checkout. Activation happens twice-redundantly: via the webhook `checkout.session.completed` **and** via `GET /payments/verify-session` on the success redirect.
2. **B2C sessions** — Stripe **Connect**: intervenants onboard via account links (`/payments/onboard`, status polled at `/payments/onboard/status`); clients pay a confirmed appointment via PaymentIntent (`/payments/create-intent`) with `application_fee_amount` = **30% platform fee** and `transfer_data.destination` = the coach's account. Card + Klarna. Pending PaymentIntents are reused (React StrictMode double-invoke guard). Success recorded via webhook `payment_intent.succeeded` **and** `POST /payments/confirm` fallback called by the frontend after `stripe.confirmPayment()` — both paths go through the shared idempotent `markAppointmentPaid` helper (single `PAYMENT_RECEIVED` notification to the coach).
3. **Marketplace produits** — one-shot Checkout Session per `ProductOrder` (platform sale, no Connect). Fulfilment is idempotent (`updateMany` PENDING→PAID) via the shared `checkout.session.completed` webhook (branch on `metadata.type === 'product_order'`) **and** `GET /products/orders/verify` on the success redirect.

`GET /payments/earnings` aggregates an intervenant's paid (DONE) vs pending (paid but not DONE) vs **frozen** (open dispute) totals.

### Auth

- Register: role CLIENT/INTERVENANT/ENTREPRISE. ENTREPRISE gets an auto-generated unique 8-hex `joinCode` and is auto-VERIFIED when a SIRET is provided (Pappers validation planned, not implemented). CLIENT may pass a `joinCode` — either a `CompanyInvite` token or a company's permanent code — to be attached as employee. CLIENT may also pass optional onboarding-questionnaire fields (`level`, `sportType`, `objectives[]`) which nested-create the `Profile` (Register.jsx step 2 for Particulier/Collaborateur, skippable). INTERVENANT starts PENDING until admin validates documents.
- Login returns `{ user, accessToken, refreshToken }`; refresh token stored in Redis (7-day TTL). Email verification token (`email_verify:<token>`, 24 h) sent via Resend; `POST /auth/verify-email` sets `emailVerifiedAt`.
- **Passkeys/WebAuthn** (`/api/passkeys`, `@simplewebauthn/server`): challenges in Redis (5 min TTL, keys `passkey_challenge:<scope>:<id>`); authentication returns the same JWT pair as password login. `PASSKEY_RP_ID`/`PASSKEY_ORIGIN` must match the serving domain.
- Redis `set` failures during login/register are caught and logged — a Redis hiccup must not fail an otherwise successful auth.

### PARQ questionnaire (medical readiness)

CLIENT-only, gates the booking flow. Routes `/api/parq`: `submit`, `status`, `me`. Seven boolean answers **encrypted at rest** (see encryption above) — never returned in plaintext to anyone but the owner. One record per user (resubmit overwrites, resets `coachCleared`), 1-year expiry. `GET /parq/status` returns `canBook`: false if missing/expired or `hasRisk && !coachCleared`.

### Companies (B2B)

ENTREPRISE manages employees at `/api/companies`: list/remove employees, permanent `joinCode` (regenerable), tokenized email invites (7-day expiry, Resend), usage stats (`PLAN_LIMITS` in `company.service.js` — `maxSessions` is a **per-collaborator monthly quota**, enforced at booking), per-employee stats, and `GET /companies/employees/usage` (per-employee covered/total counts, feeds the client-side CSV export in `utils/exportCsv.js` — BOM + `;` separator for Excel FR). Employees see their employer plan + quota counter at `/dashboard/client/employer-plan` and `GET /companies/my-quota`.

### Documents & verification

INTERVENANTs upload identity + diplomas (`POST /api/documents/upload`, multer → `backend/uploads/documents/`, UUID filenames, 5 MB, PDF/JPG/PNG). Admin reviews in `ManageVerifications` (inline blob preview via ADMIN-only `GET /api/documents/:id/file`), then `PATCH /api/users/:id/verify` sets `verificationStatus` + note. `DashboardLayout` shows a `VerificationBanner` for non-VERIFIED intervenants linking to the profile page (documents section lives inside the intervenant profile).

## Frontend architecture

### Routing & guards

```
main.jsx → App.jsx: ThemeProvider > BrowserRouter > AuthProvider > Toaster + Routes
  ProtectedRoute (isAuthenticated, Spinner while loading)
    RoleRoute (user.role whitelist)
      DashboardLayout (Navbar + VerificationBanner + Sidebar + <Outlet/>)
```

Public routes: `/`, `/login`, `/register`, `/search`, `/coaches/:id`, `/verify-email`, `/cgu`, `/confidentialite`. `/dashboard` redirects by role via `DashboardRedirect`:
- CLIENT → `/dashboard/client` (appointments, search, book/:intervenantId, employer-plan, marketplace=Boutique produits, profile; legacy `services` path redirects to search)
- INTERVENANT → `/dashboard/intervenant` (agenda incl. QR scanner + "Client absent", reviews, services=CoachService management, payments=Stripe onboarding+earnings merged, profile=identity+expertise+documents; legacy `earnings`/`documents` paths redirect)
- ENTREPRISE → `/dashboard/entreprise` (employees incl. export CSV, search, subscription, analytics, profile)
- ADMIN → `/dashboard/admin` (users, verifications, disputes, products)

Sidebar menus per role live in `components/layout/Sidebar.jsx`.

### Auth state & axios

`AuthContext` holds `user` (+ helpers `isClient`, `isIntervenant`, …) persisted in localStorage along with both tokens. The axios instance `services/api.js` (`baseURL: '/api'`):
- request interceptor adds the Bearer token, drops Content-Type for FormData
- response interceptor: on 401, transparently refreshes the access token (queueing concurrent 401s) and retries. **Auth routes `/auth/login|register|refresh` are excluded** — a 401 there means bad credentials and must surface. On refresh failure: clear storage + hard redirect to `/login`.

Each backend domain has a matching thin API module in `src/services/*.api.js`.

### Conventions & gotchas

- Shared label maps in `src/utils/constants.js`: `CATEGORY_LABELS`, `STATUS_LABELS`, `PLAN_LABELS`, `BILLING_CYCLE_LABELS`, `LEVEL_LABELS`, `DAY_LABELS` (index 0 = Lundi), `ATTENDANCE_LABELS`, `DISPUTE_STATUS_LABELS`, `ORDER_STATUS_LABELS`, `COURSE_LOCATION_OPTIONS` (values must stay byte-identical — the search filter does an exact `courseLocations: { has }` match)
- `reviewApi.getForIntervenant()` returns `{ reviews, averageRating, reviewCount, totalSessions }` — destructure, it is not an array
- UI primitives in `src/components/ui/` (`Button`, `Card`, `Input`, `Badge`, `Spinner`, `AvatarFallback`); `cn.js` for class merging
- Public pages (Landing, Login, Register, CoachPublicProfile) use their own inline `<style>` CSS with an editorial design system (Archivo Narrow / Inter Tight / JetBrains Mono) — they do not use the dashboard Tailwind components
- `ThemeContext` is currently **hard-pinned to light mode** (toggle is a no-op); Landing uses Tailwind `dark:` variants driven by `prefers-color-scheme` independently
- `OnboardingChecklist` (per-role setup steps on each dashboard) auto-hides only when every step is `done` and **cannot be dismissed manually**
- Booking UI: `BookAppointment.jsx` = pick a CoachService card (same channel for everyone) → `SlotPicker` week grid → PARQ gate (`PARQModal`) → create appointment; payment happens later from `MyAppointments` via `PaymentModal` (Stripe Elements) once the coach confirmed. For salariés, a banner + `willBeCovered` (from `GET /companies/my-quota`) previews whether the session will be company-covered; the server decides at creation and the success toast reflects `coveredByCompany`
- Dead files (not routed, do not extend): `pages/client/Profile.jsx`, `pages/client/MySubscription.jsx`

## Seed data

`npm run db:seed` (⚠️ wipes all tables first) creates users with password `Password1!`:
- `admin@goupylsport.fr` — ADMIN
- `marc.leroy@email.com`, `sophie.martin@email.com`, `julien.blanc@email.com` (+ others) — INTERVENANT
- `marvin.dupont@email.com`, `sarah.benali@email.com` (+ others) — CLIENT
- `rh@acmecorp.fr` (ESSENTIEL), `wellness@techstart.fr` (BOOST), `sport@industria.fr` (ULTRA) — ENTREPRISE

The seed also creates CoachServices for the 3 named coaches (B2C flow demoable), `courseLocations` on several coach profiles (search filter demoable), 5 marketplace products, and `qrToken`s on CONFIRMED appointments.

When changing the seed cleanup order: `payment`, `review`, and `appointmentStatusHistory` must be deleted before `appointment`; `productOrder` before `product` (FK constraints).

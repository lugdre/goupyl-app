# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Goupyl Sport — a platform connecting sport/wellness professionals (intervenants) with clients. Full-stack monorepo: `backend/` (Node.js API) + `frontend/` (React SPA).

## Running the project

Both services must run simultaneously in separate terminals.

**Backend** (port 3000):
```bash
cd backend
npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend
npm run dev
```

The Vite dev server proxies `/api` → `localhost:3000`, so no CORS config is needed during development.

## Backend commands

All Prisma commands require the explicit schema path because it is in a non-standard location (`src/prisma/schema.prisma`):

```bash
npm run db:migrate    # npx prisma migrate dev --schema=src/prisma/schema.prisma
npm run db:seed       # node src/prisma/seed.js
npm run db:generate   # regenerate Prisma client after schema changes
npm run db:studio     # open Prisma Studio GUI
npm run test          # jest --verbose (all tests)
npm run lint          # eslint src/
```

Run a single test file:
```bash
cd backend && npx jest tests/unit/auth.test.js --verbose
```

## Environment variables

Required in `backend/.env`:

```
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/goupyl_sport"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
FRONTEND_URL="http://localhost:5173"
RESEND_API_KEY="re_..."        # transactional emails via Resend
STRIPE_SECRET_KEY="sk_test_..." # ENTREPRISE subscriptions + appointment payments
```

## Infrastructure requirements

- **PostgreSQL**: local database `goupyl_sport`. For macOS with Homebrew, use the current OS user (superuser) to avoid permission issues: `DATABASE_URL="postgresql://YOUR_MACOS_USERNAME@localhost:5432/goupyl_sport"`. Create with `createdb goupyl_sport`.
- **Redis**: `brew install redis && brew services start redis`. Default URL: `redis://localhost:6379`. Stores refresh tokens (7-day TTL) and session challenge data for passkeys.

## Architecture

### Backend — layered request flow

```
HTTP Request → app.js (helmet/cors/rateLimit) → routes/index.js
  → route file → validate.middleware (Zod) → auth.middleware (JWT) → role.middleware (RBAC)
  → controller (thin, calls service) → service (business logic, Prisma + Redis)
  → Prisma ORM → PostgreSQL
```

Key files:
- `src/app.js` — Express setup, global rate limiter (100/min), auth limiter (10/min on login/register)
- `src/routes/index.js` — mounts all routers under `/api`
- `src/utils/apiError.js` — `ApiError` class with static helpers (`unauthorized`, `notFound`, etc.)
- `src/middlewares/errorHandler.middleware.js` — catches `ApiError`, Prisma `P2002`/`P2025`, JWT errors
- `src/config/jwt.js` — access tokens (15 min) + refresh tokens (7 days stored in Redis)

Backend uses **CommonJS** (`require`/`module.exports`).

### Tests

Tests live in `backend/tests/unit/` (Prisma + Redis mocked via `jest.mock`) and `backend/tests/integration/` (real DB required). Unit tests mock `../../src/config/database` and `../../src/config/redis` directly.

### Frontend — component and routing structure

```
main.jsx → App.jsx (BrowserRouter + AuthProvider + Toaster)
  → ProtectedRoute (checks isAuthenticated)
    → RoleRoute (checks user.role)
      → DashboardLayout (Navbar + VerificationBanner + Sidebar + <Outlet />)
        → page components
```

Auth state lives in `AuthContext` (localStorage for tokens + user object). The Axios instance in `src/services/api.js` auto-adds the Bearer token and auto-refreshes on 401 responses.

Frontend uses **ESM** (`import`/`export`), React 19, Tailwind CSS v4 (loaded via `@tailwindcss/vite` plugin — no PostCSS config needed).

UI primitives: `Button`, `Card`, `Input`, `Badge`, `Spinner` in `src/components/ui/`. Shared label maps in `src/utils/constants.js` (`CATEGORY_LABELS`, `STATUS_LABELS`, `LEVEL_LABELS`, `DAY_LABELS`, etc.).

Each backend domain has a matching frontend API service (e.g. `coachService.service.js` ↔ `coachService.api.js`). Public pages are in `src/pages/public/`, role-scoped pages in `src/pages/client/`, `src/pages/intervenant/`, `src/pages/entreprise/`, `src/pages/admin/`.

### RBAC roles

Four roles with distinct dashboard paths:
- `CLIENT` → `/dashboard/client`
- `INTERVENANT` → `/dashboard/intervenant`
- `ENTREPRISE` → `/dashboard/entreprise`
- `ADMIN` → `/dashboard/admin`

`/dashboard` redirects to the role-appropriate path via `DashboardRedirect` in `App.jsx`.

### Dual appointment service type

Appointments can reference either a B2B `Service` (platform-defined, `serviceId`) or a B2C `CoachService` (coach-defined, `coachServiceId`). Both fields are nullable — always use null-safe access: `appt.coachService?.name || appt.service?.name`. This applies everywhere an appointment's service name is displayed (frontend) or serialized (backend).

`CoachService` has a `sessionType` enum (`SOLO` / `DUO` / `GROUP`) and optional `maxParticipants`.

### Payment (Stripe)

Two payment flows both use Stripe:
1. **ENTREPRISE subscriptions** — Stripe Checkout sessions (`/api/payments/checkout`). Billed **per collaborator / month**: `ESSENTIEL_ENTREPRISE` 54€/collab/mo (5400 cents), `BOOST_ENTREPRISE` 122€/collab/mo (12200 cents); `ULTRA_ENTREPRISE` is **sur devis** (no online checkout — routes to `/#demo`). YEARLY = monthly rate −20% × 12. Stripe `quantity` = number of attached collaborators (min 1). Webhook at `/api/payments/webhook` activates subscriptions.
2. **Appointment payments** — PaymentIntent with platform fee split between platform and intervenant (`Payment` model stores `platformFee` + `intervenantShare`).

### Resource access tiers

`Resource` model has `access` enum (`ESSENTIEL` / `BOOST` / `ULTRA`) matching the ENTREPRISE subscription plans (`ESSENTIEL_ENTREPRISE` / `BOOST_ENTREPRISE` / `ULTRA_ENTREPRISE`). Access is cumulative (Boost sees Essentiel+Boost; Ultra sees all) and gates content visibility by the client's company subscription tier.

### Passkey / WebAuthn

Routes at `/api/passkeys`. Uses `@simplewebauthn/server`. Registration challenge stored in Redis (short TTL). Passkey authentication returns same JWT token pair as password login; handled by `loginWithPasskey` in `AuthContext`.

### Document upload & verification flow

INTERVENANTs must upload identity + diplomas before their account is activated:
1. After registration, `verificationStatus` defaults to `PENDING`
2. `DashboardLayout` shows a `VerificationBanner` for INTERVENANT with PENDING/REJECTED status
3. Documents uploaded via `POST /api/documents/upload` (multer, stored in `backend/uploads/documents/`, UUID filenames, 5 MB max, PDF/JPG/PNG only)
4. Admin reviews at `ManageVerifications` page: expand a user card → eye icon (inline preview via blob URL) or download icon
5. Admin calls `PUT /api/users/:id/verify` with `{ status, note }` → updates `verificationStatus` on the user

ENTREPRISEs provide a SIRET at registration. SIRET validation via Pappers API is planned but not yet implemented — for now, verified automatically on registration.

`GET /api/documents/:id/file` is ADMIN-only and returns the file as a binary stream; the frontend fetches it with `responseType: 'blob'` and creates an object URL.

### Availability convention

`dayOfWeek` is an integer where **0 = Lundi (Monday)** through **6 = Dimanche (Sunday)** — matching the index of `DAY_LABELS` in `constants.js`. The backend returns availability arrays directly (not wrapped in an object).

### Reviews API shape

`reviewApi.getForIntervenant()` returns `{ reviews, averageRating, reviewCount, totalSessions }` — not a direct array. Always destructure: `const { reviews } = res.data`.

### Landing page

`src/pages/public/Landing.jsx` is fully public (no auth required). It uses Tailwind's `dark:` variant for automatic light/dark switching via `prefers-color-scheme` — no JS toggle needed. Dual logos: `<img className="dark:hidden">` for the color logo, `<img className="hidden dark:block">` for the white logo. Coaches are fetched from the API and sorted by rating then profile completeness.

`/coaches/:id` renders `CoachPublicProfile.jsx` — also fully public, no auth required.

### Seed data

All seed users have password `Password1!`:
- `admin@goupylsport.fr` — ADMIN
- `marc.leroy@email.com`, `sophie.martin@email.com`, `julien.blanc@email.com` — INTERVENANT
- `marvin.dupont@email.com`, `sarah.benali@email.com` — CLIENT
- `rh@acmecorp.fr` (ESSENTIEL_ENTREPRISE), `wellness@techstart.fr` (BOOST_ENTREPRISE), `sport@industria.fr` (ULTRA_ENTREPRISE) — ENTREPRISE

When updating `seed.js` cleanup order, `payment` and `review` must be deleted before `appointment` due to foreign key constraints.

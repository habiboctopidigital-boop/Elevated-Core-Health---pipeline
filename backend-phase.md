# ECH Pipeline Portal — Backend Implementation Plan

## Architecture
- Express 5 + TypeScript + Prisma + PostgreSQL
- JWT auth: access token (15min) + refresh token (7 days, DB-stored for revocation)
- npm package manager
- Zod validation on all endpoints
- Module pattern: router → controller → service → validation
- Email: Resend (transactional)

## Step-by-Step

### Step 1: Clean dependencies + config
- npm install bcryptjs jsonwebtoken resend @types/bcryptjs @types/jsonwebtoken
- npm uninstall better-auth cloudinary multer socket.io @prisma/adapter-pg
- Update `src/utils/envConfig.ts`: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, WEBHOOK_SECRET, RESEND_API_KEY
- Update `src/config/roles.ts`: `admin | va`
- Update `src/server.ts`: welcome message
- Update `src/index.ts`: remove socket.io
- Delete agency configs: cloudinary.ts, categories.ts
- Delete agency services: activity.service.ts, audit.service.ts, file.service.ts, notification.service.ts, user.service.ts, webhook.service.ts
- Delete all agency module dirs

### Step 2: JWT auth (access + refresh tokens)
- `prisma/schemas/refresh-token.prisma` — refresh token model
- `src/lib/auth.ts` — sign/verify JWT helpers
- Rewrite `src/middlewares/auth.ts` — requireAuth, requireRole
- Rewrite `src/modules/auth/` — login, refresh, me, logout

### Step 3: Seed script
- `prisma/seed.ts` — 3 users (Donna, Jude, Amanda) + 4 default checklist items
- Password hashing with bcrypt

### Step 4: Dynamic checklists
- `prisma/schemas/checklist-item.prisma` — checklist items per stage
- `src/config/checklists.ts` — load + validate
- Admin management endpoint in admin module

### Step 5: Patients module (core pipeline)
- CRUD + stage move (server-side gated) + checklist toggle + assign + claim + flag
- `POST /api/patients/intake` (webhook, shared secret) — creates patient, emails both VAs
- `POST /api/patients/:id/claim` — VA self-assigns, notifies other VA
- `POST /api/patients/:id/flag` — any user, requires reason
- `PATCH /api/patients/:id/flag/clear` — admin only

### Step 6: Activity log module
- `GET /api/activity-log` — filterable, paginated

### Step 7: Dashboard module
- `GET /api/dashboard/summary` — stale + flagged counts

### Step 8: Admin module
- User CRUD, analytics, checklist item management
- All requireRole('admin')

### Step 9: Email service (Resend)
- New patient notification → both VAs
- Claim notification → the other VA
- Graceful degradation if RESEND_API_KEY not set

### Step 10: Rewire routes.ts + cleanup
- ECH-only routes

### Step 11: Tests
- Auth, checklist gating, role enforcement, webhook intake, claim flow

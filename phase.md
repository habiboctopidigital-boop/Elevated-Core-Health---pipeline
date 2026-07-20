# ECH Pipeline Portal — Task Tracker

---

## Phase 1: Foundation — Schema, Auth & API Skeleton
- [x] Prisma schema: User, Patient, ActivityLog + RefreshToken + ChecklistItem models
- [x] Seed script: 3 fixed users (Donna, Jude, Amanda) + 4 default checklist items
- [x] Update roles config: `admin` | `va` (replace agency roles)
- [x] Update env config: Add JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, WEBHOOK_SECRET, RESEND_API_KEY
- [x] JWT auth middleware (replace BetterAuth) — access + refresh tokens
- [x] Auth module: login, me, refresh, logout endpoints
- [x] Clean up routes.ts: remove all agency imports, wire ECH routes
- [x] Remove unused agency services (GHL webhook, file service, etc.)
- [x] Clean up server.ts: update welcome message, remove agency references

## Phase 2: Core Pipeline API
- [x] Patients CRUD: list (filterable by stage), get by ID
- [x] Stage move endpoint with **strict server-side checklist gating**
- [x] Checklist toggle endpoint (dynamic items from DB)
- [x] Assign endpoint (manual + VA claim with conflict check)
- [x] Notes endpoint (with activity log)
- [x] Flag create endpoint (any user) + email alert to Donna
- [x] Flag clear endpoint (admin only, 403 for VA)
- [x] Webhook intake: name, email, phone, appointment date, problem description, shared-secret auth
- [x] Claim endpoint: VA self-assigns + email notification to other VA
- [x] Activity log: create + query with filters + pagination
- [x] Dashboard summary: stale count + flagged count (computed)

## Phase 3: Premium Frontend — Board, Cards & Patient Detail
- [ ] Clean up irrelevant frontend features (products, social, etc.)
- [ ] Update types, constants, services for ECH domain
- [ ] Fix middleware (proxy.ts → middleware.ts)
- [ ] ECH design system: brand colors, typography, premium tokens
- [ ] Generate missing shadcn/ui components (dialog, select, tabs, toast, tooltip)
- [ ] Login page: premium branded design
- [ ] Dashboard Home: greeting, stats, quick nav modules
- [ ] Board page: 7-column Kanban with premium card design
- [ ] Patient Detail Modal: notes, checklist, assign, flag, stage move
- [ ] Status bar: stale + flagged counts
- [ ] Sidebar: ECH branding, correct navigation

## Phase 4: Supporting Views & Guardrails
- [ ] Handoff Log page: filterable activity feed
- [ ] SOP Reference page: static stage guide
- [ ] Stale card visual flagging (48h+ computed)
- [ ] Flag for Donna flow: end-to-end (create → display → admin clear)
- [ ] Role-based route guarding (admin vs VA views)

## Phase 5: Admin Dashboard & Email
- [ ] Admin Dashboard page: flagged list, stale list, analytics charts
- [ ] User management: list, add, edit, reset password
- [ ] Analytics API: avg time per stage, reconciled per week, per-VA load
- [ ] Email service (Resend): flag alerts, stale digest, daily summary

## Phase 6: Testing, Hardening & Launch
- [ ] End-to-end API tests (Vitest + Supertest)
- [ ] Frontend component tests
- [ ] Security review: auth, RBAC, input validation
- [ ] HIPAA preparation checklist
- [ ] UAT readiness

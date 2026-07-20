# Elevated Core Health — Patient Pipeline Portal
## Complete Implementation Plan


comments -  

re-modify based on current application requrements oky . but keep folder stuckture as same oky

Email service: Do you have a Resend or SendGrid API key ready, or should email notifications be stub...
resend - will be provied a api keys oky

Brand logo: ECH_logo.png is referenced in the docs but not found in the repo. Can you provide it?
use dummy

AM/PM cutoff for auto-assignment: The spec defaults to 12:00 PM — is this confirmed with Donna?
right now stop auto assign . just show receommed based on time oky 

The existing backend/ and web-dashboard/ directories contain code from a different project (agency d...
re-factore based on our current porject

Database hosting: The spec mentions Supabase (HIPAA-eligible tier). Do you already have a Supabase p...
use prisma i will provied a db url

PATCH /api/patients/:id/checklist — toggle one checklist item
make sure without fill the all checklist never move to next oky

[NEW] Webhook intake (POST /api/patients/intake)
the webhook payload will be , name,email,phone, apppintdate, problems descripton optional and etc

Phase 3: Premium Frontend — Board, Cards & Patient Detail
becare full to design a ui . need good level design not a toy level ui ok . is indsyrty real usable project oky 
---

## Executive Summary

This is a **sensitive client project** for **Donna Rhodes** (owner/provider at Elevated Core Health). The application tracks patients through a **7-stage administrative workflow** (booking → payment reconciliation) enabling two remote VAs (Jude & Amanda) on different shifts to hand off work without anything falling through the cracks.

**This is NOT an EHR and NOT a billing system.** All patient data is treated as PHI. Only 3 users will ever access the system.

---

## Current State Analysis

> [!CAUTION]
> **The existing backend and frontend codebases are from a GENERIC AGENCY DASHBOARD template** — they were built for a completely different application (client/staff portal with tickets, projects, chat, GoHighLevel integration, etc.). Almost none of the existing business logic is relevant to ECH.

### What Exists (and must be reworked)

| Layer | Status | Notes |
|---|---|---|
| **Backend skeleton** | Express 5 + TypeScript + Prisma + pino logging | ✅ Keep the Express/Prisma skeleton, middleware patterns, and error handling |
| **Backend modules** | Agency-specific: onboarding, requests, projects, tickets, chat, GHL webhooks | ❌ **All must be replaced** with ECH-specific modules |
| **Backend roles** | `client`, `staff`, `admin`, `super_admin` | ❌ Must change to `admin`, `va` |
| **Prisma schema** | Empty `schema.prisma` (just generator + datasource) | 🟡 Schema files exist under `prisma/schemas/` but are for the agency app |
| **Frontend skeleton** | Next.js 16 + Tailwind v4 + shadcn/ui + React Query + Redux Toolkit | ✅ Keep the framework, but all pages/features need ECH-specific rebuild |
| **Frontend features** | Generic auth, users, products, social, notifications | ❌ **All must be replaced** with ECH-specific features |
| **Auth** | BetterAuth library (backend), token-based flow (frontend) | 🟡 Can be adapted — simplify for 3 fixed users |

### What Must Be Built From Scratch

1. **ECH Prisma Schema** — `users`, `patients`, `activity_log` tables per spec
2. **Patient Pipeline API** — All 15+ endpoints from the spec
3. **Kanban Board UI** — 7-stage pipeline view (premium design, not prototype-level)
4. **Patient Detail Modal** — Checklist, notes, flag, assign, stage-move controls
5. **Webhook Intake** — `POST /api/patients/intake` with auto-assignment logic
6. **Stale Detection** — Computed 48h+ staleness flagging
7. **Flag for Donna** — VA escalation flow with admin-only clearing
8. **Status Bar** — Real-time stale + flagged counts
9. **Admin Dashboard** — Flagged/stale lists, analytics, user management
10. **Handoff Log** — Filterable activity feed
11. **SOP Reference** — Static stage-by-stage guide
12. **Email Notifications** — Flag alerts, stale digests, daily summaries

---

## Open Questions

> [!IMPORTANT]
> ### Questions for You Before We Start Building
> 
> 1. **Database hosting**: The spec mentions Supabase (HIPAA-eligible tier). Do you already have a Supabase project set up, or should I configure for a local PostgreSQL instance for development?
> 
> 2. **The existing `backend/` and `web-dashboard/` directories** contain code from a different project (agency dashboard). Should I:
>    - **(A)** Strip them down and rebuild in-place (keep Express/Prisma/Next.js skeleton, replace all business logic), or
>    - **(B)** Start fresh in new directories?
> 
> 3. **Email service**: Do you have a Resend or SendGrid API key ready, or should email notifications be stubbed for Phase 1 and wired later?
> 
> 4. **Brand logo**: `ECH_logo.png` is referenced in the docs but not found in the repo. Can you provide it?
> 
> 5. **AM/PM cutoff** for auto-assignment: The spec defaults to 12:00 PM — is this confirmed with Donna?

---

## Proposed Changes — 6 Phases

---

### Phase 1: Foundation — Schema, Auth & API Skeleton
**Goal:** Working backend with database, authentication, and core data models.

#### Backend — Database Schema

##### [MODIFY] [schema.prisma](file:///d:/octopi-project/Elevated%20Core%20Health%20-%20pipeline/backend/prisma/schema.prisma)
- Replace the empty Prisma schema with the full ECH data model:
  - `User` model: id, name, email, passwordHash, role (enum: `admin` | `va`), shift (`morning` | `evening` | null), createdAt
  - `Patient` model: id, name, stage (7-stage enum), assignedTo, assignedBy, notes, checklistState (JSON), isFlagged, flagReason, flaggedBy, flaggedAt, source, bookingPlatform, appointmentDatetime, updatedAt, updatedBy, createdAt
  - `ActivityLog` model: id, patientId, author, message, type (`auto` | `manual`), createdAt
  - Indexes on stage, isFlagged, updatedAt, patientId

##### [NEW] Seed script
- Create seed file to insert the 3 fixed users:
  - Donna Rhodes — `admin`, shift: null
  - Jude — `va`, shift: `morning`
  - Amanda — `va`, shift: `evening`

#### Backend — Auth & Middleware

##### [MODIFY] [roles.ts](file:///d:/octopi-project/Elevated%20Core%20Health%20-%20pipeline/backend/src/config/roles.ts)
- Replace agency roles (`client`, `staff`, `admin`, `super_admin`) with ECH roles (`admin`, `va`)

##### [MODIFY] [auth.ts](file:///d:/octopi-project/Elevated%20Core%20Health%20-%20pipeline/backend/src/middlewares/auth.ts)
- Implement JWT-based auth middleware: `requireAuth`, `requireRole('admin')`
- Simple email/password login for 3 fixed accounts (bcrypt + jsonwebtoken)

##### [NEW] Auth module (`src/modules/auth/`)
- `POST /api/auth/login` — email + password → JWT + user info
- `GET /api/auth/me` — current user from token
- `POST /api/auth/logout` — token invalidation

##### [MODIFY] [routes.ts](file:///d:/octopi-project/Elevated%20Core%20Health%20-%20pipeline/backend/src/moduels/routes.ts)
- Remove ALL agency routes (onboarding, requests, projects, tickets, chat, GHL, etc.)
- Wire new ECH-specific routes only

##### [MODIFY] [server.ts](file:///d:/octopi-project/Elevated%20Core%20Health%20-%20pipeline/backend/src/server.ts)
- Update welcome message to "Elevated Core Health Pipeline Portal API"
- Ensure CORS allows the frontend origin

---

### Phase 2: Core Pipeline API — Patients CRUD + Business Logic
**Goal:** Complete patient lifecycle API with checklist-gated stage moves.

##### [NEW] Patients module (`src/modules/patients/`)
- `GET /api/patients` — list all, filterable by `?stage=`
- `GET /api/patients/:id` — single patient detail
- `PATCH /api/patients/:id/stage` — **server-side checklist validation** before forward move, backward always allowed
- `PATCH /api/patients/:id/assign` — manual reassignment
- `PATCH /api/patients/:id/checklist` — toggle one checklist item
- `POST /api/patients/:id/notes` — append/update operational note + log activity
- `POST /api/patients/:id/flag` — set flag with required reason, log activity
- `PATCH /api/patients/:id/flag/clear` — **admin only**, clear flag + log
- `DELETE /api/patients/:id` — admin only, rare cleanup

##### [NEW] Checklist validation logic
- Hardcoded server-side per stage:
  - `post_visit_docs`: ["instruction_letter_sent", "labs_sent"]
  - `chart_signed`: ["note_signed", "clawback_passed"]
  - Other stages: no required checklist
- `canAdvance()` function validates all items checked before forward move

##### [NEW] Webhook intake (`POST /api/patients/intake`)
- Shared secret header auth (`x-webhook-secret`)
- Creates patient at `onboarding` stage
- Auto-assigns VA by appointment time (hour < 12 → Jude, ≥ 12 → Amanda)
- Logs activity as `system`
- Never updates existing patients

##### [NEW] Activity Log module
- `GET /api/activity-log` — filterable by patientId, date range

##### [NEW] Dashboard module
- `GET /api/dashboard/summary` — stale count + flagged count (computed, not stored)

---

### Phase 3: Premium Frontend — Board, Cards & Patient Detail
**Goal:** Production-quality Kanban board UI — premium, professional, not prototype-level.

> [!IMPORTANT]
> The prototype JSX is **reference only**. The real UI will be a **premium, professional design** using:
> - shadcn/ui component library for consistent, polished UI primitives
> - Brand colors: Dark Green `#036638`, Green `#65BD6C`, Light Green BG `#EBF7EC`, Cream `#FBE7B2`, Sand `#EADEC0`
> - Dark sidebar theme (charcoal `#16181C`) with orange accent `#E8792E`
> - Modern typography (Inter/Outfit via Google Fonts)
> - Smooth micro-animations, glassmorphism touches, premium card design
> - Properly responsive layout

#### Frontend — Gutting & Rebuilding

##### Remove all agency-specific features
- Delete `src/features/products/`, `src/features/social/`, and other irrelevant feature modules
- Clean up unused services, hooks, types, constants

##### [NEW] ECH Design System
- Custom shadcn/ui theme tokens matching ECH + Phoenix HQ brand palette
- Premium card component with subtle shadows, hover effects, animated transitions
- Badge components for stale/flagged/checklist status
- Professional sidebar navigation

##### [NEW] Login page (`/login`)
- Clean, branded email + password form
- Error states, loading states
- Redirect to board on success

##### [NEW] Board page (`/board`) — Main pipeline view
- 7-column Kanban layout with stage headers (name, hint, card count)
- Patient cards: name, assignee avatar, relative timestamp, flag/stale badges, checklist progress
- Click card → opens detail modal
- Top status bar: stale + flagged counts, or "All caught up ✅"
- Smooth transitions when cards move between columns

##### [NEW] Patient Detail Modal
- Full notes editor (operational notes only)
- Checklist checkboxes (only for stages that have them)
- Assign dropdown (VAs only)
- "Flag for Donna" button + reason input
- Stage move controls: Back (always) / Advance (disabled until checklist complete, with tooltip)
- Flag banner (admin gets "Clear" action)

##### [NEW] Dashboard Home (`/`)
- Greeting with user name + date
- 4 stat cards: Active patients, Flagged, Stale 48h+, Reconciled today
- Quick navigation modules: Board, Handoff Log, SOP Reference, Admin Dashboard (admin only)

---

### Phase 4: Supporting Views & Guardrails
**Goal:** Complete the remaining pages and enforce all business rules end-to-end.

##### [NEW] Handoff Log page (`/log`)
- Chronological feed of all activity
- Filter by patient, date, auto vs manual entries
- Visual distinction between system-generated and user-generated entries

##### [NEW] SOP Reference page (`/sop`)
- Static content: 7 stages with descriptions + checklist items
- Clean, readable layout
- Note: "Optimantra remains the sole legal clinical record"

##### [NEW] Stale card logic (frontend + backend)
- Computed at query time: `updated_at < now() - 48 hours` AND `stage != 'reconciled'`
- Visual flagging: amber border, "Stale" badge on cards
- Status bar integration

##### [NEW] Flag for Donna flow (end-to-end)
- VA flags with required text reason → API → card shows red badge
- Admin (Donna) sees flag in admin dashboard + on card → clears flag
- VA cannot clear flags (UI hidden + API returns 403)

---

### Phase 5: Admin Dashboard & Email Notifications
**Goal:** Admin-only analytics, user management, and email alert system.

##### [NEW] Admin Dashboard page (`/admin`) — admin only
- Route-guarded: `<ProtectedRoute role="admin">`
- Flagged cards table with "Clear Flag" action
- Stale cards table
- User management table (add/edit/remove VA, reset password)
- Analytics charts (using Recharts, already in deps):
  - Avg days per stage (bar chart)
  - Cards reconciled per week (line chart)
  - Cards per VA (bar chart)
- Full activity log search with filters

##### [NEW] Admin API endpoints
- `GET /api/admin/analytics` — avg time per stage, weekly reconciled, per-VA load
- `GET/POST/PATCH/DELETE /api/admin/users` — user management

##### [NEW] Email notification service
- Service: Resend or SendGrid (transactional)
- Triggers:
  - Flag created → immediate email to Donna
  - Nightly cron: stale cards digest → Donna
  - Nightly cron: daily summary → Donna
  - Password reset → requesting user

---

### Phase 6: Integration Testing, Hardening & Launch
**Goal:** Production-ready, HIPAA-appropriate deployment.

##### End-to-end testing
- Test webhook intake with sample Make.com payloads (AM + PM appointment times)
- Test all checklist gating (forward blocked, backward always allowed)
- Test role enforcement on all admin-only endpoints
- Test stale computation edge cases
- Test flag create/clear flow

##### Security hardening
- All routes authenticated (except webhook with shared secret)
- Role middleware on every mutating endpoint
- Rate limiting
- Input validation (Zod schemas on all endpoints)
- No clinical data fields anywhere

##### HIPAA hosting preparation
- Confirm hosting provider BAA
- Encryption at rest + in transit
- Access restricted to 3 accounts only
- Backup schedule configured
- Error monitoring (Sentry)

##### UAT & Go-Live
- User acceptance testing with Donna, Jude, Amanda
- Cut over Make.com from current workflow → webhook
- Monitor for issues post-launch

---

## Verification Plan

### Automated Tests
```bash
# Backend
cd backend && pnpm test          # Vitest unit tests
cd backend && pnpm test:cov      # Coverage report

# Frontend
cd web-dashboard && npm test     # Vitest component tests
```

### Manual Verification
- Login as each of the 3 users, verify correct role-based UI
- Create a patient via webhook simulation, verify auto-assignment
- Move a card through all 7 stages, verify checklist gating
- Flag a card as VA, verify admin can clear
- Leave a card untouched 48h+, verify stale flagging
- Verify status bar counts update in real-time
- Test admin dashboard: analytics, user management, log search

---

## Tech Stack (Confirmed)

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui |
| Backend | Express 5 + TypeScript + Prisma ORM |
| Database | PostgreSQL (Supabase or local) |
| Auth | JWT (bcrypt + jsonwebtoken) — 3 fixed users |
| State | TanStack React Query (server state) + Redux Toolkit (UI state) |
| Charts | Recharts |
| Email | Resend or SendGrid |
| Validation | Zod (both client + server) |
| Testing | Vitest + Supertest |
| Icons | Lucide React |

---

## Timeline Estimate

| Phase | Scope | Estimated Effort |
|---|---|---|
| **Phase 1** | Schema + Auth + API skeleton | ~1 day |
| **Phase 2** | Patients CRUD + business logic + webhook | ~1-2 days |
| **Phase 3** | Premium frontend: Board, Cards, Modal, Dashboard Home | ~2-3 days |
| **Phase 4** | Handoff Log, SOP, Stale logic, Flag flow | ~1-2 days |
| **Phase 5** | Admin Dashboard + Email notifications | ~1-2 days |
| **Phase 6** | Testing, hardening, launch prep | ~1-2 days |
| **Total** | | **~7-12 days** |

---

## Non-Negotiable Rules (From Spec)

1. ✅ **Checklist-gated forward moves** — enforced server-side, not just UI
2. ✅ **Backward moves always allowed** — unconditionally
3. ✅ **48h stale flag** — computed, not manually set
4. ✅ **Flag for Donna** — VAs can flag, only admin clears
5. ✅ **Webhook creates only** — never updates existing patients
6. ✅ **No clinical data** — operational notes only, never diagnoses
7. ✅ **Role enforcement** — backend middleware on every mutating/admin route
8. ✅ **Auto-assignment by time** — morning → Jude, evening → Amanda

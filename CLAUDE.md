# CLAUDE.md — Project Context for Claude Code

This file gives Claude Code the full context of this project. Read this before making any changes.

---

## Project Name
**Elevated Core Health — Patient Pipeline Portal**

## One-line summary
An internal operations web app that tracks patients through a 7-stage administrative workflow (booking → payment reconciliation) so two remote VAs on different shifts can hand off work without anything falling through the cracks. **This is not an EHR and not a billing system.**

---

## Business Context

- **Client:** Donna Rhodes — owner/provider at Elevated Core Health
- **Users (3 total, fixed — no self-signup):**
  - Donna Rhodes — `admin` role
  - Jude — `va` role, works mornings
  - Amanda — `va` role, works evenings
- Optimantra remains the sole legal clinical record. This app never stores clinical notes or diagnoses — only patient name + operational/workflow status.
- Treat all patient data as PHI even though minimal (name + appointment status). HIPAA-appropriate hosting is required: BAA with hosting provider, encryption at rest and in transit, access restricted to the 3 users above.

---

## Existing Assets (do not discard, use as reference)

- `ech-pipeline-portal.jsx` — a Claude-generated React prototype. **Reference for UI/UX and feature scope only — it is a browser-sandbox mockup with no backend, no DB, no auth, and no way to receive external data. Do not treat it as deployable code.** Extract from it: the exact `CHECKLISTS` object (per-stage required checklist item text), the visual/component structure, and the SOP tab content.
- `ECH_logo.png` — brand logo, transparent background.
- Brand colors:
  - Dark green: `#036638`
  - Green: `#65BD6C`
  - Light green background: `#EBF7EC`
  - Cream accent: `#FBE7B2`
  - Sand/neutral: `#EADEC0`

---

## The 7 Pipeline Stages (fixed order, do not rename)

1. `onboarding` — scheduled on calendar
2. `visit_complete` — encounter finished
3. `post_visit_docs` — patient instruction letter sent, labs sent
4. `chart_signed` — Optimantra note signed + pre-billing clawback check (CPT level, ICD-10 alignment, documentation support) passed
5. `sent_to_billing` — claim submitted (Headway / Grow Therapy / self-pay)
6. `payment_posted` — payment received
7. `reconciled` — reconciled against what was billed, closed out (final stage — no stale-flag applies here)

---

## Core Business Rules (non-negotiable — enforce server-side, not just in UI)

0. **Time-based auto-assignment (confirmed by client, added after initial brief).** When a new patient is created via the webhook, auto-assign the VA by appointment time: appointment hour < 12:00 PM (local clinic time) → Jude; ≥ 12:00 PM → Amanda. This is a *default*, not a lock — any VA/admin can manually reassign afterward via `PATCH /api/patients/:id/assign`. If no appointment time is present, leave `assigned_to` null rather than guessing. **Confirm the exact AM/PM cutoff hour with Donna before finalizing — 12:00 PM is an assumption, not yet client-confirmed.** See `ECH_Final_Feature_Spec_and_DFD.md` for the reference implementation.

1. **Forward stage moves are checklist-gated.** A patient card cannot advance to the next stage until every checklist item for its *current* stage is checked. Backward moves are always allowed, unconditionally.
2. **Stale flag:** any card not updated in 48+ hours, and not in `reconciled`, must be visually flagged. This is computed (not manually set).
3. **Flag for Donna:** any VA can flag any card with a required text reason. The flag stays visible on the card until `admin` (Donna) clears it. VAs cannot clear flags.
4. **Status bar:** always-visible summary at the top of the board showing count of stale cards + count of flagged cards, or "all caught up" if both are zero.
5. **Webhook intake:** `POST /api/patients/intake` receives new-patient data pushed from Make.com (parsed from Klarity/ZocDoc booking confirmation emails). This always creates a new patient at stage `onboarding`. It does not update existing patients. Auth for this endpoint is a shared secret header, not user login.
6. **No clinical data ever.** Notes fields are for operational status only (e.g. "waiting on labs"), never diagnoses or clinical detail. Do not add fields that could invite clinical data entry.

---

## Roles & Permissions

| Action | admin (Donna) | va (Jude/Amanda) |
|---|---|---|
| View board / assign self / move cards / checklists / notes / flag | ✅ | ✅ |
| Clear a flag | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| View analytics dashboard | ✅ | ❌ |
| Access `/admin/*` routes | ✅ | ❌ (403) |

Enforce role checks in backend middleware on every mutating/admin route — never rely on frontend hiding alone.

---

## Tech Stack (target)

- **Frontend:** React + Vite + Tailwind (adapt from the existing prototype JSX, don't rebuild UI from scratch)
- **Backend:** Node.js + Express
- **DB:** PostgreSQL (Supabase preferred — bundles DB + auth + a HIPAA-eligible tier; confirm BAA before committing to any host)
- **Auth:** JWT-based, 3 fixed users, email + password, roles `admin` | `va`
- **Email:** Resend or SendGrid (transactional) for flag alerts, stale digests, daily summary
- **Automation (external, not built by us):** Make.com watches a Gmail label and POSTs to our webhook

---

## Database Tables (see full SQL in ECH_Pipeline_Portal_Technical_Plan.md)

- `users` (id, name, email, password_hash, role, created_at)
- `patients` (id, name, stage, assigned_to, notes, checklist_state JSONB, is_flagged, flag_reason, flagged_by, flagged_at, source, booking_platform, appointment_datetime, updated_at, updated_by, created_at)
- `activity_log` (id, patient_id, author, message, type, created_at)

---

## API Surface (see full spec in ECH_Pipeline_Portal_Technical_Plan.md)

Key routes to implement first (Phase 1–2 priority):
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/patients`, `GET /api/patients/:id`
- `PATCH /api/patients/:id/stage` — **must run `canAdvance()` checklist validation server-side**
- `PATCH /api/patients/:id/assign`
- `PATCH /api/patients/:id/checklist`
- `POST /api/patients/:id/notes`
- `POST /api/patients/:id/flag`, `PATCH /api/patients/:id/flag/clear` (admin only)
- `POST /api/patients/intake` (webhook, secret-header auth, no user session)
- `GET /api/dashboard/summary` (stale + flagged counts)
- Admin-only: `GET/POST/PATCH/DELETE /api/admin/users`, `GET /api/admin/analytics`

---

## Explicitly Out of Scope — do not build

- No clinical notes / diagnosis fields anywhere
- No billing/claims processing — status tracking only
- No enterprise SSO — 3 simple accounts is sufficient
- No mobile app — responsive web is enough unless told otherwise
- Do not let the webhook endpoint update existing patients — intake only creates new ones

---

## Reference Documents in This Project

- `ECH_Pipeline_Portal_Technical_Plan.md` — full DB schema, complete API spec, code snippets for checklist validation / role middleware / webhook handler, UI requirements per screen, phased build plan
- `ech-pipeline-portal.jsx` — UI/UX + checklist-copy reference (prototype, not production code)
- `ECH_logo.png` — brand asset

## Development Priority Order

1. DB schema + auth
2. Patients CRUD + stage-move endpoint with server-side checklist gating
3. Frontend board wired to real API (replace prototype's static state)
4. Stale-flag computation + status bar
5. Flag-for-Donna flow
6. Webhook intake endpoint + Make.com integration test
7. Email notifications
8. Admin dashboard (user mgmt, analytics, log search)
9. HIPAA hosting hardening (BAA, encryption, backups) before go-live

# Elevated Core Health — Patient Pipeline Portal
## FINAL Feature Spec + DFD Flow (v2 — for Claude Code build)

This supersedes earlier drafts. Read this file fully before writing any code.

---

## ⚠️ NEW RULE — confirmed by client, not in original brief text

**Time-based auto-assignment.** When a new patient is created via the webhook (or manually), the system auto-assigns the VA based on the patient's appointment time:
- **Morning appointment → Jude**
- **Evening appointment → Amanda**

This was implicit in the brief's "Jude — mornings / Amanda — evenings" shift description, but the client has now confirmed it as an explicit **system behavior**, not just a staffing note.

**Open question to confirm with client before building:** the exact AM/PM cutoff hour (e.g. "before 12:00 PM = morning", or "before 1:00 PM"). Default assumption until confirmed: **appointment_datetime local hour < 12:00 → Jude; ≥ 12:00 → Amanda**.

**Auto-assignment is a default, not a lock.** Any VA or admin can manually reassign a card afterward — this rule only sets the *initial* assignee at intake, it does not restrict who can work a card later.

```js
function autoAssign(appointmentDateTime) {
  const hour = new Date(appointmentDateTime).getHours(); // local clinic timezone
  return hour < 12 ? 'jude' : 'amanda';
}
```

If `appointmentDateTime` is missing or unparseable, leave `assigned_to` null and let a VA self-assign manually (don't guess).

---

## 1. Full Feature List (final)

### Core board
- 7-stage Kanban board: Onboarding → Visit Complete → Post-Visit Docs → Chart Signed → Sent to Billing → Payment Posted → Reconciled
- Patient cards: name, assignee avatar, last-updated relative time, notes preview
- Card detail view: full notes, checklist, stage-move controls, assign dropdown, flag

### Guardrails
- **Checklist-gated forward moves.** Backward moves always allowed, never blocked.
  - `post_visit_docs`: "Patient instruction letter sent", "Labs sent"
  - `chart_signed`: "Optimantra note signed", "Clawback check passed (CPT / ICD-10)"
  - Other stages: no required checklist (always advanceable)
  - **Checklist source is static/hardcoded server-side for v1** — not admin-editable in this version (see note below)
- **Stale flag.** Any card not updated in 48+ hours, and not `reconciled`, flags itself visually. Computed, not stored.
- **Flag for Donna.** Any user can flag a card with a required text reason. Stays visible until admin clears it.
- **Status bar.** Top of board: stale count + flagged count, or "All caught up" if both zero.

### Automation
- **Webhook intake:** `POST /api/patients/intake` — Make.com posts parsed booking data here. Creates a new patient at stage `onboarding`.
- **Auto-assignment by appointment time** (see rule above) — runs at intake, before the card is saved.
- Webhook never updates existing patients — creation only.
- Auth: shared secret header (`x-webhook-secret`), not user session.

### Roles & views
| Action | admin (Donna) | va (Jude / Amanda) |
|---|---|---|
| View board, move cards, checklist, notes, flag | ✅ | ✅ |
| Reassign a card (override auto-assign) | ✅ | ✅ |
| Clear a flag | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| View analytics dashboard | ✅ | ❌ |

### Supporting views
- Handoff log — chronological feed, auto + manual entries, filterable
- SOP reference tab — static content, stage list + checklist text
- Admin dashboard (admin only) — flagged list w/ clear action, stale list, per-VA load count, basic analytics, user management

### Non-functional
- HIPAA-appropriate hosting: BAA, encryption at rest + in transit, access limited to 3 accounts
- No clinical notes/diagnoses stored anywhere — operational status only
- Simple email/password auth for 3 fixed users, no SSO

---

## 2. DFD Flow (see diagram rendered in chat — description below for reference)

**Entities (external):**
- `Booking platforms` (Klarity / ZocDoc, via Make.com) — sends parsed booking data
- `VA / Donna` — the three human users interacting with the web app

**Processes:**
- `Intake` — receives webhook POST, creates patient record, **runs auto-assignment by appointment time**
- `Pipeline` — stage moves, checklist toggles, assignment, notes; the main VA/admin workflow surface
- `Escalate` — flag creation, flag clearing, activity logging for escalations

**Data stores:**
- `Patients` — card data: name, stage, assignee, checklist state, flag state
- `Activity log` — append-only history of all actions (auto + manual)

**Flow narrative:**
1. Booking platform confirmation email → Make.com parses it → POSTs to `Intake`.
2. `Intake` creates the patient record, **auto-assigns VA by appointment time**, writes to `Patients`, logs to `Activity log` (implied, not drawn as separate arrow to keep diagram readable — Intake and Pipeline both write to Activity log in practice).
3. New card appears in `Onboarding` column. `Pipeline` process is where VA/Donna do all day-to-day work — checklist, notes, stage moves, reassignment.
4. `Pipeline` reads/writes `Patients` continuously, and writes to `Activity log` on every action.
5. When a card needs escalation, `Pipeline` hands off to `Escalate`, which sets the flag on `Patients` and records it in `Activity log`.
6. Admin (part of `VA / Donna` entity) sees flags/stale cards via `Pipeline`'s status bar and the admin dashboard, and clears flags through `Escalate`.

---

## 3. Database Schema (PostgreSQL)

```sql
CREATE TYPE user_role AS ENUM ('admin', 'va');
CREATE TYPE patient_stage AS ENUM (
  'onboarding', 'visit_complete', 'post_visit_docs',
  'chart_signed', 'sent_to_billing', 'payment_posted', 'reconciled'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'va',
  shift TEXT, -- 'morning' | 'evening' | null (used by auto-assign lookup)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage patient_stage NOT NULL DEFAULT 'onboarding',
  assigned_to UUID REFERENCES users(id),
  assigned_by TEXT DEFAULT 'auto', -- 'auto' | 'manual'
  notes TEXT,
  checklist_state JSONB NOT NULL DEFAULT '{}',
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  flagged_by UUID REFERENCES users(id),
  flagged_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual', -- 'webhook' | 'manual'
  booking_platform TEXT,
  appointment_datetime TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'auto' | 'manual'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_patients_stage ON patients(stage);
CREATE INDEX idx_patients_flagged ON patients(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_patients_updated_at ON patients(updated_at);
CREATE INDEX idx_activity_log_patient ON activity_log(patient_id);
```

Seed `users.shift`: Jude = `'morning'`, Amanda = `'evening'`, Donna = `null` (admin, not part of assignment rotation).

---

## 4. API Endpoints (final)

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/auth/login` | `{email, password}` → JWT |
| GET | `/api/auth/me` | current user |
| GET | `/api/patients` | list, `?stage=` filter |
| GET | `/api/patients/:id` | detail |
| PATCH | `/api/patients/:id/stage` | server validates checklist before forward move |
| PATCH | `/api/patients/:id/assign` | manual override of auto-assignment |
| PATCH | `/api/patients/:id/checklist` | toggle one item |
| POST | `/api/patients/:id/notes` | append/update note |
| POST | `/api/patients/:id/flag` | `{reason}` |
| PATCH | `/api/patients/:id/flag/clear` | admin only |
| **POST** | **`/api/patients/intake`** | **webhook — creates patient + runs auto-assign by appointment time** |
| GET | `/api/dashboard/summary` | stale + flagged counts |
| GET | `/api/admin/analytics` | admin only |
| GET/POST/PATCH/DELETE | `/api/admin/users` | admin only |
| GET | `/api/activity-log` | filterable by patient/date |

### Auto-assignment logic lives in the intake handler
```js
app.post('/api/patients/intake', validateWebhookSecret, async (req, res) => {
  const { name, appointmentDateTime, platform } = req.body;
  const assignedTo = appointmentDateTime ? autoAssignByTime(appointmentDateTime) : null;

  const patient = await db.createPatient({
    name, appointment_datetime: appointmentDateTime, booking_platform: platform,
    stage: 'onboarding', source: 'webhook',
    assigned_to: assignedTo, assigned_by: assignedTo ? 'auto' : null,
  });

  await db.logActivity(patient.id, 'system',
    assignedTo
      ? `New patient auto-created from booking email (${platform}), auto-assigned to ${assignedTo}`
      : `New patient auto-created from booking email (${platform}), unassigned — no appointment time provided`,
    'auto');

  res.status(201).json({ success: true, patientId: patient.id });
});
```

---

## 5. Build Order (for Claude Code)

1. DB schema + migrations, seed 3 users with `shift` field
2. Auth (login/JWT) + role middleware
3. Patients CRUD + stage-move endpoint with server-side checklist gating
4. **Webhook intake endpoint with auto-assignment logic** — test with sample payloads for both AM and PM appointment times
5. Frontend board (adapt from `ech-pipeline-portal-v2.jsx` prototype) wired to real API
6. Stale-flag computation + status bar
7. Flag-for-Donna flow (create + admin-only clear)
8. Email notifications (flag alert to Donna, stale digest, daily summary)
9. Admin dashboard (flagged/stale lists, per-VA load, user management)
10. HIPAA hosting hardening (BAA, encryption, backups) before go-live

---

## 6. Explicitly Out of Scope (unchanged)
- No clinical notes/diagnoses anywhere
- No billing/claims processing — status only
- No enterprise SSO
- No admin-editable checklist templates in v1 (static, hardcoded server-side)
- Webhook creates patients only, never updates existing ones

---

## 7. Open Questions Before/During Build
1. **Exact AM/PM cutoff time** for auto-assignment (default assumed: 12:00 PM local time) — confirm with Donna
2. What happens if a booking has no clear appointment time in the email (edge case) — leave unassigned, per this spec
3. Email notification granularity — every webhook intake, or just digest? (assumed: flag alerts immediate, everything else digest)
4. Confirm hosting provider for BAA before infra setup begins

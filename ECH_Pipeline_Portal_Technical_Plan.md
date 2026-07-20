# Elevated Core Health — Patient Pipeline Portal
## Full Technical Project Plan (Developer Reference)

---

## 1. Roles & Permissions

| Role | Users | Description |
|---|---|---|
| `admin` | Donna Rhodes | Full oversight — clears flags, manages users, sees analytics |
| `va` | Jude, Amanda | Daily operational workflow — moves cards, checklists, notes, flags |

### Permission Matrix

| Action | admin | va |
|---|---|---|
| View board | ✅ | ✅ |
| Assign self to card | ✅ | ✅ |
| Move card forward (checklist gated) | ✅ | ✅ |
| Move card backward | ✅ | ✅ |
| Toggle checklist items | ✅ | ✅ |
| Add notes | ✅ | ✅ |
| Flag card ("Flag for Donna") | ✅ | ✅ |
| **Clear a flag** | ✅ | ❌ |
| View activity log | ✅ | ✅ |
| **Manage users** (add/remove/reset password) | ✅ | ❌ |
| **View analytics/reports** | ✅ | ❌ |
| **Edit checklist templates** | ✅ | ❌ |
| Access admin dashboard route | ✅ | ❌ |

Enforce this **both** client-side (hide UI) and **server-side** (middleware check on every mutating endpoint) — never trust the frontend alone.

---

## 2. Role-Based UI Differences

### VA View (Jude / Amanda)
- Route: `/board`
- Kanban board (7 columns), own name highlighted on assigned cards
- Status bar: stale count + flagged count (read-only summary)
- Card modal: notes, checklist, assign, flag, move stage
- No access to `/admin/*` routes (redirect or 403 page if URL typed manually)
- Nav: Board | SOP Reference | Handoff Log | Logout

### Admin View (Donna)
- Everything VA sees, **plus**:
- Route: `/admin` — separate dashboard
  - Flagged cards list (with "Clear Flag" action)
  - Stale cards list
  - User management (add/remove VA, reset password)
  - Analytics: avg time per stage, cards reconciled this week/month, per-VA card count
  - Full activity log search/filter (by patient, date, author)
  - Checklist template editor (optional v1.1)
- Nav: Board | Admin Dashboard | SOP Reference | Handoff Log | Logout

**Implementation tip:** one React app, route-guard with a `<ProtectedRoute role="admin">` wrapper; don't build two separate apps.

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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stage patient_stage NOT NULL DEFAULT 'onboarding',
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  checklist_state JSONB NOT NULL DEFAULT '{}',  -- { "chart_signed": { "note_signed": true, "clawback_passed": false } }
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  flagged_by UUID REFERENCES users(id),
  flagged_at TIMESTAMPTZ,
  source TEXT DEFAULT 'manual',   -- 'webhook' | 'manual'
  booking_platform TEXT,          -- 'klarity' | 'zocdoc' | null
  appointment_datetime TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  author TEXT NOT NULL,           -- user name or 'system'
  message TEXT NOT NULL,
  type TEXT NOT NULL,             -- 'auto' | 'manual'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Helpful indexes
CREATE INDEX idx_patients_stage ON patients(stage);
CREATE INDEX idx_patients_flagged ON patients(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_patients_updated_at ON patients(updated_at);
CREATE INDEX idx_activity_log_patient ON activity_log(patient_id);
```

**Stale-card logic:** computed at query time, no stored column needed —
```sql
SELECT * FROM patients
WHERE stage != 'reconciled'
AND updated_at < now() - interval '48 hours';
```

**Checklist source of truth (from prototype's CHECKLISTS object)** — hardcode server-side per stage, e.g.:
```json
{
  "chart_signed": ["note_signed", "clawback_passed"],
  "post_visit_docs": ["instruction_letter_sent", "labs_sent"]
}
```
Server validates `checklist_state[currentStage]` has **all keys true** before allowing a forward stage transition.

---

## 4. Backend API — Full Endpoint Spec

**Stack suggestion:** Node.js + Express (or Fastify) + PostgreSQL (Supabase works well — gives you DB + auth + HIPAA-eligible tier in one).

### Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` | Returns JWT + user info |
| POST | `/api/auth/logout` | — | Invalidate session/token |
| POST | `/api/auth/forgot-password` | `{email}` | Sends reset link |
| POST | `/api/auth/reset-password` | `{token, newPassword}` | — |
| GET | `/api/auth/me` | — | Returns current user (for session check) |

### Patients / Board
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| GET | `/api/patients` | — | List all, filterable by `?stage=` |
| GET | `/api/patients/:id` | — | Single patient detail |
| PATCH | `/api/patients/:id/stage` | `{newStage}` | **Server validates checklist before allowing forward move** |
| PATCH | `/api/patients/:id/assign` | `{userId}` | Assign/reassign |
| PATCH | `/api/patients/:id/checklist` | `{stage, itemKey, checked}` | Toggle one checklist item |
| POST | `/api/patients/:id/notes` | `{note}` | Appends note + logs activity |
| POST | `/api/patients/:id/flag` | `{reason}` | Sets is_flagged=true, logs, emails Donna |
| PATCH | `/api/patients/:id/flag/clear` | — | **admin only** |
| DELETE | `/api/patients/:id` | — | admin only, rare/manual cleanup |

### Activity Log
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/activity-log` | Full log, `?patientId=` `?from=` `?to=` filters |

### Dashboard / Analytics (admin)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/dashboard/summary` | `{staleCount, flaggedCount}` for status bar (all roles) |
| GET | `/api/admin/analytics` | avg time per stage, weekly reconciled count, per-VA load (**admin only**) |

### User Management (admin)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/users` | List 3 users |
| POST | `/api/admin/users` | Add VA |
| PATCH | `/api/admin/users/:id` | Edit / reset password |
| DELETE | `/api/admin/users/:id` | Remove |

### Webhook (Make.com integration)
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/patients/intake` | **No user auth** — instead validate a shared secret header `x-webhook-secret`. Body: `{name, appointmentDateTime, platform}`. Creates patient with `stage=onboarding`, `source=webhook`. |

Example webhook payload:
```json
{
  "name": "Jane Doe",
  "appointmentDateTime": "2026-07-25T14:00:00Z",
  "platform": "zocdoc"
}
```

---

## 5. Core Backend Logic — Key Code Snippets

### Stage-transition validation (the most important business rule)
```js
const STAGE_ORDER = [
  'onboarding', 'visit_complete', 'post_visit_docs',
  'chart_signed', 'sent_to_billing', 'payment_posted', 'reconciled'
];

const CHECKLISTS = {
  post_visit_docs: ['instruction_letter_sent', 'labs_sent'],
  chart_signed: ['note_signed', 'clawback_passed'],
  // other stages may have empty/no required checklist
};

function canAdvance(patient, targetStage) {
  const currentIdx = STAGE_ORDER.indexOf(patient.stage);
  const targetIdx = STAGE_ORDER.indexOf(targetStage);

  // moving backward is always allowed
  if (targetIdx < currentIdx) return { ok: true };

  const required = CHECKLISTS[patient.stage] || [];
  const stageState = patient.checklist_state?.[patient.stage] || {};
  const incomplete = required.filter(key => !stageState[key]);

  if (incomplete.length > 0) {
    return { ok: false, reason: `Incomplete checklist: ${incomplete.join(', ')}` };
  }
  return { ok: true };
}

// route handler
app.patch('/api/patients/:id/stage', authMiddleware, async (req, res) => {
  const patient = await db.getPatient(req.params.id);
  const check = canAdvance(patient, req.body.newStage);
  if (!check.ok) return res.status(400).json({ error: check.reason });

  await db.updatePatientStage(patient.id, req.body.newStage, req.user.id);
  await db.logActivity(patient.id, req.user.name,
    `Moved from ${patient.stage} to ${req.body.newStage}`, 'auto');
  res.json({ success: true });
});
```

### Role-based middleware
```js
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
// usage: app.patch('/api/patients/:id/flag/clear', authMiddleware, requireRole('admin'), handler)
```

### Webhook secret validation
```js
app.post('/api/patients/intake', (req, res, next) => {
  if (req.headers['x-webhook-secret'] !== process.env.MAKE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }
  next();
}, async (req, res) => {
  const { name, appointmentDateTime, platform } = req.body;
  const patient = await db.createPatient({
    name, appointment_datetime: appointmentDateTime,
    booking_platform: platform, stage: 'onboarding', source: 'webhook'
  });
  await db.logActivity(patient.id, 'system', 'New patient auto-created from booking email', 'auto');
  await notifyVAs(patient); // optional email
  res.status(201).json({ success: true, patientId: patient.id });
});
```

### Stale-card cron/query (run on dashboard load, or nightly job for digest email)
```js
async function getStaleCards() {
  return db.query(`
    SELECT * FROM patients
    WHERE stage != 'reconciled'
    AND updated_at < now() - interval '48 hours'
  `);
}
```

---

## 6. Email Notifications

**Service:** Resend, SendGrid, or Postmark (any transactional email API).

| Trigger | Recipient | Type |
|---|---|---|
| Webhook creates new patient | Jude + Amanda | Immediate (optional toggle) |
| `/flag` called | Donna | Immediate |
| Nightly cron: any stale cards exist | Donna | Daily digest (list of stale cards) |
| Nightly cron: daily summary | Donna | Digest (stage counts, cards moved yesterday) |
| Password reset requested | requesting user | Immediate, contains reset token link |

```js
// pseudo
async function notifyFlag(patient, reason, flaggedBy) {
  await resend.emails.send({
    to: 'donna@email.com',
    subject: `🚩 Flag: ${patient.name}`,
    html: `${flaggedBy.name} flagged ${patient.name}: ${reason}`
  });
}
```

---

## 7. Frontend UI Requirements (per screen)

### Login (`/login`)
- Email + password fields, error state, "forgot password" link

### Board (`/board`) — main app
- 7-column Kanban, drag-and-drop or click-to-move (validate against backend response either way — don't optimistically update past a checklist gate)
- Top status bar: `X stale · Y flagged` or "All caught up ✅"
- Card component: patient name, assignee avatar/initials, last-updated relative time, flag badge if flagged, stale border/highlight if stale
- Card click → modal: notes textarea, checklist checkboxes (only for stages that have one), assign dropdown, "Flag for Donna" button + reason input, stage move buttons (forward disabled until checklist complete, tooltip explains why)

### Handoff Log (`/log`)
- Chronological feed, filter by patient/date, auto vs manual entries visually distinct

### SOP Reference (`/sop`)
- Static content, same as prototype

### Admin Dashboard (`/admin`) — admin only
- Flagged cards table + "Clear" button
- Stale cards table
- User management table (add/edit/remove)
- Analytics charts: avg days per stage (bar), reconciled per week (line), cards per VA (pie/bar)
- Log search with filters

---

## 8. Suggested Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (reuse prototype) + Vite, Tailwind |
| Backend | Node.js + Express |
| DB | PostgreSQL via Supabase (or raw Postgres on AWS RDS) |
| Auth | Supabase Auth or custom JWT (bcrypt + jsonwebtoken) |
| Email | Resend or SendGrid |
| Hosting | Supabase (DB+auth) + Vercel/Render (frontend+backend) — **confirm BAA availability before committing**, since this is PHI |
| Automation | Make.com (already planned) |

---

## 9. Project Phases / Plan

**Phase 1 — Foundation (Week 1)**
- DB schema setup, auth (login/JWT), basic Express API skeleton
- Deploy skeleton to staging

**Phase 2 — Core Board (Week 2)**
- Patients CRUD, stage-move endpoint w/ checklist validation
- Frontend: adapt prototype UI to call real API, replace static state

**Phase 3 — Guardrails & Escalation (Week 3)**
- Checklist UI + validation end-to-end
- Stale-flag logic + status bar
- Flag for Donna + clear flow
- Activity log wiring

**Phase 4 — Webhook & Email (Week 4)**
- `/api/patients/intake` + Make.com connection (test with real Klarity/ZocDoc sample emails)
- Email notifications (flag alert, stale digest, daily summary)

**Phase 5 — Admin Dashboard (Week 5)**
- User management, analytics, log search

**Phase 6 — Hardening & Launch**
- HIPAA hosting checklist: BAA signed, encryption verified, access limited to 3 accounts
- Backup schedule, error monitoring (e.g. Sentry)
- UAT with Donna/Jude/Amanda, then go-live; cut over Make.com from Google Sheet → webhook

---

## 10. Open Questions for Client (Donna)
- Exact checklist item text per stage — confirm against prototype's `CHECKLISTS` object (need the `.jsx` file to extract exact copy)
- Email notification preferences — does she want every new-patient email, or just digests?
- Preferred hosting provider (affects BAA process)
- Any need for mobile app, or is responsive web enough?

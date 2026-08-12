# Phase Plan — RBAC, Ownership Scoping & System-Wide Audit

Derived from `task.md`, checked against the code as it exists today.
**Nothing in here is implemented yet.** This is the build order and the reasoning behind it.

---

## Vision (one paragraph)

Today the portal is a **shared board with two flat roles**: any authenticated user sees every
patient, and the audit trail only remembers what happened *inside a patient card*. `task.md` asks
for a **three-tier, ownership-scoped, fully-accountable system**: Super Admin › Admin › VA, where a
VA's world narrows to their own assigned patients plus the unassigned pool; where the Super Admin is
a protected system account no one can delete; where every meaningful action — logins, failed logins,
profile edits, role changes, user deletion, report exports — lands in one central ledger with actor,
role, target, before-value, after-value, and timestamp; and where destructive actions require
deliberate two-step confirmation backed by independent server-side re-validation. The governing rule
for every request becomes:

```
Authentication → Role Authorization → Resource Ownership → Action Permission
```

enforced **server-side**, against the authenticated session — never against role information
supplied by the client.

---

## Guiding Principle — Additive, Non-Breaking

**Nothing that works today gets torn out.** The existing activity tracking, the `audit()` helper and
its 16 call sites, `type: auto|manual`, the patient-card handoff log, `requireRole("admin")`, the
privacy-lock rule — all of it stays and keeps behaving identically. New requirements are satisfied by
**extending** these, not replacing them:

| Existing | What happens to it |
|---|---|
| `audit()` signature | Unchanged and still valid. New params (`category`, `ip`, `userAgent`, `patientId: null`) are **optional additions** — every current call site compiles and behaves the same |
| `ActivityLog.type` (`auto` \| `manual`) | **Kept as-is.** A separate new `category` column is added alongside it, rather than widening `type` and breaking existing rows and the log UI |
| `ActivityLog.patientId` | Stays, and stays populated for patient events. Only becomes *nullable* so non-patient events (login, export) can also be recorded |
| `requireRole("admin")` | Stays working. `requireMinRole()` is added alongside; routes migrate to it gradually, and `admin` keeps every ability it has today |
| Handoff log UI | Keeps rendering exactly what it renders now; new categories are additional rows, not a redesign |
| `canEditPatient()` / privacy lock | Preserved as-is, with the ownership check layered around it |

Rule of thumb for every phase: **existing rows stay valid, existing calls stay valid, existing
screens keep working.** Any migration must be safe to apply to the live database with data in it.

---

## Current State Audit

### Already in place (build on, don't rebuild)

| Capability | Where |
|---|---|
| Structured audit helper with `prevValue` / `newValue` / `action` / `entityType` | `backend/src/lib/audit.ts` |
| `requireAuth` + `requireRole` middleware | `backend/src/middlewares/auth.ts` |
| Admin-only gating on `/admin`, `/crm`, `/admin/settings`, `/reporting/admin` | respective routers |
| Appointment-date editing, already audited with prev → new | `patients.service.ts` `updateAppointment` |
| Patient reassignment, already audited with prev → new | `patients.service.ts` `assign` |
| Per-patient flag history with raise/clear attribution | `PatientFlag` model |
| Privacy-lock concept (a narrow form of ownership) | `canEditPatient()` in `patients.service.ts` |

### Gaps against `task.md`

| # | Gap | Evidence | Severity |
|---|---|---|---|
| G1 | Super Admin role does not exist — enum is `admin \| va` | `schema.prisma:10-13`, `config/roles.ts:1` | Blocking |
| G2 | `patientsService.list()` ignores the caller; every VA sees every patient | `patients.service.ts:134-142` | Critical |
| G3 | `ActivityLog.patientId` is required + cascade-deletes — non-patient events cannot be stored, and deleting a patient destroys its audit trail | `schema.prisma:191-215` | Blocking |
| G4 | `audit()` called in only 2 modules (patients, import). No auth / profile / user-mgmt / settings / export coverage | grep: 3 files | Critical |
| G5 | Activity-log endpoint has no role scoping — a VA can read any actor's or any patient's history via query params | `activity-log.service.ts:5-32` | Critical |
| G6 | `deleteUser(id)` takes only an id: no actor, no self-delete check, no target-role check, no audit | `admin.service.ts:98-106` | Critical |
| G7 | Delete is a single-click confirm in the UI | `admin/dashboard/users/page.tsx:71-74` | High |
| G8 | `User` has no `status` and no `lastLoginAt`; §8 requires both in the user list | `schema.prisma:68-95` | High |
| G9 | Frontend route guard is binary (admin / not-admin) and client-side only | `auth-redirect.tsx:30-43` | Medium |
| G10 | No export-tracking anywhere | reporting module | Medium |
| G11 | Dashboard summary, workload calendar, and reporting are not ownership-scoped for VAs | `dashboard`, `reporting` services | Critical |

---

## Open Decisions — resolve before Phase 1

These change the shape of the work. I have written my recommended default for each so building can
start, but each is genuinely yours to call.

| # | Question | Why it matters | Proposed default |
|---|---|---|---|
| D1 | **Who is the Super Admin?** | Determines the seed, and whether Donna loses or keeps abilities | ✅ **Confirmed** — Donna's existing account is promoted to `super_admin`; `admin` becomes a delegatable tier below her for future staff |
| D2 | **Does VA scoping override the shared-handoff model?** The board is *intentionally* open today (`patients.service.ts:97-101`), and CLAUDE.md's core premise is two VAs on different shifts covering for each other. §17 reverses this. | Jude and Amanda will no longer see each other's cards — handoff gets harder | Apply §17 as written; add an admin-visible "unassigned pool" both VAs share |
| D3 | **What does "Based on permission" mean** in the §17 matrix (VA rows: edit appointment date, add patient, update patient)? A real per-user permission-flags system, or simply "the assigned VA may, others may not"? | A flags system is a whole extra subsystem (schema + admin UI + middleware); assigned-VA-only is ~a day | Assigned-VA-only for now; a `UserPermission` flags table is deferred to a later phase if you want true granularity |
| D4 | **Admin → "Add Admin: Restricted", "Delete VA: Yes/permission"** — can an Admin create another Admin at all? Can an Admin delete a VA unconditionally? | Directly encodes the authorization matrix | Admin **cannot** create or delete Admins; Admin **can** create and delete VAs |
| D5 | **Can an Admin see other Admins' activity in the log?** §17 gives Admin "View activity logs: Yes" but doesn't scope it. | Determines log filter defaults | Admin sees all VA + own activity; only Super Admin sees Admin-on-Admin activity |
| D6 | **IP / device capture** (§ Activity Log Data, "if supported"). This is PHI-adjacent access data under HIPAA. | Adds columns + a retention question | Capture IP + user-agent; document retention in the HIPAA hardening step |
| D7 | CLAUDE.md still says *"3 fixed users, no self-signup."* task.md's user-management section supersedes that. | Doc drift | Update CLAUDE.md at the end of Phase 6 |

---

## Phase 1 — Data Model Foundation ✅ DONE

*Nothing else can be built correctly until the schema can represent three roles and non-patient
events. This phase is pure migration + regeneration, no behaviour change.*

**1.1 Introduce the `super_admin` role**
- Add `super_admin` to the `UserRole` enum (`schema.prisma`).
- Extend `config/roles.ts`: `USER_ROLES`, a `ROLE_RANK` map (`super_admin: 3, admin: 2, va: 1`), and
  helpers `isSuperAdmin()`, `isAdminOrAbove()`, `outranks(a, b)`.
- Migration promotes exactly one existing admin (per D1) to `super_admin`.
- Add a DB-level guard so at least one `super_admin` always survives (partial unique index or a
  `BEFORE DELETE` trigger — belt and braces alongside the service-layer check in Phase 6).

**1.2 Decouple the activity log from patients** *(fixes G3)*
- `ActivityLog.patientId` → **nullable**, FK `onDelete: SetNull` (audit rows must outlive the patient).
- Add columns: `actorRole`, `actorName` (denormalised — survives user deletion), `ipAddress`,
  `userAgent`, and a **new, additional** `category` enum column — `type` (`auto|manual`) is untouched
  so every existing row and every existing query against it keeps working:
  `auth | profile | patient | appointment | user_management | report | system`.
  Existing rows backfill `category = 'patient'` (they're all patient-card events today).
- Index `(actorId, createdAt)` and `(category, createdAt)` for the log filters.

**1.3 Extend `User` for the management screen** *(fixes G8)*
- Add `status` (`active | inactive`), `lastLoginAt`, `createdById`.

**Exit criteria:** migrations apply cleanly, Prisma client regenerates, existing test suite passes,
zero behaviour change visible in the UI.

---

## Phase 2 — Authorization Core ✅ DONE

*One place that answers "may this user do this to this resource?" — so no route has to reinvent it.*

**2.1 Central permission matrix** — `backend/src/config/permissions.ts`, a literal transcription of
§17 into code (`can(user, action, resource?)`). §17 becomes a data structure, not scattered `if`s.

**2.2 Middleware layer** (`middlewares/authorize.ts`)
- `requireMinRole(role)` — rank-based, replaces scattered `requireRole("admin")`.
- `requirePermission(action)` — matrix-driven.
- `requireOwnership(loader)` — loads the resource and applies the ownership rule.
- All failures return a uniform 403 shape and are themselves audited (§18.10).

**2.3 Scoping helpers** — `scopeForUser(user)` returning a Prisma `where` fragment
(VA → `{ OR: [{ assignedTo: user.id }, { assignedTo: null }] }`; Admin/Super Admin → `{}`) so every
list endpoint scopes identically instead of each service hand-rolling it.

**Exit criteria:** matrix unit-tested for all 3 roles × all §17 rows; no route yet changed.

---

## Phase 3 — VA Ownership Scoping *(fixes G2, G11)* ✅ DONE

*Depends on D2.* Apply `scopeForUser` at every read path a VA can reach:

- `GET /api/patients` — scoped list. ✅
- `GET /api/patients/:id` — 404 (not 403 — don't confirm existence) on a patient outside scope. ✅
- `GET /api/dashboard/summary` — stale/flagged counts reflect only the caller's scope. ✅
- Workload calendar / time-grid endpoints — same. ✅
- `GET /api/reporting/me` — already self-only; verify it cannot be widened via params. ✅
- `GET /api/users` & `/users/vas` — decide exposure (needed to *render* assignment names; return
  id + name only, never workload counts). ✅ (emails dropped from both responses)
- Every mutating patient route re-checks ownership **after** loading the row, never trusting the id. ✅

Client-side belt-and-braces: the shared `usePatients()` hook now filters to `assignedTo == self |
null` for VAs, so the board and workload calendar can never render another VA's cards even if a
stale/leaky response ever got through.

**Exit criteria:** an authenticated VA calling every endpoint with a foreign patient id receives
403/404; a second VA's patients never appear in any list payload. ✅

---

## Phase 4 — System-Wide Audit Coverage *(fixes G4)* ✅ DONE

*Depends on Phase 1.2.* Extend `audit()` to accept `patientId: null` + category + request context
(IP/UA), then instrument every event `task.md` §2 names:

| Group | Events |
|---|---|
| **Auth** | login, failed login (with attempted email, never the password), logout, password change, password reset request/complete, account activation/deactivation |
| **Profile** | profile update, name change, email change, avatar change, role change |
| **Patient** | created, info updated (per-field prev → new), reassigned, status changed, stage moved, appointment updated *(partly exists — extend to per-field granularity)* |
| **User mgmt** | user created, deleted, role changed, activated/deactivated, profile updated by another user |
| **Reports** | export: type, scope, record count, format, actor |
| **System** | settings changed, stage/checklist config changed, CRM connect/disconnect, import run |

Add a **redaction list** (§14: "sensitive values should not be unnecessarily exposed") — password
hashes, tokens, and secrets are never written to `prevValue`/`newValue`; phone/email are masked in
the human-readable `message` while remaining queryable in structured fields.

Message format follows the spec's examples verbatim:
`Admin Habib reassigned Patient #1045 from VA John to VA Sarah.`

**Exit criteria:** a scripted walkthrough of every listed action produces exactly one correctly
attributed log row each.

---

## Phase 5 — Activity Log API & UI *(fixes G5)* ✅ DONE

- Scope `activityLogService.list()` by caller: **VA → own `actorId` only, forced server-side** and
  immune to a client-supplied `actorId`/`patientId`; Admin → per D5; Super Admin → everything.
- Add filters: category, action, actor, role, date range, target entity, free-text.
- Log page (`/dashboard/log`, `/admin/dashboard/log`) renders the new categories, prev → new diffs,
  and role badges; VAs get the filter UI but a locked actor scope. ✅
- Log export is itself an auditable export event (Phase 4). ✅

---

## Phase 6 — User Management Hardening *(fixes G6, G7, G8)*

**6.1 Backend delete rules** — `deleteUser(targetId, actor)` rejecting, in order, with distinct errors:
1. `targetId === actor.id` → denied (§10, applies even on a raw API call)
2. `target.role === super_admin` → denied, always, from any origin (§11)
3. `!outranks(actor.role, target.role)` → denied (Admin cannot delete Admin per D4)
4. last-remaining-super-admin guard (§5, redundant with the Phase 1.1 DB guard by design)
5. on success → audit `user.deleted` with the full prior record (minus the password hash)

Same ladder applied to `updateUser`: no self-role-change, no privilege elevation (§18.8, §18.9),
no editing a user who outranks you.

**6.2 Split the admin router** — `/admin/users` operations that create or delete an **Admin** move
behind `requireMinRole("super_admin")`; VA-targeting operations stay at `admin`.

**6.3 Two-step delete modal** (§9) — Step 1: name, email, role, permanence warning, impact, Cancel /
Continue. Step 2: type `DELETE` exactly; button stays disabled until it matches. Super Admin rows
show a protected-account badge with no delete affordance.

**6.4 User list columns** (§8) — name, email, role, status, created date, last login, role-conditional
actions. Add the activate/deactivate toggle; deactivated users are refused at login and audited.

**6.5** Update `CLAUDE.md` to retire the "3 fixed users" statement (D7).

---

## Phase 7 — Frontend RBAC *(fixes G9)*

- Extend the auth slice / `useAuth` to three roles; replace every `role === "admin"` boolean.
- Route guarding: middleware-level, not just the client-side `useEffect` redirect in
  `auth-redirect.tsx` — a VA typing `/admin/dashboard/users` must never render the page shell.
- A `<Can action="...">` component reading the same matrix as the backend, so UI and API agree.
- Sidebar/nav entries filtered by permission, not hard-coded per role.
- **Explicitly still a convenience layer** — §4 and §18.10: every hidden action remains independently
  rejected by the API.

---

## Phase 8 — Verification & Hardening

- **RBAC test matrix**: automated integration tests, every role × every protected endpoint, asserting
  the §17 outcome — including the "frontend-hidden but API-called directly" attacks (§18.10).
- Explicit negative tests for §18.1–3 (self-delete, Super Admin delete, Admin-deletes-Super-Admin)
  and §18.8–9 (self role change, privilege elevation).
- Audit-completeness test: every mutating route produces a log row.
- Run `/security-review` over the full diff.
- HIPAA note: IP/user-agent capture (D6) needs a documented retention policy before go-live.

---

## Dependency Order

```
Phase 1 (schema) ──┬─► Phase 2 (authz core) ──┬─► Phase 3 (VA scoping) ──┐
                   │                          └─► Phase 6 (user mgmt)  ──┤
                   └─► Phase 4 (audit) ──────────► Phase 5 (log API/UI) ─┤
                                                                          └─► Phase 7 (frontend) ─► Phase 8 (verify)
```

Phase 1 blocks everything. Phases 3, 4, and 6 are independent of each other once Phase 2 lands and
can be built in parallel. Phase 7 needs the backend contracts settled. Phase 8 is last.

---

## Explicitly Out of Scope

Per CLAUDE.md, unchanged by `task.md`:
- No clinical data fields of any kind — including in audit payloads.
- No enterprise SSO.
- No self-signup; accounts are created by Super Admin / Admin only.
- The webhook intake endpoint still only **creates**, never updates, and stays on shared-secret auth
  outside the role system.

import type { UserRole } from "@/config/roles";

/**
 * Central permission matrix — a literal transcription of task.md §17 (Final
 * Permission Hierarchy). This is additive: nothing currently in the app reads
 * from this file yet. Existing routes keep using requireAuth/requireRole
 * exactly as they do today. Routes migrate to `can()` one at a time in later
 * phases, so a mistake here cannot silently change behaviour anywhere until
 * a route is deliberately wired to it.
 *
 * `PermissionAction` names mirror the rows of the §17 table. Where §17 says
 * "Based on permission" for a VA (edit appointment date / add patient /
 * update patient), the default (per phase.md D3, confirmed default) is:
 * the assigned VA may act on their own patient, others may not — enforced
 * via ownership checks (see requireOwnership in authorize.ts), not this
 * matrix alone. This matrix answers "is this role even eligible", ownership
 * answers "is this specific resource theirs".
 */
export type PermissionAction =
	| "patients.view_all"
	| "patients.view_assigned"
	| "workload.view_all"
	| "workload.view_assigned"
	| "pipeline.view_all"
	| "pipeline.view_own"
	| "patients.reassign"
	| "appointments.edit_date"
	| "patients.add"
	| "patients.update"
	| "reports.export"
	| "activity_log.view_all"
	| "activity_log.view_own"
	| "users.add_admin"
	| "users.add_va"
	| "users.delete_admin"
	| "users.delete_va"
	| "users.delete_own"
	| "users.delete_super_admin"
	| "users.manage_super_admin"
	| "users.change_own_role";

/** Matches the §17 table's Yes / No / Restricted / "Based on permission" cells. */
export type PermissionLevel = "allow" | "deny" | "restricted" | "conditional";

type PermissionMatrix = Record<PermissionAction, Record<UserRole, PermissionLevel>>;

export const PERMISSIONS: PermissionMatrix = {
	"patients.view_all": { super_admin: "allow", admin: "allow", va: "deny" },
	"patients.view_assigned": { super_admin: "allow", admin: "allow", va: "allow" },
	"workload.view_all": { super_admin: "allow", admin: "allow", va: "deny" },
	"workload.view_assigned": { super_admin: "allow", admin: "allow", va: "allow" },
	"pipeline.view_all": { super_admin: "allow", admin: "allow", va: "deny" },
	"pipeline.view_own": { super_admin: "allow", admin: "allow", va: "allow" },
	"patients.reassign": { super_admin: "allow", admin: "allow", va: "deny" },
	"appointments.edit_date": { super_admin: "allow", admin: "allow", va: "conditional" },
	"patients.add": { super_admin: "allow", admin: "allow", va: "conditional" },
	"patients.update": { super_admin: "allow", admin: "allow", va: "conditional" },
	"reports.export": { super_admin: "allow", admin: "allow", va: "restricted" },
	"activity_log.view_all": { super_admin: "allow", admin: "allow", va: "deny" },
	"activity_log.view_own": { super_admin: "allow", admin: "allow", va: "allow" },
	"users.add_admin": { super_admin: "allow", admin: "restricted", va: "deny" },
	"users.add_va": { super_admin: "allow", admin: "allow", va: "deny" },
	"users.delete_admin": { super_admin: "allow", admin: "deny", va: "deny" },
	"users.delete_va": { super_admin: "allow", admin: "restricted", va: "deny" },
	"users.delete_own": { super_admin: "deny", admin: "deny", va: "deny" },
	"users.delete_super_admin": { super_admin: "deny", admin: "deny", va: "deny" },
	"users.manage_super_admin": { super_admin: "deny", admin: "deny", va: "deny" },
	"users.change_own_role": { super_admin: "deny", admin: "deny", va: "deny" },
};

/**
 * True only for a hard "allow". `restricted`/`conditional` cells require the
 * caller to also pass a resource-ownership or extra-authorization check
 * (requireOwnership, or a dedicated rule like "must be the assigned VA") —
 * `can()` alone is deliberately not enough to grant those.
 */
export function can(role: UserRole, action: PermissionAction): boolean {
	return PERMISSIONS[action][role] === "allow";
}

/** True for "allow" or "restricted"/"conditional" — i.e. the role is eligible at all, pending an ownership/extra check. */
export function mayBeEligible(role: UserRole, action: PermissionAction): boolean {
	return PERMISSIONS[action][role] !== "deny";
}

export function permissionLevel(role: UserRole, action: PermissionAction): PermissionLevel {
	return PERMISSIONS[action][role];
}

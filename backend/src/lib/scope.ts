import type { AuthenticatedUser } from "@/lib/types";

/**
 * Prisma `where` fragment implementing task.md §17's ownership rule for
 * patient-shaped resources: a VA sees their own assigned patients plus the
 * unassigned pool (so a freshly-booked, not-yet-claimed patient stays
 * visible to every VA instead of disappearing); admin and super_admin see
 * everything. Every VA-facing list/read endpoint should merge this into its
 * `where` clause so the rule is defined exactly once.
 *
 * Applied in phase.md Phase 3: patients list/detail, dashboard summary, and
 * every VA-facing read path. The frontend additionally filters usePatients()
 * client-side as belt-and-braces (see web-dashboard usePatients hook).
 */
export function patientScopeFor(user: AuthenticatedUser): Record<string, unknown> {
	if (user.role === "admin" || user.role === "super_admin") return {};
	return { OR: [{ assignedTo: user.id }, { assignedTo: null }] };
}

/**
 * Single-record equivalent of patientScopeFor, for endpoints that already
 * fetched the row by id (GET /:id) and need to decide whether the caller is
 * allowed to see it at all. Admin/super_admin are always in scope.
 */
export function isPatientInScope(patient: { assignedTo: string | null }, user: AuthenticatedUser): boolean {
	if (user.role === "admin" || user.role === "super_admin") return true;
	return patient.assignedTo === null || patient.assignedTo === user.id;
}

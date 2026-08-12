import { describe, expect, it } from "vitest";

import { can, PERMISSIONS, permissionLevel, type PermissionAction } from "@/config/permissions";
import { USER_ROLES } from "@/config/roles";

// Transcription of task.md §17 (Final Permission Hierarchy) — every row,
// every role. Kept intentionally verbose/explicit (no loops building the
// expectation) so a future edit to the matrix has to consciously touch a
// matching line here.
const EXPECTED: Record<PermissionAction, { super_admin: string; admin: string; va: string }> = {
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

describe("permission matrix (task.md §17)", () => {
	for (const [action, roles] of Object.entries(EXPECTED) as [PermissionAction, Record<string, string>][]) {
		for (const role of USER_ROLES) {
			it(`${action} — ${role} → ${roles[role]}`, () => {
				expect(permissionLevel(role, action)).toBe(roles[role]);
			});
		}
	}

	it("every action has an entry for every role (no silent gaps)", () => {
		for (const action of Object.keys(PERMISSIONS) as PermissionAction[]) {
			for (const role of USER_ROLES) {
				expect(PERMISSIONS[action][role]).toBeDefined();
			}
		}
	});

	describe("critical security rules (§18)", () => {
		it("no one can delete their own account (§18.1, §10)", () => {
			for (const role of USER_ROLES) expect(can(role, "users.delete_own")).toBe(false);
		});

		it("Super Admin can never be deleted, by anyone (§18.2, §11)", () => {
			for (const role of USER_ROLES) expect(can(role, "users.delete_super_admin")).toBe(false);
		});

		it("Admin cannot delete Super Admin (§18.3)", () => {
			expect(can("admin", "users.delete_super_admin")).toBe(false);
		});

		it("Admin cannot delete another Admin outright — only Super Admin can (§18.3, §6, §17)", () => {
			expect(can("admin", "users.delete_admin")).toBe(false);
			expect(can("super_admin", "users.delete_admin")).toBe(true);
		});

		it("VA cannot see system-wide pipeline/patients/workload/reports/logs (§18.6, §18.7)", () => {
			expect(can("va", "patients.view_all")).toBe(false);
			expect(can("va", "pipeline.view_all")).toBe(false);
			expect(can("va", "workload.view_all")).toBe(false);
			expect(can("va", "activity_log.view_all")).toBe(false);
			expect(permissionLevel("va", "reports.export")).not.toBe("allow");
		});

		it("no one can change their own role / elevate privileges (§18.8, §18.9)", () => {
			for (const role of USER_ROLES) expect(can(role, "users.change_own_role")).toBe(false);
		});

		it("Super Admin's own account cannot be 'managed' via the normal path (§11)", () => {
			for (const role of USER_ROLES) expect(can(role, "users.manage_super_admin")).toBe(false);
		});
	});
});

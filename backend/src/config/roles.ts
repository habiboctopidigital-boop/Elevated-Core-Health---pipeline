export const USER_ROLES = ["super_admin", "admin", "va"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** @deprecated kept for existing call sites — "admin" alone no longer covers super_admin. Prefer isAdminOrAbove(). */
export const ADMIN_ROLES: readonly UserRole[] = ["admin"];

/** @deprecated role === "admin" no longer implies the highest tier. Prefer isAdminOrAbove() / isSuperAdmin(). */
export const isAdmin = (role: UserRole): boolean => ADMIN_ROLES.includes(role);

/** Relative rank — higher outranks lower. Used for delete/edit authority checks (task.md §17-§18). */
export const ROLE_RANK: Record<UserRole, number> = {
	super_admin: 3,
	admin: 2,
	va: 1,
};

export const isSuperAdmin = (role: UserRole): boolean => role === "super_admin";

/** True for admin and super_admin — the two tiers that have "admin-ish" access today. */
export const isAdminOrAbove = (role: UserRole): boolean => ROLE_RANK[role] >= ROLE_RANK.admin;

/** True if `role` strictly outranks `target` (e.g. can this role delete/edit a user with that role). */
export const outranks = (role: UserRole, target: UserRole): boolean => ROLE_RANK[role] > ROLE_RANK[target];

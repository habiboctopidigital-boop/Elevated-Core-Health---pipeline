export const USER_ROLES = ["admin", "va"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES: readonly UserRole[] = ["admin"];

export const isAdmin = (role: UserRole): boolean => ADMIN_ROLES.includes(role);

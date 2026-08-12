import type { UserRole } from "@/types"

/**
 * Relative rank — mirrors backend/src/config/roles.ts. Used so "admin" checks
 * across the app (route redirects, admin-only UI) keep working for
 * super_admin without every call site needing an update. Full permission-
 * matrix-driven UI gating (task.md §4, §17) lands in a later phase — this is
 * the minimal fix that keeps existing admin screens from breaking.
 */
export const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 3,
  admin: 2,
  va: 1,
}

export const isSuperAdmin = (role?: UserRole | null): boolean => role === "super_admin"

/** True for admin and super_admin — replaces bare `role === "admin"` checks. */
export const isAdminOrAbove = (role?: UserRole | null): boolean =>
  !!role && ROLE_RANK[role] >= ROLE_RANK.admin

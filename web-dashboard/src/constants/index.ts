export const ROLES = {
  ADMIN: "admin" as const,
  VA: "va" as const,
}

export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: {
    HOME: "/dashboard",
    BOARD: "/dashboard/board",
    LOG: "/dashboard/log",
    SOP: "/dashboard/sop",
    REPORTING: "/dashboard/reporting",
    IMPORT: "/dashboard/import",
    PROFILE: "/dashboard/profile",
  },
  ADMIN: {
    HOME: "/admin/dashboard",
    BOARD: "/admin/dashboard/board",
    LOG: "/admin/dashboard/log",
    SOP: "/admin/dashboard/sop",
    REPORTING: "/admin/dashboard/reporting",
    IMPORT: "/admin/dashboard/import",
    USERS: "/admin/dashboard/users",
    STAGES: "/admin/dashboard/stages",
    CRM: "/admin/dashboard/crm",
    ELIGIBILITY: "/admin/dashboard/eligibility",
    PROFILE: "/admin/dashboard/profile",
  },
}

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
    LOGOUT: "/auth/logout",
    PROFILE: "/auth/profile",
    CHANGE_PASSWORD: "/auth/change-password",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  STAGES: "/stages",
  PATIENTS: "/patients",
  PATIENTS_INTAKE: "/patients/intake",
  PATIENTS_INTAKE_TEST: "/patients/intake-test",
  PATIENTS_IMPORT: "/patients/import",
  PATIENTS_IMPORT_APPLY: "/patients/import/apply",
  PATIENTS_IMPORT_HISTORY: "/patients/import/history",
  CRM: {
    CONTACTS: "/crm/contacts",
    EXPORT: "/crm/contacts/export",
  },
  REPORTING: {
    ADMIN: "/reporting/admin",
    ME: "/reporting/me",
    VA: (id: string) => `/reporting/va/${id}`,
  },
  PATIENT_CHECK_ELIGIBILITY: (id: string) => `/patients/${id}/check-eligibility`,
  ACTIVITY_LOG: "/activity-log",
  DASHBOARD_SUMMARY: "/dashboard/summary",
  ADMIN: {
    USERS: "/admin/users",
    STAGES: "/admin/stages",
    CHECKLIST_ITEMS: "/admin/checklist-items",
    ELIGIBILITY_RULES: "/admin/eligibility-rules",
    ANALYTICS: "/admin/analytics",
  },
}

export const QUERY_KEYS = {
  AUTH: {
    ME: ["auth", "me"] as const,
  },
  PATIENTS: {
    ALL: ["patients"] as const,
    DETAIL: (id: string) => ["patients", id] as const,
    CHECKLIST_ITEMS: ["checklist-items"] as const,
  },
  ACTIVITY_LOG: {
    LIST: (params?: string) => ["activity-log", params] as const,
  },
  CRM: {
    CONTACTS: ["crm", "contacts"] as const,
  },
  REPORTING: {
    ADMIN: ["reporting", "admin"] as const,
    ME: ["reporting", "me"] as const,
    VA: (id: string) => ["reporting", "va", id] as const,
  },
  IMPORT: {
    HISTORY: ["import", "history"] as const,
  },
  DASHBOARD: {
    SUMMARY: ["dashboard", "summary"] as const,
  },
  STAGES: ["stages"] as const,
  ADMIN: {
    USERS: ["admin", "users"] as const,
    STAGES: ["admin", "stages"] as const,
    ANALYTICS: ["admin", "analytics"] as const,
    ELIGIBILITY_RULES: ["admin", "eligibility-rules"] as const,
  },
}

export const STALE_HOURS = 48

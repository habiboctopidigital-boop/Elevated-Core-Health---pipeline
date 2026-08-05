export type UserRole = "admin" | "va"

// Stages are DB-driven now — a stage key is just a stable string slug
// (e.g. "onboarding"). The API returns the full list via GET /stages.
export type PatientStage = string

export interface PipelineStage {
  id: string
  key: string
  name: string
  hint: string | null
  sortOrder: number
  isFinal: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  shift?: string | null
  createdAt?: string
}

export type ChecklistStatus = "required" | "optional"

export type EligibilityStatus = "not_checked" | "eligible" | "not_eligible"

export interface ChecklistItemDef {
  id: string
  label: string
  description?: string | null
  status: ChecklistStatus
  isDefault: boolean
  sortOrder: number
  stage: PatientStage
}

export interface EligibilityRule {
  id: string
  label: string
  field: string
  operator: "is_not_empty" | "is_empty" | "equals" | "contains"
  value?: string | null
  isActive: boolean
  createdAt: string
}

export interface EligibilityDetails {
  vob?: Record<string, unknown>
  evaluatedRules?: number
}

export interface Patient {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  stage: PatientStage
  assignedTo?: string | null
  assignedUser?: Pick<User, "id" | "name"> | null
  notes?: string | null
  checklistState: Record<string, Record<string, boolean>>
  isFlagged: boolean
  flagReason?: string | null
  flaggedByUser?: Pick<User, "id" | "name"> | null
  flaggedAt?: string | null
  flagClearedReason?: string | null
  flagClearedByUser?: Pick<User, "id" | "name"> | null
  flagClearedAt?: string | null
  source: string
  bookingPlatform?: string | null
  appointmentDatetime?: string | null
  paymentMethod?: string | null
  insuranceProvider?: string | null
  paymentDetails?: Record<string, unknown> | null
  eligibilityStatus: EligibilityStatus
  eligibilityCheckedAt?: string | null
  eligibilityDetails?: EligibilityDetails | null
  eligibilityReason?: string | null
  updatedAt: string
  createdAt: string
  activityLogs?: ActivityLog[]
}

export interface ActivityLog {
  id: string
  patientId: string
  author: string
  message: string
  type: "auto" | "manual"
  createdAt: string
  patient?: Pick<Patient, "id" | "name">
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

export interface DashboardSummary {
  staleCount: number
  flaggedCount: number
  allCaughtUp: boolean
}

export interface PaginatedResponse<T> {
  logs: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface VaUser {
  id: string
  name: string
  email: string
}

export interface AdminAnalytics {
  patientsPerStage: Record<string, number>
  vaLoad: Array<{ id: string; name: string; patientCount: number }>
  reconciledThisWeek: number
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  statusCode: number
}

// Static fallback used while stages load from the API — never the source of truth.
export const DEFAULT_STAGES: PipelineStage[] = [
  { id: "stage_onboarding", key: "onboarding", name: "Onboarding", hint: "Scheduled on calendar", sortOrder: 0, isFinal: false, isActive: true },
  { id: "stage_visit_complete", key: "visit_complete", name: "Visit Complete", hint: "Encounter finished", sortOrder: 1, isFinal: false, isActive: true },
  { id: "stage_post_visit_docs", key: "post_visit_docs", name: "Post-Visit Docs", hint: "Letter + labs sent", sortOrder: 2, isFinal: false, isActive: true },
  { id: "stage_chart_signed", key: "chart_signed", name: "Chart Signed", hint: "Optimantra finalized", sortOrder: 3, isFinal: false, isActive: true },
  { id: "stage_sent_to_billing", key: "sent_to_billing", name: "Sent to Billing", hint: "Claim submitted", sortOrder: 4, isFinal: false, isActive: true },
  { id: "stage_payment_posted", key: "payment_posted", name: "Payment Posted", hint: "Payment received", sortOrder: 5, isFinal: false, isActive: true },
  { id: "stage_reconciled", key: "reconciled", name: "Reconciled", hint: "Closed out", sortOrder: 6, isFinal: true, isActive: true },
]

export const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_STAGES.map((s) => [s.key, s.name]),
)

export const STAGE_HINTS: Record<string, string> = Object.fromEntries(
  DEFAULT_STAGES.map((s) => [s.key, s.hint ?? ""]),
)

export const STAGE_ORDER: string[] = DEFAULT_STAGES.map((s) => s.key)

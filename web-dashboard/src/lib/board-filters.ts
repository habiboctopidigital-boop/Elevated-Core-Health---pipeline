import type { Patient } from "@/types"

/**
 * Shared board filtering — single source of truth for the global filter bar
 * (search + status + date ranges). Both the VA board page and the admin board
 * page apply these filters across EVERY stage column, so a patient in
 * "onboarding" and one in "reconciled" are filtered identically.
 */

export type BoardFilterMode = "all" | "stale" | "flagged"

export interface BoardFilters {
  /** Free-text search on patient name. */
  search: string
  /** Global status mode. */
  mode: BoardFilterMode
  /** Assigned VA user id, or "" for all (admin board only). */
  assignedTo: string
  /** Appointment date range (inclusive), "YYYY-MM-DD" or "" when unset. */
  appointmentFrom: string
  appointmentTo: string
  /** Created / came-in date range (inclusive), "YYYY-MM-DD" or "" when unset. */
  createdFrom: string
  createdTo: string
}

export const EMPTY_BOARD_FILTERS: BoardFilters = {
  search: "",
  mode: "all",
  assignedTo: "",
  appointmentFrom: "",
  appointmentTo: "",
  createdFrom: "",
  createdTo: "",
}

/**
 * A card is stale when it hasn't been updated in 48h+ and isn't in a final
 * stage (reconciled) — mirrors the backend's computed stale rule.
 */
export function isPatientStale(p: Patient, now = Date.now()): boolean {
  if (p.stage === "reconciled") return false
  const hours = (now - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60)
  return hours > 48
}

/**
 * True when `dateStr` (an ISO timestamp) falls inside the inclusive
 * [from, to] day range. A range with only one bound is treated as open-ended.
 *
 * ISO timestamps parse as UTC while date-picker bounds are local midnight, so
 * Date-based comparisons can misclassify a card by one day near midnight —
 * compare the date-only prefix as strings instead, which is timezone-proof.
 */
export function isDateInRange(
  dateStr: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true
  if (!dateStr) return false

  const day = dateStr.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  }

  // Non-ISO fallback: bound the parsed instant to the local day range.
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  if (from && d < new Date(`${from}T00:00:00`)) return false
  if (to && d > new Date(`${to}T23:59:59.999`)) return false
  return true
}

/** Applies the global filter bar across all stages. */
export function filterPatients(patients: Patient[], filters: BoardFilters): Patient[] {
  const q = filters.search.trim().toLowerCase()
  return patients.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false
    if (filters.mode === "stale" && !isPatientStale(p)) return false
    if (filters.mode === "flagged" && !p.isFlagged) return false
    if (filters.assignedTo && p.assignedTo !== filters.assignedTo) return false
    if (!isDateInRange(p.appointmentDatetime, filters.appointmentFrom, filters.appointmentTo)) return false
    if (!isDateInRange(p.createdAt, filters.createdFrom, filters.createdTo)) return false
    return true
  })
}

/** Number of non-default filter groups currently applied (for the reset badge). */
export function activeFilterCount(filters: BoardFilters): number {
  let count = 0
  if (filters.search.trim()) count++
  if (filters.mode !== "all") count++
  if (filters.assignedTo) count++
  if (filters.appointmentFrom || filters.appointmentTo) count++
  if (filters.createdFrom || filters.createdTo) count++
  return count
}

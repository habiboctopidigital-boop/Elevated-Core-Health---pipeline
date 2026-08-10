"use client"

import { useCallback, useMemo, useState } from "react"
import { usePatients } from "@/hooks/query/usePatients"
import { useAuth } from "@/hooks/auth/useAuth"
import { STALE_HOURS } from "@/constants"
import type { Patient } from "@/types"

export interface Notification {
  id: string
  message: string
  type: "flag" | "stale" | "assignment" | "onboarding" | "success" | "info"
  timestamp: Date
  read: boolean
}

/** How many of each derived kind to surface — a VA with 40 stale cards shouldn't get
 *  a 40-item dropdown; the board's own stale/flagged counts already cover "how many". */
const MAX_PER_KIND = 8
const NEW_PATIENT_WINDOW_HOURS = 24

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function hoursSince(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
}

/** Notifications are derived live from the same `patients` data every board/card in the
 *  app already reads from Postgres via `usePatients()` — there is no separate, static,
 *  or mocked notification list. `addNotification` still exists for same-tick optimistic
 *  feedback (e.g. "patient added" the instant the dialog closes, before the list
 *  refetches) — those transient entries are merged in on top of the derived ones. */
export function useNotifications() {
  const { isAuthenticated } = useAuth()
  // Gated on auth — this provider is mounted at the app root (it also wraps /login), so
  // without this it would fire an authenticated patients request before anyone signs in.
  const { data: patients } = usePatients(undefined, { enabled: isAuthenticated })
  const [transient, setTransient] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const derived = useMemo<Notification[]>(() => {
    if (!isAuthenticated || !patients) return []
    const list: Notification[] = []

    const flagged = patients
      .filter((p): p is Patient & { flagReason: string } => p.isFlagged && !!p.flagReason)
      .sort((a, b) => new Date(b.flaggedAt ?? b.updatedAt).getTime() - new Date(a.flaggedAt ?? a.updatedAt).getTime())
      .slice(0, MAX_PER_KIND)
    for (const p of flagged) {
      list.push({
        id: `flag-${p.id}`,
        message: `${p.name} flagged: ${truncate(p.flagReason, 60)}`,
        type: "flag",
        timestamp: new Date(p.flaggedAt ?? p.updatedAt),
        read: readIds.has(`flag-${p.id}`),
      })
    }

    const stale = patients
      .filter((p) => p.stage !== "reconciled" && hoursSince(p.updatedAt) > STALE_HOURS)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .slice(0, MAX_PER_KIND)
    for (const p of stale) {
      list.push({
        id: `stale-${p.id}`,
        message: `${p.name} hasn't moved in ${Math.floor(hoursSince(p.updatedAt))}h`,
        type: "stale",
        timestamp: new Date(p.updatedAt),
        read: readIds.has(`stale-${p.id}`),
      })
    }

    const newPatients = patients
      .filter((p) => hoursSince(p.createdAt) <= NEW_PATIENT_WINDOW_HOURS)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_PER_KIND)
    for (const p of newPatients) {
      list.push({
        id: `new-${p.id}`,
        message: `New patient added: ${p.name}`,
        type: "onboarding",
        timestamp: new Date(p.createdAt),
        read: readIds.has(`new-${p.id}`),
      })
    }

    return list
  }, [isAuthenticated, patients, readIds])

  const notifications = useMemo(
    () =>
      [...transient, ...derived].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [transient, derived],
  )

  const addNotification = useCallback((message: string, type: Notification["type"] = "info") => {
    const id = `manual-${Date.now()}`
    setTransient((prev) => [{ id, message, type, timestamp: new Date(), read: false }, ...prev])
    return id
  }, [])

  const markAsRead = useCallback((id: string) => {
    if (id.startsWith("manual-")) {
      setTransient((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } else {
      setReadIds((prev) => new Set(prev).add(id))
    }
  }, [])

  const markAllAsRead = useCallback(() => {
    setTransient((prev) => prev.map((n) => ({ ...n, read: true })))
    setReadIds((prev) => {
      const next = new Set(prev)
      for (const n of derived) next.add(n.id)
      return next
    })
  }, [derived])

  const removeNotification = useCallback((id: string) => {
    setTransient((prev) => prev.filter((n) => n.id !== id))
    // Derived notifications aren't "removable" (they reflect real state — the flag/stale
    // condition still exists), but dismiss reads the same as marking them read.
    setReadIds((prev) => new Set(prev).add(id))
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    unreadCount,
  }
}

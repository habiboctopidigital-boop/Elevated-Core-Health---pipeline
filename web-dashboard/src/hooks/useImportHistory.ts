"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "ech_import_history"

export interface ImportHistoryEntry {
  id: string
  fileName: string
  fileType: string
  fileSize: string
  totalRows: number
  columns: string[]
  status: "success"
  timestamp: string
}

function getSnapshot(): ImportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function subscribe(callback: () => void): () => void {
  const handler = () => callback()
  window.addEventListener("storage", handler)
  return () => window.removeEventListener("storage", handler)
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function useImportHistory() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const addEntry = useCallback((entry: ImportHistoryEntry) => {
    try {
      const current = getSnapshot()
      const updated = [entry, ...current]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      emit()
    } catch {
      // localStorage full or unavailable
    }
  }, [])

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    emit()
  }, [])

  const removeEntry = useCallback((id: string) => {
    const current = getSnapshot()
    const updated = current.filter((e) => e.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    emit()
  }, [])

  return { entries, addEntry, clearHistory, removeEntry }
}

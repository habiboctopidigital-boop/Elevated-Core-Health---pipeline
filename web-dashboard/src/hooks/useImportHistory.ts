"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "ech_import_history"

export interface ImportHistoryEntry {
  id: string
  fileName: string
  fileType: string
  fileSize: string
  totalRows: number
  columns: string[]
  previewRows: Record<string, string | undefined>[]
  status: "success"
  timestamp: string
}

function readStorage(): ImportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useImportHistory() {
  const [entries, setEntries] = useState<ImportHistoryEntry[]>(readStorage)

  const sync = useCallback(() => {
    setEntries(readStorage())
  }, [])

  useEffect(() => {
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [sync])

  const addEntry = useCallback(
    (entry: ImportHistoryEntry) => {
      try {
        const current = readStorage()
        const updated = [entry, ...current]
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        setEntries(updated)
      } catch {
        // localStorage full or unavailable
      }
    },
    [],
  )

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setEntries([])
  }, [])

  const removeEntry = useCallback((id: string) => {
    const current = readStorage()
    const updated = current.filter((e) => e.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setEntries(updated)
  }, [])

  return { entries, addEntry, clearHistory, removeEntry }
}

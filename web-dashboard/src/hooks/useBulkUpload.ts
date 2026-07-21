"use client"

import { useState, useRef, useCallback } from "react"
import { ImportService, type ParsedRow } from "@/services/import.service"
import { useImportHistory, type ImportHistoryEntry } from "./useImportHistory"

const ALLOWED_TYPES = ".csv,.xlsx,.xls"
const MAX_SIZE = 10 * 1024 * 1024

export type UploadState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "selected"; file: File }
  | { status: "uploading"; file: File; progress: number }
  | { status: "success"; file: File; result: { totalRows: number; data: ParsedRow[] } }
  | { status: "error"; file: File; message: string }

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

let idCounter = 0
function genId() {
  return `import-${Date.now()}-${++idCounter}`
}

export function useBulkUpload() {
  const [state, setState] = useState<UploadState>({ status: "idle" })
  const inputRef = useRef<HTMLInputElement>(null)
  const { addEntry } = useImportHistory()

  const reset = useCallback(() => {
    setState({ status: "idle" })
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const handleFile = useCallback((file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(ext)) {
      setState({ status: "error", file, message: "Unsupported file type. Accepted: .csv, .xlsx, .xls" })
      return
    }
    if (file.size > MAX_SIZE) {
      setState({ status: "error", file, message: `File exceeds 10 MB limit (${formatFileSize(file.size)})` })
      return
    }
    if (file.size === 0) {
      setState({ status: "error", file, message: "File is empty." })
      return
    }
    setState({ status: "selected", file })
  }, [])

  const upload = useCallback(async () => {
    if (state.status !== "selected") return
    const { file } = state
    setState({ status: "uploading", file, progress: 0 })

    try {
      const result = await ImportService.uploadFile(file)
      setState({ status: "success", file, result })

      const columns = result.data.length > 0 ? Object.keys(result.data[0]) : []
      const entry: ImportHistoryEntry = {
        id: genId(),
        fileName: file.name,
        fileType: (ext() || "unknown").replace(".", ""),
        fileSize: formatFileSize(file.size),
        totalRows: result.totalRows,
        columns,
        status: "success",
        timestamp: new Date().toISOString(),
      }
      addEntry(entry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Please try again."
      setState({ status: "error", file, message })
    }
  }, [state, addEntry])

  function ext() {
    if (state.status === "idle") return ""
    return "." + state.file.name.split(".").pop()?.toLowerCase()
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setState({ status: "idle" })
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState((s) => (s.status === "idle" || s.status === "dragging" ? { status: "dragging" } : s))
  }, [])

  const onDragLeave = useCallback(() => {
    setState((s) => (s.status === "dragging" ? { status: "idle" } : s))
  }, [])

  return {
    state,
    inputRef,
    reset,
    handleFile,
    upload,
    onDrop,
    onDragOver,
    onDragLeave,
  }
}

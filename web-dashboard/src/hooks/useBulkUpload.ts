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
  | { status: "uploading"; file: File }
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

function getExt(name: string) {
  const parts = name.split(".")
  return parts.length > 1 ? (parts.pop() ?? "").toLowerCase() : ""
}

export function useBulkUpload() {
  const [state, setState] = useState<UploadState>({ status: "idle" })
  const inputRef = useRef<HTMLInputElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const { addEntry } = useImportHistory()

  const reset = useCallback(() => {
    setState({ status: "idle" })
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  const handleFile = useCallback((file: File) => {
    const ext = "." + getExt(file.name)
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
    const current = stateRef.current
    if (current.status !== "selected") return
    const { file } = current
    setState({ status: "uploading", file })

    try {
      const result = await ImportService.uploadFile(file)
      console.log("=== PARSED IMPORT DATA ===", { fileName: file.name, totalRows: result.totalRows, data: result.data })
      setState({ status: "success", file, result })

      const previewRows = result.data.slice(0, 20)
      const columns = result.data.length > 0 ? Object.keys(result.data[0]) : []
      const entry: ImportHistoryEntry = {
        id: genId(),
        fileName: file.name,
        fileType: getExt(file.name).toUpperCase(),
        fileSize: formatFileSize(file.size),
        totalRows: result.totalRows,
        columns,
        previewRows,
        status: "success",
        timestamp: new Date().toISOString(),
      }
      addEntry(entry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Please try again."
      setState({ status: "error", file, message })
    }
  }, [addEntry])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState({ status: "dragging" })
  }, [])

  const onDragLeave = useCallback(() => {
    setState({ status: "idle" })
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

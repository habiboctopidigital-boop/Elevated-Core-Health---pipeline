"use client"

import { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ImportService, type ParsedRow } from "@/services/import.service"
import { useApplyImport } from "@/hooks/query/useCrm"
import type { ImportBatch } from "@/types"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  X,
  Loader2,
  ArrowDown,
  Table,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ALLOWED_TYPES = ".csv,.xlsx,.xls"
const MAX_SIZE = 10 * 1024 * 1024

type UploadState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "selected"; file: File }
  | { status: "uploading"; file: File }
  | { status: "success"; file: File; result: { totalRows: number; data: ParsedRow[] } }
  | { status: "error"; file: File; message: string }

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImportDialog() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<UploadState>({ status: "idle" })
  const inputRef = useRef<HTMLInputElement>(null)

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
    setState({ status: "uploading", file })

    try {
      const result = await ImportService.uploadFile(file)
      setState({ status: "success", file, result })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed. Please try again."
      setState({ status: "error", file, message })
    }
  }, [state])

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

  const onClose = useCallback(
    (open: boolean) => {
      setOpen(open)
      if (!open) setTimeout(reset, 300)
    },
    [reset],
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 h-9 px-3 rounded-xl bg-white text-[#374151] hover:bg-[#EBF7EC] hover:border-[#036638]/30 hover:text-[#036638] hover:shadow-sm transition-all"
        >
          <Upload className="w-3.5 h-3.5 text-[#036638]" />
          <span className="hidden sm:inline">Patients Import</span>
          <span className="sm:hidden">Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        hideAccent
        closeButtonClassName="bg-white/15 text-white hover:bg-white/25 hover:text-white"
        className="sm:max-w-2xl lg:max-w-3xl gap-0 p-0 overflow-hidden border-0 shadow-2xl rounded-3xl flex flex-col max-h-[88vh]"
      >
        {/* Gradient brand header band */}
        <div className="relative overflow-hidden bg-gradient-to-r border-none from-[#036638] via-[#0a7a44] to-emerald-600 px-5 pt-5 pb-5 pr-12 shrink-0">
          {/* Decorative bubbles */}
          <div className="absolute -right-10 -top-12 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -right-2 -top-3 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="flex items-start gap-3 relative">
            <div className="w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0 shadow-lg shadow-black/5">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold text-white tracking-tight">Import Patients</DialogTitle>
              <p className="text-xs text-emerald-50/90 mt-0.5">Upload .csv, .xlsx, or .xls files</p>
            </div>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {state.status === "success" ? (
            <SuccessView result={state.result} file={state.file} onReset={reset} />
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200",
                  state.status === "dragging"
                    ? "border-[#036638] bg-[#EBF7EC] scale-[1.02]"
                    : state.status === "selected" || state.status === "uploading"
                      ? "border-[#036638]/40 bg-[#EBF7EC]/20"
                      : "border-[#E5E7EB] bg-white hover:border-[#036638]/30 hover:bg-[#EBF7EC]/10",
                )}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ALLOWED_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                  }}
                />

                {state.status === "uploading" ? (
                  <div className="py-4">
                    <Loader2 className="w-10 h-10 text-[#036638] mx-auto mb-3 animate-spin" />
                    <p className="text-sm font-medium text-[#374151]">Uploading & parsing...</p>
                    <p className="text-xs text-[#6B7280] mt-1">{state.file.name}</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EBF7EC] to-[#FBE7B2] ring-1 ring-[#036638]/10 shadow-[var(--shadow-sm)] flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6 text-[#036638]" />
                    </div>
                    <p className="text-sm font-semibold text-[#374151]">
                      {state.status === "dragging" ? "Drop file here" : "Drag & drop your file here"}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1.5">.csv, .xlsx, .xls up to 10 MB</p>
                    {state.status !== "dragging" && (
                      <span className="inline-flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#036638] to-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/25">
                        <Upload className="w-3 h-3" />
                        Browse files
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Selected file info */}
              {(state.status === "selected" || state.status === "error") && (
                <div className="mt-4">
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border",
                      state.status === "error"
                        ? "bg-red-50 border-red-100"
                        : "bg-[#EBF7EC]/40 border-[#FBE7B2]/50",
                    )}
                  >
                    <FileSpreadsheet
                      className={cn(
                        "w-8 h-8 shrink-0",
                        state.status === "error" ? "text-red-400" : "text-[#036638]",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#374151] truncate">
                        {state.status === "selected" ? state.file.name : state.file.name}
                      </p>
                      <p className="text-xs text-[#6B7280]">{formatFileSize(state.file.size)}</p>
                    </div>
                    <button
                      onClick={reset}
                      className="p-1 rounded-lg hover:bg-black/5 transition-colors"
                    >
                      <X className="w-4 h-4 text-[#6B7280]" />
                    </button>
                  </div>

                  {/* Error message */}
                  {state.status === "error" && (
                    <div className="flex items-start gap-2 mt-2 px-3 py-2 text-xs text-red-600 bg-red-50 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{state.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {state.status === "selected" && (
                <div className="flex justify-end gap-2 mt-5">
                  <Button variant="outline" size="sm" onClick={reset} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={upload}
                    className="gap-1.5 bg-[#036638] hover:bg-[#025030] text-white text-xs shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload & Parse
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

      <div className="px-5 py-3 bg-[#F8FAF9] border-t border-[#EDEFF2] flex items-center gap-4 text-[10px] text-[#6B7280] shrink-0">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          Max 10 MB
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          Preview first
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          Imports create patients
        </span>
      </div>
      </DialogContent>
    </Dialog>
  )
}

function SuccessView({
  result,
  file,
  onReset,
}: {
  result: { totalRows: number; data: ParsedRow[] }
  file: File
  onReset: () => void
}) {
  const applyImport = useApplyImport()
  const [importing, setImporting] = useState(false)
  const [applied, setApplied] = useState<ImportBatch | null>(null)
  const previewRows = result.data.slice(0, 8)
  const columns = result.data.length > 0 ? Object.keys(result.data[0]) : []

  if (applied) {
    return <ImportResultsView batch={applied} onDone={onReset} />
  }

  return (
    <div className="space-y-4">
      {/* Success banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">File parsed successfully</p>
          <p className="text-xs text-green-600 mt-0.5">
            {result.totalRows} row{result.totalRows !== 1 ? "s" : ""} found in {file.name}
          </p>
        </div>
      </div>

      {/* Column preview */}
      {columns.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Table className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
              Columns ({columns.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((col) => (
              <span
                key={col}
                className="text-[10px] font-mono bg-[#EBF7EC]/60 text-[#036638] px-2 py-0.5 rounded-md border border-[#FBE7B2]/50"
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Data preview */}
      {previewRows.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDown className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
              Preview (first {previewRows.length})
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-3 py-2">#</th>
                  {columns.slice(0, 8).map((col) => (
                    <th
                      key={col}
                      className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-3 py-2 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                  {columns.length > 8 && (
                    <th className="text-left text-[10px] font-semibold text-[#6B7280] px-3 py-2">
                      +{columns.length - 8} more
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-[#E5E7EB]/50 last:border-0 hover:bg-[#EBF7EC]/20">
                    <td className="text-[#6B7280] px-3 py-2">{i + 1}</td>
                    {columns.slice(0, 8).map((col) => (
                      <td key={col} className="text-[#374151] px-3 py-2 max-w-[200px] truncate whitespace-nowrap">
                        {row[col] || <span className="text-[#B0B0B0] italic">-</span>}
                      </td>
                    ))}
                    {columns.length > 8 && <td className="text-[#6B7280] px-3 py-2">-</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          className="text-xs"
        >
          Import Another
        </Button>
        {result.totalRows > 0 && (
          <Button
            size="sm"
            onClick={async () => {
              setImporting(true)
              try {
                const batch = await applyImport.mutateAsync({
                  rows: result.data,
                  fileName: file.name,
                  fileType: (file.name.split(".").pop() || "csv").toLowerCase() as "csv" | "xlsx" | "xls",
                })
                // Show what happened row-by-row instead of jumping straight back
                // to the upload screen — "0 imported, 2 duplicates skipped" reads
                // as a bug report until you can see *which* existing patient each
                // row matched.
                setApplied(batch)
              } finally {
                setImporting(false)
              }
            }}
            disabled={importing || applyImport.isPending}
            className="bg-[#036638] hover:bg-[#025030] text-white text-xs gap-1.5"
          >
            <Loader2 className={cn("w-3.5 h-3.5", (importing || applyImport.isPending) && "animate-spin")} />
            {importing || applyImport.isPending
              ? "Importing..."
              : `Import ${result.totalRows} Contact${result.totalRows === 1 ? "" : "s"}`}
          </Button>
        )}
      </div>
    </div>
  )
}

/** Shown right after "Import" — a per-row breakdown so a duplicate skip is
 *  something the user can verify (which existing patient it matched), not an
 *  unexplained "0 imported". */
function ImportResultsView({ batch, onDone }: { batch: ImportBatch; onDone: () => void }) {
  const details = batch.errorDetails ?? []
  const duplicates = details.filter((d) => d.type === "duplicate")
  const failures = details.filter((d) => d.type !== "duplicate")

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-3 text-center">
          <p className="text-2xl font-bold text-green-700 tabular-nums">{batch.successCount}</p>
          <p className="text-[10px] font-semibold text-green-700/80 uppercase tracking-wider mt-0.5">Imported</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-center">
          <p className="text-2xl font-bold text-amber-700 tabular-nums">{batch.duplicateCount}</p>
          <p className="text-[10px] font-semibold text-amber-700/80 uppercase tracking-wider mt-0.5">Duplicates</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-center">
          <p className="text-2xl font-bold text-red-700 tabular-nums">{batch.failCount}</p>
          <p className="text-[10px] font-semibold text-red-700/80 uppercase tracking-wider mt-0.5">Failed</p>
        </div>
      </div>

      {duplicates.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
              Skipped as duplicates ({duplicates.length})
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {duplicates.map((d, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-[10px] font-bold text-amber-700 shrink-0 mt-0.5">Row {d.row}</span>
                <span className="text-xs text-amber-800">{d.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {failures.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">
              Failed rows ({failures.length})
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {failures.map((d, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <span className="text-[10px] font-bold text-red-700 shrink-0 mt-0.5">Row {d.row}</span>
                <span className="text-xs text-red-800">{d.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {batch.successCount === 0 && duplicates.length === 0 && failures.length === 0 && (
        <p className="text-sm text-[#6B7280] italic">No rows were processed.</p>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={onDone} className="bg-[#036638] hover:bg-[#025030] text-white text-xs">
          Done
        </Button>
      </div>
    </div>
  )
}

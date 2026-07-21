"use client"

import { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ImportService, type ParsedRow } from "@/services/import.service"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
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
          className="gap-1.5 border-[#E5E7EB] text-[#374151] hover:bg-[#FFF0E5] hover:border-[#E8792E]/20 hover:text-[#E8792E]"
        >
          <Upload className="w-3.5 h-3.5" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFF0E5] to-[#FBE7B2] flex items-center justify-center">
              <Upload className="w-5 h-5 text-[#E8792E]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#1A1B1E]">Import Patients</DialogTitle>
              <p className="text-xs text-[#6B7280] mt-0.5">Upload .csv, .xlsx, or .xls files</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5">
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
                  "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200",
                  state.status === "dragging"
                    ? "border-[#E8792E] bg-[#FFF0E5] scale-[1.02]"
                    : state.status === "selected" || state.status === "uploading"
                      ? "border-[#E8792E]/40 bg-[#FFF0E5]/20"
                      : "border-[#E5E7EB] bg-white hover:border-[#E8792E]/30 hover:bg-[#FFF0E5]/10",
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
                    <Loader2 className="w-10 h-10 text-[#E8792E] mx-auto mb-3 animate-spin" />
                    <p className="text-sm font-medium text-[#374151]">Uploading & parsing...</p>
                    <p className="text-xs text-[#6B7280] mt-1">{state.file.name}</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFF0E5] to-[#FBE7B2] flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6 text-[#E8792E]" />
                    </div>
                    <p className="text-sm font-semibold text-[#374151]">
                      {state.status === "dragging" ? "Drop file here" : "Drag & drop or click to browse"}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">.csv, .xlsx, .xls up to 10 MB</p>
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
                        : "bg-[#FFF0E5]/40 border-[#FBE7B2]/50",
                    )}
                  >
                    <FileSpreadsheet
                      className={cn(
                        "w-8 h-8 shrink-0",
                        state.status === "error" ? "text-red-400" : "text-[#E8792E]",
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
                    className="gap-1.5 bg-[#E8792E] hover:bg-[#D4691F] text-white text-xs shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload & Parse
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] flex items-center gap-4 text-[10px] text-[#6B7280]">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Max 10 MB
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            No DB write yet
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Preview first
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
  const previewRows = result.data.slice(0, 5)
  const columns = result.data.length > 0 ? Object.keys(result.data[0]) : []

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
                className="text-[10px] font-mono bg-[#FFF0E5]/60 text-[#E8792E] px-2 py-0.5 rounded-md border border-[#FBE7B2]/50"
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
                  {columns.slice(0, 5).map((col) => (
                    <th
                      key={col}
                      className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-3 py-2 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                  {columns.length > 5 && (
                    <th className="text-left text-[10px] font-semibold text-[#6B7280] px-3 py-2">
                      +{columns.length - 5} more
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-[#E5E7EB]/50 last:border-0 hover:bg-[#FFF0E5]/20">
                    <td className="text-[#6B7280] px-3 py-2">{i + 1}</td>
                    {columns.slice(0, 5).map((col) => (
                      <td key={col} className="text-[#374151] px-3 py-2 max-w-[160px] truncate whitespace-nowrap">
                        {row[col] || <span className="text-[#B0B0B0] italic">-</span>}
                      </td>
                    ))}
                    {columns.length > 5 && <td className="text-[#6B7280] px-3 py-2">-</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={onReset}
          className="bg-[#E8792E] hover:bg-[#D4691F] text-white text-xs"
        >
          Import Another
        </Button>
      </div>
    </div>
  )
}

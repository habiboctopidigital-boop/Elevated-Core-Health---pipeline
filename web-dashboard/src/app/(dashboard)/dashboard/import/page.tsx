"use client"

import { useCallback, useState } from "react"
import { useBulkUpload, formatFileSize } from "@/hooks/useBulkUpload"
import { useImportHistory, type ImportHistoryEntry } from "@/hooks/useImportHistory"
import { Button } from "@/components/ui/button"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Table,
  ChevronDown,
  ChevronRight,
  Clock,
  HardDrive,
  Trash2,
  Database,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
} from "lucide-react"
import { cn } from "@/lib/utils"

const PREVIEW_LIMIT = 20

function DataPreviewTable({
  data,
  maxCols = 6,
  maxRows,
}: {
  data: Record<string, string | undefined>[]
  maxCols?: number
  maxRows?: number
}) {
  const rows = maxRows ? data.slice(0, maxRows) : data
  const columns = data.length > 0 ? Object.keys(data[0]) : []
  const displayCols = columns.slice(0, maxCols)

  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <th className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-3 py-2.5 w-8">#</th>
            {displayCols.map((col) => (
              <th key={col} className="text-left text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">
                {col}
              </th>
            ))}
            {columns.length > maxCols && (
              <th className="text-left text-[10px] font-semibold text-[#6B7280] px-3 py-2.5">
                +{columns.length - maxCols}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#E5E7EB]/50 last:border-0 hover:bg-[#FFF0E5]/20">
              <td className="text-[#6B7280] px-3 py-2.5 text-[10px]">{i + 1}</td>
              {displayCols.map((col) => (
                <td key={col} className="text-[#374151] px-3 py-2.5 max-w-[200px] truncate whitespace-nowrap">
                  {row[col] || <span className="text-[#B0B0B0] italic">-</span>}
                </td>
              ))}
              {columns.length > maxCols && <td className="text-[#6B7280] px-3 py-2.5 text-[10px]">-</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Upload Zone ───
function UploadZone({
  state,
  inputRef,
  handleFile,
  upload,
  reset,
  onDrop,
  onDragOver,
  onDragLeave,
}: ReturnType<typeof useBulkUpload>) {
  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer transition-all duration-200",
          state.status === "dragging"
            ? "border-[#E8792E] bg-[#FFF0E5] scale-[1.01]"
            : state.status === "selected" || state.status === "uploading"
              ? "border-[#E8792E]/40 bg-[#FFF0E5]/20"
              : "border-[#E5E7EB] bg-white hover:border-[#E8792E]/30 hover:bg-[#FFF0E5]/10",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {state.status === "uploading" ? (
          <div className="py-6">
            <Loader2 className="w-12 h-12 text-[#E8792E] mx-auto mb-4 animate-spin" />
            <p className="text-base font-semibold text-[#374151]">Uploading & Parsing...</p>
            <p className="text-sm text-[#6B7280] mt-1.5">{state.file.name}</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFF0E5] to-[#FBE7B2] flex items-center justify-center mx-auto mb-5">
              <Upload className="w-8 h-8 text-[#E8792E]" />
            </div>
            <p className="text-base font-semibold text-[#374151]">
              {state.status === "dragging" ? "Release to upload" : "Drag & drop your file here"}
            </p>
            <p className="text-sm text-[#6B7280] mt-1.5">
              or <span className="text-[#E8792E] font-medium underline underline-offset-2">browse files</span>
            </p>
            <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-[#6B7280]">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                .csv, .xlsx, .xls
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5" />
                Max 10 MB
              </span>
            </div>
          </>
        )}
      </div>

      {(state.status === "selected" || state.status === "error") && (
        <div className="mt-4 max-w-xl mx-auto">
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border",
              state.status === "error" ? "bg-red-50 border-red-100" : "bg-[#FFF0E5]/40 border-[#FBE7B2]/50",
            )}
          >
            <FileSpreadsheet
              className={cn("w-10 h-10 shrink-0", state.status === "error" ? "text-red-400" : "text-[#E8792E]")}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#374151] truncate">{state.file.name}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{formatFileSize(state.file.size)}</p>
            </div>
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>
          </div>

          {state.status === "error" && (
            <div className="flex items-start gap-2 mt-2 px-4 py-2.5 text-xs text-red-600 bg-red-50 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{state.message}</span>
            </div>
          )}

          {state.status === "selected" && (
            <div className="flex justify-center gap-3 mt-5">
              <Button variant="outline" size="sm" onClick={reset} className="text-xs h-9">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={upload}
                className="gap-1.5 bg-[#E8792E] hover:bg-[#D4691F] text-white text-xs h-9 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload & Parse
              </Button>
            </div>
          )}
        </div>
      )}

      {state.status === "success" && (
        <div className="mt-6 max-w-3xl mx-auto">
          <SuccessResult result={state.result} file={state.file} onUploadAnother={reset} />
        </div>
      )}
    </div>
  )
}

// ─── Success Result ───
function SuccessResult({
  result,
  file,
  onUploadAnother,
}: {
  result: { totalRows: number; data: Record<string, string | undefined>[] }
  file: File
  onUploadAnother: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const allCount = result.data.length
  const displayData = showAll ? result.data : result.data.slice(0, PREVIEW_LIMIT)
  const columns = result.data.length > 0 ? Object.keys(result.data[0]) : []

  function downloadJson() {
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = file.name.replace(/\.[^.]+$/, "") + "_parsed.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl border border-green-100 bg-green-50/50 overflow-hidden">
      <div className="flex items-center gap-3 p-5">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-green-800">Parsed Successfully</p>
          <p className="text-xs text-green-600 mt-0.5">
            {result.totalRows} row{result.totalRows !== 1 ? "s" : ""} from {file.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={downloadJson}
            className="text-xs gap-1.5 border-green-200 text-green-700 hover:bg-green-100"
          >
            <Download className="w-3 h-3" />
            JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onUploadAnother}
            className="text-xs gap-1.5 border-green-200 text-green-700 hover:bg-green-100"
          >
            <RefreshCw className="w-3 h-3" />
            Upload Another
          </Button>
        </div>
      </div>

      {columns.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Table className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[10px] font-semibold text-[#374151] uppercase tracking-wider">
              Detected Columns ({columns.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((col) => (
              <span
                key={col}
                className="text-[11px] font-mono bg-white text-[#E8792E] px-2.5 py-1 rounded-lg border border-[#FBE7B2]/60 shadow-sm"
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.data.length > 0 && (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#6B7280]" />
              <span className="text-[10px] font-semibold text-[#374151] uppercase tracking-wider">
                Data Preview ({showAll ? allCount : Math.min(PREVIEW_LIMIT, allCount)} of {allCount} rows)
              </span>
            </div>
            {allCount > PREVIEW_LIMIT && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 text-[10px] font-medium text-[#E8792E] hover:text-[#D4691F] transition-colors"
              >
                {showAll ? (
                  <><EyeOff className="w-3 h-3" /> Show less</>
                ) : (
                  <><Eye className="w-3 h-3" /> Show all {allCount} rows</>
                )}
              </button>
            )}
          </div>
          <DataPreviewTable data={displayData} />
          {!showAll && allCount > PREVIEW_LIMIT && (
            <p className="text-[10px] text-[#6B7280] mt-2 text-center">
              Showing first {PREVIEW_LIMIT} rows. Click "Show all" to view all {allCount} rows.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── History Row ───
function HistoryRow({
  entry,
  isExpanded,
  onToggle,
  onDelete,
}: {
  entry: ImportHistoryEntry
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const date = new Date(entry.timestamp)
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const formattedTime = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  const preview = entry.previewRows ?? []

  return (
    <div className="group">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-[#FFF0E5]/20 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <button className="p-0.5 rounded text-[#6B7280] hover:text-[#374151]">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        <FileSpreadsheet className="w-5 h-5 text-[#E8792E] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#374151] truncate">{entry.fileName}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#6B7280]">
            <span>{entry.fileType}</span>
            <span className="w-1 h-1 rounded-full bg-[#D4D4D8]" />
            <span>{entry.totalRows} rows</span>
            <span className="w-1 h-1 rounded-full bg-[#D4D4D8]" />
            <span>{entry.fileSize}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#6B7280]">
          <Clock className="w-3 h-3" />
          <span>{formattedDate}</span>
          <span className="text-[#D4D4D8]">at</span>
          <span>{formattedTime}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-100">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-[10px] font-medium text-green-600">Success</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pl-11 space-y-3">
          {/* Metadata */}
          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <div className="flex items-center gap-1.5 mb-2">
              <Table className="w-3 h-3 text-[#6B7280]" />
              <span className="text-[10px] font-semibold text-[#374151] uppercase tracking-wider">Details</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {entry.columns.map((col) => (
                <span key={col} className="text-[10px] font-mono bg-white text-[#6B7280] px-2 py-0.5 rounded border border-[#E5E7EB]">
                  {col}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-[10px] text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
              <span>File: {entry.fileName}</span>
              <span>Type: {entry.fileType}</span>
              <span>Rows: {entry.totalRows}</span>
              <span>Size: {entry.fileSize}</span>
              <span>Date: {formattedDate} {formattedTime}</span>
            </div>
          </div>

          {/* Preview data */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Database className="w-3 h-3 text-[#6B7280]" />
                <span className="text-[10px] font-semibold text-[#374151] uppercase tracking-wider">
                  Data Preview (first {preview.length})
                </span>
              </div>
              <DataPreviewTable data={preview} maxCols={8} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ───
export default function ImportPage() {
  const bulk = useBulkUpload()
  const { entries, clearHistory, removeEntry } = useImportHistory()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFF0E5] to-[#FBE7B2] flex items-center justify-center">
            <Upload className="w-5 h-5 text-[#E8792E]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1B1E]">Bulk Import</h1>
            <p className="text-sm text-[#6B7280]">Upload patient data from .csv or Excel files</p>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-8">
        <UploadZone {...bulk} />
      </div>

      {/* Upload history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF0E5] flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#E8792E]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1A1B1E]">Upload History</h2>
              <p className="text-[10px] text-[#6B7280]">
                {entries.length} import{entries.length !== 1 ? "s" : ""} recorded
              </p>
            </div>
          </div>
          {entries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5 h-8"
            >
              <Trash2 className="w-3 h-3" />
              Clear All
            </Button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F9FAFB] flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5 text-[#D4D4D8]" />
            </div>
            <p className="text-sm font-medium text-[#6B7280]">No imports yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Upload a file above to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden divide-y divide-[#E5E7EB]/50">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <span className="w-5 shrink-0" />
              <span className="w-5 shrink-0" />
              <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider flex-1">File</span>
              <span className="hidden sm:block text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-32">Date</span>
              <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider w-16 text-center">Status</span>
              <span className="w-7 shrink-0" />
            </div>
            {entries.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                isExpanded={expandedIds.has(entry.id)}
                onToggle={() => toggleExpand(entry.id)}
                onDelete={() => removeEntry(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

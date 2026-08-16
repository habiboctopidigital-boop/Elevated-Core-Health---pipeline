"use client"

import { useEffect, useMemo, useState } from "react"
import {
  useAdminStages,
  useCreateStage,
  useUpdateStage,
  useReorderStages,
  useDeleteStage,
} from "@/hooks/query/useStages"
import {
  useAdminChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from "@/hooks/query/useAdmin"
import { usePatients } from "@/hooks/query/usePatients"
import {
  Loader2,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Settings,
  Users,
  Lock,
  AlertTriangle,
  Flag,
  ListChecks,
  Layers,
  History,
  Calendar,
  EllipsisVertical,
  Power,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useForm } from "react-hook-form"
import type { PipelineStage, ChecklistItemDef } from "@/types"

// Small pill toggle switch matching the reference design's "Enable" control.
function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
        checked ? "bg-[#036638]" : "bg-gray-200",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  )
}

/**
 * Full stage-settings content (stage list with drag-reorder, add/edit/delete,
 * per-stage checklist manager). Rendered on the /admin/dashboard/stages page
 * AND inside the Stage Settings dialog on the admin board — both must stay
 * identical, so the page is now a thin wrapper around this panel.
 */
export function StageSettingsPanel({
  variant = "page",
}: {
  /** "page" = full standalone page, "dialog" = compact inside a modal */
  variant?: "page" | "dialog"
} = {}) {
  const isDialog = variant === "dialog"
  const { data: stages, isLoading } = useAdminStages()
  const { data: patients } = usePatients()
  const { data: checklistItems } = useAdminChecklist()

  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const reorderStages = useReorderStages()
  const deleteStage = useDeleteStage()

  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  // Toggle between the stage list and the inline Add Stage form — the panel
  // header stays fixed and only the content below switches (no stacked modal).
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [deletingStage, setDeletingStage] = useState<PipelineStage | null>(null)

  // True when either the Add Stage form or the Edit Stage form is open — the
  // panel toggles between the stage list and one of these forms, keeping the
  // header fixed (no stacked modals for stage editing).
  const showInlineForm = showCreateForm || editingStage !== null

  const patientCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of patients ?? []) {
      counts[p.stage] = (counts[p.stage] || 0) + 1
    }
    return counts
  }, [patients])

  const itemsByStage = useMemo(() => {
    const grouped: Record<string, ChecklistItemDef[]> = {}
    for (const item of checklistItems ?? []) {
      if (!grouped[item.stage]) grouped[item.stage] = []
      grouped[item.stage].push(item)
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return grouped
  }, [checklistItems])

  const orderedStages = useMemo(() => [...(stages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [stages])

  // ---------------------------------------------------------------------
  // Drag-and-drop stage reordering — optimistic local reorder + real
  // persistence via PATCH /admin/stages/reorder.
  // ---------------------------------------------------------------------
  const [localStages, setLocalStages] = useState<PipelineStage[]>(orderedStages)
  const [draggedStageKey, setDraggedStageKey] = useState<string | null>(null)
  const [dragOverStageKey, setDragOverStageKey] = useState<string | null>(null)

  useEffect(() => {
    if (!draggedStageKey) setLocalStages(orderedStages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages])

  const displayStages = localStages

  const finalStage = displayStages.find((s) => s.isFinal)
  const activeCount = displayStages.filter((s) => s.isActive).length

  const handleStageDragStart = (key: string) => () => setDraggedStageKey(key)
  const handleStageDragOver = (key: string) => (e: React.DragEvent) => {
    e.preventDefault()
    if (key !== dragOverStageKey) setDragOverStageKey(key)
  }
  const handleStageDrop = (targetKey: string) => (e: React.DragEvent) => {
    e.preventDefault()
    const dragged = draggedStageKey
    setDraggedStageKey(null)
    setDragOverStageKey(null)
    if (!dragged || dragged === targetKey) return
    const from = localStages.findIndex((s) => s.key === dragged)
    const to = localStages.findIndex((s) => s.key === targetKey)
    if (from === -1 || to === -1) return
    const next = [...localStages]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setLocalStages(next)
    // Persist the new order server-side (backend rewrites sortOrder = index).
    reorderStages.mutate(next.map((s) => s.key))
  }
  const handleStageDragEnd = () => {
    setDraggedStageKey(null)
    setDragOverStageKey(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#036638] animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className={cn("space-y-5 max-w-[1600px] mx-auto", isDialog ? "pb-1" : "pb-12")}>
        {isDialog ? (
          /* Compact toolbar for the modal — the dialog already has its own
             header. Stays fixed while the content below toggles between the
             stage list and the Add Stage form. */
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#6B7280]">
              {editingStage
                ? `Editing stage “${editingStage.name}”`
                : showCreateForm
                  ? "Add a new stage to the pipeline"
                  : "Drag stages to reorder · expand a stage to manage its checklist"}
            </p>
            {showInlineForm ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingStage(null)
                }}
                className="text-sm gap-1.5 rounded-xl px-3 h-9 shrink-0 text-[#6B7280]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Stages
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setShowCreateForm(true)
                  setEditingStage(null)
                }}
                className="bg-[#036638] hover:bg-[#025030] text-white text-sm gap-1.5 rounded-xl px-4 h-9 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Stage
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1A1B1E]">Stage Settings</h1>
                  <p className="text-sm text-[#6B7280] mt-0.5">
                    Manage pipeline stages and the checklist that gates each one
                  </p>
                </div>
              </div>
              {showInlineForm ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingStage(null)
                  }}
                  className="text-sm gap-1.5 rounded-xl px-4 h-10 text-[#6B7280] border border-[#E5E7EB]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Stages
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setShowCreateForm(true)
                    setEditingStage(null)
                  }}
                  className="bg-[#036638] hover:bg-[#025030] text-white text-sm gap-1.5 rounded-xl px-4 h-10"
                >
                  <Plus className="w-4 h-4" />
                  Add Stage
                </Button>
              )}
            </div>

            {/* Summary chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#1A1B1E] leading-none">{displayStages.length}</span>
              <span className="text-xs text-[#6B7280] leading-tight">Total Stages</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <History className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#036638] leading-none">{activeCount}</span>
              <span className="text-xs text-[#6B7280] leading-tight">Active Stages</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A1B1E] leading-tight">
                {finalStage ? finalStage.name : "No final stage"}
              </p>
              <p className="text-[11px] text-[#6B7280]">Final stage (stale-exempt)</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[11px] text-[#6B7280] leading-snug">
              Stage keys are permanent. A stage can&apos;t be deleted while patients or checklist items use it.
            </p>
          </div>
        </div>
          </>
        )}

        {showInlineForm ? (
          /* Inline Add/Edit Stage form — same panel, header stays fixed, only
             the content below switches (toggle approach, no stacked modal). */
          <div className={cn("bg-white rounded-2xl p-5", isDialog ? "shadow-[0_1px_3px_rgba(16,24,40,0.06)]" : "border border-[#E5E7EB]")}>
            {editingStage ? (
              <>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F3F4F6]">
                  <Settings className="w-4 h-4 text-[#036638]" />
                  <h3 className="text-sm font-bold text-[#1A1B1E]">Edit Stage</h3>
                </div>
                <StageForm
                  initial={editingStage}
                  onCancel={() => setEditingStage(null)}
                  onSubmit={async (values) => {
                    await updateStage.mutateAsync({ key: editingStage.key, ...values })
                    // Switch back to the stage list after saving.
                    setEditingStage(null)
                  }}
                  isPending={updateStage.isPending}
                  allowFinalToggle
                />
              </>
            ) : (
              <StageForm
                stages={displayStages}
                onCancel={() => setShowCreateForm(false)}
                onSubmit={async (values) => {
                  const { position, ...stageInput } = values
                  const created = await createStage.mutateAsync(stageInput)
                  // Backend appends new stages at the end — if the user picked a
                  // position, insert the new key there and persist the full order.
                  if (position) {
                    const keys = displayStages.map((s) => s.key)
                    if (position.type === "start") {
                      keys.unshift(created.key)
                    } else if (position.type === "after") {
                      const idx = keys.indexOf(position.key)
                      keys.splice(idx === -1 ? keys.length : idx + 1, 0, created.key)
                    } else {
                      keys.push(created.key)
                    }
                    await reorderStages.mutateAsync(keys)
                  }
                  // Switch back to the stage list after the new stage is added.
                  setShowCreateForm(false)
                }}
                isPending={createStage.isPending || reorderStages.isPending}
              />
            )}
          </div>
        ) : (
          <>
        {/* Reordering indicator */}
        {reorderStages.isPending && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Saving new order...
          </div>
        )}

        {/* Stage list */}
        <div className="space-y-2.5">
          {displayStages.map((stage) => {
            const isExpanded = expandedStage === stage.key
            const count = patientCounts[stage.key] || 0
            const itemCount = itemsByStage[stage.key]?.length || 0
            const isDragOver = dragOverStageKey === stage.key && draggedStageKey !== stage.key
            const isBeingDragged = draggedStageKey === stage.key
            return (
              <div
                key={stage.key}
                draggable
                onDragStart={handleStageDragStart(stage.key)}
                onDragOver={handleStageDragOver(stage.key)}
                onDrop={handleStageDrop(stage.key)}
                onDragEnd={handleStageDragEnd}
                className={cn(
                  "bg-white rounded-2xl transition-all",
                  isDialog
                    ? cn(
                        "shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:shadow-[0_4px_14px_rgba(16,24,40,0.08)]",
                        isExpanded && "shadow-[0_6px_20px_rgba(3,102,56,0.10)] ring-1 ring-[#65BD6C]/30",
                      )
                    : cn("border", isExpanded ? "border-[#65BD6C]/60 shadow-sm" : "border-[#E5E7EB]"),
                  isDragOver && "ring-2 ring-emerald-200",
                  isBeingDragged && "opacity-40",
                  !stage.isActive && "opacity-80",
                )}
              >
                {/* Stage row */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Drag handle — desktop only (HTML5 drag doesn't work on touch) */}
                  <div className="hidden sm:block cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 shrink-0" title="Drag to reorder">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Order badge */}
                  <span className="w-7 h-7 rounded-full bg-[#036638] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {displayStages.findIndex((s) => s.key === stage.key) + 1}
                  </span>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[#1A1B1E]">{stage.name}</h3>
                      <span
                        className={cn(
                          "hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded",
                          isExpanded ? "bg-emerald-50 text-emerald-700" : "bg-[#F3F4F6] text-[#6B7280]",
                        )}
                      >
                        {stage.key}
                      </span>
                      {stage.isFinal && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold border border-emerald-300 text-emerald-700 px-2 py-0.5 rounded-full">
                          Final
                        </span>
                      )}
                      {!stage.isActive && (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>
                    {stage.hint && (
                      <p className="hidden sm:flex items-center gap-1.5 text-xs text-[#6B7280] mt-0.5 truncate">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {stage.hint}
                      </p>
                    )}
                  </div>

                  {/* Stats — desktop only */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <div className={cn("flex items-center gap-1.5 bg-white rounded-xl px-2.5 py-1.5", isDialog ? "shadow-[0_1px_2px_rgba(16,24,40,0.05)]" : "border border-[#E5E7EB]")} title="Patients in this stage">
                      <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span className="text-xs font-bold text-[#1A1B1E]">{count}</span>
                    </div>
                    <div className={cn("flex items-center gap-1.5 bg-white rounded-xl px-2.5 py-1.5", isDialog ? "shadow-[0_1px_2px_rgba(16,24,40,0.05)]" : "border border-[#E5E7EB]")} title="Checklist items">
                      <ListChecks className="w-3.5 h-3.5 text-[#6B7280]" />
                      <span className="text-xs font-bold text-[#1A1B1E]">{itemCount}</span>
                    </div>
                  </div>

                  {/* Enable toggle — desktop only */}
                  <div className={cn("hidden sm:flex items-center gap-2 shrink-0 bg-white rounded-xl px-2.5 py-1.5", isDialog ? "shadow-[0_1px_2px_rgba(16,24,40,0.05)]" : "border border-[#E5E7EB]")}>
                    <span className="text-[11px] font-semibold text-[#374151]">Enable</span>
                    <ToggleSwitch
                      checked={stage.isActive}
                      disabled={updateStage.isPending}
                      onChange={() => updateStage.mutate({ key: stage.key, isActive: !stage.isActive })}
                    />
                  </div>

                  {/* Actions — desktop only */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setShowCreateForm(false)
                        setEditingStage(stage)
                      }}
                      className={cn("p-2 rounded-xl text-[#6B7280] hover:text-[#036638] transition-colors", isDialog ? "hover:bg-[#EBF7EC]" : "border border-[#E5E7EB] hover:border-[#036638]")}
                      title="Edit stage"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingStage(stage)}
                      className={cn("p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors", isDialog ? "" : "border border-[#E5E7EB] hover:border-red-300")}
                      title="Delete stage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                      className={cn("p-2 rounded-xl text-[#6B7280] hover:text-[#036638] transition-colors", isDialog ? "hover:bg-[#EBF7EC]" : "border border-[#E5E7EB] hover:border-[#036638]")}
                      title={isExpanded ? "Collapse checklist" : "Manage checklist"}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* 3-dot menu — phone only */}
                  <div className="sm:hidden shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2 rounded-xl text-[#036638] hover:bg-[#EBF7EC] transition-colors cursor-pointer"
                          title="Stage options"
                        >
                          <EllipsisVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-xl">
                        <div className="px-2 py-1.5">
                          <p className="text-sm font-bold text-[#1A1B1E] truncate">{stage.name}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {count} patients · {itemCount} checklist items
                          </p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setShowCreateForm(false)
                            setEditingStage(stage)
                          }}
                          className="cursor-pointer text-xs gap-2 text-[#374151]"
                        >
                          <Settings className="w-3.5 h-3.5 text-[#036638]" />
                          Edit Stage
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateStage.mutate({ key: stage.key, isActive: !stage.isActive })}
                          disabled={updateStage.isPending}
                          className="cursor-pointer text-xs gap-2 text-[#374151]"
                        >
                          <Power className="w-3.5 h-3.5 text-[#036638]" />
                          {stage.isActive ? "Disable Stage" : "Enable Stage"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                          className="cursor-pointer text-xs gap-2 text-[#374151]"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#036638]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#036638]" />
                          )}
                          {isExpanded ? "Collapse Checklist" : "Manage Checklist"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeletingStage(stage)}
                          className="cursor-pointer text-xs gap-2 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          Delete Stage
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Expanded: checklist manager */}
                {isExpanded && (
                  <div className={cn("px-4 py-4 rounded-b-2xl", isDialog ? "bg-[#F6FAF7] mt-3 mx-3 mb-3 rounded-xl border border-[#65BD6C]/15" : "border-t border-[#E5E7EB]/70 bg-[#F9FAFB]/60")}>
                    <StageChecklistManager
                      stageKey={stage.key}
                      items={itemsByStage[stage.key] || []}
                      allStages={displayStages}
                      isDialog={isDialog}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {displayStages.length === 0 && (
          <div className={cn("text-center py-16 rounded-2xl", isDialog ? "bg-[#F6FAF7]" : "bg-white border border-dashed border-[#E5E7EB]")}>
            <p className="text-sm text-[#6B7280]">No stages yet. Add your first stage to get started.</p>
          </div>
        )}

          </>
        )}

        {/* Delete Stage Confirm — stays open with a loading state until the request finishes */}
        {deletingStage && (
          <Dialog
            open
            onOpenChange={(next) => {
              if (!deleteStage.isPending && !next) setDeletingStage(null)
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[#1A1B1E]">Delete Stage</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {deleteStage.isPending ? (
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  )}
                  <p className="text-xs text-amber-800">
                    {deleteStage.isPending ? (
                      <>
                        Deleting <strong>{deletingStage.name}</strong>…
                      </>
                    ) : (
                      <>
                        This permanently removes <strong>{deletingStage.name}</strong>. The action is blocked if
                        patients or checklist items still reference it.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingStage(null)}
                    disabled={deleteStage.isPending}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await deleteStage.mutateAsync(deletingStage.key)
                        // Close only after the request succeeded.
                        setDeletingStage(null)
                      } catch {
                        // Keep the modal open — the hook already toasts the error.
                      }
                    }}
                    disabled={deleteStage.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs min-w-[110px]"
                  >
                    {deleteStage.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Stage"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  )
}

/* ---------------------------------- Stage form ---------------------------------- */

function StageForm({
  initial,
  onCancel,
  onSubmit,
  isPending,
  allowFinalToggle = false,
  stages = [],
}: {
  initial?: PipelineStage
  onCancel: () => void
  onSubmit: (values: {
    name: string
    hint: string | null
    isFinal?: boolean
    isActive?: boolean
    position?: { type: "start" | "end" } | { type: "after"; key: string }
  }) => void
  isPending: boolean
  allowFinalToggle?: boolean
  /** Ordered stage list — only used when creating, to offer position choices. */
  stages?: PipelineStage[]
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: initial?.name ?? "",
      hint: initial?.hint ?? "",
      isFinal: initial?.isFinal ?? false,
    },
  })
  // Position for a NEW stage: at the end (default), at the start, or after a
  // specific existing stage.
  const [position, setPosition] = useState<"start" | "end" | `after:${string}`>("end")

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit({
          name: data.name,
          hint: data.hint?.trim() || null,
          isFinal: allowFinalToggle ? data.isFinal : undefined,
          position:
            position === "start"
              ? { type: "start" }
              : position.startsWith("after:")
                ? { type: "after", key: position.slice(6) }
                : { type: "end" },
        }),
      )}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[#374151]">Stage Name</label>
        <input
          {...register("name", { required: "Stage name is required" })}
          placeholder="e.g. Insurance Verified"
          className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
        />
        {!initial && (
          <p className="text-[11px] text-[#6B7280]">
            A permanent key is generated from the name (e.g. &quot;insurance_verified&quot;).
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[#374151]">Hint / Description</label>
        <input
          {...register("hint")}
          placeholder="e.g. Shown under the stage name on the board"
          className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
        />
      </div>
      {!initial && stages.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#374151]">Position in Pipeline</label>
          <Select
            value={position}
            onValueChange={(v) => setPosition(v as typeof position)}
          >
            <SelectTrigger className="w-full h-9 rounded-lg border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/25 hover:border-[#D1D5DB] cursor-pointer">
              <SelectValue placeholder="Choose position..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="end">At the end (default)</SelectItem>
              <SelectItem value="start">At the beginning</SelectItem>
              {stages.map((s) => (
                <SelectItem key={s.key} value={`after:${s.key}`}>
                  After “{s.name}”
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-[#6B7280]">
            Choose where this stage should appear in the pipeline.
          </p>
        </div>
      )}
      {allowFinalToggle && (
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            {...register("isFinal")}
            className="w-4 h-4 rounded border-[#E5E7EB] text-[#036638] focus:ring-[#036638] accent-[#036638] cursor-pointer"
          />
          <span className="text-sm text-[#374151]">
            Final stage - cards here are exempt from the stale flag
          </span>
        </label>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs">
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="bg-[#036638] hover:bg-[#025030] text-white text-xs"
        >
          {isPending ? "Saving..." : initial ? "Save Changes" : "Add Stage"}
        </Button>
      </div>
    </form>
  )
}

/* ---------------------------- Per-stage checklist manager ---------------------------- */

function StageChecklistManager({
  stageKey,
  items,
  allStages,
  isDialog = false,
}: {
  stageKey: string
  items: ChecklistItemDef[]
  allStages: PipelineStage[]
  isDialog?: boolean
}) {
  const createItem = useCreateChecklistItem()
  const updateItem = useUpdateChecklistItem()
  const deleteItem = useDeleteChecklistItem()

  const { register, handleSubmit, reset, watch, setValue } = useForm<{
    label: string
    status: "required" | "optional"
  }>({
    defaultValues: { label: "", status: "required" },
  })

  const [showAdd, setShowAdd] = useState(false)
  // Id of the checklist item currently being deleted — its row shows a spinner
  // while the request is in flight instead of silently waiting.
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // ---------------------------------------------------------------------
  // Drag-and-drop item reordering — optimistic local reorder + persistence
  // by rewriting each item's sortOrder via PATCH /admin/checklist-items/:id.
  // ---------------------------------------------------------------------
  const [localItems, setLocalItems] = useState<ChecklistItemDef[]>(items)
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const [isReorderingItems, setIsReorderingItems] = useState(false)

  useEffect(() => {
    if (!draggedItemId) setLocalItems(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const handleItemDragStart = (id: string) => () => setDraggedItemId(id)
  const handleItemDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault()
    if (id !== dragOverItemId) setDragOverItemId(id)
  }
  const handleItemDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    const dragged = draggedItemId
    setDraggedItemId(null)
    setDragOverItemId(null)
    if (!dragged || dragged === targetId) return
    const from = localItems.findIndex((i) => i.id === dragged)
    const to = localItems.findIndex((i) => i.id === targetId)
    if (from === -1 || to === -1) return
    const next = [...localItems]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setLocalItems(next)
    // Persist the new order — rewrite sortOrder on every item in sequence.
    setIsReorderingItems(true)
    void Promise.all(
      next.map((item, index) =>
        updateItem.mutateAsync({ id: item.id, label: item.label, sortOrder: index, silent: true }),
      ),
    ).finally(() => setIsReorderingItems(false))
  }
  const handleItemDragEnd = () => {
    setDraggedItemId(null)
    setDragOverItemId(null)
  }

  const onSubmit = async (data: { label: string; status: "required" | "optional" }) => {
    await createItem.mutateAsync({
      stage: stageKey,
      label: data.label,
      status: data.status,
      sortOrder: localItems.length,
    })
    reset({ label: "", status: "required" })
    setShowAdd(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-[#1A1B1E]">Checklist Items</p>
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
            {localItems.length}
          </span>
          {isReorderingItems && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving order...
            </span>
          )}
        </div>
       
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className={cn(
          "flex flex-wrap items-center gap-2 bg-white rounded-xl p-2",
          isDialog ? "shadow-[0_1px_3px_rgba(16,24,40,0.06)]" : "border border-[#E5E7EB]",
        )}
      >
        <input
          {...register("label", { required: "Label is required" })}
          placeholder="New checklist item..."
          className="flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-1 focus:ring-[#036638]/40"
        />
        <Select
          value={watch("status")}
          onValueChange={(v) => setValue("status", v as "required" | "optional")}
        >
          <SelectTrigger className="h-9 w-[130px] rounded-lg border-[#E5E7EB] bg-white text-sm font-medium text-[#1A1B1E] shadow-none focus:ring-1 focus:ring-[#036638]/40 cursor-pointer">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="required">Required</SelectItem>
            <SelectItem value="optional">Optional</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="sm"
          disabled={createItem.isPending}
          className="bg-[#036638] hover:bg-[#025030] text-white text-sm h-9 rounded-lg px-4"
        >
          {createItem.isPending ? "Adding..." : "Add Item"}
        </Button>
      </form>

      {localItems.length > 0 ? (
        <div className={cn(
          "bg-white rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1",
          isDialog ? "shadow-[0_1px_3px_rgba(16,24,40,0.06)]" : "border border-[#E5E7EB]",
        )}>

          {localItems.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              allStages={allStages}
              onUpdate={(id, label, status, stage) => updateItem.mutate({ id, label, status, stage })}
              onDelete={async (id) => {
                setDeletingItemId(id)
                try {
                  await deleteItem.mutateAsync(id)
                } catch {
                  // The hook already toasts the failure reason.
                } finally {
                  setDeletingItemId(null)
                }
              }}
              isUpdating={updateItem.isPending}
              isDeleting={deletingItemId === item.id}
              isDragOver={dragOverItemId === item.id && draggedItemId !== item.id}
              isBeingDragged={draggedItemId === item.id}
              onDragStart={handleItemDragStart(item.id)}
              onDragOver={handleItemDragOver(item.id)}
              onDrop={handleItemDrop(item.id)}
              onDragEnd={handleItemDragEnd}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#6B7280] italic">
          No checklist items - this stage can advance without checking anything.
        </p>
      )}
    </div>
  )
}

function ChecklistItemRow({
  item,
  allStages,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  isDragOver,
  isBeingDragged,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  item: ChecklistItemDef
  allStages: PipelineStage[]
  onUpdate: (id: string, label: string, status: "required" | "optional", stage?: string) => void
  onDelete: (id: string) => void
  isUpdating: boolean
  isDeleting: boolean
  isDragOver: boolean
  isBeingDragged: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.label)
  const [editStage, setEditStage] = useState(item.stage)

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed) {
      onUpdate(item.id, trimmed, item.status, editStage !== item.stage ? editStage : undefined)
    }
    setEditing(false)
  }

  const toggleStatus = () => {
    const next = item.status === "required" ? "optional" : "required"
    onUpdate(item.id, item.label, next)
  }

  const handleCancel = () => {
    setEditValue(item.label)
    setEditStage(item.stage)
    setEditing(false)
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#EBF7EC]/50 transition-colors group border border-transparent hover:border-[#E5E7EB]",
        isDragOver && "border-emerald-400 bg-emerald-50/60",
        isBeingDragged && "opacity-40",
        isDeleting && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 shrink-0" title="Drag to reorder">
          <GripVertical className="w-3.5 h-3.5" />
        </span>
        {item.isDefault ? (
          <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5 text-white" />
          </span>
        ) : (
          <span className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
        )}
        {editing ? (
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") handleCancel()
              }}
              autoFocus
              className="flex-1 min-w-[120px] h-7 px-2 rounded border border-[#036638] text-sm text-[#1A1B1E] focus:outline-none focus:ring-1 focus:ring-[#036638]/30"
            />
            <Select value={editStage} onValueChange={setEditStage}>
              <SelectTrigger className="h-7 w-[140px] rounded border border-[#E5E7EB] bg-white text-xs text-[#1A1B1E] shadow-none focus:outline-none focus:ring-1 focus:ring-[#036638]/40 cursor-pointer" title="Move item to another stage">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {allStages.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={handleSave}
              disabled={isUpdating || !editValue.trim()}
              className="p-1 rounded hover:bg-green-50 text-green-600 disabled:opacity-30"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancel} className="p-1 rounded hover:bg-red-50 text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span
            onClick={() => !item.isDefault && setEditing(true)}
            className={`text-sm text-[#374151] truncate ${item.isDefault ? "" : "cursor-pointer hover:text-[#036638]"}`}
          >
            {item.label}
          </span>
        )}
        <button
          onClick={toggleStatus}
          title={item.status === "required" ? "Click to make Optional" : "Click to make Required"}
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer whitespace-nowrap",
            item.status === "required"
              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              : "bg-[#EBF7EC] text-[#036638] border-[#65BD6C]/40 hover:bg-[#dff4eb]",
          )}
        >
          {item.status === "required" ? "Required" : "Optional"}
        </button>
        {item.isDefault && (
          <span className="text-[10px] bg-[#F3F4F6] text-[#6B7280] px-1.5 py-0.5 rounded font-medium shrink-0">
            Default
          </span>
        )}
      </div>
      {!item.isDefault &&
        (isDeleting ? (
          <Loader2 className="w-3.5 h-3.5 text-[#036638] animate-spin shrink-0" />
        ) : (
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 rounded hover:bg-red-50 text-[#6B7280] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ))}
    </div>
  )
}

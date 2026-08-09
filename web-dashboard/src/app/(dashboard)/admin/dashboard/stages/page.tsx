"use client"

import { useMemo, useState } from "react"
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
  ArrowUp,
  ArrowDown,
  Settings,
  Users,
  Lock,
  AlertTriangle,
  Flag,
  ListChecks,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SettingsNav } from "@/components/features/settings-nav"
import { useForm } from "react-hook-form"
import type { PipelineStage, ChecklistItemDef } from "@/types"

export default function AdminStageSettingsPage() {
  const { data: stages, isLoading } = useAdminStages()
  const { data: patients } = usePatients()
  const { data: checklistItems } = useAdminChecklist()

  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const reorderStages = useReorderStages()
  const deleteStage = useDeleteStage()

  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [deletingStage, setDeletingStage] = useState<PipelineStage | null>(null)

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

  const finalStage = orderedStages.find((s) => s.isFinal)
  const activeCount = orderedStages.filter((s) => s.isActive).length

  const moveStageOrder = (index: number, direction: -1 | 1) => {
    const next = [...orderedStages]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    reorderStages.mutate(next.map((s) => s.key))
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
      {/* Settings Navigation - Top */}
      <SettingsNav currentPage="stages" />

      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#036638]/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#036638]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1A1B1E]">Stage Settings</h1>
              <p className="text-sm text-[#6B7280] mt-0.5">
                Manage pipeline stages and the checklist that gates each one
              </p>
            </div>
          </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#036638] hover:bg-[#025030] text-white text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Stage
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
          <span className="text-2xl font-bold text-[#1A1B1E]">{orderedStages.length}</span>
          <span className="text-xs text-[#6B7280] leading-tight">
            Total stages
          </span>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
          <span className="text-2xl font-bold text-[#036638]">{activeCount}</span>
          <span className="text-xs text-[#6B7280] leading-tight">
            Active stages
          </span>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
          <Flag className="w-5 h-5 text-[#036638]" />
          <div>
            <p className="text-xs font-semibold text-[#1A1B1E]">
              {finalStage ? finalStage.name : "No final stage"}
            </p>
            <p className="text-[11px] text-[#6B7280]">Final stage (stale-exempt)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3 flex items-center gap-2 text-[11px] text-[#6B7280]">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          Stage keys are permanent. A stage can&apos;t be deleted while patients or checklist items use it.
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-3">
        {orderedStages.map((stage, index) => {
          const isExpanded = expandedStage === stage.key
          const count = patientCounts[stage.key] || 0
          const itemCount = itemsByStage[stage.key]?.length || 0
          return (
            <div
              key={stage.key}
              className={cn(
                "bg-white rounded-xl border transition-all",
                isExpanded ? "border-[#65BD6C]/60 shadow-sm" : "border-[#E5E7EB]",
                !stage.isActive && "opacity-80",
              )}
            >
              {/* Stage row */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveStageOrder(index, -1)}
                    disabled={index === 0 || reorderStages.isPending}
                    className="p-0.5 rounded hover:bg-[#EBF7EC] text-[#9CA3AF] hover:text-[#036638] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveStageOrder(index, 1)}
                    disabled={index === orderedStages.length - 1 || reorderStages.isPending}
                    className="p-0.5 rounded hover:bg-[#EBF7EC] text-[#9CA3AF] hover:text-[#036638] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#1A1B1E]">{stage.name}</h3>
                    <span className="text-[10px] font-mono text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                      {stage.key}
                    </span>
                    {stage.isFinal && (
                      <span className="text-[10px] font-semibold bg-[#036638] text-white px-2 py-0.5 rounded-full">
                        Final
                      </span>
                    )}
                    {!stage.isActive && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5 truncate">
                    {stage.hint || "No description"}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5" title="Patients in this stage">
                    <Users className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span className="text-xs font-bold text-[#1A1B1E]">{count}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5" title="Checklist items">
                    <ListChecks className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span className="text-xs font-bold text-[#1A1B1E]">{itemCount}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateStage.mutate({ key: stage.key, isActive: !stage.isActive })}
                    disabled={updateStage.isPending}
                    className="px-2 py-1 text-[11px] font-medium rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#65BD6C]/50 hover:text-[#036638] disabled:opacity-40 transition-colors"
                    title={stage.isActive ? "Disable this stage" : "Enable this stage"}
                  >
                    {stage.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => setEditingStage(stage)}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#036638] hover:text-[#036638] transition-colors"
                    title="Edit stage"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingStage(stage)}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-red-300 hover:text-red-500 transition-colors"
                    title="Delete stage"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedStage(isExpanded ? null : stage.key)}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-[#036638] hover:text-[#036638] transition-colors"
                    title={isExpanded ? "Collapse checklist" : "Manage checklist"}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded: checklist manager */}
              {isExpanded && (
                <div className="border-t border-[#E5E7EB]/70 px-4 py-4 bg-[#F9FAFB]/60 rounded-b-xl">
                  <StageChecklistManager
                    stageKey={stage.key}
                    items={itemsByStage[stage.key] || []}
                    allStages={orderedStages}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {orderedStages.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-[#E5E7EB]">
          <p className="text-sm text-[#6B7280]">No stages yet. Add your first stage to get started.</p>
        </div>
      )}

      {/* Add Stage Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1B1E]">Add Stage</DialogTitle>
          </DialogHeader>
          <StageForm
            onCancel={() => setCreateOpen(false)}
            onSubmit={async (values) => {
              await createStage.mutateAsync(values)
              setCreateOpen(false)
            }}
            isPending={createStage.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      {editingStage && (
        <Dialog open onOpenChange={() => setEditingStage(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#1A1B1E]">
                Edit Stage
              </DialogTitle>
            </DialogHeader>
            <StageForm
              initial={editingStage}
              onCancel={() => setEditingStage(null)}
              onSubmit={async (values) => {
                await updateStage.mutateAsync({ key: editingStage.key, ...values })
                setEditingStage(null)
              }}
              isPending={updateStage.isPending}
              allowFinalToggle
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Stage Confirm */}
      {deletingStage && (
        <Dialog open onOpenChange={() => setDeletingStage(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#1A1B1E]">
                Delete Stage
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  This permanently removes <strong>{deletingStage.name}</strong> (key:{" "}
                  <code className="font-mono">{deletingStage.key}</code>). The action is blocked if
                  patients or checklist items still reference it.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDeletingStage(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    deleteStage.mutate(deletingStage.key)
                    setDeletingStage(null)
                  }}
                  disabled={deleteStage.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs"
                >
                  {deleteStage.isPending ? "Deleting..." : "Delete Stage"}
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
}: {
  initial?: PipelineStage
  onCancel: () => void
  onSubmit: (values: { name: string; hint: string | null; isFinal?: boolean; isActive?: boolean }) => void
  isPending: boolean
  allowFinalToggle?: boolean
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: initial?.name ?? "",
      hint: initial?.hint ?? "",
      isFinal: initial?.isFinal ?? false,
    },
  })

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit({
          name: data.name,
          hint: data.hint?.trim() || null,
          isFinal: allowFinalToggle ? data.isFinal : undefined,
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
}: {
  stageKey: string
  items: ChecklistItemDef[]
  allStages: PipelineStage[]
}) {
  const createItem = useCreateChecklistItem()
  const updateItem = useUpdateChecklistItem()
  const deleteItem = useDeleteChecklistItem()

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { label: "", status: "required" as const },
  })

  const [showAdd, setShowAdd] = useState(false)

  const onSubmit = async (data: { label: string; status: "required" | "optional" }) => {
    await createItem.mutateAsync({
      stage: stageKey,
      label: data.label,
      status: data.status,
      sortOrder: items.length,
    })
    reset({ label: "", status: "required" })
    setShowAdd(false)
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#036638] uppercase tracking-wider">
          Checklist Items
        </p>
        <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? "Cancel" : "Add Item"}
        </Button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-lg p-2">
          <input
            {...register("label", { required: "Label is required" })}
            placeholder="New checklist item..."
            className="flex-1 h-8 px-2.5 rounded border border-[#E5E7EB] text-sm focus:outline-none focus:ring-1 focus:ring-[#036638]/40"
          />
          <select
            {...register("status")}
            className="h-8 px-2 rounded border border-[#E5E7EB] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#036638]/40"
          >
            <option value="required">Required</option>
            <option value="optional">Optional</option>
          </select>
          <Button
            type="submit"
            size="sm"
            disabled={createItem.isPending}
            className="bg-[#036638] hover:bg-[#025030] text-white text-xs h-8"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        </form>
      )}

      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              allStages={allStages}
              onUpdate={(id, label, status, stage) => updateItem.mutate({ id, label, status, stage })}
              onDelete={(id) => deleteItem.mutate(id)}
              isUpdating={updateItem.isPending}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#6B7280] italic">No checklist items - this stage can advance without checking anything.</p>
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
}: {
  item: ChecklistItemDef
  allStages: PipelineStage[]
  onUpdate: (id: string, label: string, status: "required" | "optional", stage?: string) => void
  onDelete: (id: string) => void
  isUpdating: boolean
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
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[#EBF7EC]/50 transition-colors group bg-white/70 border border-transparent hover:border-[#E5E7EB]">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-3.5 h-3.5 rounded border border-[#E5E7EB] shrink-0" />
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
            <select
              value={editStage}
              onChange={(e) => setEditStage(e.target.value)}
              className="h-7 px-2 rounded border border-[#E5E7EB] text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#036638]/40"
              title="Move item to another stage"
            >
              {allStages.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
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
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all shrink-0 cursor-pointer",
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
      {!item.isDefault && (
        <button
          onClick={() => onDelete(item.id)}
          className="p-1 rounded hover:bg-red-50 text-[#6B7280] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

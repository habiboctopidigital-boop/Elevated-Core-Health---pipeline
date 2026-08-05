"use client"

import { useState } from "react"
import {
  useAdminChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
} from "@/hooks/query/useAdmin"
import { STAGE_ORDER, STAGE_LABELS } from "@/types"
import { Loader2, Plus, Trash2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"

export default function AdminChecklistPage() {
  const { data: items, isLoading } = useAdminChecklist()
  const createItem = useCreateChecklistItem()
  const updateItem = useUpdateChecklistItem()
  const deleteItem = useDeleteChecklistItem()

  const [modalOpen, setModalOpen] = useState(false)

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { stage: "onboarding", label: "", status: "required", sortOrder: 0 },
  })

  const openCreate = () => {
    reset({ stage: "onboarding", label: "", status: "required", sortOrder: 0 })
    setModalOpen(true)
  }

  const onSubmit = async (data: any) => {
    await createItem.mutateAsync({
      stage: data.stage,
      label: data.label,
      status: data.status,
      sortOrder: data.sortOrder ? parseInt(data.sortOrder) : undefined,
    })
    setModalOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#036638] animate-spin" />
      </div>
    )
  }

  const itemsByStage =
    items?.reduce(
      (acc, item) => {
        if (!acc[item.stage]) acc[item.stage] = []
        acc[item.stage].push(item)
        return acc
      },
      {} as Record<string, typeof items>,
    ) || {}

  return (
    <div className="space-y-6  max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1A1B1E]">Checklist Manager</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Configure checklist items per pipeline stage
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#036638] hover:bg-[#025030] text-white text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {STAGE_ORDER.map((stage) => {
        const stageItems = itemsByStage[stage] || []
        return (
          <div key={stage} className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="text-sm font-bold text-[#036638] mb-3">{STAGE_LABELS[stage]}</h3>
            {stageItems.length > 0 ? (
              <div className="space-y-1.5">
                {stageItems
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onUpdate={(id, label, status) => updateItem.mutate({ id, label, status })}
                      onDelete={(id) => deleteItem.mutate(id)}
                      isUpdating={updateItem.isPending}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-[#6B7280] italic">No items for this stage</p>
            )}
          </div>
        )
      })}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1B1E]">
              Add Checklist Item
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Stage</label>
              <select
                {...register("stage")}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
              >
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Label</label>
              <input
                {...register("label", { required: "Label is required" })}
                placeholder="e.g. Verify insurance eligibility"
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Status</label>
              <select
                {...register("status")}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
              >
                <option value="required">Required — must be completed to advance</option>
                <option value="optional">Optional — informational only</option>
              </select>
              <p className="text-[11px] text-[#6B7280]">
                Only Required items block a patient from moving to the next stage.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Sort Order</label>
              <input
                type="number"
                {...register("sortOrder")}
                placeholder="0"
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createItem.isPending}
                className="bg-[#036638] hover:bg-[#025030] text-white text-xs"
              >
                {createItem.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChecklistItemRow({
  item,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  item: { id: string; label: string; status: "required" | "optional"; isDefault: boolean }
  onUpdate: (id: string, label: string, status: "required" | "optional") => void
  onDelete: (id: string) => void
  isUpdating: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.label)

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== item.label) {
      onUpdate(item.id, trimmed, item.status)
    }
    setEditing(false)
  }

  const toggleStatus = () => {
    const next = item.status === "required" ? "optional" : "required"
    onUpdate(item.id, item.label, next)
  }

  const handleCancel = () => {
    setEditValue(item.label)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[#EBF7EC]/50 transition-colors group">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-3.5 h-3.5 rounded border border-[#E5E7EB] shrink-0" />
        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") handleCancel()
              }}
              autoFocus
              className="flex-1 h-7 px-2 rounded border border-[#036638] text-sm text-[#1A1B1E] focus:outline-none focus:ring-1 focus:ring-[#036638]/30"
            />
            <button
              onClick={handleSave}
              disabled={isUpdating || !editValue.trim()}
              className="p-1 rounded hover:bg-green-50 text-green-600 disabled:opacity-30"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 rounded hover:bg-red-50 text-red-500"
            >
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

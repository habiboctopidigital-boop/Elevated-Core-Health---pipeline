"use client"

import { useState } from "react"
import {
  useEligibilityRules,
  useCreateEligibilityRule,
  useUpdateEligibilityRule,
  useDeleteEligibilityRule,
} from "@/hooks/query/useAdmin"
import type { EligibilityRule } from "@/types"
import { Loader2, Plus, Trash2, Pencil, ShieldCheck, Power } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"

const FIELD_OPTIONS = [
  { value: "insuranceProvider", label: "Insurance provider" },
  { value: "paymentMethod", label: "Payment method" },
  { value: "coverage", label: "Coverage (simulated)" },
  { value: "payer", label: "Payer (simulated)" },
  { value: "memberId", label: "Member ID (simulated)" },
  { value: "copay", label: "Copay (simulated)" },
  { value: "deductible", label: "Deductible (simulated)" },
  { value: "authorizationRequired", label: "Authorization required (simulated)" },
]

const OPERATOR_OPTIONS = [
  { value: "is_not_empty", label: "is not empty" },
  { value: "is_empty", label: "is empty" },
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
]

const OPERATOR_LABELS: Record<string, string> = Object.fromEntries(
  OPERATOR_OPTIONS.map((o) => [o.value, o.label]),
)
const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  FIELD_OPTIONS.map((f) => [f.value, f.label]),
)

function needsValue(operator: string): boolean {
  return operator === "equals" || operator === "contains"
}

export default function AdminEligibilityPage() {
  const { data: rules, isLoading } = useEligibilityRules()
  const createRule = useCreateEligibilityRule()
  const updateRule = useUpdateEligibilityRule()
  const deleteRule = useDeleteEligibilityRule()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<EligibilityRule | null>(null)

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      label: "",
      field: "insuranceProvider",
      operator: "is_not_empty",
      value: "",
      isActive: true,
    },
  })

  const operator = watch("operator")

  const openCreate = () => {
    setEditingRule(null)
    reset({ label: "", field: "insuranceProvider", operator: "is_not_empty", value: "", isActive: true })
    setModalOpen(true)
  }

  const openEdit = (rule: EligibilityRule) => {
    setEditingRule(rule)
    reset({
      label: rule.label,
      field: rule.field,
      operator: rule.operator,
      value: rule.value ?? "",
      isActive: rule.isActive,
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: any) => {
    const payload = {
      label: data.label,
      field: data.field,
      operator: data.operator,
      value: needsValue(data.operator) && data.value ? data.value : null,
      isActive: data.isActive,
    }
    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, ...payload })
    } else {
      await createRule.mutateAsync(payload)
    }
    setModalOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#036638] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1A1B1E]">Eligibility Rules</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Define the criteria used to decide if a patient is eligible. All active
            rules must pass.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#036638] hover:bg-[#025030] text-white text-xs gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </Button>
      </div>

      {rules && rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "bg-white rounded-xl border p-4 flex items-center gap-4 transition-all",
                rule.isActive ? "border-[#E5E7EB]" : "border-[#E5E7EB] opacity-60",
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  rule.isActive ? "bg-[#EBF7EC] text-[#036638]" : "bg-gray-100 text-gray-400",
                )}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#1A1B1E]">{rule.label}</p>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      rule.isActive
                        ? "bg-[#EBF7EC] text-[#036638]"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {rule.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-1">
                  <span className="font-medium text-[#374151]">{FIELD_LABELS[rule.field] || rule.field}</span>{" "}
                  <span className="text-[#036638] font-medium">{OPERATOR_LABELS[rule.operator] || rule.operator}</span>
                  {rule.value ? <span className="font-medium text-[#374151]"> "{rule.value}"</span> : null}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => updateRule.mutate({ id: rule.id, isActive: !rule.isActive })}
                  title={rule.isActive ? "Deactivate rule" : "Activate rule"}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    rule.isActive
                      ? "text-[#036638] hover:bg-[#EBF7EC]"
                      : "text-gray-400 hover:bg-gray-100",
                  )}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEdit(rule)}
                  className="p-2 rounded-lg text-[#6B7280] hover:bg-gray-100 hover:text-[#036638] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteRule.mutate(rule.id)}
                  className="p-2 rounded-lg text-[#6B7280] hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-10 text-center">
          <ShieldCheck className="w-8 h-8 text-[#65BD6C] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1A1B1E]">No eligibility rules yet</p>
          <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
            Add a rule such as "Insurance provider is not empty". Until a rule is
            added, every eligibility check will return Eligible.
          </p>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1B1E]">
              {editingRule ? "Edit Eligibility Rule" : "Add Eligibility Rule"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Label</label>
              <input
                {...register("label", { required: "Label is required" })}
                placeholder="e.g. Patient has an insurance provider"
                className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151]">Field</label>
                <select
                  {...register("field")}
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
                >
                  {FIELD_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151]">Operator</label>
                <select
                  {...register("operator")}
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
                >
                  {OPERATOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {needsValue(operator) && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#374151]">Value</label>
                <input
                  {...register("value")}
                  placeholder="e.g. Blue Cross Blue Shield"
                  className="w-full h-9 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
              <input
                type="checkbox"
                {...register("isActive")}
                className="w-4 h-4 rounded border-[#E5E7EB] text-[#036638] focus:ring-[#036638] accent-[#036638]"
              />
              Rule is active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createRule.isPending || updateRule.isPending}
                className="bg-[#036638] hover:bg-[#025030] text-white text-xs"
              >
                {createRule.isPending || updateRule.isPending
                  ? "Saving..."
                  : editingRule
                    ? "Save Changes"
                    : "Add Rule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

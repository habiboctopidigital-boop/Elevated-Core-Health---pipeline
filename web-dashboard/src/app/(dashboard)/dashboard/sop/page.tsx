"use client"

import { ScrollText, CheckCircle, AlertTriangle, Flag, Loader2 } from "lucide-react"
import { useChecklistItems } from "@/hooks/query/usePatients"
import { useStageMeta } from "@/hooks/query/useStages"
import { cn } from "@/lib/utils"

export default function SOPPage() {
  const { data: items, isLoading } = useChecklistItems()
  const { order: stageOrder, labels: stageLabels, hints: stageHints } = useStageMeta()

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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ScrollText className="w-5 h-5 text-[#036638]" />
          <h1 className="text-xl font-bold text-[#1A1B1E]">
            SOP Reference
          </h1>
        </div>
        <p className="text-sm text-[#6B7280]">
          Standard operating procedures for the patient pipeline
        </p>
      </div>

      {/* Key Rules */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#036638]">Key Rules</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-[#65BD6C] mt-0.5 shrink-0" />
            <p className="text-sm text-[#374151]">
              <strong>Forward moves are checklist-gated:</strong> A patient cannot advance
              until every <strong>Required</strong> checklist item for the current stage is
              checked: Optional items never block advancement.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-[#374151]">
              <strong>Stale flag (48h):</strong> If a card hasn&apos;t been updated in 48+
              hours and is not in <strong>Reconciled</strong>, it gets flagged visually.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <Flag className="w-4 h-4 text-[#036638] mt-0.5 shrink-0" />
            <p className="text-sm text-[#374151]">
              <strong>Flag for Donna:</strong> Any VA can flag a card with a text reason:
              Only Donna can clear flags: Use this for issues needing her attention.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-[#65BD6C] mt-0.5 shrink-0" />
            <p className="text-sm text-[#374151]">
              <strong>No clinical data:</strong> Notes fields are for operational status
              only - never diagnoses or clinical details.
            </p>
          </div>
        </div>
      </div>

      {/* Stage Checklists */}
      {stageOrder.map((stage) => {
        const stageItems = itemsByStage[stage] || []
        return (
          <div key={stage} className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <div className="mb-3">
              <h3 className="text-sm font-bold text-[#036638]">
                {stageLabels[stage]}
              </h3>
              <p className="text-xs text-[#6B7280]">{stageHints[stage]}</p>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading checklist...
              </div>
            ) : stageItems.length > 0 ? (
              <ul className="space-y-1.5">
                {stageItems
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5 text-sm text-[#374151]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#65BD6C] mt-1.5 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          {item.label.replaceAll(".", ":")}
                          <span
                            className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                              item.status === "required"
                                ? "bg-red-50 text-red-700"
                                : "bg-[#EBF7EC] text-[#036638]",
                            )}
                          >
                            {item.status === "required" ? "Required" : "Optional"}
                          </span>
                        </span>
                        {item.description && (
                          <span className="block text-xs text-[#6B7280] mt-0.5">
                            {item.description.replaceAll(".", ":")}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-[#6B7280] italic">No checklist items configured for this stage</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

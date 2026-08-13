"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-time-picker"
import { Loader2, ShieldCheck, RotateCcw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { useCheckEligibility } from "@/hooks/query/usePatients"
import { SelectOrOther } from "@/components/shared/select-or-other"
import { INSURANCE_PROVIDER_OPTIONS, VOB_LABELS } from "@/lib/patient-options"
import type { Patient } from "@/types"

// ---------------------------------------------------------------------------
// Eligibility Check Dialog — demo flow.
//
// Phase 1 (form):    dummy insurance fields a VA would read off the intake /
//                    insurance card (payer, member ID, group #, DOB).
// Phase 2 (checking): simulated "contacting payer" loading. A minimum display
//                    time keeps the checking state clearly visible while the
//                    real API call runs underneath in parallel.
// Phase 3 (result):  the backend's verdict with the VOB snapshot. With no
//                    eligibility rules configured the backend returns
//                    `eligible` (true) — the intended demo result.
// ---------------------------------------------------------------------------

type Phase = "form" | "checking" | "result" | "error"

const CHECK_STEPS = [
  "Contacting payer network…",
  "Verifying coverage details…",
  "Checking authorization requirements…",
  "Finalizing eligibility report…",
]

interface EligibilityCheckDialogProps {
  patient: Patient
  open: boolean
  onClose: () => void
}

export function EligibilityCheckDialog({ patient, open, onClose }: EligibilityCheckDialogProps) {
  const checkEligibility = useCheckEligibility()

  const [phase, setPhase] = useState<Phase>("form")
  const [stepIndex, setStepIndex] = useState(0)
  const [insuranceProvider, setInsuranceProvider] = useState("")
  const [insuranceProviderOther, setInsuranceProviderOther] = useState(false)
  const [memberId, setMemberId] = useState("")
  const [groupNumber, setGroupNumber] = useState("")
  const [dob, setDob] = useState("")
  const [result, setResult] = useState<Patient | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittingRef = useRef(false)

  // Fresh, empty form every time the dialog opens (or the patient changes).
  useEffect(() => {
    if (!open) return
    setPhase("form")
    setStepIndex(0)
    setError(null)
    setResult(null)
    setInsuranceProvider(patient.insuranceProvider ?? "")
    setInsuranceProviderOther(
      !!patient.insuranceProvider &&
        !INSURANCE_PROVIDER_OPTIONS.includes(patient.insuranceProvider),
    )
    setMemberId("")
    setGroupNumber("")
    setDob("")
  }, [open, patient.id, patient.insuranceProvider])

  // Rotate the checking steps while the dummy loading is on screen.
  useEffect(() => {
    if (phase !== "checking") return
    setStepIndex(0)
    stepTimer.current = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, CHECK_STEPS.length - 1))
    }, 550)
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current)
    }
  }, [phase])

  const handleSubmit = async () => {
    // Ref-based guard: state updates are batched, so two very fast clicks could
    // both see the "form" phase before the re-render. The ref blocks duplicates.
    if (!open || submittingRef.current) return
    submittingRef.current = true
    setPhase("checking")
    // Dummy minimum loading so the demo clearly shows the checking state,
    // while the real backend call runs underneath in parallel.
    const minLoading = new Promise((resolve) => setTimeout(resolve, 2400))
    try {
      const [updated] = await Promise.all([
        checkEligibility.mutateAsync({
          id: patient.id,
          insuranceProvider: insuranceProvider.trim() || null,
          paymentDetails: {
            memberId: memberId.trim() || null,
            groupNumber: groupNumber.trim() || null,
            dateOfBirth: dob || null,
          },
        }),
        minLoading,
      ])
      setResult(updated)
      setPhase("result")
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Eligibility check failed. Please try again.",
      )
      setPhase("error")
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg bg-white p-0 gap-0 overflow-hidden rounded-2xl border border-emerald-100 shadow-2xl">
        {/* Visually hidden accessible name for screen readers */}
        <DialogTitle className="sr-only">Eligibility Check for {patient.name}</DialogTitle>
        {/* Header. `pr-10` keeps the title clear of the built-in X close button
            rendered by DialogContent at top-right. */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 px-6 py-5 pr-10">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Eligibility Check</h3>
              <p className="text-xs text-emerald-100/90">
                Verify benefits for {patient.name}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {phase === "form" && (
            <>
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Demo mode.</span> These are sample
                  fields. Enter anything to run the check. The result comes back
                  from the backend.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FieldLabel>Insurance Provider</FieldLabel>
                  <SelectOrOther
                    value={insuranceProvider}
                    onChange={setInsuranceProvider}
                    otherMode={insuranceProviderOther}
                    onOtherModeChange={setInsuranceProviderOther}
                    options={INSURANCE_PROVIDER_OPTIONS}
                    placeholder="Select insurance provider..."
                  />
                </div>
                <div>
                  <FieldLabel>Member ID</FieldLabel>
                  <input
                    type="text"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="ECH12345678"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Group Number</FieldLabel>
                  <input
                    type="text"
                    value={groupNumber}
                    onChange={(e) => setGroupNumber(e.target.value)}
                    placeholder="G123456"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Date of Birth</FieldLabel>
                  <DatePicker value={dob} onChange={(v) => setDob(v)} placeholder="Select date of birth" />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2.5">
                <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={checkEligibility.isPending}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Check Eligibility
                </Button>
              </div>
            </>
          )}

          {phase === "checking" && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                <ShieldCheck className="absolute inset-0 m-auto w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Checking eligibility…</p>
                <p className="text-xs text-gray-500 mt-1.5 min-h-[1rem]">
                  {CHECK_STEPS[stepIndex]}
                </p>
              </div>
              <div className="w-full max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${((stepIndex + 1) / CHECK_STEPS.length) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                This is a simulated loading state for demo purposes
              </p>
            </div>
          )}

          {phase === "result" && result && (
            <div className="space-y-5">
              <div className="flex items-start gap-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-emerald-900">Patient is Eligible</h4>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    Eligibility check completed - coverage verified.
                  </p>
                  {result.eligibilityCheckedAt && (
                    <p className="text-[11px] text-emerald-600/80 mt-1.5">
                      Checked {new Date(result.eligibilityCheckedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {result.eligibilityDetails?.vob && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Coverage Details
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {VOB_LABELS.map(([key, label]) => {
                      const value = result.eligibilityDetails?.vob?.[key]
                      if (value === undefined || value === null) return null
                      return (
                        <div key={key} className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                          <p className="text-sm font-semibold text-gray-700">
                            {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={onClose}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-5">
              <div className="flex items-start gap-4 rounded-2xl bg-red-50 border border-red-200 p-5">
                <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-red-900">Check Failed</h4>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2.5">
                <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setPhase("form")
                    setError(null)
                  }}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white shadow gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  )
}

const inputClass =
  "w-full h-10 px-3 border border-gray-200 rounded-xl text-sm bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 " +
  "placeholder:text-gray-400"

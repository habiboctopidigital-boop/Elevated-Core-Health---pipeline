"use client"

import { useRef, useState } from "react"
import {
  Webhook,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Code2,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import { SettingsNav } from "@/components/features/settings-nav"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SelectOrOther } from "@/components/shared/select-or-other"
import { useWebhookSettings, useRotateWebhookSecret, useSendTestWebhook } from "@/hooks/query/useWebhooks"
import { useListVas } from "@/hooks/query/usePatients"
import { PAYMENT_METHOD_OPTIONS, INSURANCE_PROVIDER_OPTIONS, VISIT_STATUS_OPTIONS } from "@/lib/patient-options"
import { cn } from "@/lib/utils"

// Mirrors the enum on the real IntakeSchema (backend/patients.validation.ts) — kept
// local rather than shared, matching how add-patient-dialog.tsx already does this.
const BOOKING_PLATFORMS = [
  { value: "klarity", label: "Klarity" },
  { value: "zocdoc", label: "ZocDoc" },
  { value: "headway", label: "Headway" },
  { value: "grow_therapy", label: "Grow Therapy" },
  { value: "google", label: "Google" },
  { value: "phone", label: "Phone" },
  { value: "walk_in", label: "Walk-in" },
]

// Radix Select rejects an empty-string item value, so "no explicit VA" uses this
// sentinel and gets stripped back out to `undefined` before the payload is sent.
const AUTO_ASSIGN = "auto"

function toLocalDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultTestPayload() {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
  return {
    // `name` is the only name field this form exposes — deliberately no
    // firstName/lastName here. The real IntakeSchema treats explicit
    // firstName/lastName as overrides that WIN over `name` server-side, so
    // silently sending stale defaults for them would edit-and-then-ignore
    // whatever the admin types into the Patient Name field below.
    name: "Test Patient",
    // Unique per generation — intake() rejects a repeat email as a duplicate
    // (409), so reusing one static test address would make every send after
    // the first look like a failure that has nothing to do with the webhook.
    email: `test.patient+${Date.now()}@example.com`,
    phone: "(555) 000-1234",
    location: "Remote Test",
    appointmentDatetime: toLocalDatetimeLocal(oneHourFromNow),
    bookingPlatform: "phone",
    assignedTo: AUTO_ASSIGN,
    problemDescription: "",
    paymentMethod: "",
    insuranceProvider: "",
    visitStatus: "not_visited",
  }
}

export default function WebhooksSettingsPage() {
  const { data: settings, isLoading } = useWebhookSettings()
  const { data: vaList } = useListVas()
  const rotateSecret = useRotateWebhookSecret()
  const sendTest = useSendTestWebhook()

  const [showSecret, setShowSecret] = useState(false)
  const [copiedField, setCopiedField] = useState<"url" | "secret" | null>(null)
  const [confirmRotateOpen, setConfirmRotateOpen] = useState(false)
  const [showRawPayload, setShowRawPayload] = useState(false)
  const [paymentMethodOther, setPaymentMethodOther] = useState(false)
  const [insuranceProviderOther, setInsuranceProviderOther] = useState(false)
  const [payload, setPayload] = useState(defaultTestPayload())
  const resultRef = useRef<HTMLDivElement>(null)

  const copy = (value: string, field: "url" | "secret") => {
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    toast.success(field === "url" ? "Endpoint URL copied" : "Secret key copied")
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 2000)
  }

  const handleRotate = async () => {
    await rotateSecret.mutateAsync()
    setConfirmRotateOpen(false)
    setShowSecret(true)
  }

  const buildBody = (): Record<string, unknown> => ({
    name: payload.name.trim(),
    email: payload.email.trim() || undefined,
    phone: payload.phone.trim() || undefined,
    location: payload.location.trim() || undefined,
    appointmentDatetime: payload.appointmentDatetime
      ? new Date(payload.appointmentDatetime).toISOString()
      : undefined,
    bookingPlatform: payload.bookingPlatform || undefined,
    assignedTo: payload.assignedTo === AUTO_ASSIGN ? undefined : payload.assignedTo,
    problemDescription: payload.problemDescription.trim() || undefined,
    paymentMethod: payload.paymentMethod.trim() || undefined,
    insuranceProvider: payload.insuranceProvider.trim() || undefined,
    visitStatus: payload.visitStatus,
  })

  const handleSendTest = async () => {
    if (!payload.name.trim()) {
      toast.error("Patient name is required")
      return
    }
    try {
      await sendTest.mutateAsync(buildBody())
      // The toast fires from the mutation hook, but the panel with the full
      // detail (message, created patient, HTTP status) is easy to miss below
      // the fold — pull it into view so the outcome is unmistakable either way.
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    } catch {
      // Already toasted by the hook's onError — nothing else to do here.
    }
  }

  const result = sendTest.data
  const resultSucceeded = result?.response?.success === true

  return (
    <>
      {/* Tabs + page title scroll together as one pinned unit — otherwise the
          title/breadcrumb (which explain what page you're even on) disappear
          the moment you scroll past them, leaving only the bare tab bar. */}
      <div className="sticky top-0 z-40 bg-[#F4F5F7]">
        <SettingsNav currentPage="webhooks" />
        <div className="max-w-5xl mx-auto px-1 pt-4 pb-4">
          <PageHeader
            breadcrumb="Settings · Webhooks"
            title="Webhook Integration"
            subtitle="Manage the Make.com intake endpoint, rotate the secret key, and send test bookings"
            icon={Webhook}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto pt-2 pb-16 space-y-6">
        {/* Endpoint */}
        <div className="rounded-2xl border border-[#EDEFF2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#EBF7EC] flex items-center justify-center shrink-0">
              <Webhook className="w-4.5 h-4.5 text-[#036638]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#1A1B1E]">Intake Endpoint</h3>
              <p className="text-xs text-[#6B7280]">Where Make.com posts new booking-email data</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1.5 rounded-md bg-[#036638]/10 text-[#036638] shrink-0">
              POST
            </span>
            <code className="flex-1 min-w-0 truncate text-xs sm:text-sm font-mono text-[#1A1B1E] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2">
              {isLoading ? "Loading…" : settings?.url}
            </code>
            <button
              type="button"
              onClick={() => settings && copy(settings.url, "url")}
              disabled={!settings}
              className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#036638] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy endpoint URL"
            >
              {copiedField === "url" ? <Check className="w-4 h-4 text-[#036638]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-2.5 leading-relaxed">
            Every call must include an <code className="font-mono text-[#6B7280]">x-webhook-secret</code> header
            matching the key below — it always creates a brand-new patient at{" "}
            <span className="font-semibold text-[#036638]">Onboarding</span>, never updates an existing one.
          </p>
        </div>

        {/* Secret key */}
        <div className="rounded-2xl border border-[#EDEFF2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#EBF7EC] flex items-center justify-center shrink-0">
                <Shield className="w-4.5 h-4.5 text-[#036638]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#1A1B1E]">Secret Key</h3>
                <p className="text-xs text-[#6B7280]">Checked against the header on every intake call</p>
              </div>
            </div>
            {settings && (
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border shrink-0",
                  settings.source === "database"
                    ? "bg-[#EBF7EC] text-[#036638] border-[#65BD6C]/30"
                    : "bg-amber-50 text-amber-700 border-amber-200",
                )}
              >
                {settings.source === "database" ? "Rotated" : "Environment default"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-xs sm:text-sm font-mono text-[#1A1B1E] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2">
              {isLoading
                ? "Loading…"
                : showSecret
                  ? settings?.secret
                  : "•".repeat(Math.min(settings?.secret.length ?? 32, 40))}
            </code>
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              disabled={!settings}
              className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#036638] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title={showSecret ? "Hide secret" : "Reveal secret"}
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => settings && copy(settings.secret, "secret")}
              disabled={!settings}
              className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#036638] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Copy secret key"
            >
              {copiedField === "secret" ? <Check className="w-4 h-4 text-[#036638]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
            <p className="text-[11px] text-[#9CA3AF]">
              {settings?.source === "database" && settings.rotatedAt
                ? `Rotated ${new Date(settings.rotatedAt).toLocaleString()}${settings.rotatedBy ? ` by ${settings.rotatedBy.name}` : ""}`
                : "Currently using the default configured in the server environment — not yet rotated."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRotateOpen(true)}
              disabled={!settings || rotateSecret.isPending}
              className="text-xs gap-1.5 border-[#036638]/30 text-[#036638] hover:bg-[#EBF7EC] hover:border-[#036638]/60"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate Secret
            </Button>
          </div>
        </div>

        {/* Test webhook */}
        <div className="rounded-2xl border border-[#EDEFF2] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#EBF7EC] flex items-center justify-center shrink-0">
                <Send className="w-4.5 h-4.5 text-[#036638]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#1A1B1E]">Send Test Webhook</h3>
                <p className="text-xs text-[#6B7280]">
                  Edits below are sent exactly as-is to the real intake endpoint
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPayload(defaultTestPayload())}
                className="text-xs font-medium text-[#6B7280] hover:text-[#036638] flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to defaults
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={payload.name}
                onChange={(e) => setPayload((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Location</label>
              <Input
                value={payload.location}
                onChange={(e) => setPayload((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Email</label>
              <Input
                type="email"
                value={payload.email}
                onChange={(e) => setPayload((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Phone</label>
              <Input
                type="tel"
                value={payload.phone}
                onChange={(e) => setPayload((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Appointment Date &amp; Time</label>
              <Input
                type="datetime-local"
                value={payload.appointmentDatetime}
                onChange={(e) => setPayload((p) => ({ ...p, appointmentDatetime: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Booking Platform</label>
              <Select
                value={payload.bookingPlatform}
                onValueChange={(v) => setPayload((p) => ({ ...p, bookingPlatform: v }))}
              >
                <SelectTrigger className="w-full h-9 rounded-lg border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/30 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_PLATFORMS.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Assign VA</label>
              <Select
                value={payload.assignedTo}
                onValueChange={(v) => setPayload((p) => ({ ...p, assignedTo: v }))}
              >
                <SelectTrigger className="w-full h-9 rounded-lg border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/30 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_ASSIGN}>Auto-assign (by appointment time)</SelectItem>
                  {vaList?.map((va) => (
                    <SelectItem key={va.id} value={va.id}>
                      {va.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Visit Status</label>
              <Select
                value={payload.visitStatus}
                onValueChange={(v) => setPayload((p) => ({ ...p, visitStatus: v }))}
              >
                <SelectTrigger className="w-full h-9 rounded-lg border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/30 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Payment Type</label>
              <SelectOrOther
                value={payload.paymentMethod}
                onChange={(v) => setPayload((p) => ({ ...p, paymentMethod: v }))}
                otherMode={paymentMethodOther}
                onOtherModeChange={setPaymentMethodOther}
                options={PAYMENT_METHOD_OPTIONS}
                placeholder="Select payment type..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151]">Insurance Company</label>
              <SelectOrOther
                value={payload.insuranceProvider}
                onChange={(v) => setPayload((p) => ({ ...p, insuranceProvider: v }))}
                otherMode={insuranceProviderOther}
                onOtherModeChange={setInsuranceProviderOther}
                options={INSURANCE_PROVIDER_OPTIONS}
                placeholder="Select insurance company..."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-[#374151]">
                Notes <span className="text-[#9CA3AF] font-normal">(optional, operational only)</span>
              </label>
              <Textarea
                value={payload.problemDescription}
                onChange={(e) => setPayload((p) => ({ ...p, problemDescription: e.target.value }))}
                placeholder="e.g. Follow-up visit, medication review..."
                className="text-sm min-h-[60px]"
              />
            </div>
          </div>

          {/* Creates-at reminder — intake always lands in Onboarding, so this is informational, not a control */}
          <div className="flex items-center gap-2 mt-4 text-xs text-[#6B7280]">
            <span>Creates at:</span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[#036638]/10 text-[#036638]">
              Onboarding
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRawPayload((v) => !v)}
              className="text-xs font-medium text-[#6B7280] hover:text-[#036638] flex items-center gap-1.5 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showRawPayload ? "Hide" : "View"} raw payload
            </button>
            <Button
              onClick={handleSendTest}
              disabled={sendTest.isPending || !payload.name.trim()}
              className="bg-[#036638] hover:bg-[#025030] text-white text-xs gap-1.5"
            >
              {sendTest.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Test Webhook
                </>
              )}
            </Button>
          </div>

          {showRawPayload && (
            <pre className="mt-3 text-[11px] font-mono text-[#4B5563] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3.5 overflow-x-auto">
              {JSON.stringify(buildBody(), null, 2)}
            </pre>
          )}

          {result && (
            <div
              ref={resultRef}
              className={cn(
                "rounded-xl border p-4 mt-4 scroll-mt-6",
                resultSucceeded ? "bg-[#EBF7EC] border-[#65BD6C]/40" : "bg-red-50 border-red-200",
              )}
            >
              <div className="flex items-center gap-2">
                {resultSucceeded ? (
                  <CheckCircle2 className="w-4 h-4 text-[#036638] shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <p className={cn("text-sm font-bold", resultSucceeded ? "text-[#036638]" : "text-red-700")}>
                  {resultSucceeded ? "Webhook accepted" : "Webhook rejected"}
                </p>
                <span className="ml-auto text-[10px] font-mono text-[#6B7280]">HTTP {result.httpStatus}</span>
              </div>
              <p className="text-xs text-[#4B5563] mt-1.5">{result.response.message}</p>
              {resultSucceeded && result.response.data && (
                <div className="flex items-center gap-2 mt-3 bg-white rounded-lg border border-[#65BD6C]/30 px-3 py-2 w-fit">
                  <span className="text-sm font-semibold text-[#1A1B1E]">{result.response.data.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#036638] text-white">
                    {result.response.data.stage}
                  </span>
                </div>
              )}
              {/* 409 here almost always just means "you sent this same test email before" — a fresh
                  one and a resend is the fix, not a problem with the webhook or secret. */}
              {result.httpStatus === 409 && (
                <button
                  type="button"
                  onClick={() =>
                    setPayload((p) => ({ ...p, email: `test.patient+${Date.now()}@example.com` }))
                  }
                  className="mt-3 text-xs font-semibold text-red-700 hover:text-red-800 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Generate a fresh test email &amp; try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Regenerate confirmation */}
      <Dialog
        open={confirmRotateOpen}
        onOpenChange={(open) => {
          if (!rotateSecret.isPending) setConfirmRotateOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1B1E] flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
              Regenerate webhook secret?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6B7280] mt-1 leading-relaxed">
              The current secret stops working the instant this completes. Any booking that arrives before
              you update the header value in Make.com will be rejected with a 401 until you do.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRotateOpen(false)}
              disabled={rotateSecret.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRotate}
              disabled={rotateSecret.isPending}
              className="text-xs gap-1.5"
            >
              {rotateSecret.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rotating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate Now
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

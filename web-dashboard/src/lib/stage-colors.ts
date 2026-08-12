// ---------------------------------------------------------------------------
// Shared color system — strict green-only brand palette.
//
// The client's branding is green-based only (no blue / violet / purple / etc).
// The 7 stages form a *deepening green journey* from fresh mint all the way to
// dark forest, with the final Reconciled stage in the deepest forest tone as
// the premium "closed out" seal.
//
//   Onboarding      → mint (emerald-300/400)
//   Visit Complete  → fresh (emerald-400/500)
//   Post-Visit Docs → brand green #65BD6C
//   Chart Signed    → deep (emerald-500/600)
//   Sent to Billing → forest (emerald-600/700)
//   Payment Posted  → dark forest (emerald-700/800)
//   Reconciled      → deepest forest (emerald-800/950)
//
// Red / amber are intentionally NOT part of this system — they are reserved
// for alert states only (flagged / stale / not-eligible) in the components.
//
// Stages are DB-driven, so unknown/renamed stage keys fall back to the brand
// dark green. Tailwind classes are written out in full (never built
// dynamically) so the JIT compiler can find every one of them.
// ---------------------------------------------------------------------------

export interface StageColor {
  /** Top accent bar for cards */
  bar: string
  /** Initials-avatar gradient */
  avatar: string
  /** Filled step circle (completed / current) */
  circle: string
  /** Ring + glow for the current step */
  ring: string
  /** Filled connector segment between steps */
  connector: string
  /** Current step label color */
  label: string
  /** Soft tinted chip */
  chipBg: string
  chipText: string
  chipBorder: string
}

const STAGE_COLORS: Record<string, StageColor> = {
  onboarding: {
    bar: "bg-gradient-to-r from-emerald-300 to-emerald-400",
    avatar: "bg-gradient-to-br from-emerald-300 to-emerald-400",
    circle: "bg-emerald-400 border-emerald-400",
    ring: "ring-4 ring-emerald-300/70 shadow-lg shadow-emerald-400/30",
    connector: "bg-emerald-300",
    label: "text-emerald-700",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    chipBorder: "border-emerald-200",
  },
  visit_complete: {
    bar: "bg-gradient-to-r from-emerald-400 to-emerald-500",
    avatar: "bg-gradient-to-br from-emerald-400 to-emerald-500",
    circle: "bg-emerald-500 border-emerald-500",
    ring: "ring-4 ring-emerald-300/70 shadow-lg shadow-emerald-500/30",
    connector: "bg-emerald-400",
    label: "text-emerald-700",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    chipBorder: "border-emerald-200",
  },
  post_visit_docs: {
    bar: "bg-gradient-to-r from-[#65BD6C] to-emerald-500",
    avatar: "bg-gradient-to-br from-[#65BD6C] to-emerald-500",
    circle: "bg-[#65BD6C] border-[#65BD6C]",
    ring: "ring-4 ring-[#65BD6C]/50 shadow-lg shadow-[#65BD6C]/30",
    connector: "bg-[#65BD6C]",
    label: "text-emerald-700",
    chipBg: "bg-[#EBF7EC]",
    chipText: "text-[#036638]",
    chipBorder: "border-[#65BD6C]/40",
  },
  chart_signed: {
    bar: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    avatar: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    circle: "bg-emerald-600 border-emerald-600",
    ring: "ring-4 ring-emerald-400/60 shadow-lg shadow-emerald-600/30",
    connector: "bg-emerald-500",
    label: "text-emerald-800",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-800",
    chipBorder: "border-emerald-300",
  },
  sent_to_billing: {
    bar: "bg-gradient-to-r from-emerald-600 to-emerald-700",
    avatar: "bg-gradient-to-br from-emerald-600 to-emerald-700",
    circle: "bg-emerald-700 border-emerald-700",
    ring: "ring-4 ring-emerald-500/50 shadow-lg shadow-emerald-700/30",
    connector: "bg-emerald-600",
    label: "text-emerald-800",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-800",
    chipBorder: "border-emerald-300",
  },
  payment_posted: {
    bar: "bg-gradient-to-r from-emerald-700 to-emerald-800",
    avatar: "bg-gradient-to-br from-emerald-700 to-emerald-800",
    circle: "bg-emerald-800 border-emerald-800",
    ring: "ring-4 ring-emerald-600/50 shadow-lg shadow-emerald-800/40",
    connector: "bg-emerald-700",
    label: "text-emerald-900",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-900",
    chipBorder: "border-emerald-400",
  },
  reconciled: {
    bar: "bg-gradient-to-r from-emerald-800 to-emerald-950",
    avatar: "bg-gradient-to-br from-emerald-800 to-emerald-950",
    circle: "bg-emerald-900 border-emerald-900",
    ring: "ring-4 ring-emerald-700/50 shadow-lg shadow-emerald-900/40",
    connector: "bg-emerald-800",
    label: "text-emerald-950",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-950",
    chipBorder: "border-emerald-500",
  },
}

const FALLBACK_COLOR: StageColor = {
  bar: "bg-gradient-to-r from-emerald-600 to-emerald-700",
  avatar: "bg-gradient-to-br from-emerald-600 to-emerald-700",
  circle: "bg-emerald-700 border-emerald-700",
  ring: "ring-4 ring-emerald-500/50 shadow-lg shadow-emerald-700/30",
  connector: "bg-emerald-600",
  label: "text-emerald-800",
  chipBg: "bg-emerald-50",
  chipText: "text-emerald-800",
  chipBorder: "border-emerald-300",
}

export function getStageColor(stageKey: string | null | undefined): StageColor {
  if (!stageKey) return FALLBACK_COLOR
  return STAGE_COLORS[stageKey] ?? FALLBACK_COLOR
}

// ---------------------------------------------------------------------------
// VA avatar colors — the two VAs get distinct green-based identities so their
// avatars are instantly distinguishable (Jude = deep forest, Amanda = bright
// emerald). Any other user falls back to the brand green.
// ---------------------------------------------------------------------------
export function getVaColor(userName: string | null | undefined): string {
  const name = (userName ?? "").toLowerCase()
  if (name.includes("jude")) return "bg-gradient-to-br from-emerald-700 to-emerald-900"
  if (name.includes("amanda")) return "bg-gradient-to-br from-emerald-400 to-emerald-600"
  return "bg-gradient-to-br from-emerald-500 to-emerald-700"
}

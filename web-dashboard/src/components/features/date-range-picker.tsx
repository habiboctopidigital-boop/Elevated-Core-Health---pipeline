"use client"

import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

// Short month names for the quick-jump month dropdown.
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Year range for the quick-jump year dropdown — scrollable in the list.
const NAV_YEAR_END = new Date().getFullYear() + 5
const NAV_YEAR_START = NAV_YEAR_END - 60
const NAV_YEARS: number[] = []
for (let y = NAV_YEAR_START; y <= NAV_YEAR_END; y++) NAV_YEARS.push(y)

function toIso(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

function defaultViewDate(): Date {
  return startOfMonth(new Date())
}

interface DateRangePickerProps {
  /** Short label shown on the trigger, e.g. "Appointment" or "Created". */
  label: string
  /** Draft range ("YYYY-MM-DD", or "" when unset). Controlled by the parent. */
  from: string
  to: string
  /** True when the draft differs from what is applied — shows an amber hint. */
  pending: boolean
  onFrom: (value: string) => void
  onTo: (value: string) => void
}

/**
 * Shadcn-style range date picker: a popover calendar (built on date-fns so no
 * extra dependency is needed) with click-to-range selection, quick presets,
 * and a clear action. Styling mirrors the brand: emerald range fill with a
 * dark-green start/end seal.
 *
 * Phone (< sm): the calendar is replaced with two native `<input type="date">`
 * fields (From / To). Native date inputs open the OS date picker, so picking a
 * date works reliably on touch devices where the hover-driven calendar and
 * custom month/year dropdowns are flaky.
 */
export function DateRangePicker({ label, from, to, pending, onFrom, onTo }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState<Date>(() => (from ? startOfMonth(parseISO(from)) : defaultViewDate()))
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  const start = from ? parseISO(from) : null
  const end = to ? parseISO(to) : null
  const isRange = Boolean(start && end)

  const rangeStart = start && end ? (start <= end ? start : end) : null
  const rangeEnd = start && end ? (start <= end ? end : start) : null

  // Hover preview — shows the prospective range before the end point is picked.
  const previewStart = start && !end && hoverDate ? (hoverDate < start ? hoverDate : start) : rangeStart
  const previewEnd = start && !end && hoverDate ? (hoverDate < start ? start : hoverDate) : rangeEnd

  const handleSelect = (day: Date) => {
    // Clicking a day from the adjacent month navigates to it (shadcn behavior),
    // so a range can be started/ended across months without extra clicks.
    if (!isSameMonth(day, viewDate)) setViewDate(startOfMonth(day))

    if (!start || isRange) {
      // First click — start the range (also re-starts after a completed range).
      onFrom(toIso(day))
      onTo("")
    } else if (day < start) {
      // Picked before the start — swap so the range is always forward.
      onFrom(toIso(day))
      onTo(toIso(start))
    } else if (isSameDay(day, start)) {
      // Single-day range.
      onFrom(toIso(day))
      onTo(toIso(day))
    } else {
      onTo(toIso(day))
    }
  }

  const setRange = (fromDate: Date, toDate: Date) => {
    onFrom(toIso(fromDate))
    onTo(toIso(toDate))
  }

  const gridStart = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 })
  // eachDayOfInterval handles DST shifts correctly (a day is never 24h).
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const hasRange = Boolean(from || to)
  const triggerText = hasRange
    ? `${from ? format(parseISO(from), "MMM d") : "…"} – ${to ? format(parseISO(to), "MMM d") : "…"}`
    : label

  const presets = [
    {
      label: "Week",
      run: () => setRange(startOfWeek(new Date(), { weekStartsOn: 0 }), endOfWeek(new Date(), { weekStartsOn: 0 })),
    },
    {
      label: "Month",
      run: () => setRange(startOfMonth(new Date()), endOfMonth(new Date())),
    },
    {
      label: "30d",
      run: () => setRange(subDays(new Date(), 29), new Date()),
    },
  ]

  const renderPresets = (withTopBorder: boolean) => (
    <div
      className={cn(
        "flex items-center justify-between gap-2",
        withTopBorder && "pt-2 border-t border-[#EDEFF2]",
      )}
    >
      <div className="flex items-center gap-1">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={preset.run}
            className="px-2 py-1 rounded-md text-[10px] font-bold text-[#036638] bg-[#EBF7EC] hover:bg-[#036638] hover:text-white transition-colors cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>
      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            onFrom("")
            onTo("")
          }}
          className="flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  )

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setViewDate(start ? startOfMonth(start) : defaultViewDate())
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 h-9 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer max-w-[150px] min-w-[98px]",
            pending
              ? "border-amber-300 bg-amber-50/60 text-amber-700"
              : from || to
                ? "border-[#036638]/30 bg-[#EBF7EC]/60 text-[#036638]"
                : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#65BD6C]/50 hover:text-[#036638] hover:shadow-sm",
          )}
          title={`Filter by ${label.toLowerCase()} date`}
        >
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          <span
            className={cn(
              "truncate min-w-0",
              pending
                ? "font-bold text-amber-700"
                : hasRange
                  ? "font-bold text-[#036638]"
                  : "text-[#6B7280]",
            )}
          >
            {triggerText}
          </span>
          {pending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[290px] p-3 rounded-2xl shadow-lg" align="start">
        {/* Phone (< sm): native date inputs — open the OS picker, always work */}
        <div className="sm:hidden space-y-2.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => onFrom(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs font-semibold text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => onTo(e.target.value)}
              className="w-full h-9 rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-xs font-semibold text-[#1A1B1E] focus:outline-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50"
            />
          </div>
          {renderPresets(true)}
        </div>

        {/* Desktop (sm+): custom calendar */}
        <div className="hidden sm:block">
          {/* Month nav — arrows + month/year dropdowns for instant jumps */}
          <div className="flex items-center gap-1 mb-2">
            <button
              type="button"
              onClick={() => setViewDate((v) => subMonths(v, 1))}
              aria-label="Previous month"
              className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#036638] transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 grid grid-cols-2 gap-1">
              <Select
                value={String(viewDate.getMonth())}
                onValueChange={(v) => setViewDate(new Date(viewDate.getFullYear(), Number(v), 1))}
              >
                <SelectTrigger className="h-7 w-full rounded-lg border-[#E5E7EB] bg-white text-xs font-semibold text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/25 px-2 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(viewDate.getFullYear())}
                onValueChange={(v) => setViewDate(new Date(Number(v), viewDate.getMonth(), 1))}
              >
                <SelectTrigger className="h-7 w-full rounded-lg border-[#E5E7EB] bg-white text-xs font-semibold text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/25 px-2 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64 rounded-xl">
                  {NAV_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => setViewDate((v) => addMonths(v, 1))}
              aria-label="Next month"
              className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#036638] transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <span key={d} className="text-center text-[10px] font-bold text-[#9CA3AF]">
                {d}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewDate)
              const isSelStart = start && isSameDay(day, start)
              const isSelEnd = end && isSameDay(day, end)
              const singleDay = isSelStart && isSelEnd
              const inPreview = previewStart && previewEnd && isWithinInterval(day, { start: previewStart, end: previewEnd })
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  aria-label={format(day, "EEEE, MMMM d, yyyy")}
                  aria-pressed={Boolean(singleDay || (isSelStart && !isSelEnd) || (isSelEnd && !isSelStart))}
                  onClick={() => handleSelect(day)}
                  onMouseEnter={() => setHoverDate(day)}
                  onMouseLeave={() => setHoverDate(null)}
                  className={cn(
                    "h-8 w-8 mx-auto rounded-full text-xs font-medium transition-colors cursor-pointer",
                    !inMonth && "text-[#D1D5DB]",
                    inMonth && !inPreview && !isSelStart && !isSelEnd && "text-[#1A1B1E] hover:bg-[#EBF7EC] hover:text-[#036638]",
                    isToday(day) && inMonth && "ring-1 ring-[#036638]/40",
                    singleDay && "bg-[#036638] text-white hover:bg-[#036638] shadow-sm shadow-emerald-500/30",
                    inPreview && !singleDay && !isSelStart && !isSelEnd && "bg-[#EBF7EC] text-[#036638]",
                    isSelStart && !singleDay && "bg-[#036638] text-white hover:bg-[#036638]",
                    isSelEnd && !singleDay && "bg-[#036638] text-white hover:bg-[#036638]",
                  )}
                >
                  {format(day, "d")}
                </button>
              )
            })}
          </div>

          {renderPresets(true)}
        </div>
      </PopoverContent>
    </Popover>
  )
}

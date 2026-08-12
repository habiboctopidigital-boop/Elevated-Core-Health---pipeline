"use client"

import { useMemo } from "react"
import { addDays, differenceInCalendarDays, format, isToday, startOfDay, startOfWeek } from "date-fns"
import { Clock, User as UserIcon } from "lucide-react"
import type { Patient } from "@/types"
import { cn } from "@/lib/utils"

export interface TimeGridEvent {
  id: string
  start: Date
  title: string
  color: { bg: string; text: string }
  patient: Patient
}

interface WorkloadTimeGridProps {
  /** Any date inside the range to display. For "week" the grid snaps to that Monday. */
  anchorDate: Date
  events: TimeGridEvent[]
  /** 7 columns (week) or a single column (day). */
  mode?: "week" | "day"
  /** Default visible window. Widened automatically if events fall outside it. */
  slotMinHour?: number
  slotMaxHour?: number
  onEventClick?: (id: string) => void
}

/**
 * Layout constants. `MIN_EVENT_HEIGHT` is the shortest a single event card can be
 * while still showing its three lines (name / time / assignee) without clipping —
 * this is the value that the old fixed-height FullCalendar slots violated.
 */
const MIN_EVENT_HEIGHT = 58
const SLOT_PADDING = 10
const MIN_SLOT_HEIGHT = 56

interface MinuteGroup {
  minuteKey: string
  events: TimeGridEvent[]
}

interface HourRow {
  hour: number
  /** One entry per visible day column, each bucketed by exact start time. */
  cells: MinuteGroup[][]
  minHeight: number
}

export function WorkloadTimeGrid({
  anchorDate,
  events,
  mode = "week",
  slotMinHour = 6,
  slotMaxHour = 20,
  onEventClick,
}: WorkloadTimeGridProps) {
  const dayCount = mode === "week" ? 7 : 1

  const rangeStart = useMemo(
    () => (mode === "week" ? startOfWeek(anchorDate, { weekStartsOn: 1 }) : startOfDay(anchorDate)),
    [anchorDate, mode],
  )
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => addDays(rangeStart, i)),
    [rangeStart, dayCount],
  )

  const { rows, timeLabelWidth } = useMemo(() => {
    // Only events inside the visible range matter; everything else is filtered out up
    // front so the bucketing below stays O(events in view) rather than O(all events).
    const rangeEnd = addDays(rangeStart, dayCount)
    const inWeek = events.filter((e) => e.start >= rangeStart && e.start < rangeEnd)

    // Widen the visible window so an event outside the default 6am–8pm range is never
    // silently dropped — the axis grows to include it instead.
    let minHour = slotMinHour
    let maxHour = slotMaxHour
    for (const e of inWeek) {
      const h = e.start.getHours()
      if (h < minHour) minHour = h
      if (h + 1 > maxHour) maxHour = h + 1
    }

    // Bucket: dayIndex -> hour -> "HH:mm" -> events
    const buckets = new Map<string, Map<string, TimeGridEvent[]>>()
    for (const e of inWeek) {
      // Calendar-day difference, not raw ms/86400000 — a DST shift makes a week contain
      // a 23h or 25h day, which would otherwise push events into the neighbouring column.
      const dayIdx = differenceInCalendarDays(e.start, rangeStart)
      if (dayIdx < 0 || dayIdx >= dayCount) continue
      const key = `${dayIdx}-${e.start.getHours()}`
      const minuteKey = format(e.start, "HH:mm")
      let byMinute = buckets.get(key)
      if (!byMinute) {
        byMinute = new Map()
        buckets.set(key, byMinute)
      }
      const list = byMinute.get(minuteKey)
      if (list) list.push(e)
      else byMinute.set(minuteKey, [e])
    }

    const built: HourRow[] = []
    for (let hour = minHour; hour < maxHour; hour++) {
      const cells: MinuteGroup[][] = []
      let maxGroups = 0

      for (let dayIdx = 0; dayIdx < dayCount; dayIdx++) {
        const byMinute = buckets.get(`${dayIdx}-${hour}`)
        const groups: MinuteGroup[] = byMinute
          ? [...byMinute.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([minuteKey, evts]) => ({ minuteKey, events: evts }))
          : []
        cells.push(groups)
        if (groups.length > maxGroups) maxGroups = groups.length
      }

      built.push({
        hour,
        cells,
        // The requested formula: tallest stack in this hour drives the whole row, so
        // every day-cell stays aligned with the time label on the left.
        minHeight: Math.max(MIN_SLOT_HEIGHT, maxGroups * MIN_EVENT_HEIGHT + SLOT_PADDING),
      })
    }

    return { rows: built, timeLabelWidth: 56 }
  }, [events, rangeStart, dayCount, slotMinHour, slotMaxHour])

  return (
    <div className="overflow-auto max-h-[calc(100vh-16rem)] rounded-lg border border-[#E5E7EB]">
      <div
        className={cn("grid", mode === "week" && "min-w-[720px]")}
        style={{
          // Day view has a single column, so it never needs horizontal scrolling and can
          // fill the container. Week view keeps a min column width and scrolls instead of
          // squeezing seven columns into a phone screen.
          gridTemplateColumns:
            mode === "week"
              ? `${timeLabelWidth}px repeat(7, minmax(92px, 1fr))`
              : `${timeLabelWidth}px minmax(0, 1fr)`,
        }}
      >
        {/* ---- Header row (sticky to the top while scrolling) ---- */}
        <div className="sticky top-0 left-0 z-30 bg-[#F9FAFB] border-b border-r border-[#E5E7EB]" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "sticky top-0 z-20 bg-[#F9FAFB] border-b border-r border-[#E5E7EB] px-2 py-2 text-center",
              isToday(day) && "bg-[#EBF7EC]",
            )}
          >
            {mode === "day" ? (
              <p
                className={cn(
                  "text-sm font-bold",
                  isToday(day) ? "text-[#036638]" : "text-[#1A1B1E]",
                )}
              >
                {format(day, "EEEE, MMM d")}
              </p>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  {format(day, "EEE")}
                </p>
                <p
                  className={cn(
                    "text-sm font-bold mt-0.5",
                    isToday(day) ? "text-[#036638]" : "text-[#1A1B1E]",
                  )}
                >
                  {format(day, "d")}
                </p>
              </>
            )}
          </div>
        ))}

        {/* ---- Hour rows ---- */}
        {rows.map((row) => (
          <HourRowCells
            key={row.hour}
            row={row}
            days={days}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  )
}

function HourRowCells({
  row,
  days,
  onEventClick,
}: {
  row: HourRow
  days: Date[]
  onEventClick?: (id: string) => void
}) {
  const label = format(new Date(2000, 0, 1, row.hour), "ha").toLowerCase()

  return (
    <>
      {/* Time axis cell — sticky to the left so it stays visible on horizontal scroll,
          and in the same grid row as its day cells so alignment is automatic. */}
      <div
        className="sticky left-0 z-10 bg-white border-b border-r border-[#E5E7EB] px-2 pt-1.5 text-right transition-[min-height] duration-300 ease-out"
        style={{ minHeight: row.minHeight }}
      >
        <span className="text-[11px] font-medium text-[#6B7280]">{label}</span>
      </div>

      {days.map((day, dayIdx) => {
        const groups = row.cells[dayIdx]
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "border-b border-r border-[#E5E7EB] p-1 flex flex-col gap-1 transition-[min-height] duration-300 ease-out",
              isToday(day) && "bg-[#EBF7EC]/30",
            )}
            style={{ minHeight: row.minHeight }}
          >
            {groups.map((group) => (
              // One flex row per distinct start time: concurrent events split the
              // width evenly (2 → 50%, 3 → 33%…), later times stack below.
              <div key={group.minuteKey} className="flex gap-1 flex-1 min-h-0">
                {group.events.map((event) => (
                  <EventCard key={event.id} event={event} onClick={onEventClick} />
                ))}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}

function EventCard({
  event,
  onClick,
}: {
  event: TimeGridEvent
  onClick?: (id: string) => void
}) {
  const { patient } = event
  const time = format(event.start, "h:mm a")
  const assignee = patient.assignedUser?.name ?? "Unassigned"
  const tooltip = `${patient.name} - ${time} - ${assignee}`

  return (
    <button
      type="button"
      onClick={() => onClick?.(event.id)}
      title={tooltip}
      style={{ backgroundColor: event.color.bg, color: event.color.text }}
      className={cn(
        // flex-1 + min-w-0 is what distributes concurrent events evenly across the
        // cell width without any absolute positioning.
        "flex-1 min-w-0 text-left rounded-md px-2 py-1.5 shadow-sm ring-1 ring-black/10",
        "hover:brightness-110 hover:shadow-md transition-all cursor-pointer overflow-hidden",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className="text-[11px] font-bold leading-tight break-words"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 5,
            overflow: "hidden",
          }}
        >
          {patient.name}
        </span>
        {patient.isFlagged && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1" />
        )}
      </div>
      <span className="text-[10px] opacity-90 flex items-center gap-1 mt-0.5">
        <Clock className="w-2.5 h-2.5 shrink-0" />
        {time}
      </span>
      <span className="text-[10px] opacity-90 flex items-center gap-1 mt-0.5 min-w-0">
        <UserIcon className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate">{assignee}</span>
      </span>
    </button>
  )
}

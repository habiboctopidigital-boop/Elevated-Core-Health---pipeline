"use client"

import { useState } from "react"
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from "lucide-react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const pad = (n: number) => String(n).padStart(2, "0")

// 30-minute slots across the full day (48 options) — scrollable inside the popover.
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const date = new Date(2000, 0, 1, hours, minutes)
  return {
    value: `${pad(hours)}:${pad(minutes)}`,
    label: format(date, "h:mm a"),
  }
})

interface DateTimePickerProps {
  /** ISO string ("" when unset). */
  value: string
  onChange: (iso: string) => void
  placeholder?: string
}

/**
 * Shadcn-style date + time picker: click the input-like trigger and a popover
 * opens with a calendar grid (date-fns — no new dependency) and a 30-minute
 * time select. Picking a day keeps any chosen time (defaults to 9:00 AM);
 * picking a time keeps the selected day.
 */
export function DateTimePicker({ value, onChange, placeholder = "Select date & time" }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(value) : null

  const [viewDate, setViewDate] = useState<Date>(() =>
    selected ? startOfMonth(selected) : startOfMonth(new Date()),
  )
  const [timeSlot, setTimeSlot] = useState<string>(() =>
    selected ? `${pad(selected.getHours())}:${pad(selected.getMinutes())}` : "",
  )

  const gridStart = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const handleDaySelect = (day: Date) => {
    if (!isSameMonth(day, viewDate)) setViewDate(startOfMonth(day))
    const base = new Date(day)
    if (timeSlot) {
      const [h, m] = timeSlot.split(":").map(Number)
      base.setHours(h, m, 0, 0)
    } else {
      base.setHours(9, 0, 0, 0)
    }
    onChange(base.toISOString())
  }

  const handleTimeSelect = (slot: string) => {
    setTimeSlot(slot)
    const base = selected ? new Date(selected) : new Date()
    const [h, m] = slot.split(":").map(Number)
    base.setHours(h, m, 0, 0)
    onChange(base.toISOString())
  }

  const handleClear = () => {
    setTimeSlot("")
    onChange("")
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && selected) setViewDate(startOfMonth(selected))
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-10 px-3.5 rounded-lg border bg-white text-sm flex items-center gap-2.5 transition-all cursor-pointer",
            selected
              ? "border-[#036638]/40 focus:border-[#036638]/60"
              : "border-[#E5E7EB] hover:border-[#D1D5DB]",
            "focus:outline-none focus:ring-2 focus:ring-[#036638]/25 focus:border-[#036638]/50",
          )}
          title={selected ? format(selected, "EEEE, MMMM d, yyyy h:mm a") : placeholder}
        >
          <Calendar className={cn("w-4 h-4 shrink-0", selected ? "text-[#036638]" : "text-[#9CA3AF]")} />
          {selected ? (
            <>
              <span className="font-semibold text-[#1A1B1E]">
                {format(selected, "EEE, MMM d, yyyy")}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#036638] bg-[#EBF7EC] border border-[#65BD6C]/30 rounded-md px-1.5 py-0.5">
                <Clock className="w-3 h-3" />
                {format(selected, "h:mm a")}
              </span>
            </>
          ) : (
            <span className="text-[#9CA3AF]">{placeholder}</span>
          )}
          <ChevronDown className="ml-auto w-4 h-4 text-[#9CA3AF] shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-3 rounded-2xl shadow-lg" align="start">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setViewDate((v) => subMonths(v, 1))}
            aria-label="Previous month"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#036638] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-[#12141A]">{format(viewDate, "MMMM yyyy")}</span>
          <button
            type="button"
            onClick={() => setViewDate((v) => addMonths(v, 1))}
            aria-label="Next month"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#036638] transition-colors cursor-pointer"
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
            const isSelected = selected && isSameDay(day, selected)
            return (
              <button
                key={day.toISOString()}
                type="button"
                aria-label={format(day, "EEEE, MMMM d, yyyy")}
                aria-pressed={Boolean(isSelected)}
                onClick={() => handleDaySelect(day)}
                className={cn(
                  "h-8 w-8 mx-auto rounded-full text-xs font-medium transition-colors cursor-pointer",
                  !inMonth && "text-[#D1D5DB]",
                  inMonth && !isSelected && "text-[#1A1B1E] hover:bg-[#EBF7EC] hover:text-[#036638]",
                  isToday(day) && inMonth && !isSelected && "ring-1 ring-[#036638]/40",
                  isSelected && "bg-[#036638] text-white hover:bg-[#036638] shadow-sm shadow-emerald-500/30",
                )}
              >
                {format(day, "d")}
              </button>
            )
          })}
        </div>

        {/* Time select */}
        <div className="mt-3 pt-3 border-t border-[#EDEFF2]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Appointment time
          </p>
          <Select value={timeSlot} onValueChange={handleTimeSelect}>
            <SelectTrigger className="w-full h-9 rounded-lg border-[#E5E7EB] bg-white text-sm shadow-none focus:ring-2 focus:ring-[#036638]/25 cursor-pointer">
              <SelectValue placeholder="Select time..." />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear */}
        <div className="mt-2.5 pt-2 border-t border-[#EDEFF2]">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            Clear date & time
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

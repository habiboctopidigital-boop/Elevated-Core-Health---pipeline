"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const OTHER_OPTION = "Other"

/**
 * Dropdown of common presets with an "Other" option that reveals a free-text
 * input. The parent owns `otherMode` so it can reset in lockstep with `value`
 * whenever the underlying record (e.g. selected patient) changes.
 */
export function SelectOrOther({
  value,
  onChange,
  otherMode,
  onOtherModeChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  otherMode: boolean
  onOtherModeChange: (other: boolean) => void
  options: string[]
  placeholder: string
}) {
  const selectValue = otherMode ? OTHER_OPTION : options.includes(value) ? value : ""

  return (
    <div className="space-y-1.5">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === OTHER_OPTION) {
            onOtherModeChange(true)
            onChange("")
          } else {
            onOtherModeChange(false)
            onChange(v)
          }
        }}
      >
        <SelectTrigger className="w-full h-10 sm:h-9 rounded-lg border-[#E5E7EB] bg-white text-sm text-[#1A1B1E] shadow-none focus:ring-2 focus:ring-[#036638]/25 hover:border-[#D1D5DB] cursor-pointer">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_OPTION}>Other (specify)</SelectItem>
        </SelectContent>
      </Select>
      {otherMode && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter name..."
          autoFocus
          className="w-full h-10 sm:h-9 px-2.5 rounded-lg border border-[#E5E7EB] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white"
        />
      )}
    </div>
  )
}

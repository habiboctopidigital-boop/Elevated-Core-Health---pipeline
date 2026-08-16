"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { US_CITIES } from "@/lib/us-cities"

const MAX_RESULTS = 100

/**
 * Searchable USA city + state picker. Typing filters the built-in city list
 * live; picking a result stores "City, ST". If the typed text matches nothing
 * in the list, a "Use ... as is" row lets the user keep their own entry —
 * so unusual/rural addresses are never blocked.
 */
export function LocationCombobox({
  value,
  onChange,
  placeholder = "Search city & state...",
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return US_CITIES.slice(0, MAX_RESULTS)
    return US_CITIES.filter(
      ([city, state]) =>
        city.toLowerCase().includes(q) ||
        state.toLowerCase().includes(q) ||
        `${city}, ${state}`.toLowerCase().includes(q),
    ).slice(0, MAX_RESULTS)
  }, [query])

  const noMatch = query.trim() !== "" && matches.length === 0

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative w-full flex items-center justify-between gap-2 text-left cursor-pointer",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-gray-400")}>
            {value || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-gray-200 shadow-xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city or state..."
            autoFocus
            className="w-full text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>
        {/* Results / fallback */}
        <div className="max-h-60 overflow-y-auto py-1">
          {noMatch ? (
            <button
              type="button"
              onClick={() => pick(query.trim())}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-emerald-50 cursor-pointer"
            >
              <span className="text-emerald-600 font-semibold">
                Use &quot;{query.trim()}&quot; as is
              </span>
            </button>
          ) : (
            matches.map(([city, state]) => {
              const label = `${city}, ${state}`
              const active = label === value
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pick(label)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-emerald-50 cursor-pointer",
                    active && "bg-emerald-50 text-emerald-700 font-semibold",
                  )}
                >
                  <span className="truncate">{label}</span>
                  {active && <Check className="w-4 h-4 shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

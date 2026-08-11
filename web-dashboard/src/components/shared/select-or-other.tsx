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
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === OTHER_OPTION) {
            onOtherModeChange(true)
            onChange("")
          } else {
            onOtherModeChange(false)
            onChange(e.target.value)
          }
        }}
        className="w-full h-10 sm:h-9 px-2.5 rounded-lg border border-[#E5E7EB] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 bg-white appearance-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value={OTHER_OPTION}>Other (specify)</option>
      </select>
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

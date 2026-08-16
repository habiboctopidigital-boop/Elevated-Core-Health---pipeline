// ---------------------------------------------------------------------------
// US phone helpers — shared by the patient modal (Contact & Payment tab) and
// the Add Patient dialog so validation + formatting stay identical everywhere.
// ---------------------------------------------------------------------------
// Accepts any of the punctuation a VA would actually type — (555) 123-4567,
// 555-123-4567, 555.123.4567, +1 555 123 4567, 15551234567 — by stripping
// everything but digits first, then checking real NANP shape: 10 digits (or
// 11 starting with the US/Canada country code 1), with the area code and
// exchange code never starting with 0 or 1.
export function isValidUsPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(local)
}

// Formats a US phone number live as the user types: (555) 123-4567. Accepts
// any of the common styles — (555) 123-4567, 555-123-4567, 555.123.4567,
// +1 555 123 4567, 5550123456 — by stripping non-digits first, dropping an
// optional leading US country code (1 / +1), then laying the remaining 10
// digits out in the standard NANP pattern (area code · prefix · line).
// Extra digits beyond 10 are ignored, and an empty result stays empty.
export function formatUsPhone(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1)
  if (digits.length > 10) digits = digits.slice(0, 10)
  if (digits.length === 0) return ""
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export const PAYMENT_METHOD_OPTIONS = [
  "Self-pay",
  "Insurance",
  "Sliding Scale",
  "Employee Assistance Program (EAP)",
  "Medicare",
  "Medicaid",
]

export const INSURANCE_PROVIDER_OPTIONS = [
  "Blue Cross Blue Shield",
  "Aetna",
  "Cigna",
  "United Healthcare",
  "Humana",
  "Kaiser Permanente",
  "Tricare",
  "Medicare",
  "Medicaid",
]

export const VISIT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "not_visited", label: "Not Visited" },
  { value: "arrived", label: "Arrived" },
  { value: "no_show", label: "No-Show" },
  { value: "rescheduled", label: "Rescheduled" },
]

// Label pairs for the VOB (verification of benefits) snapshot returned by the
// backend's eligibility service. Shared by the patient modal and the
// eligibility-check dialog.
export const VOB_LABELS: Array<[string, string]> = [
  ["coverage", "Coverage"],
  ["payer", "Payer"],
  ["memberId", "Member ID"],
  ["groupNumber", "Group Number"],
  ["copay", "Copay"],
  ["coinsurance", "Coinsurance"],
  ["deductible", "Deductible"],
  ["deductibleMet", "Deductible Met"],
  ["outOfPocketMax", "Out-of-Pocket Max"],
  ["authorizationRequired", "Authorization"],
  ["visitsCoveredPerYear", "Visits / Year"],
  ["checkDate", "Checked"],
]

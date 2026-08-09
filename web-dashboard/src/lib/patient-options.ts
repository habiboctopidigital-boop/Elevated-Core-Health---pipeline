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

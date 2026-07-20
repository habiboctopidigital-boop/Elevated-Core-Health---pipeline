import { randomBytes } from "node:crypto";

/**
 * Generates a short, human-readable, collision-resistant reference code for
 * client-facing entities (e.g. `PRJ-1A2B3C4D`, `REQ-…`, `TKT-…`). The random
 * suffix is 8 hex chars (32 bits) — plenty for display codes, and the column is
 * `@unique` so any astronomically-rare clash surfaces as a write error rather
 * than silent corruption.
 */
export const generateCode = (prefix: string): string => `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;

export const codes = {
	request: () => generateCode("REQ"),
	project: () => generateCode("PRJ"),
	ticket: () => generateCode("TKT"),
};

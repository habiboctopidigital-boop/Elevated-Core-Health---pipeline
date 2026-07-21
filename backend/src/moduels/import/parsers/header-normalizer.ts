export function normalizeHeaders(headers: string[]): string[] {
  return headers.map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, ""),
  );
}

export function normalizeRow(
  rawRow: Record<string, unknown>,
  headerMap: Map<string, string>,
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [rawKey, value] of Object.entries(rawRow)) {
    const normalizedKey = headerMap.get(rawKey) ?? normalizeHeaders([rawKey])[0];
    normalized[normalizedKey] = value == null ? undefined : String(value).trim();
  }
  return normalized;
}

export function buildHeaderMap(rawHeaders: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < rawHeaders.length; i++) {
    map.set(rawHeaders[i], normalizeHeaders([rawHeaders[i]])[0]);
  }
  return map;
}

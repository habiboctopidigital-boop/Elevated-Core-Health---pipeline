import { parse } from "csv-parse/sync";
import type { ParsedRow, ParseResult } from "../import.types";
import { buildHeaderMap, normalizeRow } from "./header-normalizer";

export function parseCsv(
  buffer: Buffer,
  fileName: string,
): ParseResult {
  const raw: string = buffer.toString("utf-8").trim();

  if (!raw) {
    throw new Error(`CSV file "${fileName}" is empty.`);
  }

  const records: Record<string, unknown>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  if (records.length === 0) {
    throw new Error(`CSV file "${fileName}" contains no data rows.`);
  }

  const rawHeaders = Object.keys(records[0]);
  if (rawHeaders.length === 0) {
    throw new Error(`CSV file "${fileName}" has no headers.`);
  }

  const headerMap = buildHeaderMap(rawHeaders);
  const data: ParsedRow[] = records.map((row) => normalizeRow(row, headerMap));

  return {
    success: true,
    totalRows: data.length,
    data,
  };
}

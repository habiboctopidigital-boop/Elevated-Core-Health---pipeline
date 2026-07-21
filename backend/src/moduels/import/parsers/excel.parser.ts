import * as XLSX from "xlsx";
import type { ParsedRow, ParseResult } from "../import.types";
import { buildHeaderMap, normalizeRow } from "./header-normalizer";

export function parseExcel(
  buffer: Buffer,
  fileName: string,
): ParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`Excel file "${fileName}" contains no sheets.`);
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet["!ref"]) {
    throw new Error(`Worksheet "${sheetName}" is empty.`);
  }

  const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
  });

  if (rawData.length === 0) {
    throw new Error(`Worksheet "${sheetName}" contains no data rows.`);
  }

  const rawHeaders = Object.keys(rawData[0]);
  if (rawHeaders.length === 0) {
    throw new Error(`Worksheet "${sheetName}" has no headers.`);
  }

  const headerMap = buildHeaderMap(rawHeaders);
  const data: ParsedRow[] = rawData.map((row) => normalizeRow(row, headerMap));

  return {
    success: true,
    totalRows: data.length,
    data,
  };
}

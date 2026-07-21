export type FileType = "csv" | "xlsx" | "xls";

export interface ParsedRow {
  [key: string]: string | undefined;
}

export interface ParseResult {
  success: true;
  totalRows: number;
  data: ParsedRow[];
}

export interface ParseError {
  success: false;
  message: string;
}

export interface ImportLogEntry {
  fileName: string;
  fileType: FileType;
  totalRows: number;
  parseTimeMs: number;
}

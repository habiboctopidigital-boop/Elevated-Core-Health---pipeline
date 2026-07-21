import { StatusCodes } from "http-status-codes";

import { logger } from "@/utils/logger";
import { ServiceResponse } from "@/utils/serviceResponse";
import type { FileType, ImportLogEntry, ParsedRow } from "./import.types";

interface ImportFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
import { parseCsv } from "./parsers/csv.parser";
import { parseExcel } from "./parsers/excel.parser";

function detectFileType(fileName: string, mimeType: string): FileType {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (ext === ".csv") return "csv";
  if (ext === ".xlsx") return "xlsx";
  if (ext === ".xls") return "xls";
  if (mimeType.includes("spreadsheetml")) return "xlsx";
  if (mimeType.includes("ms-excel")) return "xls";
  return "csv";
}

function parseFile(
  buffer: Buffer,
  fileType: FileType,
  fileName: string,
): { totalRows: number; data: ParsedRow[] } {
  switch (fileType) {
    case "csv": {
      const result = parseCsv(buffer, fileName);
      return { totalRows: result.totalRows, data: result.data };
    }
    case "xlsx":
    case "xls": {
      const result = parseExcel(buffer, fileName);
      return { totalRows: result.totalRows, data: result.data };
    }
  }
}

export const importService = {
  async processImport(
    file: ImportFile | undefined,
  ): Promise<ServiceResponse<{ totalRows: number; data: ParsedRow[] } | null>> {
    const startTime = performance.now();

    if (!file) {
      return ServiceResponse.failure("No file provided. Please upload a .csv, .xlsx, or .xls file.", null, StatusCodes.BAD_REQUEST);
    }

    if (file.size === 0) {
      return ServiceResponse.failure("Uploaded file is empty.", null, StatusCodes.BAD_REQUEST);
    }

    const fileType = detectFileType(file.originalname, file.mimetype);

    let parseResult: { totalRows: number; data: ParsedRow[] };
    try {
      parseResult = parseFile(file.buffer, fileType, file.originalname);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse file.";
      return ServiceResponse.failure(message, null, StatusCodes.BAD_REQUEST);
    }

    const parseTimeMs = Math.round(performance.now() - startTime);

    const logEntry: ImportLogEntry = {
      fileName: file.originalname,
      fileType,
      totalRows: parseResult.totalRows,
      parseTimeMs,
    };

    logger.info(
      {
        import: logEntry,
      },
      `Import: ${file.originalname} | ${fileType} | ${parseResult.totalRows} rows | ${parseTimeMs}ms`,
    );

    return ServiceResponse.success("File parsed successfully.", {
      totalRows: parseResult.totalRows,
      data: parseResult.data,
    });
  },
};

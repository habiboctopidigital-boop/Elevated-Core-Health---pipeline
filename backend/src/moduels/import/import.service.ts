import { StatusCodes } from "http-status-codes";

import { getFirstStageKey } from "@/config/stages";
import { audit } from "@/lib/audit";
import type { AuthenticatedUser } from "@/lib/types";
import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";
import type { FileType, ImportLogEntry, ParsedRow } from "./import.types";
import type { ApplyImportInput } from "./import.validation";

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

function parseFile(buffer: Buffer, fileType: FileType, fileName: string): { totalRows: number; data: ParsedRow[] } {
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
			return ServiceResponse.failure(
				"No file provided. Please upload a .csv, .xlsx, or .xls file.",
				null,
				StatusCodes.BAD_REQUEST,
			);
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

	/**
	 * Phase 3: persist parsed rows as real patients (with dedupe + audit batch).
	 * Called by the CRM / import UIs after the user confirms the preview.
	 */
	async applyImport(input: ApplyImportInput, user: AuthenticatedUser) {
		const rows = input.rows;
		const fileName = input.fileName?.trim() || "manual-import";

		const batch = await prisma.importBatch.create({
			data: {
				fileName,
				fileType: input.fileType ?? "csv",
				totalRows: rows.length,
				status: "processing",
				importedById: user.id,
			},
		});
		let firstStage: string;
		try {
			firstStage = await getFirstStageKey();
		} catch (err) {
			await prisma.importBatch.update({
				where: { id: batch.id },
				data: {
					status: "failed",
					completedAt: new Date(),
					errorDetails: [{ row: 0, message: "No stages configured" }] as object,
				},
			});
			return ServiceResponse.failure(
				"No active stages configured. Create a stage first.",
				null,
				StatusCodes.BAD_REQUEST,
			);
		}

		let success = 0;
		let fail = 0;
		let dup = 0;
		const errors: { row: number; message: string }[] = [];

		try {
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i] as Record<string, unknown>;
				const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

				try {
					const firstName = str(row.first_name) || null;
					const lastName = str(row.last_name) || null;
					const name = str(row.name) || [firstName, lastName].filter(Boolean).join(" ").trim() || null;
					const email = str(row.email).toLowerCase() || null;
					const phone = str(row.phone) || null;

					if (!name && !email && !phone) {
						fail++;
						errors.push({ row: i + 1, message: "Row has no name, email or phone — skipped" });
						continue;
					}

					// Dedupe against existing patients by email (case-insensitive) or phone.
					if (email || phone) {
						const existing = await prisma.patient.findFirst({
							where: {
								OR: [
									...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
									...(phone ? [{ phone }] : []),
								],
							},
							select: { id: true },
						});
						if (existing) {
							dup++;
							continue;
						}
					}

					const appointmentRaw = str(
						row.appointment_datetime || row.appointment_date || row.appointment_time || row.appointment,
					);
					let appointmentDatetime: Date | null = null;
					if (appointmentRaw) {
						const parsed = new Date(appointmentRaw);
						if (!Number.isNaN(parsed.getTime())) appointmentDatetime = parsed;
					}

					const patient = await prisma.patient.create({
						data: {
							name: name || "Unknown",
							firstName,
							lastName,
							location: str(row.location) || null,
							email,
							phone,
							stage: firstStage,
							status: "active",
							source: "import",
							bookingPlatform: str(row.booking_platform || row.platform) || null,
							appointmentDatetime,
							insuranceProvider: str(row.insurance_provider || row.insurance) || null,
							paymentMethod: str(row.payment_method) || null,
							importBatchId: batch.id,
							checklistState: {},
						},
					});

					await audit({
						patientId: patient.id,
						user,
						action: "patient.create",
						entityType: "patient",
						entityId: patient.id,
						newValue: { source: "import", batchId: batch.id, fileName },
						message: `Patient created from bulk import (${fileName})`,
						type: "auto",
					});
					success++;
				} catch (err) {
					fail++;
					errors.push({ row: i + 1, message: err instanceof Error ? err.message : "Failed to create patient" });
				}
			}
		} catch (err) {
			logger.error({ err, batchId: batch.id }, "Bulk import batch failed");
			await prisma.importBatch.update({
				where: { id: batch.id },
				data: { status: "failed", completedAt: new Date(), errorDetails: errors as object },
			});
			return ServiceResponse.failure(
				"Import failed: " + (err instanceof Error ? err.message : "unknown error"),
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}

		const completed = await prisma.importBatch.update({
			where: { id: batch.id },
			data: {
				successCount: success,
				failCount: fail,
				duplicateCount: dup,
				errorDetails: (errors as object) || [],
				status: fail > 0 ? "completed_with_errors" : "completed",
				completedAt: new Date(),
			},
		});

		return ServiceResponse.success("Import completed.", completed, StatusCodes.CREATED);
	},

	async listBatches() {
		const batches = await prisma.importBatch.findMany({
			orderBy: { createdAt: "desc" },
			take: 50,
			include: { importedByUser: { select: { id: true, name: true } } },
		});
		return ServiceResponse.success("Import history retrieved.", batches);
	},
};

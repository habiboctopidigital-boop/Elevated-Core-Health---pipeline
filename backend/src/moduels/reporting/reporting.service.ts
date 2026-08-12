import { StatusCodes } from "http-status-codes";

import { getFinalStageKeys } from "@/config/stages";
import { audit, type RequestContext } from "@/lib/audit";
import type { AuthenticatedUser } from "@/lib/types";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";
import type { ExportLogInput } from "./reporting.validation";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STALE_MS = 48 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

function startOfWeek(date: Date): Date {
	const day = startOfDay(date);
	const offset = (day.getDay() + 6) % 7; // Monday-based week
	return addDays(day, -offset);
}

function avgCompletionDays(completed: { createdAt: Date; completedAt: Date | null }[]): number {
	const done = completed.filter((p) => p.completedAt);
	if (done.length === 0) return 0;
	const total =
		done.reduce((sum, p) => sum + ((p.completedAt as Date).getTime() - p.createdAt.getTime()) / MS_PER_DAY, 0) /
		done.length;
	return Math.round(total * 10) / 10;
}

function completionRate(completed: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((completed / total) * 1000) / 10;
}

/** Bucket logs into the last N day/week/month ranges, oldest → newest. */
function bucketSeries(
	logs: { createdAt: Date }[],
	granularity: "day" | "week" | "month",
	count: number,
): { label: string; count: number }[] {
	const now = startOfDay(new Date());
	const buckets: { label: string; start: Date; end: Date }[] = [];

	for (let i = count - 1; i >= 0; i--) {
		let start: Date;
		let end: Date;
		let label: string;

		if (granularity === "day") {
			start = addDays(now, -i);
			end = addDays(start, 1);
			label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
		} else if (granularity === "week") {
			start = addDays(startOfWeek(now), -7 * i);
			end = addDays(start, 7);
			label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
		} else {
			start = new Date(now.getFullYear(), now.getMonth() - i, 1);
			end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
			label = start.toLocaleDateString("en-US", { month: "short" });
		}

		buckets.push({ label, start, end });
	}

	return buckets.map((b) => ({
		label: b.label,
		count: logs.filter((l) => l.createdAt >= b.start && l.createdAt < b.end).length,
	}));
}

export const reportingService = {
	/**
	 * Platform-wide report for admins: totals, patients by stage, workflow
	 * metrics and a cross-VA comparison table.
	 */
	async getAdminReport() {
		const [patients, vas, stages, staleCount, flaggedCount] = await Promise.all([
			prisma.patient.findMany({
				select: {
					id: true,
					stage: true,
					status: true,
					assignedTo: true,
					createdAt: true,
					completedAt: true,
					updatedAt: true,
				},
			}),
			prisma.user.findMany({ where: { role: "va" }, select: { id: true, name: true } }),
			prisma.stage.findMany({ orderBy: { sortOrder: "asc" }, select: { key: true, name: true } }),
			getFinalStageKeys().then((finalKeys) =>
				prisma.patient.count({
					where: {
						...(finalKeys.length > 0 ? { stage: { notIn: finalKeys } } : {}),
						updatedAt: { lt: new Date(Date.now() - STALE_MS) },
					},
				}),
			),
			prisma.patient.count({ where: { isFlagged: true } }),
		]);

		const totals = { total: patients.length, active: 0, completed: 0, cancelled: 0 };
		const byStage: Record<string, number> = {};
		for (const p of patients) {
			totals[p.status] = (totals[p.status] || 0) + 1;
			byStage[p.stage] = (byStage[p.stage] || 0) + 1;
		}

		const completedPatients = patients.filter((p) => p.status === "completed");
		const weekAgo = new Date(Date.now() - 7 * MS_PER_DAY);
		const reconciledThisWeek = completedPatients.filter((p) => p.completedAt && p.completedAt >= weekAgo).length;

		// Distinct patients each VA has touched (handled cases) + total actions.
		// groupBy already returns distinct (actorId, patientId) pairs.
		const handledRows = await prisma.activityLog.groupBy({
			by: ["actorId", "patientId"],
			where: { actorId: { in: vas.map((v) => v.id) } },
		});
		const handledPerVa = new Map<string, number>();
		for (const row of handledRows) {
			if (!row.actorId) continue;
			handledPerVa.set(row.actorId, (handledPerVa.get(row.actorId) || 0) + 1);
		}
		const actionsPerVa = await prisma.activityLog.groupBy({
			by: ["actorId"],
			where: { actorId: { in: vas.map((v) => v.id) } },
			_count: { _all: true },
		});
		const actionsMap = new Map(actionsPerVa.map((a) => [a.actorId as string, a._count._all]));

		const vaComparison = vas.map((va) => {
			const assigned = patients.filter((p) => p.assignedTo === va.id);
			const assignedCompleted = assigned.filter((p) => p.status === "completed");
			return {
				id: va.id,
				name: va.name,
				assigned: assigned.length,
				active: assigned.filter((p) => p.status === "active").length,
				completed: assignedCompleted.length,
				cancelled: assigned.filter((p) => p.status === "cancelled").length,
				handledCases: handledPerVa.get(va.id) || 0,
				actions: actionsMap.get(va.id) || 0,
				avgCompletionDays: avgCompletionDays(assignedCompleted),
				stageCompletionRate: completionRate(assignedCompleted.length, assigned.length),
			};
		});

		return ServiceResponse.success("Admin report retrieved.", {
			totals,
			byStage: stages.map((s) => ({ stage: s.key, label: s.name, count: byStage[s.key] || 0 })),
			workflow: {
				reconciledThisWeek,
				staleCount,
				flaggedCount,
				avgCompletionDays: avgCompletionDays(completedPatients),
				completionRate: completionRate(totals.completed, totals.total),
			},
			vaComparison,
		});
	},

	/**
	 * Individual performance report for one VA — used both for the VA's own
	 * "My Report" page and for admin drill-down into a specific VA.
	 */
	async getVaReport(vaId: string) {
		const va = await prisma.user.findUnique({
			where: { id: vaId },
			select: { id: true, name: true, email: true },
		});
		if (!va) {
			return ServiceResponse.failure("VA not found.", null, StatusCodes.NOT_FOUND);
		}

		const [patients, stages] = await Promise.all([
			prisma.patient.findMany({
				where: { assignedTo: vaId },
				select: { id: true, stage: true, status: true, createdAt: true, completedAt: true },
			}),
			prisma.stage.findMany({ orderBy: { sortOrder: "asc" }, select: { key: true, name: true } }),
		]);

		const totals = { assigned: patients.length, active: 0, completed: 0, cancelled: 0 };
		const byStage: Record<string, number> = {};
		for (const p of patients) {
			totals[p.status] = (totals[p.status] || 0) + 1;
			byStage[p.stage] = (byStage[p.stage] || 0) + 1;
		}

		// Distinct patients this VA has ever touched.
		const handledRows = await prisma.activityLog.groupBy({
			by: ["patientId"],
			where: { actorId: vaId },
		});

		const now = new Date();
		// Fetch enough history to cover the longest series (monthly = 6 months incl. current).
		const logsFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
		const logs = await prisma.activityLog.findMany({
			where: { actorId: vaId, createdAt: { gte: logsFrom } },
			select: { createdAt: true },
			orderBy: { createdAt: "asc" },
		});

		const startToday = startOfDay(now);
		const startWeek = addDays(startToday, -6);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const actions = {
			today: logs.filter((l) => l.createdAt >= startToday).length,
			thisWeek: logs.filter((l) => l.createdAt >= startWeek).length,
			thisMonth: logs.filter((l) => l.createdAt >= monthStart).length,
		};

		const completedPatients = patients.filter((p) => p.status === "completed");

		return ServiceResponse.success("VA report retrieved.", {
			va,
			totals,
			workload: totals.active,
			stageDistribution: stages.map((s) => ({ stage: s.key, label: s.name, count: byStage[s.key] || 0 })),
			performance: {
				handledCases: handledRows.length,
				actions,
				avgCompletionDays: avgCompletionDays(completedPatients),
				stageCompletionRate: completionRate(totals.completed, totals.assigned),
			},
			series: {
				daily: bucketSeries(logs, "day", 7),
				weekly: bucketSeries(logs, "week", 4),
				monthly: bucketSeries(logs, "month", 6),
			},
		});
	},

	/**
	 * task.md §15: every export creates an activity — user, role, report type,
	 * scope, record count, format, timestamp. For client-generated exports
	 * (e.g. the workload calendar's CSV, built in-browser from data already
	 * fetched) this is the only server-side signal that an export happened at
	 * all, so the frontend calls this right after triggering the download.
	 */
	async logExport(input: ExportLogInput, actor: AuthenticatedUser, ctx: RequestContext) {
		await audit({
			user: actor,
			action: "report.exported",
			category: "report",
			entityType: "export",
			newValue: {
				reportType: input.reportType,
				label: input.label ?? null,
				scope: input.scope ?? null,
				recordCount: input.recordCount,
				format: input.format,
			},
			message: `${actor.name} exported ${input.recordCount} ${input.label ?? input.reportType} record${input.recordCount === 1 ? "" : "s"} as ${input.format.toUpperCase()}`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Export logged.", null);
	},
};

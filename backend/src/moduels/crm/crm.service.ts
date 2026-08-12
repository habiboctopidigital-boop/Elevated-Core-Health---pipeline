import { audit, type RequestContext } from "@/lib/audit";
import type { AuthenticatedUser } from "@/lib/types";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

export interface CrmFilters {
	search?: string;
	status?: string;
	stage?: string;
	eligibility?: string;
	assignedTo?: string;
}

export function buildCrmWhere(filters: CrmFilters): Record<string, unknown> {
	const where: Record<string, unknown> = {};
	if (filters.status) where.status = filters.status;
	if (filters.stage) where.stage = filters.stage;
	if (filters.eligibility) where.eligibilityStatus = filters.eligibility;
	if (filters.assignedTo) where.assignedTo = filters.assignedTo;
	if (filters.search) {
		where.OR = [
			{ name: { contains: filters.search, mode: "insensitive" } },
			{ firstName: { contains: filters.search, mode: "insensitive" } },
			{ lastName: { contains: filters.search, mode: "insensitive" } },
			{ email: { contains: filters.search, mode: "insensitive" } },
			{ phone: { contains: filters.search } },
			{ location: { contains: filters.search, mode: "insensitive" } },
		];
	}
	return where;
}

const include = {
	assignedUser: { select: { id: true, name: true } },
	cancelledByUser: { select: { id: true, name: true } },
	privateLockedByUser: { select: { id: true, name: true } },
} as const;

function csvEscape(value: unknown): string {
	const s = value === null || value === undefined ? "" : String(value);
	return `"${s.replace(/"/g, '""')}"`;
}

export const crmService = {
	async listContacts(query: Record<string, unknown>) {
		const page = Math.max(1, Number(query.page) || 1);
		const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));

		const where = buildCrmWhere({
			search: query.search as string | undefined,
			status: query.status as string | undefined,
			stage: query.stage as string | undefined,
			eligibility: query.eligibility as string | undefined,
			assignedTo: query.assignedTo as string | undefined,
		});

		const [contacts, total] = await Promise.all([
			prisma.patient.findMany({
				where,
				orderBy: { updatedAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
				include,
			}),
			prisma.patient.count({ where }),
		]);

		return ServiceResponse.success("Contacts retrieved.", {
			contacts,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		});
	},

	async exportContacts(query: Record<string, unknown>, actor: AuthenticatedUser, ctx: RequestContext) {
		const where = buildCrmWhere({
			search: query.search as string | undefined,
			status: query.status as string | undefined,
			stage: query.stage as string | undefined,
			eligibility: query.eligibility as string | undefined,
			assignedTo: query.assignedTo as string | undefined,
		});

		const contacts = await prisma.patient.findMany({
			where,
			orderBy: { updatedAt: "desc" },
			take: 5000,
			include,
		});

		const headers = [
			"First Name",
			"Last Name",
			"Name",
			"Phone",
			"Email",
			"Location",
			"Stage",
			"Status",
			"Eligibility",
			"Assigned VA",
			"Booking Platform",
			"Appointment",
			"Copay Amount",
			"Amount Paid",
			"Created",
		];

		const rows = contacts.map((c) => [
			c.firstName ?? "",
			c.lastName ?? "",
			c.name,
			c.phone ?? "",
			c.email ?? "",
			c.location ?? "",
			c.stage,
			c.status,
			c.eligibilityStatus,
			c.assignedUser?.name ?? "",
			c.bookingPlatform ?? "",
			c.appointmentDatetime ? c.appointmentDatetime.toISOString() : "",
			c.copayAmount?.toString() ?? "",
			c.amountPaid?.toString() ?? "",
			c.createdAt.toISOString(),
		]);

		const csv = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");

		// task.md §15: every export creates an activity.
		await audit({
			user: actor,
			action: "report.exported",
			category: "report",
			entityType: "export",
			newValue: { reportType: "crm_contacts", scope: JSON.stringify(where), recordCount: contacts.length, format: "csv" },
			message: `${actor.name} exported ${contacts.length} CRM contact record${contacts.length === 1 ? "" : "s"} as CSV`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Contacts exported.", { csv });
	},
};

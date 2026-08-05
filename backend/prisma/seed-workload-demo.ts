import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** Build a Date at a given hour/minute, N days offset from today (local time). */
function atOffset(days: number, hour: number, minute = 0): Date {
	const d = new Date();
	d.setDate(d.getDate() + days);
	d.setHours(hour, minute, 0, 0);
	return d;
}

async function main() {
	console.log("Seeding workload demo patients...");

	const [jude, amanda] = await Promise.all([
		prisma.user.findUnique({ where: { email: "jude@elevatedcore.com" } }),
		prisma.user.findUnique({ where: { email: "amanda@elevatedcore.com" } }),
	]);
	if (!jude || !amanda) {
		throw new Error("Run `npm run seed` first to create the base users/stages/checklist items.");
	}

	const stages = await prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
	const stageOrder = stages.map((s) => s.key);
	const checklistItems = await prisma.checklistItem.findMany({ where: { status: "required" } });
	const itemsByStage = new Map<string, string[]>();
	for (const item of checklistItems) {
		if (!itemsByStage.has(item.stage)) itemsByStage.set(item.stage, []);
		itemsByStage.get(item.stage)?.push(item.id);
	}

	/** Mark every required item complete for every stage strictly before `stage`. */
	function completedPriorStages(stage: string): Record<string, Record<string, boolean>> {
		const idx = stageOrder.indexOf(stage);
		const state: Record<string, Record<string, boolean>> = {};
		for (let i = 0; i < idx; i++) {
			const key = stageOrder[i];
			const ids = itemsByStage.get(key) ?? [];
			state[key] = Object.fromEntries(ids.map((id) => [id, true]));
		}
		return state;
	}

	function partialCurrentStage(
		state: Record<string, Record<string, boolean>>,
		stage: string,
		fraction: number,
	) {
		const ids = itemsByStage.get(stage) ?? [];
		const count = Math.round(ids.length * fraction);
		state[stage] = Object.fromEntries(ids.map((id, i) => [id, i < count]));
	}

	type Demo = {
		name: string;
		email: string;
		phone: string;
		stage: string;
		assignedTo: string | null;
		appointment: Date;
		isFlagged?: boolean;
		flagReason?: string;
		eligibilityStatus: "not_checked" | "eligible" | "not_eligible";
		insuranceProvider?: string;
		paymentMethod?: string;
		copayAmount?: string;
		amountPaid?: string;
		bookingPlatform?: "klarity" | "zocdoc";
		status?: "active" | "completed" | "cancelled";
		updatedDaysAgo?: number;
		currentStageProgress: number; // 0..1 fraction of required items checked in current stage
	};

	const demos: Demo[] = [
		{
			name: "Maria Gonzalez",
			email: "maria.gonzalez@example.com",
			phone: "+1-575-201-4021",
			stage: "onboarding",
			assignedTo: jude.id,
			appointment: atOffset(0, 9, 0),
			eligibilityStatus: "not_checked",
			bookingPlatform: "klarity",
			currentStageProgress: 0.4,
		},
		{
			name: "Kevin Brooks",
			email: "kevin.brooks@example.com",
			phone: "+1-575-201-4022",
			stage: "onboarding",
			assignedTo: amanda.id,
			appointment: atOffset(0, 14, 30),
			eligibilityStatus: "eligible",
			insuranceProvider: "Aetna",
			bookingPlatform: "zocdoc",
			currentStageProgress: 0.2,
		},
		{
			name: "Sophia Turner",
			email: "sophia.turner@example.com",
			phone: "+1-575-201-4023",
			stage: "visit_complete",
			assignedTo: jude.id,
			appointment: atOffset(0, 11, 0),
			eligibilityStatus: "eligible",
			insuranceProvider: "Blue Cross Blue Shield",
			currentStageProgress: 0.5,
		},
		{
			name: "Daniel Osei",
			email: "daniel.osei@example.com",
			phone: "+1-575-201-4024",
			stage: "visit_complete",
			assignedTo: null,
			appointment: atOffset(1, 10, 0),
			eligibilityStatus: "not_checked",
			currentStageProgress: 0,
		},
		{
			name: "Priya Patel",
			email: "priya.patel@example.com",
			phone: "+1-575-201-4025",
			stage: "post_visit_docs",
			assignedTo: amanda.id,
			appointment: atOffset(1, 15, 0),
			eligibilityStatus: "eligible",
			insuranceProvider: "Cigna",
			currentStageProgress: 0.5,
		},
		{
			name: "Marcus Reed",
			email: "marcus.reed@example.com",
			phone: "+1-575-201-4026",
			stage: "post_visit_docs",
			assignedTo: jude.id,
			appointment: atOffset(2, 9, 30),
			isFlagged: true,
			flagReason: "Waiting on outside lab results — patient hasn't responded to calls",
			eligibilityStatus: "eligible",
			insuranceProvider: "United Healthcare",
			currentStageProgress: 1,
		},
		{
			name: "Elena Vasquez",
			email: "elena.vasquez@example.com",
			phone: "+1-575-201-4027",
			stage: "chart_signed",
			assignedTo: amanda.id,
			appointment: atOffset(3, 13, 0),
			eligibilityStatus: "eligible",
			insuranceProvider: "Aetna",
			currentStageProgress: 0.5,
		},
		{
			name: "Tyler Nguyen",
			email: "tyler.nguyen@example.com",
			phone: "+1-575-201-4028",
			stage: "chart_signed",
			assignedTo: jude.id,
			appointment: atOffset(5, 10, 0),
			eligibilityStatus: "not_checked",
			currentStageProgress: 0,
		},
		{
			name: "Grace Kim",
			email: "grace.kim@example.com",
			phone: "+1-575-201-4029",
			stage: "sent_to_billing",
			assignedTo: amanda.id,
			appointment: atOffset(5, 14, 0),
			eligibilityStatus: "eligible",
			insuranceProvider: "Cigna",
			paymentMethod: "Insurance",
			copayAmount: "30.00",
			currentStageProgress: 0.5,
		},
		{
			name: "Robert Chen",
			email: "robert.chen@example.com",
			phone: "+1-575-201-4030",
			stage: "sent_to_billing",
			assignedTo: null,
			appointment: atOffset(7, 11, 0),
			isFlagged: true,
			flagReason: "Eligibility check failed — insurance coverage lapsed",
			eligibilityStatus: "not_eligible",
			insuranceProvider: "Humana",
			currentStageProgress: 0,
		},
		{
			name: "Amara Johnson",
			email: "amara.johnson@example.com",
			phone: "+1-575-201-4031",
			stage: "payment_posted",
			assignedTo: jude.id,
			appointment: atOffset(7, 16, 0),
			eligibilityStatus: "eligible",
			insuranceProvider: "Blue Cross Blue Shield",
			paymentMethod: "Insurance",
			copayAmount: "25.00",
			amountPaid: "125.00",
			currentStageProgress: 1,
		},
		{
			name: "Liam O'Connor",
			email: "liam.oconnor@example.com",
			phone: "+1-575-201-4032",
			stage: "payment_posted",
			assignedTo: amanda.id,
			appointment: atOffset(9, 9, 0),
			eligibilityStatus: "eligible",
			insuranceProvider: "Aetna",
			paymentMethod: "Self-pay",
			amountPaid: "150.00",
			currentStageProgress: 0.5,
		},
		{
			name: "Isabella Rossi",
			email: "isabella.rossi@example.com",
			phone: "+1-575-201-4033",
			stage: "reconciled",
			assignedTo: jude.id,
			appointment: atOffset(-7, 10, 0),
			eligibilityStatus: "eligible",
			insuranceProvider: "United Healthcare",
			paymentMethod: "Insurance",
			copayAmount: "20.00",
			amountPaid: "180.00",
			status: "completed",
			currentStageProgress: 1,
		},
		{
			name: "Noah Williams",
			email: "noah.williams@example.com",
			phone: "+1-575-201-4034",
			stage: "onboarding",
			assignedTo: amanda.id,
			appointment: atOffset(-1, 9, 0),
			eligibilityStatus: "not_checked",
			updatedDaysAgo: 3,
			currentStageProgress: 0,
		},
	];

	let created = 0;
	for (const demo of demos) {
		const existing = await prisma.patient.findFirst({ where: { email: demo.email } });
		if (existing) {
			console.log(`Skipping "${demo.name}" — already exists`);
			continue;
		}

		const checklistState = completedPriorStages(demo.stage);
		partialCurrentStage(checklistState, demo.stage, demo.currentStageProgress);

		const updatedAt = demo.updatedDaysAgo
			? new Date(Date.now() - demo.updatedDaysAgo * 24 * 60 * 60 * 1000)
			: new Date();

		const patient = await prisma.patient.create({
			data: {
				name: demo.name,
				email: demo.email,
				phone: demo.phone,
				stage: demo.stage,
				status: demo.status ?? "active",
				assignedTo: demo.assignedTo,
				checklistState,
				isFlagged: demo.isFlagged ?? false,
				flagReason: demo.flagReason ?? null,
				flaggedById: demo.isFlagged ? demo.assignedTo : null,
				flaggedAt: demo.isFlagged ? new Date() : null,
				source: "webhook",
				bookingPlatform: demo.bookingPlatform ?? null,
				appointmentDatetime: demo.appointment,
				paymentMethod: demo.paymentMethod ?? null,
				insuranceProvider: demo.insuranceProvider ?? null,
				copayAmount: demo.copayAmount ?? null,
				amountPaid: demo.amountPaid ?? null,
				eligibilityStatus: demo.eligibilityStatus,
				eligibilityCheckedAt: demo.eligibilityStatus !== "not_checked" ? new Date() : null,
				completedAt: demo.status === "completed" ? new Date() : null,
				updatedAt,
				updatedById: demo.assignedTo,
			},
		});

		await prisma.activityLog.create({
			data: {
				patientId: patient.id,
				author: "system",
				actorId: null,
				action: "patient.create",
				entityType: "patient",
				entityId: patient.id,
				newValue: { source: "webhook", platform: demo.bookingPlatform ?? "email" },
				metadata: {},
				message: `New patient auto-created from booking email (${demo.bookingPlatform ?? "email"})`,
				type: "auto",
			},
		});

		if (demo.assignedTo) {
			const assignedUser = demo.assignedTo === jude.id ? jude : amanda;
			await prisma.activityLog.create({
				data: {
					patientId: patient.id,
					author: "system",
					actorId: null,
					action: "assignment.change",
					entityType: "patient",
					entityId: patient.id,
					prevValue: { assignedTo: null },
					newValue: { assignedTo: demo.assignedTo, name: assignedUser.name },
					metadata: {},
					message: `Assigned patient to ${assignedUser.name}`,
					type: "auto",
				},
			});
		}

		if (demo.isFlagged && demo.assignedTo) {
			const assignedUser = demo.assignedTo === jude.id ? jude : amanda;
			await prisma.activityLog.create({
				data: {
					patientId: patient.id,
					author: assignedUser.name,
					actorId: assignedUser.id,
					action: "flag.create",
					entityType: "patient",
					entityId: patient.id,
					prevValue: { isFlagged: false },
					newValue: { isFlagged: true, reason: demo.flagReason },
					metadata: {},
					message: `Flagged for Donna: ${demo.flagReason}`,
					type: "manual",
				},
			});
		}

		console.log(`Created "${demo.name}" — ${demo.stage} — ${demo.appointment.toLocaleString()}`);
		created++;
	}

	console.log(`\nDone. Created ${created} demo patient(s).`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CHECKLIST_SEEDS = [
	// Onboarding — required items (gate advancement)
	{
		stage: "onboarding" as const,
		label: "Intake sent/clear",
		description: "Ensure intake forms are sent to the patient and returned/cleared",
		status: "required" as const,
		isDefault: false,
		sortOrder: 1,
	},
	{
		stage: "onboarding" as const,
		label: "Insurance verified",
		description: "Confirm active coverage with the insurance provider",
		status: "required" as const,
		isDefault: false,
		sortOrder: 2,
	},
	{
		stage: "onboarding" as const,
		label: "VOB passed",
		description: "Verification of Benefits completed and benefits confirmed",
		status: "required" as const,
		isDefault: false,
		sortOrder: 3,
	},
	{
		stage: "onboarding" as const,
		label: "Card on file",
		description: "Confirm a valid payment card is stored on the patient account",
		status: "required" as const,
		isDefault: false,
		sortOrder: 4,
	},
	{
		stage: "onboarding" as const,
		label: "Appt confirmed",
		description: "Confirm the appointment date and time with the patient",
		status: "required" as const,
		isDefault: false,
		sortOrder: 5,
	},
	// Onboarding — optional items (informational only)
	{
		stage: "onboarding" as const,
		label: "PHQ-9/GAD-7 e-forms",
		description: "Send PHQ-9 and GAD-7 e-forms before the visit (optional)",
		status: "optional" as const,
		isDefault: false,
		sortOrder: 6,
	},
	{
		stage: "onboarding" as const,
		label: "ADHD e-forms",
		description: "Send ADHD screening e-forms before the visit (optional)",
		status: "optional" as const,
		isDefault: false,
		sortOrder: 7,
	},
	{
		stage: "post_visit_docs" as const,
		label: "Patient instruction letter sent",
		description: "Ensure the post-visit summary and recommendations are sent to the patient",
		status: "required" as const,
		isDefault: true,
		sortOrder: 1,
	},
	{
		stage: "post_visit_docs" as const,
		label: "Labs sent",
		description: "Confirm lab orders have been submitted and results are pending",
		status: "required" as const,
		isDefault: true,
		sortOrder: 2,
	},
	{
		stage: "chart_signed" as const,
		label: "Optimantra note signed",
		description: "Verify the clinical note is finalized and signed in Optimantra",
		status: "required" as const,
		isDefault: true,
		sortOrder: 1,
	},
	{
		stage: "chart_signed" as const,
		label: "Clawback check passed (CPT / ICD-10)",
		description: "Confirm CPT code level, ICD-10 alignment, and documentation support the billed amount",
		status: "required" as const,
		isDefault: true,
		sortOrder: 2,
	},
];

async function main() {
	console.log("Seeding database...");

	const donnaPassword = await hashPassword("donna123");
	const judePassword = await hashPassword("jude123");
	const amandaPassword = await hashPassword("amanda123");

	const users = await Promise.all([
		prisma.user.upsert({
			where: { email: "donna@elevatedcore.com" },
			update: {},
			create: {
				name: "Donna Rhodes",
				email: "donna@elevatedcore.com",

				passwordHash: donnaPassword,
				role: "admin",
				shift: null,
			},
		}),
		prisma.user.upsert({
			where: { email: "jude@elevatedcore.com" },
			update: {},
			create: {
				name: "Jude",
				email: "jude@elevatedcore.com",
				passwordHash: judePassword,
				role: "va",
				shift: "morning",
			},
		}),
		prisma.user.upsert({
			where: { email: "amanda@elevatedcore.com" },
			update: {},
			create: {
				name: "Amanda",
				email: "amanda@elevatedcore.com",
				passwordHash: amandaPassword,
				role: "va",
				shift: "evening",
			},
		}),
	]);

	console.log(`Created ${users.length} users`);

	const checklistItems = await Promise.all(
		CHECKLIST_SEEDS.map((item) =>
			prisma.checklistItem.upsert({
				where: {
					stage_label: { stage: item.stage, label: item.label },
				},
				update: {},
				create: {
					stage: item.stage,
					label: item.label,
					description: item.description,
					status: item.status,
					isDefault: item.isDefault,
					sortOrder: item.sortOrder,
				},
			}),
		),
	);

	console.log(`Created ${checklistItems.length} checklist items`);
	console.log("Seeding complete.");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

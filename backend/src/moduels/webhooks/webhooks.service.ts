import crypto from "node:crypto";

import { audit, type RequestContext } from "@/lib/audit";
import type { AuthenticatedUser } from "@/lib/types";
import { env } from "@/utils/envConfig";
import { logger } from "@/utils/logger";
import { prisma } from "@/utils/prisma";
import { ServiceResponse } from "@/utils/serviceResponse";

/** AppSetting key the rotated secret is stored under — same key-value table settings.service.ts uses. */
const WEBHOOK_SECRET_KEY = "webhook_secret";

const noContext: RequestContext = { ip: null, userAgent: null };

function generateSecret(): string {
	return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}

class WebhooksService {
	/**
	 * The secret currently enforced by POST /patients/intake. A database row
	 * (written by rotateSecret) always wins; until the first rotation, this
	 * falls back to the static WEBHOOK_SECRET env var so an existing Make.com
	 * integration keeps working unchanged.
	 */
	async getActiveSecret(): Promise<string> {
		try {
			const row = await prisma.appSetting.findUnique({ where: { key: WEBHOOK_SECRET_KEY } });
			return row?.value || env.WEBHOOK_SECRET;
		} catch (err) {
			logger.error({ err }, "Failed to read webhook secret from database — falling back to env");
			return env.WEBHOOK_SECRET;
		}
	}

	/** Admin-facing view: the live secret plus where it's coming from and when it last changed. */
	async getWebhookSettings(publicUrl: string) {
		const row = await prisma.appSetting.findUnique({
			where: { key: WEBHOOK_SECRET_KEY },
			include: { updatedByUser: { select: { id: true, name: true } } },
		});

		return ServiceResponse.success("Webhook settings retrieved.", {
			url: publicUrl,
			secret: row?.value || env.WEBHOOK_SECRET,
			source: row ? ("database" as const) : ("environment" as const),
			rotatedAt: row?.updatedAt ?? null,
			rotatedBy: row?.updatedByUser ?? null,
		});
	}

	/**
	 * Issues a brand-new secret and persists it immediately — the next webhook
	 * call is checked against it right away, no redeploy needed. The old
	 * secret (env or previous rotation) stops working the instant this returns,
	 * so the caller is responsible for updating Make.com with the new value.
	 */
	async rotateSecret(actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		const previous = await prisma.appSetting.findUnique({ where: { key: WEBHOOK_SECRET_KEY } });
		const secret = generateSecret();

		const row = await prisma.appSetting.upsert({
			where: { key: WEBHOOK_SECRET_KEY },
			update: { value: secret, updatedById: actor.id, updatedAt: new Date() },
			create: { key: WEBHOOK_SECRET_KEY, value: secret, updatedById: actor.id },
		});

		// audit() redacts any field literally named "secret" — the raw value never
		// lands in the activity log, only the fact that a rotation happened.
		await audit({
			user: actor,
			action: "system.webhook_secret_rotated",
			category: "system",
			entityType: "app_setting",
			entityId: WEBHOOK_SECRET_KEY,
			prevValue: { secret: previous ? "[previously set]" : "[environment default]" },
			newValue: { secret },
			message: `${actor.name} rotated the webhook secret — Make.com must be updated with the new value`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		return ServiceResponse.success("Webhook secret rotated.", { secret, rotatedAt: row.updatedAt });
	}

	/**
	 * Relays the admin's edited payload straight into the real, secret-gated
	 * POST /patients/intake route (server-to-server, so the raw secret never
	 * reaches the browser) and hands back exactly what that route returned —
	 * the same success/failure shape Make.com would see.
	 */
	async sendTestWebhook(payload: unknown, actor: AuthenticatedUser, ctx: RequestContext = noContext) {
		const secret = await this.getActiveSecret();
		const internalUrl = `http://localhost:${env.PORT}/api/patients/intake`;

		let upstream: { status: number; body: unknown };
		try {
			const res = await fetch(internalUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
				body: JSON.stringify(payload),
			});
			upstream = { status: res.status, body: await res.json().catch(() => null) };
		} catch (err) {
			logger.error({ err }, "Test webhook relay to /patients/intake failed");
			return ServiceResponse.failure("Could not reach the webhook endpoint. Is the API server running?", null, 502);
		}

		const upstreamBody = upstream.body as {
			success?: boolean;
			message?: string;
			data?: { id?: string; name?: string; stage?: string };
		} | null;
		const succeeded = upstream.status >= 200 && upstream.status < 300 && upstreamBody?.success !== false;

		await audit({
			user: actor,
			action: "webhook.test_send",
			category: "system",
			entityType: "app_setting",
			entityId: WEBHOOK_SECRET_KEY,
			metadata: { status: upstream.status, patientId: upstreamBody?.data?.id ?? null },
			message: succeeded
				? `${actor.name} sent a test webhook — created "${upstreamBody?.data?.name ?? "patient"}" in ${upstreamBody?.data?.stage ?? "onboarding"}`
				: `${actor.name} sent a test webhook — it failed (${upstreamBody?.message ?? `HTTP ${upstream.status}`})`,
			ip: ctx.ip,
			userAgent: ctx.userAgent,
		});

		// The relay itself succeeded (we reached the endpoint and got a structured
		// reply) regardless of what that reply says — `data` carries the real
		// outcome (its own success/message/statusCode) exactly as Make.com would
		// receive it, including a 401 for a bad secret or a 400 for a bad payload.
		return ServiceResponse.success("Test webhook sent.", { httpStatus: upstream.status, response: upstream.body });
	}
}

export const webhooksService = new WebhooksService();

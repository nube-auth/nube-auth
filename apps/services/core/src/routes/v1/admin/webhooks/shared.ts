import { randomBytes } from "node:crypto";
import { createLogger } from "@nube-auth/shared";
import { assertSafeOutboundUrl } from "@nube-auth/shared/outbound-url";
import { z } from "zod";
import { env } from "../../../../config/env.js";

export const log = createLogger("admin-webhook-routes");
export const MAX_WEBHOOKS_PER_APP = 25;

export async function parseWebhookUrl(raw: string): Promise<string> {
	const url = await assertSafeOutboundUrl(raw, { allowInsecureHttp: env.IS_DEVELOPMENT });
	return url.toString();
}

export const SUPPORTED_EVENTS = [
	"user.registered",
	"user.updated",
	"user.deleted",
	"session.created",
	"session.revoked",
	"session.expired",
	"session.all_revoked",
	"license.created",
	"license.upgraded",
	"license.downgraded",
	"license.canceled",
	"license.expired",
	"license.renewed",
	"license.reactivated",
	"license.trial_started",
	"license.trial_ended",
	"plan.created",
	"plan.updated",
	"plan.deleted",
	"subscription.created",
	"subscription.renewed",
	"subscription.canceled",
	"subscription.payment_failed",
	"subscription.refunded",
	"subscription.resumed",
	"oauth.connected",
	"oauth.disconnected",
] as const;

export const CreateWebhookSchema = z.object({
	url: z.string().url().max(2048),
	events: z
		.array(z.string())
		.min(1)
		.refine((events) => events.every((e) => SUPPORTED_EVENTS.includes(e as any) || e === "*"), {
			message: "One or more unsupported event names",
		}),
	description: z.string().max(255).optional(),
});

export const UpdateWebhookSchema = z.object({
	url: z.string().url().max(2048).optional(),
	events: z
		.array(z.string())
		.min(1)
		.refine((events) => events.every((e) => SUPPORTED_EVENTS.includes(e as any) || e === "*"), {
			message: "One or more unsupported event names",
		})
		.optional(),
	description: z.string().max(255).nullable().optional(),
	isActive: z.boolean().optional(),
});

export function generateSecret(): string {
	return randomBytes(32).toString("hex");
}

export function formatWebhook(
	wh: {
		id: number;
		public_id: string;
		url: string;
		events: unknown;
		description: string | null;
		is_active: boolean;
		created_at: Date;
		updated_at: Date;
	},
	secret?: string,
) {
	return {
		webhookId: wh.public_id,
		url: wh.url,
		events: wh.events as string[],
		description: wh.description,
		isActive: wh.is_active,
		createdAt: wh.created_at.toISOString(),
		updatedAt: wh.updated_at.toISOString(),
		...(secret != null ? { secret } : {}),
	};
}

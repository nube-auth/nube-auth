/**
 * Email Worker
 *
 * Consumes jobs from the "emails" BullMQ queue and sends them through the
 * Nube Auth Email API (template-based).
 *
 * This is the ONLY place email is actually dispatched. Services (Core/Gateway)
 * enqueue jobs via `enqueueEmail()` and never block the request path on delivery.
 */

import type { SendEmailJob } from "@nube-auth/queue";
import { QueueClient } from "@nube-auth/queue";
import { createLogger, serializeError } from "@nube-auth/shared";
import type { EmailTemplateSlug } from "@nube-auth/shared/email";
import { createEmailService } from "@nube-auth/shared/email";
import type { Worker } from "bullmq";

const log = createLogger("email-worker");

export async function setupEmailWorker(): Promise<Worker<SendEmailJob>> {
	const { Worker: BullWorker } = await import("bullmq");
	const queueClient = new QueueClient();

	// NOTE: The workers service has no config/env module yet, so env is read
	// directly here (consistent with webhook-rescue-cron.ts and index.ts).
	const emailService = createEmailService({
		sendEmails: process.env["SEND_EMAILS"] === "true",
		baseUrl: process.env["EMAIL_API_BASE_URL"] ?? "",
		apiKey: process.env["EMAIL_API_KEY"] ?? "",
		defaultFrom: process.env["EMAIL_FROM"] ?? "noreply@localhost",
		themeId: process.env["EMAIL_THEME_ID"] ?? undefined,
	});

	return new BullWorker<SendEmailJob>(
		"emails",
		async (job) => {
			const { to, templateSlug, subject, variables, from, themeId } = job.data;

			try {
				log.info({ jobId: job.id, to, templateSlug }, "Processing email job");

				await emailService.sendTemplate({
					to,
					templateSlug: templateSlug as EmailTemplateSlug,
					subject,
					variables,
					from,
					themeId,
				});

				return { success: true, to, templateSlug };
			} catch (error) {
				log.error({ err: serializeError(error as Error), jobId: job.id, to, templateSlug }, "Email job failed");
				throw error;
			}
		},
		{
			connection: queueClient.getConnectionOptions(),
			concurrency: 10,
		},
	);
}

/**
 * Email enqueuer
 *
 * Enqueues transactional email jobs onto the "emails" BullMQ queue.
 * Services (Core/Gateway) call `enqueueEmail()` and never block the request
 * path on delivery — the workers service consumes these jobs and calls the
 * Nube Auth Email API.
 */

import { getQueue } from "./index.js";
import type { SendEmailJob } from "./types.js";
import { EmailJobType, QueueName } from "./types.js";

export interface EnqueueEmailOptions {
	to: string;
	templateSlug: string;
	subject?: string;
	variables?: Record<string, unknown>;
	from?: string;
	themeId?: string;
}

/**
 * Enqueue a single transactional email for async delivery.
 * Returns once the job is persisted to Redis; delivery + retries are handled
 * by the email worker.
 */
export async function enqueueEmail(options: EnqueueEmailOptions): Promise<void> {
	const queue = getQueue<SendEmailJob>(QueueName.EMAILS);

	const job: SendEmailJob = {
		type: EmailJobType.SEND_EMAIL,
		to: options.to,
		templateSlug: options.templateSlug,
		subject: options.subject,
		variables: options.variables ?? {},
		from: options.from,
		themeId: options.themeId,
		timestamp: Date.now(),
	};

	await queue.add(EmailJobType.SEND_EMAIL, job, {
		attempts: 5,
		backoff: {
			type: "exponential",
			delay: 5000,
		},
	});
}

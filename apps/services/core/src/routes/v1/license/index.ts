import {
	activationQueries,
	appQueries,
	getDb,
	licenseQueries,
	planQueries,
	priceQueries,
	userQueries,
} from "@nube-auth/db";
import { createId, createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";

const log = createLogger("license-routes");
const router = new Hono();

// ---------------------------------------------------------------------------
// GET /validate — Validate license for current user + app
// ---------------------------------------------------------------------------

router.get("/validate", async (c: Context) => {
	const appId = c.req.query("appId");
	const userPublicId = c.req.header("X-Nube-User-Id");

	if (!userPublicId) {
		return c.json({ error: "Unauthorized — missing user ID" }, 401);
	}

	if (!appId) {
		return c.json({ error: "Missing appId query parameter" }, 400);
	}

	try {
		const db = getDb();

		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) {
			return c.json({ valid: false, reason: "user_not_found" });
		}

		const app = await appQueries.findByPublicId(db, appId);
		if (!app) {
			return c.json({ valid: false, reason: "app_not_found" });
		}

		const license = await licenseQueries.findByUserAndApp(
			db,
			user.id,
			app.id,
		);

		if (!license) {
			return c.json({ valid: false, reason: "no_license" });
		}

		// Check expiry
		const now = new Date();
		const isExpired =
			license.valid_until && new Date(license.valid_until) < now;

		const plan = await planQueries.findById(db, license.plan_id);
		const price = license.price_id
			? await priceQueries.findById(db, license.price_id)
			: null;
		const activeCount = await activationQueries.countActiveByLicenseId(
			db,
			license.id,
		);

		const licensePayload: Record<string, unknown> = {
			licenseId: license.public_id,
			status: license.status,
			plan: plan
				? {
						planId: plan.public_id,
						slug: plan.slug,
						name: plan.name,
						features: plan.features,
					}
				: null,
			price: price
				? {
						priceId: price.public_id,
						billingType: price.billing_type,
						interval: price.interval,
						amountCents: price.amount_cents,
					}
				: null,
			validUntil: license.valid_until
				? new Date(license.valid_until).toISOString()
				: null,
			activations: {
				current: activeCount,
				max: license.max_activations,
			},
		};

		if (isExpired || license.status === "expired") {
			return c.json({
				valid: false,
				reason: "expired",
				license: licensePayload,
			});
		}

		if (license.status === "canceled") {
			return c.json({
				valid: false,
				reason: "canceled",
				license: licensePayload,
			});
		}

		if (license.status === "suspended") {
			return c.json({
				valid: false,
				reason: "suspended",
				license: licensePayload,
			});
		}

		if (license.status !== "active" && license.status !== "trialing") {
			return c.json({
				valid: false,
				reason: license.status,
				license: licensePayload,
			});
		}

		return c.json({ valid: true, license: licensePayload });
	} catch (error) {
		log.error(
			{ err: serializeError(error as Error) },
			"License validation error",
		);
		return c.json({ error: "Failed to validate license" }, 500);
	}
});

// ---------------------------------------------------------------------------
// POST /activate — Register device activation
// ---------------------------------------------------------------------------

const ActivateSchema = z.object({
	appId: z.string().regex(idPatterns.app),
	deviceId: z.string().min(1).max(255),
	deviceName: z.string().max(255).optional(),
	deviceType: z.string().max(100).optional(),
});

router.post("/activate", async (c: Context) => {
	try {
		const userPublicId = c.req.header("X-Nube-User-Id");
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const body = await c.req.json();
		const validated = ActivateSchema.parse(body);

		const db = getDb();

		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, validated.appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const license = await licenseQueries.findByUserAndApp(
			db,
			user.id,
			app.id,
		);
		if (
			!license ||
			(license.status !== "active" && license.status !== "trialing")
		) {
			return c.json({ error: "No active license found" }, 403);
		}

		// Check if already activated on this device
		const existing = await activationQueries.findByLicenseAndDevice(
			db,
			license.id,
			validated.deviceId,
		);
		if (existing) {
			// Refresh last_seen
			await activationQueries.updateLastSeen(db, existing.id);
			return c.json({
				activationId: existing.public_id,
				deviceId: existing.device_id,
				deviceName: existing.device_name,
				alreadyActive: true,
			});
		}

		// Check max activations limit
		if (license.max_activations !== null) {
			const activeCount = await activationQueries.countActiveByLicenseId(
				db,
				license.id,
			);
			if (activeCount >= license.max_activations) {
				return c.json(
					{
						error: "Activation limit reached",
						current: activeCount,
						max: license.max_activations,
					},
					409,
				);
			}
		}

		const activation = await activationQueries.create(db, {
			public_id: createId("licenseActivation"),
			license_id: license.id,
			device_id: validated.deviceId,
			device_name: validated.deviceName ?? null,
			device_type: validated.deviceType ?? null,
			ip_address:
				c.req.header("X-Forwarded-For") ||
				c.req.header("X-Real-IP") ||
				null,
			user_agent: c.req.header("User-Agent") ?? null,
			last_seen_at: new Date(),
		});

		log.info(
			{
				licenseId: license.public_id,
				deviceId: validated.deviceId,
				activationId: activation.public_id,
			},
			"Device activated",
		);

		return c.json(
			{
				activationId: activation.public_id,
				deviceId: activation.device_id,
				deviceName: activation.device_name,
				createdAt: new Date(activation.created_at).toISOString(),
			},
			201,
		);
	} catch (error) {
		if (error instanceof z.ZodError)
			return c.json({ error: "Invalid request", details: error.issues }, 400);
		log.error(
			{ err: serializeError(error as Error) },
			"Device activation error",
		);
		return c.json({ error: "Failed to activate device" }, 500);
	}
});

// ---------------------------------------------------------------------------
// POST /deactivate — Remove device activation
// ---------------------------------------------------------------------------

const DeactivateSchema = z.object({
	appId: z.string().regex(idPatterns.app),
	deviceId: z.string().min(1).max(255),
});

router.post("/deactivate", async (c: Context) => {
	try {
		const userPublicId = c.req.header("X-Nube-User-Id");
		if (!userPublicId) return c.json({ error: "Unauthorized" }, 401);

		const body = await c.req.json();
		const validated = DeactivateSchema.parse(body);

		const db = getDb();

		const user = await userQueries.findByPublicId(db, userPublicId);
		if (!user) return c.json({ error: "User not found" }, 404);

		const app = await appQueries.findByPublicId(db, validated.appId);
		if (!app) return c.json({ error: "App not found" }, 404);

		const license = await licenseQueries.findByUserAndApp(
			db,
			user.id,
			app.id,
		);
		if (!license) return c.json({ error: "License not found" }, 404);

		const deactivated = await activationQueries.deactivateByDevice(
			db,
			license.id,
			validated.deviceId,
		);

		if (!deactivated) {
			return c.json({ error: "No active activation for this device" }, 404);
		}

		log.info(
			{
				licenseId: license.public_id,
				deviceId: validated.deviceId,
			},
			"Device deactivated",
		);

		return c.json({
			message: "Device deactivated",
			deviceId: validated.deviceId,
		});
	} catch (error) {
		if (error instanceof z.ZodError)
			return c.json({ error: "Invalid request", details: error.issues }, 400);
		log.error(
			{ err: serializeError(error as Error) },
			"Device deactivation error",
		);
		return c.json({ error: "Failed to deactivate device" }, 500);
	}
});

// ---------------------------------------------------------------------------
// GET /check — Validate license by public_id + update device last_seen_at
// Called by Gateway's public /v1/license/check endpoint (no user session needed).
// The licenseId is treated as a lookup key — the server decides what plan it
// maps to. No plan/feature data should be trusted from the client side.
// ---------------------------------------------------------------------------

router.get("/check", async (c: Context) => {
	const licensePublicId = c.req.query("licenseId");
	const appPublicId = c.req.query("appId");
	const deviceId = c.req.query("deviceId");

	if (!licensePublicId || !appPublicId || !deviceId) {
		return c.json({ valid: false, reason: "missing_params" }, 400);
	}

	try {
		const db = getDb();

		const app = await appQueries.findByPublicId(db, appPublicId);
		if (!app) return c.json({ valid: false, reason: "app_not_found" });

		const license = await licenseQueries.findByPublicId(db, licensePublicId);
		if (!license) return c.json({ valid: false, reason: "license_not_found" });

		// Verify this license belongs to the claimed app (prevent cross-app probing)
		if (license.app_id !== app.id) return c.json({ valid: false, reason: "app_mismatch" });

		const now = new Date();
		const isExpired = license.valid_until && new Date(license.valid_until) < now;
		if (isExpired || license.status === "expired") {
			return c.json({ valid: false, reason: "expired" });
		}
		if (license.status === "canceled") {
			return c.json({ valid: false, reason: "canceled" });
		}
		if (license.status === "suspended") {
			return c.json({ valid: false, reason: "suspended" });
		}
		if (license.status !== "active" && license.status !== "trialing") {
			return c.json({ valid: false, reason: license.status });
		}

		// Update last_seen_at on the matching device activation (best-effort)
		try {
			const activation = await activationQueries.findByLicenseAndDevice(db, license.id, deviceId);
			if (activation) {
				await activationQueries.updateLastSeen(db, activation.id);
			}
		} catch {
			// Non-fatal — don't fail the entire check if heartbeat fails
		}

		const plan = await planQueries.findById(db, license.plan_id);

		log.info(
			{ licenseId: licensePublicId.substring(0, 12), appId: appPublicId, plan: plan?.slug },
			"License check OK",
		);

		return c.json({
			valid: true,
			license: {
				licenseId: license.public_id,
				plan: plan
					? { slug: plan.slug, name: plan.name, features: plan.features }
					: null,
				validUntil: license.valid_until
					? new Date(license.valid_until).toISOString()
					: null,
			},
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "License check error");
		return c.json({ valid: false, reason: "internal_error" }, 500);
	}
});

export const licenseRoutes = router;

import {
	and,
	appQueries,
	appUserQueries,
	getDb,
	inArray,
	isNull,
	licenseQueries,
	planQueries,
	plans,
	priceQueries,
	sessionQueries,
	subscriptionQueries,
	userQueries,
	users,
} from "@nube-auth/db";
import { createId, createLogger, idPatterns, serializeError } from "@nube-auth/shared";
import type { Context } from "hono";
import { Hono } from "hono";
import { requiredParam } from "../../utils/route-param.js";

const log = createLogger("edge-routes");
export const edgeRoutes = new Hono();

async function loadApp(publicId: string) {
	return appQueries.findByPublicId(getDb(), publicId);
}

edgeRoutes.get("/users/:userId", async (c: Context) => {
	const user = await userQueries.findByPublicId(getDb(), requiredParam(c, "userId"));
	return c.json({
		createdAt: user?.created_at ? new Date(user.created_at).toISOString() : null,
	});
});

edgeRoutes.patch("/users/:userId", async (c: Context) => {
	try {
		const db = getDb();
		const user = await userQueries.findByPublicId(db, requiredParam(c, "userId"));
		if (!user) return c.json({ error: "User not found" }, 404);

		const { name, picture } = (await c.req.json()) as { name?: string; picture?: string };
		const updateData: Parameters<typeof userQueries.update>[2] = {};
		if (name !== undefined) updateData.name = name;
		if (picture !== undefined) updateData.avatar_url = picture;
		const updated = (await userQueries.update(db, user.id, updateData))[0];
		if (!updated) return c.json({ error: "User not found" }, 404);

		return c.json({
			id: updated.public_id,
			email: updated.primary_email,
			name: updated.name,
			createdAt: updated.created_at ? new Date(updated.created_at).toISOString() : null,
		});
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Update profile error");
		return c.json({ error: "Failed to update profile" }, 500);
	}
});

edgeRoutes.get("/users/:userId/sessions", async (c: Context) => {
	const db = getDb();
	const user = await userQueries.findByPublicId(db, requiredParam(c, "userId"));
	if (!user) return c.json({ error: "User not found" }, 404);
	const current = c.req.query("current");
	const sessionRows = await sessionQueries.findActiveByUserId(db, user.id);
	sessionRows.sort((a, b) => {
		const aIsCurrent = a.public_id === current;
		const bIsCurrent = b.public_id === current;
		if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1;
		return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
	});
	return c.json({
		sessions: sessionRows.map((session) => ({
			id: session.public_id,
			createdAt: new Date(session.created_at).toISOString(),
			lastSeenAt: new Date(session.last_seen_at).toISOString(),
			expiresAt: new Date(session.expires_at).toISOString(),
			isCurrent: session.public_id === current,
			ipAddress: session.ip_address || null,
			userAgent: session.user_agent || null,
			country: session.country || null,
		})),
	});
});

edgeRoutes.delete("/users/:userId/sessions", async (c: Context) => {
	const db = getDb();
	const user = await userQueries.findByPublicId(db, requiredParam(c, "userId"));
	if (!user) return c.json({ error: "User not found" }, 404);
	const activeSessions = await sessionQueries.findActiveByUserId(db, user.id);
	for (const session of activeSessions) {
		await sessionQueries.revoke(db, session.id);
	}
	return c.json({ revoked: activeSessions.length });
});

edgeRoutes.delete("/users/:userId/sessions/:sessionId", async (c: Context) => {
	const sessionId = requiredParam(c, "sessionId");
	if (!idPatterns.session.test(sessionId)) return c.json({ error: "Invalid session id" }, 400);
	const db = getDb();
	const user = await userQueries.findByPublicId(db, requiredParam(c, "userId"));
	if (!user) return c.json({ error: "User not found" }, 404);
	const session = await sessionQueries.findByPublicId(db, sessionId);
	if (!session || session.user_id !== user.id) return c.json({ error: "Session not found" }, 404);
	await sessionQueries.revoke(db, session.id);
	return c.json({ publicId: session.public_id });
});

edgeRoutes.get("/users/:userId/apps/:appId/subscription", async (c: Context) => {
	const db = getDb();
	const [user, app] = await Promise.all([
		userQueries.findByPublicId(db, requiredParam(c, "userId")),
		appQueries.findByPublicId(db, requiredParam(c, "appId")),
	]);
	const empty = { hasActivePlan: false, planSlug: null, status: null, billingInterval: null, periodEnd: null };
	if (!user || !app) return c.json(empty);

	const subscription = await subscriptionQueries.findActiveByUserAndApp(db, user.id, app.id);
	if (!subscription) {
		const license = await licenseQueries.findByUserAndApp(db, user.id, app.id);
		if (license?.status !== "active") return c.json(empty);
		const licensePrice = license.price_id ? await priceQueries.findByInternalId_(db, license.price_id) : null;
		const licensePlan = licensePrice
			? await planQueries.findByInternalId_(db, licensePrice.plan_id)
			: license.plan_id
				? await planQueries.findByInternalId_(db, license.plan_id)
				: null;
		return c.json({
			hasActivePlan: true,
			planSlug: licensePlan?.slug ?? null,
			status: license.status,
			billingInterval: null,
			periodEnd: license.valid_until ? new Date(license.valid_until).toISOString() : null,
		});
	}

	const subMeta = (subscription.metadata as Record<string, unknown> | null) ?? {};
	const metaPriceId = typeof subMeta["priceId"] === "number" ? subMeta["priceId"] : undefined;
	const priceId = subscription.price_id ?? metaPriceId;
	const price = priceId ? await priceQueries.findByInternalId_(db, priceId) : null;
	const plan = price ? await planQueries.findByInternalId_(db, price.plan_id) : null;
	return c.json({
		hasActivePlan: true,
		planSlug: plan?.slug ?? null,
		priceId: price?.public_id ?? null,
		status: subscription.status,
		billingInterval: subscription.billing_interval,
		periodEnd: subscription.billing_period_end ? new Date(subscription.billing_period_end).toISOString() : null,
	});
});

edgeRoutes.get("/apps/:appId/client-secret-hash", async (c: Context) => {
	const app = await loadApp(requiredParam(c, "appId"));
	if (!app) return c.json({ error: "App not found" }, 404);
	return c.json({ hash: app.client_secret_hash ?? null, isActive: app.is_active });
});

edgeRoutes.get("/apps/:appId/security-settings", async (c: Context) => {
	const app = await loadApp(requiredParam(c, "appId"));
	if (!app) return c.json({ error: "App not found" }, 404);
	return c.json({
		corsOrigins: app.cors_origins ?? [],
		allowedHosts: app.allowed_hosts ?? [],
	});
});

edgeRoutes.post("/service-token/resolve", async (c: Context) => {
	const { token } = (await c.req.json()) as { token?: string };
	if (!token) return c.json({ error: "Unauthorized" }, 401);
	const app = await appQueries.findByServiceToken(getDb(), token);
	if (!app) return c.json({ error: "Unauthorized" }, 401);
	return c.json({ appId: app.public_id });
});

edgeRoutes.post("/apps/:appId/users/provision", async (c: Context) => {
	try {
		const body = (await c.req.json()) as { email?: string; name?: string; avatarUrl?: string };
		if (!body.email || typeof body.email !== "string") return c.json({ error: "email is required" }, 400);
		const db = getDb();
		const app = await loadApp(requiredParam(c, "appId"));
		if (!app) return c.json({ error: "App not found" }, 404);

		let user = await userQueries.findByEmail(db, body.email);
		let created = false;
		if (!user) {
			user = await userQueries.create(db, {
				public_id: createId("user"),
				primary_email: body.email.toLowerCase(),
				primary_email_verified: true,
				name: body.name ?? null,
				avatar_url: body.avatarUrl ?? null,
			});
			created = true;
		}
		await appUserQueries.upsert(db, app.id, user.id);
		return c.json({ userId: user.public_id }, created ? 201 : 200);
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Provision user error");
		return c.json({ error: "Failed to provision user" }, 500);
	}
});

edgeRoutes.get("/apps/:appId/plans", async (c: Context) => {
	const app = await loadApp(requiredParam(c, "appId"));
	if (!app) return c.json({ error: "App not found" }, 404);
	const plansList = await planQueries.findActiveByAppId(getDb(), app.id);
	return c.json({
		plans: plansList.map((plan) => ({
			planId: plan.public_id,
			name: plan.name,
			slug: plan.slug,
			description: plan.description ?? null,
			features: plan.features && !Array.isArray(plan.features) ? plan.features : {},
			displayOrder: plan.display_order,
		})),
	});
});

edgeRoutes.get("/apps/:appId/plans/:planId/prices", async (c: Context) => {
	const planPublicId = requiredParam(c, "planId");
	const db = getDb();
	const app = await loadApp(requiredParam(c, "appId"));
	if (!app) return c.json({ error: "App not found" }, 404);
	const plan = await planQueries.findByPublicId(db, planPublicId);
	if (!plan || plan.app_id !== app.id) return c.json({ error: "Plan not found" }, 404);
	const pricesList = await priceQueries.findActiveByPlanId(db, plan.id);
	return c.json({
		planId: plan.public_id,
		prices: pricesList.map((price) => ({
			priceId: price.public_id,
			billingType: price.billing_type,
			interval: price.interval ?? null,
			amountCents: price.amount_cents,
			currency: price.currency,
			trialEnabled: price.trial_enabled,
			trialDays: price.trial_days ?? null,
		})),
	});
});

edgeRoutes.get("/apps/:appId/users", async (c: Context) => {
	const app = await loadApp(requiredParam(c, "appId"));
	if (!app) return c.json({ error: "App not found" }, 404);
	const limitRaw = Number(c.req.query("limit") ?? "100");
	const limit = Number.isFinite(limitRaw) && Number.isInteger(limitRaw) ? Math.min(Math.max(1, limitRaw), 500) : 100;
	const pageRaw = Number(c.req.query("page") ?? "1");
	const page = Number.isFinite(pageRaw) && Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
	const offset = (page - 1) * limit;
	const db = getDb();
	const allLicenses = await licenseQueries.findByAppId(db, app.id);
	const total = allLicenses.length;
	const paginated = allLicenses.slice(offset, offset + limit);
	if (paginated.length === 0) return c.json({ users: [], total, page, limit, hasMore: false });

	const uniqueUserIds = [...new Set(paginated.map((license) => license.user_id))];
	const uniquePlanIds = [...new Set(paginated.map((license) => license.plan_id))];
	const [userRows, planRows] = await Promise.all([
		uniqueUserIds.length ? db.select().from(users).where(inArray(users.id, uniqueUserIds)) : [],
		uniquePlanIds.length
			? db
					.select()
					.from(plans)
					.where(and(inArray(plans.id, uniquePlanIds), isNull(plans.deleted_at)))
			: [],
	]);
	const userMap = new Map(userRows.map((user) => [user.id, user]));
	const planMap = new Map(planRows.map((plan) => [plan.id, plan]));
	const listed = paginated.map((license) => {
		const user = userMap.get(license.user_id);
		const plan = planMap.get(license.plan_id);
		return {
			userId: user?.public_id ?? null,
			email: user?.primary_email ?? null,
			name: user?.name ?? null,
			emailVerified: user?.primary_email_verified ?? false,
			createdAt: user ? new Date(user.created_at).toISOString() : null,
			license: {
				licenseId: license.public_id,
				status: license.status,
				source: license.source ?? null,
				maxActivations: license.max_activations ?? null,
				validFrom: Math.floor(license.created_at.getTime() / 1000),
				validUntil: license.valid_until ? Math.floor(new Date(license.valid_until).getTime() / 1000) : null,
				plan: plan
					? {
							planId: plan.public_id,
							slug: plan.slug,
							name: plan.name,
							features: (plan.features as Record<string, unknown>) ?? {},
						}
					: null,
			},
		};
	});
	return c.json({ users: listed, total, page, limit, hasMore: offset + limit < total });
});

edgeRoutes.get("/apps/:appId/users/:userId/license", async (c: Context) => {
	const userPublicId = requiredParam(c, "userId");
	if (!idPatterns.user.test(userPublicId)) return c.json({ error: "Invalid userId" }, 400);
	const db = getDb();
	const app = await loadApp(requiredParam(c, "appId"));
	if (!app) return c.json({ error: "App not found" }, 404);
	const user = await userQueries.findByPublicId(db, userPublicId);
	if (!user) return c.json({ error: "User not found" }, 404);
	const license = await licenseQueries.findByUserAndApp(db, user.id, app.id);
	if (!license) return c.json({ error: "No license found for this user" }, 404);
	const price = license.price_id ? await priceQueries.findByInternalId_(db, license.price_id) : null;
	const plan = price
		? await planQueries.findByInternalId_(db, price.plan_id)
		: await planQueries.findByInternalId_(db, license.plan_id);
	const subscription = await subscriptionQueries.findActiveByUserAndApp(db, user.id, app.id);
	return c.json({
		licenseId: license.public_id,
		status: license.status,
		source: license.source ?? null,
		maxActivations: license.max_activations ?? null,
		validFrom: Math.floor(license.created_at.getTime() / 1000),
		validUntil: license.valid_until ? Math.floor(new Date(license.valid_until).getTime() / 1000) : null,
		plan: plan
			? {
					planId: plan.public_id,
					slug: plan.slug,
					name: plan.name,
					features: (plan.features as Record<string, unknown>) ?? {},
				}
			: null,
		subscription: subscription
			? {
					status: subscription.status,
					billingInterval: subscription.billing_interval ?? null,
					periodEnd: subscription.billing_period_end
						? new Date(subscription.billing_period_end).toISOString()
						: null,
				}
			: null,
	});
});

edgeRoutes.get("/apps/:appId/users/:userId", async (c: Context) => {
	const userPublicId = requiredParam(c, "userId");
	if (!idPatterns.user.test(userPublicId)) return c.json({ error: "Invalid userId" }, 400);
	const user = await userQueries.findByPublicId(getDb(), userPublicId);
	if (!user) return c.json({ error: "User not found" }, 404);
	return c.json({
		userId: user.public_id,
		email: user.primary_email,
		name: user.name ?? null,
		avatarUrl: user.avatar_url ?? null,
		emailVerified: user.primary_email_verified ?? false,
		createdAt: new Date(user.created_at).toISOString(),
	});
});

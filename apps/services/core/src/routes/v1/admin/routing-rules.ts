/**
 * Admin Routing Rules Management
 *
 * Endpoints for configuring payment provider routing rules.
 * Rules control which provider is selected based on context (country, currency, etc.).
 */

import { getDb, paymentProviderConfigQueries, routingRuleQueries } from "@nube-auth/db";
import { createId, createLogger, serializeError } from "@nube-auth/shared";
import { Hono } from "hono";
import { z } from "zod";
import { type SelectionContext, selectProvider } from "../../../billing/services/provider-selector.js";

const log = createLogger("routing-rules-admin");

const app = new Hono();

/**
 * Conditions schema for routing rules
 * Supports: eq (equals), in (in array), gte, lte, ne
 */
const ConditionsSchema = z.record(
	z.string(),
	z.object({
		eq: z.union([z.string(), z.number()]).optional(),
		in: z.array(z.union([z.string(), z.number()])).optional(),
		gte: z.number().optional(),
		lte: z.number().optional(),
		ne: z.union([z.string(), z.number()]).optional(),
	}),
);

const CreateRoutingRuleSchema = z.object({
	provider_config_id: z.number().int().positive(),
	priority: z.number().int().min(1).max(1000).default(100),
	conditions: ConditionsSchema.default({}),
	traffic_percentage: z.number().int().min(0).max(100).default(100),
	name: z.string().min(1).max(255).optional(),
	description: z.string().max(1000).optional(),
	is_active: z.boolean().default(true),
});

const UpdateRoutingRuleSchema = CreateRoutingRuleSchema.partial();

const TestRoutingSchema = z.object({
	country: z.string().length(2).optional(),
	currency: z.string().length(3).optional(),
	amountCents: z.number().int().positive().optional(),
	paymentMethod: z.string().optional(),
	userSegment: z.string().optional(),
	userId: z.string().optional(),
	planSlug: z.string().optional(),
});

/**
 * GET /routing-rules/:appId
 * List all routing rules for an app (ordered by priority)
 */
app.get("/:appId", async (c) => {
	try {
		const appId = Number(c.req.param("appId"));

		if (!Number.isFinite(appId) || !Number.isInteger(appId) || appId < 1) {
			return c.json({ error: "Invalid app ID" }, 400);
		}

		const db = getDb();
		const rules = await routingRuleQueries.findByAppId(db, appId);

		// Join with provider configs to include provider info
		const enrichedRules = await Promise.all(
			rules.map(async (rule: any) => {
				const provider = await paymentProviderConfigQueries.findByInternalId_(db, rule.provider_config_id);
				return {
					ruleId: rule.public_id,
					name: rule.name,
					description: rule.description,
					priority: rule.priority,
					conditions: rule.conditions,
					trafficPercentage: rule.traffic_percentage,
					isActive: rule.is_active,
					provider: provider
						? {
								providerId: provider.public_id,
								provider: provider.provider,
								environment: provider.environment,
							}
						: null,
					createdAt: rule.created_at,
					updatedAt: rule.updated_at,
				};
			}),
		);

		return c.json({ rules: enrichedRules });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to list routing rules");
		return c.json({ error: "Failed to list routing rules" }, 500);
	}
});

/**
 * POST /routing-rules/:appId
 * Create new routing rule
 */
app.post("/:appId", async (c) => {
	try {
		const appId = Number(c.req.param("appId"));

		if (!Number.isFinite(appId) || !Number.isInteger(appId) || appId < 1) {
			return c.json({ error: "Invalid app ID" }, 400);
		}

		const body = await c.req.json();
		const validated = CreateRoutingRuleSchema.parse(body);

		const db = getDb();

		// Verify provider config exists and belongs to same app
		const providerConfig = await paymentProviderConfigQueries.findByInternalId_(db, validated.provider_config_id);
		if (!providerConfig) {
			return c.json({ error: "Provider config not found" }, 404);
		}

		// Create rule
		const rule = await routingRuleQueries.create(db, {
			public_id: createId("request"),
			app_id: appId,
			provider_config_id: validated.provider_config_id,
			priority: validated.priority,
			conditions: validated.conditions,
			traffic_percentage: validated.traffic_percentage,
			name: validated.name,
			description: validated.description,
			is_active: validated.is_active,
		});

		log.info(
			{
				appId,
				ruleId: rule.id,
				priority: rule.priority,
			},
			"Routing rule created",
		);

		return c.json(
			{
				ruleId: rule.public_id,
				name: rule.name,
				description: rule.description,
				priority: rule.priority,
				conditions: rule.conditions,
				trafficPercentage: rule.traffic_percentage,
				isActive: rule.is_active,
				createdAt: rule.created_at,
			},
			201,
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation failed", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Failed to create routing rule");
		return c.json({ error: "Failed to create routing rule" }, 500);
	}
});

/**
 * PUT /routing-rules/:appId/:ruleId
 * Update routing rule
 */
app.put("/:appId/:ruleId", async (c) => {
	try {
		const appId = Number(c.req.param("appId"));
		const rulePublicId = c.req.param("ruleId");

		if (!Number.isFinite(appId) || !Number.isInteger(appId) || appId < 1) {
			return c.json({ error: "Invalid app ID" }, 400);
		}

		const body = await c.req.json();
		const validated = UpdateRoutingRuleSchema.parse(body);

		const db = getDb();

		// Find existing rule
		const existingRule = await routingRuleQueries.findByPublicId(db, rulePublicId);
		if (!existingRule) {
			return c.json({ error: "Routing rule not found" }, 404);
		}

		// Verify app ownership
		if (existingRule.app_id !== appId) {
			return c.json({ error: "Routing rule does not belong to this app" }, 403);
		}

		// If changing provider, verify it exists
		if (validated.provider_config_id) {
			const providerConfig = await paymentProviderConfigQueries.findByInternalId_(
				db,
				validated.provider_config_id,
			);
			if (!providerConfig) {
				return c.json({ error: "Provider config not found" }, 404);
			}
		}

		// Update rule
		const [updated] = await routingRuleQueries.update(db, existingRule.id, validated as any);

		if (!updated) {
			return c.json({ error: "Failed to update routing rule" }, 500);
		}

		log.info(
			{
				appId,
				ruleId: existingRule.id,
				changes: validated,
			},
			"Routing rule updated",
		);

		return c.json({
			ruleId: updated.public_id,
			name: updated.name,
			description: updated.description,
			priority: updated.priority,
			conditions: updated.conditions,
			trafficPercentage: updated.traffic_percentage,
			isActive: updated.is_active,
			updatedAt: updated.updated_at,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation failed", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Failed to update routing rule");
		return c.json({ error: "Failed to update routing rule" }, 500);
	}
});

/**
 * DELETE /routing-rules/:appId/:ruleId
 * Delete routing rule
 */
app.delete("/:appId/:ruleId", async (c) => {
	try {
		const appId = Number(c.req.param("appId"));
		const rulePublicId = c.req.param("ruleId");

		if (!Number.isFinite(appId) || !Number.isInteger(appId) || appId < 1) {
			return c.json({ error: "Invalid app ID" }, 400);
		}

		const db = getDb();

		// Find existing rule
		const existingRule = await routingRuleQueries.findByPublicId(db, rulePublicId);
		if (!existingRule) {
			return c.json({ error: "Routing rule not found" }, 404);
		}

		// Verify app ownership
		if (existingRule.app_id !== appId) {
			return c.json({ error: "Routing rule does not belong to this app" }, 403);
		}

		// Delete rule
		await routingRuleQueries.delete(db, existingRule.id);

		log.info(
			{
				appId,
				ruleId: existingRule.id,
			},
			"Routing rule deleted",
		);

		return c.json({ message: "Routing rule deleted" });
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Failed to delete routing rule");
		return c.json({ error: "Failed to delete routing rule" }, 500);
	}
});

/**
 * POST /routing-rules/:appId/test
 * Test provider selection with given context
 */
app.post("/:appId/test", async (c) => {
	try {
		const appId = Number(c.req.param("appId"));

		if (!Number.isFinite(appId) || !Number.isInteger(appId) || appId < 1) {
			return c.json({ error: "Invalid app ID" }, 400);
		}

		const body = await c.req.json();
		const validated = TestRoutingSchema.parse(body);

		const provider = await selectProvider(appId, validated as SelectionContext);

		return c.json({
			provider: {
				providerId: provider.public_id,
				provider: provider.provider,
				environment: provider.environment,
			},
			context: validated,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json({ error: "Validation failed", details: error.issues }, 400);
		}
		log.error({ err: serializeError(error as Error) }, "Provider selection test failed");
		return c.json({ error: (error as Error).message }, 400);
	}
});

export default app;

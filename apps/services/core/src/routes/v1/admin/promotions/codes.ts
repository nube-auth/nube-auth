import { getDb, promotionCodeQueries } from "@nube-auth/db";
import { createId } from "@nube-auth/shared";
import { Hono } from "hono";
import { z } from "zod";

import { formatCode, resolveApp, resolvePromotion } from "./shared.js";

const codeRoutes = new Hono();

// ===========================================================================
// PROMOTION CODES
// ===========================================================================

/**
 * POST /:promoId/codes — Create code for promotion
 */
const createCodeSchema = z.object({
	code: z
		.string()
		.min(1)
		.max(50)
		.transform((v) => v.toUpperCase()),
	maxUses: z.number().int().positive().optional(),
});

codeRoutes.post("/:promoId/codes", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const body = await c.req.json();
	const parsed = createCodeSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
	const data = parsed.data;

	const db = getDb();

	// Check for duplicate code
	const existing = await promotionCodeQueries.findByCode(db, data.code);
	if (existing) {
		return c.json({ error: "Code already exists" }, 409);
	}

	const code = await promotionCodeQueries.create(db, {
		public_id: createId("promotionCode"),
		promotion_id: promo.id,
		app_id: app.id,
		code: data.code,
		max_uses: data.maxUses ?? null,
	});

	return c.json(formatCode(code), 201);
});

/**
 * GET /:promoId/codes — List codes for promotion
 */
codeRoutes.get("/:promoId/codes", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const db = getDb();
	const codes = await promotionCodeQueries.findByPromotionId(db, promo.id);

	return c.json({ codes: codes.map(formatCode) });
});

/**
 * PATCH /:promoId/codes/:codeId — Update code
 */
const updateCodeSchema = z.object({
	isActive: z.boolean().optional(),
	maxUses: z.number().int().positive().nullable().optional(),
});

codeRoutes.patch("/:promoId/codes/:codeId", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const codePublicId = c.req.param("codeId");
	const db = getDb();
	const code = await promotionCodeQueries.findByPublicId(db, codePublicId);
	if (!code || code.promotion_id !== promo.id) {
		return c.json({ error: "Code not found" }, 404);
	}

	const body = await c.req.json();
	const parsed = updateCodeSchema.safeParse(body);
	if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
	const data = parsed.data;

	const updateData: Record<string, unknown> = {};
	if (data.isActive !== undefined) updateData["is_active"] = data.isActive;
	if (data.maxUses !== undefined) updateData["max_uses"] = data.maxUses;

	if (Object.keys(updateData).length === 0) {
		return c.json(formatCode(code));
	}

	const updated = await promotionCodeQueries.update(db, code.id, updateData);
	return c.json(formatCode(updated));
});

/**
 * DELETE /:promoId/codes/:codeId — Deactivate code
 */
codeRoutes.delete("/:promoId/codes/:codeId", async (c) => {
	const app = await resolveApp(c);
	if (!app) return c.json({ error: "App not found" }, 404);

	const promo = await resolvePromotion(c, app.id);
	if (!promo) return c.json({ error: "Promotion not found" }, 404);

	const codePublicId = c.req.param("codeId");
	const db = getDb();
	const code = await promotionCodeQueries.findByPublicId(db, codePublicId);
	if (!code || code.promotion_id !== promo.id) {
		return c.json({ error: "Code not found" }, 404);
	}

	await promotionCodeQueries.update(db, code.id, { is_active: false });
	return c.json({ success: true });
});

export { codeRoutes };

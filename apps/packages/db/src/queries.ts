import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import type { DbClient } from "./index.js";
import {
	app_users,
	apps,
	audit_logs,
	auth_codes,
	email_verifications,
	identities,
	invitations,
	license_activations,
	license_history,
	licenses,
	payment_transactions,
	plans,
	prices,
	project_invitations,
	project_members,
	projects,
	promotion_codes,
	promotion_plans,
	promotion_provider_refs,
	promotion_redemptions,
	promotions,
	purchases,
	sessions,
	subscriptions,
	users,
	payment_provider_configs,
	payment_routing_rules,
	test_sessions,
	webhook_logs,
} from "./schema.js";
import { buildJsonbMergeClause, createJsonbUpdateChain } from "./utils/jsonb.js";

/**
 * User queries
 */
export const userQueries = {
	async findById(db: DbClient, userId: number) {
		const results = await db.select().from(users).where(eq(users.id, userId));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db.select().from(users).where(eq(users.public_id, publicId));
		return results[0];
	},

	async findByEmail(db: DbClient, email: string) {
		const results = await db.select().from(users).where(eq(users.primary_email, email.toLowerCase()));
		return results[0];
	},

	async create(db: DbClient, data: typeof users.$inferInsert) {
		const results = await db.insert(users).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, userId: number, data: Partial<typeof users.$inferInsert>) {
		return db
			.update(users)
			.set({ ...data, updated_at: new Date() })
			.where(eq(users.id, userId))
			.returning();
	},
};

/**
 * Identity queries
 */
export const identityQueries = {
	async findByProviderUserId(db: DbClient, provider: string, providerUserId: string) {
		const results = await db
			.select()
			.from(identities)
			.where(and(eq(identities.provider, provider), eq(identities.provider_user_id, providerUserId)));
		return results[0];
	},

	async findByUserId(db: DbClient, userId: number) {
		return db.select().from(identities).where(eq(identities.user_id, userId));
	},

	async create(db: DbClient, data: typeof identities.$inferInsert) {
		const results = await db.insert(identities).values(data).returning();
		return results[0]!;
	},
};

/**
 * Session queries
 */
export const sessionQueries = {
	async findById(db: DbClient, sessionId: number) {
		const results = await db.select().from(sessions).where(eq(sessions.id, sessionId));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db.select().from(sessions).where(eq(sessions.public_id, publicId));
		return results[0];
	},

	async findByUserId(db: DbClient, userId: number) {
		return db.select().from(sessions).where(eq(sessions.user_id, userId)).orderBy(desc(sessions.created_at));
	},

	async findActiveByUserId(db: DbClient, userId: number) {
		const now = new Date();
		return db
			.select()
			.from(sessions)
			.where(and(eq(sessions.user_id, userId), isNull(sessions.revoked_at), gt(sessions.expires_at, now)));
	},

	async create(db: DbClient, data: typeof sessions.$inferInsert) {
		const results = await db.insert(sessions).values(data).returning();
		return results[0]!;
	},

	async updateLastSeen(db: DbClient, sessionId: number, lastSeenAt: Date) {
		const results = await db
			.update(sessions)
			.set({ last_seen_at: lastSeenAt })
			.where(eq(sessions.id, sessionId))
			.returning();
		return results[0]!;
	},

	async updateLastSeenAndExpiry(db: DbClient, sessionId: number, lastSeenAt: Date, expiresAt: Date) {
		const results = await db
			.update(sessions)
			.set({ last_seen_at: lastSeenAt, expires_at: expiresAt })
			.where(eq(sessions.id, sessionId))
			.returning();
		return results[0]!;
	},

	async revoke(db: DbClient, sessionId: number) {
		const results = await db
			.update(sessions)
			.set({ revoked_at: new Date() })
			.where(eq(sessions.id, sessionId))
			.returning();
		return results[0]!;
	},
};

/**
 * Project queries
 */
export const projectQueries = {
	async findById(db: DbClient, projectId: number) {
		const results = await db
			.select()
			.from(projects)
			.where(and(eq(projects.id, projectId), eq(projects.is_active, true), isNull(projects.deleted_at)));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(projects)
			.where(and(eq(projects.public_id, publicId), eq(projects.is_active, true), isNull(projects.deleted_at)));
		return results[0];
	},

	async findByOwnerId(db: DbClient, userId: number) {
		return db
			.select()
			.from(projects)
			.where(and(eq(projects.owner_user_id, userId), eq(projects.is_active, true), isNull(projects.deleted_at)));
	},

	async findByUserId(db: DbClient, userId: number) {
		// Find projects where user is a member
		const memberProjects = await db
			.select({ project_id: project_members.project_id })
			.from(project_members)
			.where(eq(project_members.user_id, userId));

		if (memberProjects.length === 0) return [];

		const projectIds = memberProjects.map((m) => m.project_id);
		return db
			.select()
			.from(projects)
			.where(and(inArray(projects.id, projectIds), eq(projects.is_active, true), isNull(projects.deleted_at)));
	},

	async create(db: DbClient, data: typeof projects.$inferInsert) {
		const results = await db.insert(projects).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, projectId: number, data: Partial<typeof projects.$inferInsert>) {
		return db
			.update(projects)
			.set({ ...data, updated_at: new Date() })
			.where(eq(projects.id, projectId))
			.returning();
	},

	async delete(db: DbClient, projectId: number) {
		const project = await this.findById(db, projectId);
		if (!project) return null;

		const now = new Date();
		const timestamp = now.getTime();
		const newSlug = `${project.slug}--deleted-${timestamp}`;

		const results = await db
			.update(projects)
			.set({
				slug: newSlug,
				is_active: false,
				deleted_at: now,
				updated_at: now,
			})
			.where(eq(projects.id, projectId))
			.returning();
		return results[0]!;
	},
};

/**
 * ProjectMember queries
 */
export const projectMemberQueries = {
	async findById(db: DbClient, id: number) {
		const results = await db.select().from(project_members).where(eq(project_members.id, id));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db.select().from(project_members).where(eq(project_members.public_id, publicId));
		return results[0];
	},

	async findByProjectAndUser(db: DbClient, projectId: number, userId: number) {
		return db
			.select()
			.from(project_members)
			.where(and(eq(project_members.project_id, projectId), eq(project_members.user_id, userId)));
	},

	async findByProjectId(db: DbClient, projectId: number) {
		return db
			.select()
			.from(project_members)
			.where(and(eq(project_members.project_id, projectId), isNull(project_members.deleted_at)));
	},

	async findByUserId(db: DbClient, userId: number) {
		return db
			.select()
			.from(project_members)
			.where(and(eq(project_members.user_id, userId), isNull(project_members.deleted_at)));
	},

	async create(db: DbClient, data: typeof project_members.$inferInsert) {
		const results = await db.insert(project_members).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, id: number, data: Partial<typeof project_members.$inferInsert>) {
		const results = await db.update(project_members).set(data).where(eq(project_members.id, id)).returning();
		return results[0]!;
	},

	async updateByPublicId(db: DbClient, publicId: string, data: Partial<typeof project_members.$inferInsert>) {
		return db.update(project_members).set(data).where(eq(project_members.public_id, publicId)).returning();
	},

	async delete(db: DbClient, id: number) {
		const results = await db
			.update(project_members)
			.set({ deleted_at: new Date(), updated_at: new Date() })
			.where(eq(project_members.id, id))
			.returning();
		return results[0]!;
	},

	async deleteByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.update(project_members)
			.set({ deleted_at: new Date(), updated_at: new Date() })
			.where(eq(project_members.public_id, publicId))
			.returning();
		return results[0]!;
	},
};

/**
 * Project Invitation queries
 */
export const projectInvitationQueries = {
	async findById(db: DbClient, id: number) {
		const results = await db.select().from(project_invitations).where(eq(project_invitations.id, id));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db.select().from(project_invitations).where(eq(project_invitations.public_id, publicId));
		return results[0];
	},

	async findByProjectAndEmail(db: DbClient, projectId: number, email: string) {
		return db
			.select()
			.from(project_invitations)
			.where(and(eq(project_invitations.project_id, projectId), eq(project_invitations.email, email)));
	},

	async findByProjectId(db: DbClient, projectId: number) {
		return db
			.select()
			.from(project_invitations)
			.where(and(eq(project_invitations.project_id, projectId), eq(project_invitations.status, "pending")));
	},

	async findByEmail(db: DbClient, email: string) {
		return db
			.select()
			.from(project_invitations)
			.where(and(eq(project_invitations.email, email), eq(project_invitations.status, "pending")));
	},

	async create(db: DbClient, data: typeof project_invitations.$inferInsert) {
		const results = await db.insert(project_invitations).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, id: number, data: Partial<typeof project_invitations.$inferInsert>) {
		const results = await db
			.update(project_invitations)
			.set(data)
			.where(eq(project_invitations.id, id))
			.returning();
		return results[0]!;
	},

	async updateByPublicId(db: DbClient, publicId: string, data: Partial<typeof project_invitations.$inferInsert>) {
		const results = await db
			.update(project_invitations)
			.set(data)
			.where(eq(project_invitations.public_id, publicId))
			.returning();
		return results[0]!;
	},

	async delete(db: DbClient, id: number) {
		const results = await db
			.update(project_invitations)
			.set({ deleted_at: new Date() })
			.where(eq(project_invitations.id, id))
			.returning();
		return results[0]!;
	},

	async deleteByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.update(project_invitations)
			.set({ deleted_at: new Date() })
			.where(eq(project_invitations.public_id, publicId))
			.returning();
		return results[0]!;
	},

	async cleanupExpired(db: DbClient) {
		const now = new Date();
		return db
			.update(project_invitations)
			.set({ status: "expired" })
			.where(and(eq(project_invitations.status, "pending"), lt(project_invitations.expires_at, now)))
			.returning();
	},
};

/**
 * App queries
 */
export const appQueries = {
	async findById(db: DbClient, appId: number) {
		const results = await db
			.select()
			.from(apps)
			.where(and(eq(apps.id, appId), isNull(apps.deleted_at)));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(apps)
			.where(and(eq(apps.public_id, publicId), isNull(apps.deleted_at)));
		return results[0];
	},

	async findByProjectId(db: DbClient, projectId: number) {
		return db
			.select()
			.from(apps)
			.where(and(eq(apps.project_id, projectId), isNull(apps.deleted_at)));
	},

	async create(db: DbClient, data: typeof apps.$inferInsert) {
		const results = await db.insert(apps).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, appId: number, data: Partial<typeof apps.$inferInsert>) {
		const results = await db.update(apps).set(data).where(eq(apps.id, appId)).returning();
		return results[0]!;
	},

	async delete(db: DbClient, appId: number) {
		const app = await this.findById(db, appId);
		if (!app) return null;

		const now = new Date();
		const timestamp = now.getTime();
		const newSlug = `${app.slug}--deleted-${timestamp}`;

		const results = await db
			.update(apps)
			.set({
				slug: newSlug,
				is_active: false,
				deleted_at: now,
				updated_at: now,
			})
			.where(eq(apps.id, appId))
			.returning();
		return results[0]!;
	},

	/**
	 * Atomically update security_settings JSONB column
	 * Uses PostgreSQL JSONB merge operator for consistent updates
	 * No read-modify-write cycle - eliminates lost update race conditions
	 */
	async updateSecuritySettings(
		db: DbClient,
		appId: number,
		updates: Record<string, any>,
	) {
		const results = await db
			.update(apps)
			.set({
				security_settings: buildJsonbMergeClause(apps.security_settings, updates),
				updated_at: new Date(),
			})
			.where(eq(apps.id, appId))
			.returning();
		return results[0]!;
	},

	/**
	 * Atomically update app_tokens JSONB column
	 * Use for API key regeneration to prevent lost updates
	 */
	async updateAppTokens(
		db: DbClient,
		appId: number,
		updates: Record<string, any>,
	) {
		const results = await db
			.update(apps)
			.set({
				app_tokens: buildJsonbMergeClause(apps.app_tokens, updates),
				updated_at: new Date(),
			})
			.where(eq(apps.id, appId))
			.returning();
		return results[0]!;
	},

	/**
	 * Atomically update plan_settings JSONB column
	 * Use for licensing configuration updates
	 */
	async updatePlanSettings(
		db: DbClient,
		appId: number,
		updates: Record<string, any>,
	) {
		const results = await db
			.update(apps)
			.set({
				plan_settings: buildJsonbMergeClause(apps.plan_settings, updates),
				updated_at: new Date(),
			})
			.where(eq(apps.id, appId))
			.returning();
		return results[0]!;
	},

	/**
	 * Atomically update multiple JSONB fields with chained updates
	 * Use for complex updates involving multiple nested paths
	 * Example: updateSecuritySettingField(db, appId, 'redirectUris', [...])
	 */
	async updateJsonbField(
		db: DbClient,
		appId: number,
		fieldName: "app_tokens" | "security_settings" | "plan_settings",
		path: string,
		value: any,
	) {
		const field = apps[fieldName as keyof typeof apps];
		const chain = createJsonbUpdateChain(field as any);
		(chain as any).set(path, value);

		const results = await db
			.update(apps)
			.set({
				[fieldName]: (chain as any).build(),
				updated_at: new Date(),
			} as any)
			.where(eq(apps.id, appId))
			.returning();
		return results[0]!;
	},

	/**
	 * Batch update multiple JSONB paths atomically
	 * More efficient than multiple individual updates
	 */
	async batchUpdateJsonbFields(
		db: DbClient,
		appId: number,
		updates: {
			fieldName: "app_tokens" | "security_settings" | "plan_settings";
			path: string;
			value: any;
		}[],
	) {
		const updateData: Record<string, any> = { updated_at: new Date() };

		// Group by field name
		const grouped = updates.reduce(
			(acc, { fieldName, path, value }) => {
				if (!acc[fieldName]) {
					acc[fieldName] = createJsonbUpdateChain(apps[fieldName as keyof typeof apps] as any);
				}
				(acc[fieldName] as any).set(path, value);
				return acc;
			},
			{} as Record<string, any>,
		);

		// Build all field updates
		for (const [fieldName, chain] of Object.entries(grouped)) {
			updateData[fieldName] = (chain as any).build();
		}

		const results = await db
			.update(apps)
			.set(updateData)
			.where(eq(apps.id, appId))
			.returning();
		return results[0]!;
	},
};

/**
 * AuthCode queries
 */
export const authCodeQueries = {
	async findByCode(db: DbClient, code: string) {
		return db.select().from(auth_codes).where(eq(auth_codes.code, code));
	},

	async markConsumed(db: DbClient, codeId: number) {
		return db.update(auth_codes).set({ consumed_at: new Date() }).where(eq(auth_codes.id, codeId)).returning();
	},

	async create(db: DbClient, data: typeof auth_codes.$inferInsert) {
		const results = await db.insert(auth_codes).values(data).returning();
		return results[0]!;
	},
};

/**
 * License queries
 */
export const licenseQueries = {
	async findByUserAndApp(db: DbClient, userId: number, appId: number) {
		const results = await db
			.select()
			.from(licenses)
			.where(and(eq(licenses.user_id, userId), eq(licenses.app_id, appId), isNull(licenses.deleted_at)));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(licenses)
			.where(and(eq(licenses.public_id, publicId), isNull(licenses.deleted_at)));
		return results[0];
	},

	async findById(db: DbClient, id: number) {
		const results = await db
			.select()
			.from(licenses)
			.where(and(eq(licenses.id, id), isNull(licenses.deleted_at)));
		return results[0];
	},

	async findByUserId(db: DbClient, userId: number) {
		return db
			.select()
			.from(licenses)
			.where(and(eq(licenses.user_id, userId), isNull(licenses.deleted_at)));
	},

	async findByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(licenses)
			.where(and(eq(licenses.app_id, appId), isNull(licenses.deleted_at)));
	},

	async create(db: DbClient, data: typeof licenses.$inferInsert) {
		const results = await db.insert(licenses).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, licenseId: number, data: Partial<typeof licenses.$inferInsert>) {
		const now = new Date();
		return db
			.update(licenses)
			.set({ ...data, updated_at: now })
			.where(eq(licenses.id, licenseId))
			.returning();
	},

	async upsert(db: DbClient, userId: number, appId: number, data: Partial<typeof licenses.$inferInsert>) {
		const existing = await licenseQueries.findByUserAndApp(db, userId, appId);
		const now = new Date();

		if (existing) {
			const results = await db
				.update(licenses)
				.set({ ...data, updated_at: now })
				.where(and(eq(licenses.user_id, userId), eq(licenses.app_id, appId)))
				.returning();
			return results[0]!;
		} else {
			const results = await db
				.insert(licenses)
				.values({
					user_id: userId,
					app_id: appId,
					...data,
					created_at: now,
					updated_at: now,
				} as typeof licenses.$inferInsert)
				.returning();
			return results[0]!;
		}
	},

	/** Transition a license to the free plan (post-cancel, post-refund). */
	async transitionToFreePlan(db: DbClient, licenseId: number, freePlanId: number) {
		const now = new Date();
		const results = await db
			.update(licenses)
			.set({
				plan_id: freePlanId,
				price_id: null,
				status: "active",
				valid_until: null,
				source: "auto_free",
				updated_at: now,
			})
			.where(eq(licenses.id, licenseId))
			.returning();
		return results[0]!;
	},

	/** Check if a user has ever had a paid license for an app (for promo eligibility). */
	async hasHadPaidLicense(db: DbClient, userId: number, appId: number) {
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(licenses)
			.where(
				and(
					eq(licenses.user_id, userId),
					eq(licenses.app_id, appId),
					eq(licenses.source, "purchase"),
				),
			);
		return (result[0]?.count ?? 0) > 0;
	},

	async delete(db: DbClient, licenseId: number) {
		const results = await db
			.update(licenses)
			.set({ deleted_at: new Date(), updated_at: new Date() })
			.where(eq(licenses.id, licenseId))
			.returning();
		return results[0]!;
	},
};

/**
 * EmailVerification queries
 */
export const emailVerificationQueries = {
	async findByEmail(db: DbClient, email: string) {
		const results = await db.select().from(email_verifications).where(eq(email_verifications.email, email));
		return results[0];
	},

	async create(db: DbClient, data: typeof email_verifications.$inferInsert) {
		const results = await db.insert(email_verifications).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, id: number, data: Partial<typeof email_verifications.$inferInsert>) {
		const results = await db
			.update(email_verifications)
			.set(data)
			.where(eq(email_verifications.id, id))
			.returning();
		return results[0]!;
	},

	async delete(db: DbClient, id: number) {
		return db.delete(email_verifications).where(eq(email_verifications.id, id)).returning();
	},

	async incrementAttempts(db: DbClient, id: number) {
		const recordResults = await db.select().from(email_verifications).where(eq(email_verifications.id, id));
		const record = recordResults[0];
		if (!record) throw new Error("Email verification not found");

		const newAttempts = record.attempts + 1;
		const updateData: any = { attempts: newAttempts };

		// Lock after 3 failed attempts
		if (newAttempts >= 3) {
			updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
		}

		return db.update(email_verifications).set(updateData).where(eq(email_verifications.id, id)).returning();
	},

	async markConsumed(db: DbClient, id: number) {
		return db
			.update(email_verifications)
			.set({ consumed_at: new Date() })
			.where(eq(email_verifications.id, id))
			.returning();
	},
};

/**
 * AuditLog queries
 */
export const auditLogQueries = {
	async create(db: DbClient, data: typeof audit_logs.$inferInsert) {
		const results = await db.insert(audit_logs).values(data).returning();
		return results[0]!;
	},

	async findByProjectId(db: DbClient, projectId: number, limit = 100) {
		return db
			.select()
			.from(audit_logs)
			.where(eq(audit_logs.project_id, projectId))
			.orderBy(desc(audit_logs.created_at))
			.limit(limit);
	},
};

/**
 * Invitation queries
 */
export const invitationQueries = {
	async create(db: DbClient, data: typeof invitations.$inferInsert) {
		const results = await db.insert(invitations).values(data).returning();
		return results[0]!;
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db.select().from(invitations).where(eq(invitations.public_id, publicId));
		return results[0];
	},

	async findByEmailAndApp(db: DbClient, email: string, appId: number) {
		return db
			.select()
			.from(invitations)
			.where(and(eq(invitations.email, email), eq(invitations.app_id, appId)));
	},

	async findPendingByEmailAndApp(db: DbClient, email: string, appId: number) {
		const now = new Date();
		return db
			.select()
			.from(invitations)
			.where(
				and(
					eq(invitations.email, email),
					eq(invitations.app_id, appId),
					isNull(invitations.consumed_at),
					gt(invitations.expires_at, now),
				),
			);
	},

	async findPendingByApp(db: DbClient, appId: number, limit = 100) {
		const now = new Date();
		return db
			.select()
			.from(invitations)
			.where(and(eq(invitations.app_id, appId), isNull(invitations.consumed_at), gt(invitations.expires_at, now)))
			.orderBy(desc(invitations.created_at))
			.limit(limit);
	},

	async markConsumed(db: DbClient, invitationId: number, userId: number) {
		const results = await db
			.update(invitations)
			.set({ consumed_at: new Date(), consumed_by_user_id: userId })
			.where(eq(invitations.id, invitationId))
			.returning();
		return results[0]!;
	},

	async deleteExpired(db: DbClient) {
		const now = new Date();
		return db
			.update(invitations)
			.set({ deleted_at: now })
			.where(
				and(isNull(invitations.consumed_at), lt(invitations.expires_at, now), isNull(invitations.deleted_at)),
			)
			.returning();
	},
};

/**
 * Plan queries
 */
export const planQueries = {
	async create(db: DbClient, data: typeof plans.$inferInsert) {
		const results = await db.insert(plans).values(data).returning();
		return results[0]!;
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(plans)
			.where(and(eq(plans.public_id, publicId), isNull(plans.deleted_at)));
		return results[0];
	},

	async findById(db: DbClient, id: number) {
		const results = await db
			.select()
			.from(plans)
			.where(and(eq(plans.id, id), isNull(plans.deleted_at)));
		return results[0];
	},

	async findByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(plans)
			.where(and(eq(plans.app_id, appId), isNull(plans.deleted_at)))
			.orderBy(plans.display_order);
	},

	async findByAppAndSlug(db: DbClient, appId: number, slug: string) {
		const results = await db
			.select()
			.from(plans)
			.where(and(eq(plans.app_id, appId), eq(plans.slug, slug), isNull(plans.deleted_at)));
		return results[0];
	},

	async findFreePlan(db: DbClient, appId: number) {
		return this.findByAppAndSlug(db, appId, "free");
	},

	async findActiveByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(plans)
			.where(and(eq(plans.app_id, appId), eq(plans.status, "active"), isNull(plans.deleted_at)))
			.orderBy(plans.display_order);
	},

	async update(db: DbClient, planId: number, data: Partial<typeof plans.$inferInsert>) {
		const now = new Date();
		const results = await db
			.update(plans)
			.set({ ...data, updated_at: now } as any)
			.where(eq(plans.id, planId))
			.returning();
		return results[0]!;
	},

	async delete(db: DbClient, planId: number) {
		const plan = await this.findById(db, planId);
		if (!plan) return null;

		const now = new Date();
		const timestamp = now.getTime();
		const newSlug = `${plan.slug}--deleted-${timestamp}`;

		const results = await db
			.update(plans)
			.set({
				slug: newSlug,
				is_active: false,
				deleted_at: now,
				updated_at: now,
			})
			.where(eq(plans.id, planId))
			.returning();
		return results[0]!;
	},

	async countLicensesByPlan(db: DbClient, planId: number) {
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(licenses)
			.where(eq(licenses.plan_id, planId));

		return result[0]?.count || 0;
	},
};

/**
 * Payment Provider Config queries
 */
export const paymentProviderConfigQueries = {
	async findById(db: DbClient, configId: number) {
		const results = await db
			.select()
			.from(payment_provider_configs)
			.where(eq(payment_provider_configs.id, configId));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(payment_provider_configs)
			.where(eq(payment_provider_configs.public_id, publicId));
		return results[0];
	},

	async findByProjectId(db: DbClient, projectId: number) {
		return db
			.select()
			.from(payment_provider_configs)
			.where(eq(payment_provider_configs.project_id, projectId))
			.orderBy(desc(payment_provider_configs.is_default), desc(payment_provider_configs.created_at));
	},

	async findByProjectAndProvider(
		db: DbClient,
		projectId: number,
		provider: string,
		environment: string,
	) {
		const results = await db
			.select()
			.from(payment_provider_configs)
			.where(
				and(
					eq(payment_provider_configs.project_id, projectId),
					eq(payment_provider_configs.provider, provider),
					eq(payment_provider_configs.environment, environment),
				),
			);
		return results[0];
	},

	async findDefaultByProject(db: DbClient, projectId: number) {
		const results = await db
			.select()
			.from(payment_provider_configs)
			.where(
				and(
					eq(payment_provider_configs.project_id, projectId),
					eq(payment_provider_configs.is_default, true),
				),
			);
		return results[0];
	},

	async create(db: DbClient, data: typeof payment_provider_configs.$inferInsert) {
		const results = await db
			.insert(payment_provider_configs)
			.values(data)
			.returning();
		return results[0]!;
	},

	async update(
		db: DbClient,
		configId: number,
		data: Partial<typeof payment_provider_configs.$inferInsert>,
	) {
		return db
			.update(payment_provider_configs)
			.set({ ...data, updated_at: new Date() })
			.where(eq(payment_provider_configs.id, configId))
			.returning();
	},

	async delete(db: DbClient, configId: number) {
		return db
			.delete(payment_provider_configs)
			.where(eq(payment_provider_configs.id, configId))
			.returning();
	},

	async findActiveByProvider(db: DbClient, provider: string) {
		return db
			.select()
			.from(payment_provider_configs)
			.where(
				and(
					eq(payment_provider_configs.provider, provider),
					eq(payment_provider_configs.is_active, true),
				),
			);
	},

	async setAsDefault(db: DbClient, projectId: number, configId: number) {
		// First, unset any existing defaults for this project
		await db
			.update(payment_provider_configs)
			.set({ is_default: false })
			.where(eq(payment_provider_configs.project_id, projectId));

		// Then set this one as default
		const results = await db
			.update(payment_provider_configs)
			.set({ is_default: true, updated_at: new Date() })
			.where(eq(payment_provider_configs.id, configId))
			.returning();
		return results[0]!;
	},
};

/**
 * Payment Routing Rules queries
 */
export const routingRuleQueries = {
	/**
	 * Find all active routing rules for an app, ordered by priority (ascending)
	 * Lower priority number = evaluated first
	 */
	async findActiveByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(payment_routing_rules)
			.where(and(eq(payment_routing_rules.app_id, appId), eq(payment_routing_rules.is_active, true)))
			.orderBy(asc(payment_routing_rules.priority));
	},

	/**
	 * Find all routing rules for an app (active + inactive)
	 */
	async findByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(payment_routing_rules)
			.where(eq(payment_routing_rules.app_id, appId))
			.orderBy(asc(payment_routing_rules.priority));
	},

	/**
	 * Find routing rule by ID
	 */
	async findById(db: DbClient, ruleId: number) {
		const results = await db
			.select()
			.from(payment_routing_rules)
			.where(eq(payment_routing_rules.id, ruleId));
		return results[0];
	},

	/**
	 * Find routing rule by public ID
	 */
	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(payment_routing_rules)
			.where(eq(payment_routing_rules.public_id, publicId));
		return results[0];
	},

	/**
	 * Create new routing rule
	 */
	async create(db: DbClient, data: typeof payment_routing_rules.$inferInsert) {
		const results = await db.insert(payment_routing_rules).values(data).returning();
		return results[0]!;
	},

	/**
	 * Update routing rule
	 */
	async update(
		db: DbClient,
		ruleId: number,
		data: Partial<typeof payment_routing_rules.$inferInsert>,
	) {
		return db
			.update(payment_routing_rules)
			.set({ ...data, updated_at: new Date() })
			.where(eq(payment_routing_rules.id, ruleId))
			.returning();
	},

	/**
	 * Deactivate routing rule (soft delete)
	 */
	async deactivate(db: DbClient, ruleId: number) {
		return db
			.update(payment_routing_rules)
			.set({ is_active: false, updated_at: new Date() })
			.where(eq(payment_routing_rules.id, ruleId))
			.returning();
	},

	/**
	 * Hard delete routing rule
	 */
	async delete(db: DbClient, ruleId: number) {
		return db.delete(payment_routing_rules).where(eq(payment_routing_rules.id, ruleId));
	},

	/**
	 * Check if app has any active routing rules
	 */
	async hasActiveRules(db: DbClient, appId: number): Promise<boolean> {
		const results = await db
			.select({ id: payment_routing_rules.id })
			.from(payment_routing_rules)
			.where(and(eq(payment_routing_rules.app_id, appId), eq(payment_routing_rules.is_active, true)))
			.limit(1);
		return results.length > 0;
	},
};

/**
 * Test Session queries
 * For payment testing playground
 */
export const testSessionQueries = {
	async create(db: DbClient, data: typeof test_sessions.$inferInsert) {
		const results = await db.insert(test_sessions).values(data).returning();
		return results[0]!;
	},

	async findById(db: DbClient, sessionId: number) {
		const results = await db
			.select()
			.from(test_sessions)
			.where(eq(test_sessions.id, sessionId));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(test_sessions)
			.where(eq(test_sessions.public_id, publicId));
		return results[0];
	},

	async findByAdminId(db: DbClient, adminId: number, limit = 10) {
		return db
			.select()
			.from(test_sessions)
			.where(eq(test_sessions.admin_id, adminId))
			.orderBy(desc(test_sessions.created_at))
			.limit(limit);
	},

	async update(
		db: DbClient,
		sessionId: number,
		data: Partial<typeof test_sessions.$inferInsert>
	) {
		const results = await db
			.update(test_sessions)
			.set({ ...data, updated_at: new Date() })
			.where(eq(test_sessions.id, sessionId))
			.returning();
		return results[0];
	},

	async updateStatus(db: DbClient, sessionId: number, status: string) {
		return this.update(db, sessionId, { status });
	},

	async delete(db: DbClient, sessionId: number) {
		return db.delete(test_sessions).where(eq(test_sessions.id, sessionId));
	},

	async findExpired(db: DbClient) {
		return db
			.select()
			.from(test_sessions)
			.where(and(eq(test_sessions.status, "active"), lt(test_sessions.expires_at, new Date())));
	},

	async deleteExpired(db: DbClient) {
		const expiredSessions = await this.findExpired(db);
		if (expiredSessions.length === 0) return [];

		const sessionIds = expiredSessions.map((s) => s.id);
		return db
			.delete(test_sessions)
			.where(inArray(test_sessions.id, sessionIds))
			.returning();
	},

	async cleanupTestData(db: DbClient, olderThanHours = 24) {
		const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

		const deletedLicenses = await db
			.delete(licenses)
			.where(and(eq(licenses.is_test, true), lt(licenses.created_at, cutoffTime)))
			.returning({ id: licenses.id });

		const deletedApps = await db
			.delete(apps)
			.where(and(eq(apps.is_test, true), lt(apps.created_at, cutoffTime)))
			.returning({ id: apps.id });

		const deletedUsers = await db
			.delete(users)
			.where(
				and(eq(users.is_test, true), lt(users.created_at, cutoffTime))
			)
			.returning({ id: users.id });

		return {
			licenses: deletedLicenses.length,
			apps: deletedApps.length,
			users: deletedUsers.length,
		};
	},
};

/**
 * Price queries
 */
export const priceQueries = {
	async create(db: DbClient, data: typeof prices.$inferInsert) {
		const results = await db.insert(prices).values(data).returning();
		return results[0]!;
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(prices)
			.where(and(eq(prices.public_id, publicId), isNull(prices.deleted_at)));
		return results[0];
	},

	async findById(db: DbClient, id: number) {
		const results = await db
			.select()
			.from(prices)
			.where(and(eq(prices.id, id), isNull(prices.deleted_at)));
		return results[0];
	},

	async findByPlanId(db: DbClient, planId: number) {
		return db
			.select()
			.from(prices)
			.where(and(eq(prices.plan_id, planId), isNull(prices.deleted_at)));
	},

	async findActiveByPlanId(db: DbClient, planId: number) {
		return db
			.select()
			.from(prices)
			.where(and(eq(prices.plan_id, planId), eq(prices.is_active, true), isNull(prices.deleted_at)));
	},

	async findByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(prices)
			.where(and(eq(prices.app_id, appId), isNull(prices.deleted_at)));
	},

	async findByExternalPriceId(db: DbClient, externalPriceId: string) {
		const results = await db
			.select()
			.from(prices)
			.where(and(eq(prices.external_price_id, externalPriceId), isNull(prices.deleted_at)));
		return results[0];
	},

	async update(db: DbClient, priceId: number, data: Partial<typeof prices.$inferInsert>) {
		const now = new Date();
		const results = await db
			.update(prices)
			.set({ ...data, updated_at: now })
			.where(eq(prices.id, priceId))
			.returning();
		return results[0]!;
	},

	async deactivate(db: DbClient, priceId: number) {
		return this.update(db, priceId, { is_active: false });
	},

	async delete(db: DbClient, priceId: number) {
		const results = await db
			.update(prices)
			.set({ deleted_at: new Date(), updated_at: new Date(), is_active: false })
			.where(eq(prices.id, priceId))
			.returning();
		return results[0]!;
	},
};

/**
 * License history queries
 */
export const licenseHistoryQueries = {
	async create(db: DbClient, data: typeof license_history.$inferInsert) {
		const results = await db.insert(license_history).values(data).returning();
		return results[0]!;
	},

	async findByLicenseId(db: DbClient, licenseId: number, limit = 100) {
		return db
			.select()
			.from(license_history)
			.where(eq(license_history.license_id, licenseId))
			.orderBy(desc(license_history.created_at))
			.limit(limit);
	},

	async findByChangeType(db: DbClient, licenseId: number, changeType: string) {
		return db
			.select()
			.from(license_history)
			.where(
				and(eq(license_history.license_id, licenseId), eq(license_history.change_type, changeType)),
			)
			.orderBy(desc(license_history.created_at));
	},
};

/**
 * Subscription queries
 */
export const subscriptionQueries = {
	async create(db: DbClient, data: typeof subscriptions.$inferInsert) {
		const results = await db.insert(subscriptions).values(data).returning();
		return results[0]!;
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.public_id, publicId));
		return results[0];
	},

	async findById(db: DbClient, id: number) {
		const results = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.id, id));
		return results[0];
	},

	async findByUserAndApp(db: DbClient, userId: number, appId: number) {
		const results = await db
			.select()
			.from(subscriptions)
			.where(and(eq(subscriptions.user_id, userId), eq(subscriptions.app_id, appId)))
			.orderBy(desc(subscriptions.created_at));
		return results[0];
	},

	async findActiveByUserAndApp(db: DbClient, userId: number, appId: number) {
		const results = await db
			.select()
			.from(subscriptions)
			.where(
				and(
					eq(subscriptions.user_id, userId),
					eq(subscriptions.app_id, appId),
					inArray(subscriptions.status, ["active", "trialing", "past_due"]),
				),
			);
		return results[0];
	},

	async findByLicenseId(db: DbClient, licenseId: number) {
		return db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.license_id, licenseId))
			.orderBy(desc(subscriptions.created_at));
	},

	async findByAppId(db: DbClient, appId: number, limit = 100) {
		return db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.app_id, appId))
			.orderBy(desc(subscriptions.created_at))
			.limit(limit);
	},

	async findByProviderSubscriptionId(db: DbClient, providerConfigId: number, providerSubscriptionId: string) {
		const results = await db
			.select()
			.from(subscriptions)
			.where(
				and(
					eq(subscriptions.provider_config_id, providerConfigId),
					eq(subscriptions.provider_subscription_id, providerSubscriptionId),
				),
			);
		return results[0];
	},

	async update(db: DbClient, subscriptionId: number, data: Partial<typeof subscriptions.$inferInsert>) {
		const now = new Date();
		const results = await db
			.update(subscriptions)
			.set({ ...data, updated_at: now })
			.where(eq(subscriptions.id, subscriptionId))
			.returning();
		return results[0]!;
	},
};

/**
 * License activation queries (seats/devices)
 */
export const activationQueries = {
	async create(db: DbClient, data: typeof license_activations.$inferInsert) {
		const results = await db.insert(license_activations).values(data).returning();
		return results[0]!;
	},

	async findByLicenseId(db: DbClient, licenseId: number) {
		return db
			.select()
			.from(license_activations)
			.where(and(eq(license_activations.license_id, licenseId), isNull(license_activations.deactivated_at)))
			.orderBy(desc(license_activations.last_seen_at));
	},

	async countActiveByLicenseId(db: DbClient, licenseId: number) {
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(license_activations)
			.where(and(eq(license_activations.license_id, licenseId), isNull(license_activations.deactivated_at)));
		return result[0]?.count ?? 0;
	},

	async findByLicenseAndDevice(db: DbClient, licenseId: number, deviceId: string) {
		const results = await db
			.select()
			.from(license_activations)
			.where(
				and(
					eq(license_activations.license_id, licenseId),
					eq(license_activations.device_id, deviceId),
					isNull(license_activations.deactivated_at),
				),
			);
		return results[0];
	},

	async deactivate(db: DbClient, activationId: number) {
		const now = new Date();
		const results = await db
			.update(license_activations)
			.set({ deactivated_at: now, updated_at: now })
			.where(eq(license_activations.id, activationId))
			.returning();
		return results[0]!;
	},

	async deactivateByDevice(db: DbClient, licenseId: number, deviceId: string) {
		const now = new Date();
		const results = await db
			.update(license_activations)
			.set({ deactivated_at: now, updated_at: now })
			.where(
				and(
					eq(license_activations.license_id, licenseId),
					eq(license_activations.device_id, deviceId),
					isNull(license_activations.deactivated_at),
				),
			)
			.returning();
		return results[0];
	},

	async updateLastSeen(db: DbClient, activationId: number) {
		const now = new Date();
		return db
			.update(license_activations)
			.set({ last_seen_at: now, updated_at: now })
			.where(eq(license_activations.id, activationId))
			.returning();
	},

	async deactivateStale(db: DbClient, staleDays = 30) {
		const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
		return db
			.update(license_activations)
			.set({ deactivated_at: new Date(), updated_at: new Date() })
			.where(
				and(
					isNull(license_activations.deactivated_at),
					lt(license_activations.last_seen_at, cutoff),
				),
			)
			.returning();
	},
};

/**
 * Promotion queries
 */
export const promotionQueries = {
	async create(db: DbClient, data: typeof promotions.$inferInsert) {
		const results = await db.insert(promotions).values(data).returning();
		return results[0]!;
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(promotions)
			.where(eq(promotions.public_id, publicId));
		return results[0];
	},

	async findById(db: DbClient, id: number) {
		const results = await db
			.select()
			.from(promotions)
			.where(eq(promotions.id, id));
		return results[0];
	},

	async findByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(promotions)
			.where(eq(promotions.app_id, appId))
			.orderBy(desc(promotions.created_at));
	},

	async findActiveByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(promotions)
			.where(
				and(
					eq(promotions.app_id, appId),
					eq(promotions.is_active, true),
				),
			)
			.orderBy(desc(promotions.created_at));
	},

	async update(db: DbClient, promoId: number, data: Partial<typeof promotions.$inferInsert>) {
		const now = new Date();
		const results = await db
			.update(promotions)
			.set({ ...data, updated_at: now })
			.where(eq(promotions.id, promoId))
			.returning();
		return results[0]!;
	},

	async incrementRedemptions(db: DbClient, promoId: number) {
		return db
			.update(promotions)
			.set({
				current_redemptions: sql`${promotions.current_redemptions} + 1`,
				updated_at: new Date(),
			})
			.where(eq(promotions.id, promoId))
			.returning();
	},

	async deactivate(db: DbClient, promoId: number) {
		return this.update(db, promoId, { is_active: false });
	},
};

/**
 * Promotion code queries
 */
export const promotionCodeQueries = {
	async create(db: DbClient, data: typeof promotion_codes.$inferInsert) {
		const results = await db.insert(promotion_codes).values(data).returning();
		return results[0]!;
	},

	async findByCode(db: DbClient, code: string) {
		const results = await db
			.select()
			.from(promotion_codes)
			.where(eq(promotion_codes.code, code));
		return results[0];
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(promotion_codes)
			.where(eq(promotion_codes.public_id, publicId));
		return results[0];
	},

	async findByPromotionId(db: DbClient, promotionId: number) {
		return db
			.select()
			.from(promotion_codes)
			.where(eq(promotion_codes.promotion_id, promotionId));
	},

	async update(db: DbClient, codeId: number, data: Partial<typeof promotion_codes.$inferInsert>) {
		const results = await db
			.update(promotion_codes)
			.set({ ...data, updated_at: new Date() })
			.where(eq(promotion_codes.id, codeId))
			.returning();
		return results[0]!;
	},

	async incrementUses(db: DbClient, codeId: number) {
		return db
			.update(promotion_codes)
			.set({
				current_uses: sql`${promotion_codes.current_uses} + 1`,
				updated_at: new Date(),
			})
			.where(eq(promotion_codes.id, codeId))
			.returning();
	},
};

/**
 * Promotion plan targeting queries
 */
export const promotionPlanQueries = {
	async create(db: DbClient, data: typeof promotion_plans.$inferInsert) {
		const results = await db.insert(promotion_plans).values(data).returning();
		return results[0]!;
	},

	async findByPromotionId(db: DbClient, promotionId: number) {
		return db
			.select()
			.from(promotion_plans)
			.where(eq(promotion_plans.promotion_id, promotionId));
	},

	async deleteByPromotionId(db: DbClient, promotionId: number) {
		return db
			.delete(promotion_plans)
			.where(eq(promotion_plans.promotion_id, promotionId))
			.returning();
	},

	async replaceForPromotion(db: DbClient, promotionId: number, planIds: number[]) {
		await this.deleteByPromotionId(db, promotionId);
		if (planIds.length === 0) return [];
		const rows = planIds.map((plan_id) => ({
			promotion_id: promotionId,
			plan_id,
		}));
		return db.insert(promotion_plans).values(rows).returning();
	},
};

/**
 * Promotion provider ref queries
 */
export const promotionProviderRefQueries = {
	async create(db: DbClient, data: typeof promotion_provider_refs.$inferInsert) {
		const results = await db.insert(promotion_provider_refs).values(data).returning();
		return results[0]!;
	},

	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(promotion_provider_refs)
			.where(eq(promotion_provider_refs.public_id, publicId));
		return results[0];
	},

	async findByPromotionId(db: DbClient, promotionId: number) {
		return db
			.select()
			.from(promotion_provider_refs)
			.where(and(eq(promotion_provider_refs.promotion_id, promotionId), eq(promotion_provider_refs.is_active, true)));
	},

	async findByPromotionAndProvider(db: DbClient, promotionId: number, providerConfigId: number) {
		const results = await db
			.select()
			.from(promotion_provider_refs)
			.where(
				and(
					eq(promotion_provider_refs.promotion_id, promotionId),
					eq(promotion_provider_refs.provider_config_id, providerConfigId),
					eq(promotion_provider_refs.is_active, true),
				),
			);
		return results[0];
	},

	async deactivate(db: DbClient, refId: number) {
		const results = await db
			.update(promotion_provider_refs)
			.set({ is_active: false, updated_at: new Date() })
			.where(eq(promotion_provider_refs.id, refId))
			.returning();
		return results[0]!;
	},
};

/**
 * Promotion redemption queries
 */
export const promotionRedemptionQueries = {
	async findByPromotionCodeId(db: DbClient, promotionCodeId: number) {
		return db
			.select()
			.from(promotion_redemptions)
			.where(eq(promotion_redemptions.promotion_code_id, promotionCodeId))
			.orderBy(desc(promotion_redemptions.created_at));
	},

	async findByAppId(db: DbClient, appId: number) {
		return db
			.select()
			.from(promotion_redemptions)
			.where(eq(promotion_redemptions.app_id, appId))
			.orderBy(desc(promotion_redemptions.created_at));
	},

	async findByUserForPromotion(db: DbClient, appId: number, subjectType: string, subjectId: number, promotionCodeIds: number[]) {
		if (promotionCodeIds.length === 0) return [];
		return db
			.select()
			.from(promotion_redemptions)
			.where(
				and(
					eq(promotion_redemptions.app_id, appId),
					eq(promotion_redemptions.subject_type, subjectType),
					eq(promotion_redemptions.subject_id, subjectId),
					inArray(promotion_redemptions.promotion_code_id, promotionCodeIds),
				),
			);
	},
};

/**
 * Purchase queries
 */
export const purchaseQueries = {
	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(purchases)
			.where(eq(purchases.public_id, publicId));
		return results[0];
	},

	async findById(db: DbClient, id: number) {
		const results = await db
			.select()
			.from(purchases)
			.where(eq(purchases.id, id));
		return results[0];
	},

	async findAll(db: DbClient, filters: {
		appId?: number | undefined;
		status?: string | undefined;
		providerConfigId?: number | undefined;
		startDate?: Date | undefined;
		endDate?: Date | undefined;
		limit?: number | undefined;
		offset?: number | undefined;
	} = {}) {
		const conditions = [];
		if (filters.appId) conditions.push(eq(purchases.app_id, filters.appId));
		if (filters.status) conditions.push(eq(purchases.status, filters.status));
		if (filters.providerConfigId) conditions.push(eq(purchases.provider_config_id, filters.providerConfigId));
		if (filters.startDate) conditions.push(gte(purchases.created_at, filters.startDate));
		if (filters.endDate) conditions.push(lte(purchases.created_at, filters.endDate));

		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const limit = filters.limit ?? 20;
		const offset = filters.offset ?? 0;

		const [items, countResult] = await Promise.all([
			db
				.select()
				.from(purchases)
				.where(where)
				.orderBy(desc(purchases.created_at))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)` })
				.from(purchases)
				.where(where),
		]);

		return { items, total: countResult[0]?.count ?? 0 };
	},

	async findByProviderSessionId(db: DbClient, providerSessionId: string) {
		const results = await db
			.select()
			.from(purchases)
			.where(eq(purchases.provider_session_id, providerSessionId));
		return results[0];
	},

	async create(db: DbClient, data: typeof purchases.$inferInsert) {
		const results = await db.insert(purchases).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, purchaseId: number, data: Partial<typeof purchases.$inferInsert>) {
		const results = await db
			.update(purchases)
			.set({ ...data, updated_at: new Date() })
			.where(eq(purchases.id, purchaseId))
			.returning();
		return results[0]!;
	},
};

/**
 * Payment transaction queries
 */
export const paymentTransactionQueries = {
	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(payment_transactions)
			.where(eq(payment_transactions.public_id, publicId));
		return results[0];
	},

	async findById(db: DbClient, id: number) {
		const results = await db
			.select()
			.from(payment_transactions)
			.where(eq(payment_transactions.id, id));
		return results[0];
	},

	async findByPurchaseId(db: DbClient, purchaseId: number) {
		return db
			.select()
			.from(payment_transactions)
			.where(eq(payment_transactions.purchase_id, purchaseId))
			.orderBy(desc(payment_transactions.created_at));
	},

	async findAll(db: DbClient, filters: {
		type?: string | undefined;
		status?: string | undefined;
		provider?: string | undefined;
		providerConfigId?: number | undefined;
		startDate?: Date | undefined;
		endDate?: Date | undefined;
		limit?: number | undefined;
		offset?: number | undefined;
	} = {}) {
		const conditions = [];
		if (filters.type) conditions.push(eq(payment_transactions.type, filters.type));
		if (filters.status) conditions.push(eq(payment_transactions.status, filters.status));
		if (filters.provider) conditions.push(eq(payment_transactions.provider, filters.provider));
		if (filters.providerConfigId) conditions.push(eq(payment_transactions.provider_config_id, filters.providerConfigId));
		if (filters.startDate) conditions.push(gte(payment_transactions.transaction_date, filters.startDate));
		if (filters.endDate) conditions.push(lte(payment_transactions.transaction_date, filters.endDate));

		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const limit = filters.limit ?? 20;
		const offset = filters.offset ?? 0;

		const [items, countResult] = await Promise.all([
			db
				.select()
				.from(payment_transactions)
				.where(where)
				.orderBy(desc(payment_transactions.created_at))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)` })
				.from(payment_transactions)
				.where(where),
		]);

		return { items, total: countResult[0]?.count ?? 0 };
	},

	async create(db: DbClient, data: typeof payment_transactions.$inferInsert) {
		const results = await db.insert(payment_transactions).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, txId: number, data: Partial<typeof payment_transactions.$inferInsert>) {
		const results = await db
			.update(payment_transactions)
			.set(data)
			.where(eq(payment_transactions.id, txId))
			.returning();
		return results[0]!;
	},

	/** Get revenue stats grouped by type */
	async revenueByType(db: DbClient, filters: { startDate?: Date | undefined; endDate?: Date | undefined; provider?: string | undefined } = {}) {
		const conditions = [eq(payment_transactions.status, "success")];
		if (filters.startDate) conditions.push(gte(payment_transactions.transaction_date, filters.startDate));
		if (filters.endDate) conditions.push(lte(payment_transactions.transaction_date, filters.endDate));
		if (filters.provider) conditions.push(eq(payment_transactions.provider, filters.provider));

		return db
			.select({
				type: payment_transactions.type,
				total: sql<number>`coalesce(sum(${payment_transactions.amount_cents}), 0)`,
				count: sql<number>`count(*)`,
			})
			.from(payment_transactions)
			.where(and(...conditions))
			.groupBy(payment_transactions.type);
	},

	/** Get revenue stats grouped by provider */
	async revenueByProvider(db: DbClient, filters: { startDate?: Date | undefined; endDate?: Date | undefined } = {}) {
		const conditions = [eq(payment_transactions.status, "success")];
		if (filters.startDate) conditions.push(gte(payment_transactions.transaction_date, filters.startDate));
		if (filters.endDate) conditions.push(lte(payment_transactions.transaction_date, filters.endDate));

		return db
			.select({
				provider: payment_transactions.provider,
				total: sql<number>`coalesce(sum(${payment_transactions.amount_cents}), 0)`,
				count: sql<number>`count(*)`,
			})
			.from(payment_transactions)
			.where(and(...conditions))
			.groupBy(payment_transactions.provider);
	},

	/** Get revenue stats grouped by currency */
	async revenueByCurrency(db: DbClient, filters: { startDate?: Date | undefined; endDate?: Date | undefined; provider?: string | undefined } = {}) {
		const conditions = [eq(payment_transactions.status, "success")];
		if (filters.startDate) conditions.push(gte(payment_transactions.transaction_date, filters.startDate));
		if (filters.endDate) conditions.push(lte(payment_transactions.transaction_date, filters.endDate));
		if (filters.provider) conditions.push(eq(payment_transactions.provider, filters.provider));

		return db
			.select({
				currency: payment_transactions.currency,
				total: sql<number>`coalesce(sum(${payment_transactions.amount_cents}), 0)`,
				count: sql<number>`count(*)`,
			})
			.from(payment_transactions)
			.where(and(...conditions))
			.groupBy(payment_transactions.currency);
	},

	/** Count transactions in last N days */
	async countRecent(db: DbClient, days: number) {
		const since = new Date();
		since.setDate(since.getDate() - days);
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(payment_transactions)
			.where(gte(payment_transactions.created_at, since));
		return result[0]?.count ?? 0;
	},

	/** Sum completed revenue (in cents) for a specific app */
	async getTotalRevenueByAppId(db: DbClient, appId: number): Promise<number> {
		const result = await db
			.select({ total: sql<number>`coalesce(sum(${payment_transactions.amount_cents}), 0)` })
			.from(payment_transactions)
			.innerJoin(licenses, eq(licenses.id, payment_transactions.license_id))
			.where(
				and(
					eq(licenses.app_id, appId),
					eq(payment_transactions.status, "success"),
					inArray(payment_transactions.type, ["purchase", "renewal"]),
				),
			);
		return Number(result[0]?.total ?? 0);
	},

	/** Sum completed revenue (in cents) for all apps in a project */
	async getTotalRevenueByProjectId(db: DbClient, projectId: number): Promise<number> {
		const result = await db
			.select({ total: sql<number>`coalesce(sum(${payment_transactions.amount_cents}), 0)` })
			.from(payment_transactions)
			.innerJoin(licenses, eq(licenses.id, payment_transactions.license_id))
			.innerJoin(apps, eq(apps.id, licenses.app_id))
			.where(
				and(
					eq(apps.project_id, projectId),
					eq(payment_transactions.status, "success"),
					inArray(payment_transactions.type, ["purchase", "renewal"]),
				),
			);
		return Number(result[0]?.total ?? 0);
	},
};

/**
 * Webhook log queries
 */
export const webhookLogQueries = {
	async findByPublicId(db: DbClient, publicId: string) {
		const results = await db
			.select()
			.from(webhook_logs)
			.where(eq(webhook_logs.public_id, publicId));
		return results[0];
	},

	async findById(db: DbClient, id: number) {
		const results = await db
			.select()
			.from(webhook_logs)
			.where(eq(webhook_logs.id, id));
		return results[0];
	},

	async findAll(db: DbClient, filters: {
		provider?: string | undefined;
		status?: string | undefined;
		eventType?: string | undefined;
		startDate?: Date | undefined;
		endDate?: Date | undefined;
		limit?: number | undefined;
		offset?: number | undefined;
	} = {}) {
		const conditions = [];
		if (filters.provider) conditions.push(eq(webhook_logs.provider, filters.provider));
		if (filters.status) conditions.push(eq(webhook_logs.status, filters.status));
		if (filters.eventType) conditions.push(eq(webhook_logs.event_type, filters.eventType));
		if (filters.startDate) conditions.push(gte(webhook_logs.received_at, filters.startDate));
		if (filters.endDate) conditions.push(lte(webhook_logs.received_at, filters.endDate));

		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const limit = filters.limit ?? 20;
		const offset = filters.offset ?? 0;

		const [items, countResult] = await Promise.all([
			db
				.select({
					id: webhook_logs.id,
					public_id: webhook_logs.public_id,
					provider: webhook_logs.provider,
					event_type: webhook_logs.event_type,
					event_id: webhook_logs.event_id,
					status: webhook_logs.status,
					ip_address: webhook_logs.ip_address,
					processing_duration_ms: webhook_logs.processing_duration_ms,
					error_message: webhook_logs.error_message,
					retry_count: webhook_logs.retry_count,
					received_at: webhook_logs.received_at,
					processing_completed_at: webhook_logs.processing_completed_at,
				})
				.from(webhook_logs)
				.where(where)
				.orderBy(desc(webhook_logs.received_at))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)` })
				.from(webhook_logs)
				.where(where),
		]);

		return { items, total: countResult[0]?.count ?? 0 };
	},

	/** Count webhooks by status */
	async countByStatus(db: DbClient) {
		return db
			.select({
				status: webhook_logs.status,
				count: sql<number>`count(*)`,
			})
			.from(webhook_logs)
			.groupBy(webhook_logs.status);
	},

	async create(db: DbClient, data: typeof webhook_logs.$inferInsert) {
		const results = await db.insert(webhook_logs).values(data).returning();
		return results[0]!;
	},

	async update(db: DbClient, logId: number, data: Partial<typeof webhook_logs.$inferInsert>) {
		const results = await db
			.update(webhook_logs)
			.set({ ...data, updated_at: new Date() })
			.where(eq(webhook_logs.id, logId))
			.returning();
		return results[0]!;
	},
};

/**
 * App User queries
 * Persistent (app, user) membership — survives session deletion.
 */
export const appUserQueries = {
	/**
	 * Upsert: insert on first login, bump last_seen_at on every subsequent login.
	 * publicId is only used when a new row is inserted.
	 */
	async upsert(db: DbClient, appId: number, userId: number) {
		const now = new Date();
		const results = await db
			.insert(app_users)
			.values({ app_id: appId, user_id: userId, last_seen_at: now })
			.onConflictDoUpdate({
				target: [app_users.app_id, app_users.user_id],
				set: { last_seen_at: now },
			})
			.returning();
		return results[0]!;
	},

	async countByAppId(db: DbClient, appId: number) {
		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(app_users)
			.where(eq(app_users.app_id, appId));
		return Number(result[0]?.count ?? 0);
	},

	async findByAppId(db: DbClient, appId: number) {
		return db.select().from(app_users).where(eq(app_users.app_id, appId));
	},

	/** Sum unique users across all apps belonging to a project */
	async countByProjectId(db: DbClient, projectId: number) {
		const result = await db
			.select({ count: sql<number>`count(distinct ${app_users.user_id})` })
			.from(app_users)
			.innerJoin(apps, eq(apps.id, app_users.app_id))
			.where(eq(apps.project_id, projectId));
		return Number(result[0]?.count ?? 0);
	},
};

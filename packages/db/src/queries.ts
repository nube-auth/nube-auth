import { and, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import type { DbClient } from "./index.js";
import {
	apps,
	audit_logs,
	auth_codes,
	email_verifications,
	identities,
	invitations,
	licenses,
	plans,
	project_invitations,
	project_members,
	projects,
	sessions,
	users,
} from "./schema.js";

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

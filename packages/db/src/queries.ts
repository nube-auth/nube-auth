import { eq, and, gt, isNull, desc, inArray } from 'drizzle-orm';
import { DbClient } from './index.js';
import {
  users,
  identities,
  sessions,
  projects,
  project_members,
  apps,
  auth_codes,
  licenses,
  email_verifications,
  audit_logs,
} from './schema.js';

/**
 * User queries
 */
export const userQueries = {
  async findById(db: DbClient, userId: number) {
    return db.select().from(users).where(eq(users.id, userId)).get();
  },

  async findByPublicId(db: DbClient, publicId: string) {
    return db.select().from(users).where(eq(users.public_id, publicId)).get();
  },

  async findByEmail(db: DbClient, email: string) {
    return db
      .select()
      .from(users)
      .where(eq(users.primary_email, email))
      .get();
  },

  async create(db: DbClient, data: typeof users.$inferInsert) {
    return db.insert(users).values(data).returning().get();
  },

  async update(db: DbClient, userId: number, data: Partial<typeof users.$inferInsert>) {
    return db
      .update(users)
      .set({ ...data, updated_at: Math.floor(Date.now() / 1000) })
      .where(eq(users.id, userId))
      .returning()
      .get();
  },
};

/**
 * Identity queries
 */
export const identityQueries = {
  async findByProviderUserId(db: DbClient, provider: string, providerUserId: string) {
    return db
      .select()
      .from(identities)
      .where(
        and(eq(identities.provider, provider), eq(identities.provider_user_id, providerUserId))
      )
      .get();
  },

  async findByUserId(db: DbClient, userId: number) {
    return db.select().from(identities).where(eq(identities.user_id, userId)).all();
  },

  async create(db: DbClient, data: typeof identities.$inferInsert) {
    return db.insert(identities).values(data).returning().get();
  },
};

/**
 * Session queries
 */
export const sessionQueries = {
  async findById(db: DbClient, sessionId: number) {
    return db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  },

  async findByPublicId(db: DbClient, publicId: string) {
    return db.select().from(sessions).where(eq(sessions.public_id, publicId)).get();
  },

  async findActiveByUserId(db: DbClient, userId: number) {
    const now = Math.floor(Date.now() / 1000);
    return db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.user_id, userId),
          isNull(sessions.revoked_at),
          gt(sessions.expires_at, now)
        )
      )
      .all();
  },

  async create(db: DbClient, data: typeof sessions.$inferInsert) {
    return db.insert(sessions).values(data).returning().get();
  },

  async updateLastSeen(db: DbClient, sessionId: number, lastSeenAt: number) {
    return db
      .update(sessions)
      .set({ last_seen_at: lastSeenAt })
      .where(eq(sessions.id, sessionId))
      .returning()
      .get();
  },

  async revoke(db: DbClient, sessionId: number) {
    return db
      .update(sessions)
      .set({ revoked_at: Math.floor(Date.now() / 1000) })
      .where(eq(sessions.id, sessionId))
      .returning()
      .get();
  },
};

/**
 * Project queries
 */
export const projectQueries = {
  async findById(db: DbClient, projectId: number) {
    return db.select().from(projects).where(eq(projects.id, projectId)).get();
  },

  async findByPublicId(db: DbClient, publicId: string) {
    return db.select().from(projects).where(eq(projects.public_id, publicId)).get();
  },

  async findByOwnerId(db: DbClient, userId: number) {
    return db.select().from(projects).where(eq(projects.owner_user_id, userId)).all();
  },

  async findByUserId(db: DbClient, userId: number) {
    // Find projects where user is a member
    const memberProjects = await db
      .select({ project_id: project_members.project_id })
      .from(project_members)
      .where(eq(project_members.user_id, userId))
      .all();

    if (memberProjects.length === 0) return [];

    const projectIds = memberProjects.map((m) => m.project_id);
    return db.select().from(projects).where(inArray(projects.id, projectIds)).all();
  },

  async create(db: DbClient, data: typeof projects.$inferInsert) {
    return db.insert(projects).values(data).returning().get();
  },
};

/**
 * ProjectMember queries
 */
export const projectMemberQueries = {
  async findByProjectAndUser(db: DbClient, projectId: number, userId: number) {
    return db
      .select()
      .from(project_members)
      .where(and(eq(project_members.project_id, projectId), eq(project_members.user_id, userId)))
      .get();
  },

  async findByProjectId(db: DbClient, projectId: number) {
    return db.select().from(project_members).where(eq(project_members.project_id, projectId)).all();
  },

  async findByUserId(db: DbClient, userId: number) {
    return db.select().from(project_members).where(eq(project_members.user_id, userId)).all();
  },

  async create(db: DbClient, data: typeof project_members.$inferInsert) {
    return db.insert(project_members).values(data).returning().get();
  },

  async update(db: DbClient, id: number, data: Partial<typeof project_members.$inferInsert>) {
    return db
      .update(project_members)
      .set(data)
      .where(eq(project_members.id, id))
      .returning()
      .get();
  },

  async delete(db: DbClient, id: number) {
    return db.delete(project_members).where(eq(project_members.id, id)).returning().get();
  },
};

/**
 * App queries
 */
export const appQueries = {
  async findById(db: DbClient, appId: number) {
    return db.select().from(apps).where(eq(apps.id, appId)).get();
  },

  async findByPublicId(db: DbClient, publicId: string) {
    return db.select().from(apps).where(eq(apps.public_id, publicId)).get();
  },

  async findByProjectId(db: DbClient, projectId: number) {
    return db.select().from(apps).where(eq(apps.project_id, projectId)).all();
  },

  async create(db: DbClient, data: typeof apps.$inferInsert) {
    return db.insert(apps).values(data).returning().get();
  },
};

/**
 * AuthCode queries
 */
export const authCodeQueries = {
  async findByCode(db: DbClient, code: string) {
    return db.select().from(auth_codes).where(eq(auth_codes.code, code)).get();
  },

  async markConsumed(db: DbClient, codeId: number) {
    return db
      .update(auth_codes)
      .set({ consumed_at: Math.floor(Date.now() / 1000) })
      .where(eq(auth_codes.id, codeId))
      .returning()
      .get();
  },

  async create(db: DbClient, data: typeof auth_codes.$inferInsert) {
    return db.insert(auth_codes).values(data).returning().get();
  },
};

/**
 * License queries
 */
export const licenseQueries = {
  async findByUserAndApp(db: DbClient, userId: number, appId: number) {
    return db
      .select()
      .from(licenses)
      .where(and(eq(licenses.user_id, userId), eq(licenses.app_id, appId)))
      .get();
  },

  async findByUserId(db: DbClient, userId: number) {
    return db.select().from(licenses).where(eq(licenses.user_id, userId)).all();
  },

  async upsert(
    db: DbClient,
    userId: number,
    appId: number,
    data: Partial<typeof licenses.$inferInsert>
  ) {
    const existing = await licenseQueries.findByUserAndApp(db, userId, appId);
    const now = Math.floor(Date.now() / 1000);

    if (existing) {
      return db
        .update(licenses)
        .set({ ...data, updated_at: now })
        .where(and(eq(licenses.user_id, userId), eq(licenses.app_id, appId)))
        .returning()
        .get();
    } else {
      return db
        .insert(licenses)
        .values({
          user_id: userId,
          app_id: appId,
          ...data,
          created_at: now,
          updated_at: now,
        } as typeof licenses.$inferInsert)
        .returning()
        .get();
    }
  },
};

/**
 * EmailVerification queries
 */
export const emailVerificationQueries = {
  async findByEmail(db: DbClient, email: string) {
    return db
      .select()
      .from(email_verifications)
      .where(eq(email_verifications.email, email))
      .get();
  },

  async create(db: DbClient, data: typeof email_verifications.$inferInsert) {
    return db.insert(email_verifications).values(data).returning().get();
  },

  async update(db: DbClient, id: number, data: Partial<typeof email_verifications.$inferInsert>) {
    return db
      .update(email_verifications)
      .set(data)
      .where(eq(email_verifications.id, id))
      .returning()
      .get();
  },

  async delete(db: DbClient, id: number) {
    return db
      .delete(email_verifications)
      .where(eq(email_verifications.id, id))
      .returning()
      .get();
  },

  async incrementAttempts(db: DbClient, id: number) {
    const record = await db.select().from(email_verifications).where(eq(email_verifications.id, id)).get();
    if (!record) throw new Error('Email verification not found');

    const newAttempts = record.attempts + 1;
    let updateData: any = { attempts: newAttempts };

    // Lock after 3 failed attempts
    if (newAttempts >= 3) {
      updateData.locked_until = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes
    }

    return db
      .update(email_verifications)
      .set(updateData)
      .where(eq(email_verifications.id, id))
      .returning()
      .get();
  },

  async markConsumed(db: DbClient, id: number) {
    return db
      .update(email_verifications)
      .set({ consumed_at: Math.floor(Date.now() / 1000) })
      .where(eq(email_verifications.id, id))
      .returning()
      .get();
  },
};

/**
 * AuditLog queries
 */
export const auditLogQueries = {
  async create(db: DbClient, data: typeof audit_logs.$inferInsert) {
    return db.insert(audit_logs).values(data).returning().get();
  },

  async findByProjectId(db: DbClient, projectId: number, limit = 100) {
    return db
      .select()
      .from(audit_logs)
      .where(eq(audit_logs.project_id, projectId))
      .orderBy(desc(audit_logs.created_at))
      .limit(limit)
      .all();
  },
};

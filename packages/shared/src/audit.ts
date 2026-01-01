import type { Logger } from "pino";

/**
 * Audit Event Types
 */
export enum AuditEventType {
	// Authentication
	AUTH_LOGIN = "auth.login",
	AUTH_LOGOUT = "auth.logout",
	AUTH_FAILED_LOGIN = "auth.failed_login",
	AUTH_PASSWORD_RESET = "auth.password_reset",
	AUTH_EMAIL_VERIFIED = "auth.email_verified",

	// User Management
	USER_CREATED = "user.created",
	USER_UPDATED = "user.updated",
	USER_DELETED = "user.deleted",
	USER_SUSPENDED = "user.suspended",
	USER_REACTIVATED = "user.reactivated",

	// Project Management
	PROJECT_CREATED = "project.created",
	PROJECT_UPDATED = "project.updated",
	PROJECT_DELETED = "project.deleted",
	PROJECT_MEMBER_ADDED = "project.member_added",
	PROJECT_MEMBER_REMOVED = "project.member_removed",
	PROJECT_MEMBER_ROLE_CHANGED = "project.member_role_changed",

	// App Management
	APP_CREATED = "app.created",
	APP_UPDATED = "app.updated",
	APP_DELETED = "app.deleted",
	APP_SECRET_REGENERATED = "app.secret_regenerated",
	APP_TOKEN_REGENERATED = "app.token_regenerated",

	// License Management
	LICENSE_GRANTED = "license.granted",
	LICENSE_REVOKED = "license.revoked",
	LICENSE_UPDATED = "license.updated",
	LICENSE_EXPIRED = "license.expired",

	// Plan Management
	PLAN_CREATED = "plan.created",
	PLAN_UPDATED = "plan.updated",
	PLAN_DELETED = "plan.deleted",

	// Payment Configuration
	PAYMENT_CONFIG_CREATED = "payment_config.created",
	PAYMENT_CONFIG_UPDATED = "payment_config.updated",
	PAYMENT_CONFIG_DELETED = "payment_config.deleted",

	// OAuth Configuration
	OAUTH_CONFIG_UPDATED = "oauth_config.updated",

	// Invitations
	INVITATION_SENT = "invitation.sent",
	INVITATION_ACCEPTED = "invitation.accepted",
	INVITATION_REVOKED = "invitation.revoked",

	// Security Events
	SECURITY_API_KEY_EXPOSED = "security.api_key_exposed",
	SECURITY_RATE_LIMIT_EXCEEDED = "security.rate_limit_exceeded",
	SECURITY_UNAUTHORIZED_ACCESS = "security.unauthorized_access",
	SECURITY_SUSPICIOUS_ACTIVITY = "security.suspicious_activity",
}

/**
 * Audit Event Severity
 */
export enum AuditSeverity {
	INFO = "info",
	WARNING = "warning",
	ERROR = "error",
	CRITICAL = "critical",
}

/**
 * Audit Event Interface
 */
export interface AuditEvent {
	type: AuditEventType;
	severity: AuditSeverity;
	actor: {
		userId?: string;
		email?: string;
		ip?: string;
		userAgent?: string;
	};
	resource: {
		type: string; // "project", "app", "user", "license", etc.
		id?: string;
		name?: string;
	};
	action: string;
	metadata?: Record<string, any>;
	timestamp: Date;
}

/**
 * Audit Logger
 */
export class AuditLogger {
	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Log an audit event
	 */
	log(event: AuditEvent): void {
		const logLevel = this.getLogLevel(event.severity);

		// Ensure timestamp is a Date object
		const timestamp = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);

		this.logger[logLevel](
			{
				audit: true,
				event_type: event.type,
				severity: event.severity,
				actor: event.actor,
				resource: event.resource,
				action: event.action,
				metadata: event.metadata,
				timestamp: timestamp.toISOString(),
			},
			`Audit: ${event.action}`,
		);
	}

	/**
	 * Log authentication event
	 */
	logAuth(
		type: AuditEventType,
		userId: string | undefined,
		email: string | undefined,
		ip: string | undefined,
		userAgent: string | undefined,
		success: boolean,
		metadata?: Record<string, any>,
	): void {
		this.log({
			type,
			severity: success ? AuditSeverity.INFO : AuditSeverity.WARNING,
			actor: { userId, email, ip, userAgent },
			resource: { type: "auth", id: userId },
			action: type,
			metadata,
			timestamp: new Date(),
		});
	}

	/**
	 * Log resource creation
	 */
	logCreate(
		resourceType: string,
		resourceId: string,
		resourceName: string,
		actorUserId: string,
		actorEmail: string | undefined,
		ip: string | undefined,
		metadata?: Record<string, any>,
	): void {
		this.log({
			type: this.getEventType(`${resourceType}.created`),
			severity: AuditSeverity.INFO,
			actor: { userId: actorUserId, email: actorEmail, ip },
			resource: { type: resourceType, id: resourceId, name: resourceName },
			action: `Created ${resourceType}`,
			metadata,
			timestamp: new Date(),
		});
	}

	/**
	 * Log resource update
	 */
	logUpdate(
		resourceType: string,
		resourceId: string,
		resourceName: string,
		actorUserId: string,
		actorEmail: string | undefined,
		ip: string | undefined,
		changes: Record<string, any>,
		metadata?: Record<string, any>,
	): void {
		this.log({
			type: this.getEventType(`${resourceType}.updated`),
			severity: AuditSeverity.INFO,
			actor: { userId: actorUserId, email: actorEmail, ip },
			resource: { type: resourceType, id: resourceId, name: resourceName },
			action: `Updated ${resourceType}`,
			metadata: { ...metadata, changes },
			timestamp: new Date(),
		});
	}

	/**
	 * Log resource deletion
	 */
	logDelete(
		resourceType: string,
		resourceId: string,
		resourceName: string,
		actorUserId: string,
		actorEmail: string | undefined,
		ip: string | undefined,
		metadata?: Record<string, any>,
	): void {
		this.log({
			type: this.getEventType(`${resourceType}.deleted`),
			severity: AuditSeverity.WARNING,
			actor: { userId: actorUserId, email: actorEmail, ip },
			resource: { type: resourceType, id: resourceId, name: resourceName },
			action: `Deleted ${resourceType}`,
			metadata,
			timestamp: new Date(),
		});
	}

	/**
	 * Log security event
	 */
	logSecurity(
		type: AuditEventType,
		severity: AuditSeverity,
		action: string,
		userId: string | undefined,
		ip: string | undefined,
		metadata?: Record<string, any>,
	): void {
		this.log({
			type,
			severity,
			actor: { userId, ip },
			resource: { type: "security" },
			action,
			metadata,
			timestamp: new Date(),
		});
	}

	/**
	 * Get log level from severity
	 */
	private getLogLevel(severity: AuditSeverity): "info" | "warn" | "error" | "fatal" {
		switch (severity) {
			case AuditSeverity.INFO:
				return "info";
			case AuditSeverity.WARNING:
				return "warn";
			case AuditSeverity.ERROR:
				return "error";
			case AuditSeverity.CRITICAL:
				return "fatal";
			default:
				return "info";
		}
	}

	/**
	 * Get event type from string
	 */
	private getEventType(type: string): AuditEventType {
		// Try to match to enum, fallback to generic
		const enumValue = Object.values(AuditEventType).find((v) => v === type);
		return enumValue || AuditEventType.USER_UPDATED;
	}
}

/**
 * Create audit logger instance
 */
export function createAuditLogger(logger: Logger): AuditLogger {
	return new AuditLogger(logger);
}

import { createLogger } from "@nube-auth/shared";

export const log = createLogger("admin-apps-routes");

export function presentDescription(value: string | null | undefined): string | undefined {
	return value ?? undefined;
}

export function maskedSecret(enc: string | null | undefined): string {
	return enc ? "••••••••" : "";
}

export function appSettingsResponse(
	app: {
		public_id: string;
		name: string;
		slug: string;
		description: string | null;
		redirect_uris: string[];
		allowed_hosts: string[];
		cors_origins: string[];
		client_secret_enc: string;
		service_token_enc: string | null;
		session_ttl_days: number;
		enabled_providers: string[];
		licensing_required: boolean;
		created_at: Date;
		updated_at: Date;
	},
	projectPublicId: string,
	extras?: Record<string, unknown>,
) {
	return {
		id: app.public_id,
		projectId: projectPublicId,
		name: app.name,
		slug: app.slug,
		description: presentDescription(app.description),
		redirectUris: app.redirect_uris,
		allowedHosts: app.allowed_hosts,
		corsOrigins: app.cors_origins,
		clientSecret: maskedSecret(app.client_secret_enc),
		serviceToken: maskedSecret(app.service_token_enc),
		sessionTtlDays: app.session_ttl_days,
		enabledProviders: app.enabled_providers,
		requiresLicensing: app.licensing_required,
		createdAt: new Date(app.created_at).toISOString(),
		updatedAt: new Date(app.updated_at).toISOString(),
		...extras,
	};
}

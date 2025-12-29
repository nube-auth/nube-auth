import type { Database } from "@proofa/db";
import { appQueries, projectQueries } from "@proofa/db";
import { decrypt, isEncrypted } from "@proofa/shared";

export interface OAuthCredentials {
	googleClientId?: string;
	googleClientSecret?: string;
	githubClientId?: string;
	githubClientSecret?: string;
	source: "proofa" | "project" | "app";
}

/**
 * Resolve OAuth credentials for an app following the inheritance chain:
 * app -> project -> proofa
 *
 * @param db Database instance
 * @param appId Internal app ID
 * @returns Resolved OAuth credentials with source information
 */
export async function resolveOAuthCredentials(
	db: Database,
	appId: number,
): Promise<OAuthCredentials> {
	// Get the app
	const app = await appQueries.findById(db, appId);
	if (!app) {
		throw new Error("App not found");
	}

	const inheritSource = app.oauth_inherit_source || "proofa";

	// If app-specific, return app credentials
	if (inheritSource === "app") {
		return {
			googleClientId: app.google_client_id || undefined,
			googleClientSecret: app.google_client_secret
				? isEncrypted(app.google_client_secret)
					? decrypt(app.google_client_secret)
					: app.google_client_secret
				: undefined,
			githubClientId: app.github_client_id || undefined,
			githubClientSecret: app.github_client_secret
				? isEncrypted(app.github_client_secret)
					? decrypt(app.github_client_secret)
					: app.github_client_secret
				: undefined,
			source: "app",
		};
	}

	// If project-level, get project credentials
	if (inheritSource === "project") {
		const project = await projectQueries.findById(db, app.project_id);
		if (!project) {
			throw new Error("Project not found");
		}

		// If project has credentials, return them
		if (project.google_client_id || project.github_client_id) {
			return {
				googleClientId: project.google_client_id || undefined,
				googleClientSecret: project.google_client_secret
					? isEncrypted(project.google_client_secret)
						? decrypt(project.google_client_secret)
						: project.google_client_secret
					: undefined,
				githubClientId: project.github_client_id || undefined,
				githubClientSecret: project.github_client_secret
					? isEncrypted(project.github_client_secret)
						? decrypt(project.github_client_secret)
						: project.github_client_secret
					: undefined,
				source: "project",
			};
		}

		// If project doesn't have credentials, fall back to Proofa
	}

	// Default: Use Proofa credentials (from environment variables)
	return {
		googleClientId: process.env.GOOGLE_CLIENT_ID,
		googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
		githubClientId: process.env.GITHUB_CLIENT_ID,
		githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
		source: "proofa",
	};
}

/**
 * Resolve OAuth credentials by app public ID
 *
 * @param db Database instance
 * @param appPublicId Public app ID
 * @returns Resolved OAuth credentials with source information
 */
export async function resolveOAuthCredentialsByPublicId(
	db: Database,
	appPublicId: string,
): Promise<OAuthCredentials> {
	const app = await appQueries.findByPublicId(db, appPublicId);
	if (!app) {
		throw new Error("App not found");
	}

	return resolveOAuthCredentials(db, app.id);
}

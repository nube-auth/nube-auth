import { env } from "../config/env";

function buildCookieName(suffix: string): string {
	return env.COOKIE_NAMESPACE ? `nube_${env.COOKIE_NAMESPACE}_${suffix}` : `nube_${suffix}`;
}

export const USER_SESSION_COOKIE = buildCookieName("user_session");
export const ADMIN_SESSION_COOKIE = buildCookieName("admin_session");
export const CSRF_TOKEN_COOKIE = buildCookieName("csrf_token");
export const OAUTH_NONCE_COOKIE = buildCookieName("oauth_nonce");

// Back-compat cleanup for older deployments that used a single shared cookie name.
export const LEGACY_SESSION_COOKIE = "nube_session";

/**
 * CSRF token utilities for state-changing requests.
 * All POST/PUT/PATCH/DELETE requests must include the CSRF header.
 */

function getCsrfToken(): string | null {
	const namespace = (import.meta.env.VITE_COOKIE_NAMESPACE || "").trim();
	const cookieName = namespace ? `nube_${namespace}_csrf_token` : "nube_csrf_token";
	const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${cookieName}=`));

	return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : null;
}

/** Returns CSRF header object for use in pingpong/fetch calls. */
export function csrfHeaders(): Record<string, string> {
	const token = getCsrfToken();
	return (token ? { "X-Nube-CSRF-Token": token } : {}) as Record<string, string>;
}

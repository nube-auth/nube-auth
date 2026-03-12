/**
 * CSRF token utilities for state-changing requests.
 * All POST/PUT/PATCH/DELETE requests must include the CSRF header.
 */

function getCsrfToken(): string | null {
	const match = document.cookie.match(/nube_csrf_token=([^;]+)/);
	const token = match?.[1] ?? null;
	return token;
}

/** Returns CSRF header object for use in pingpong/fetch calls. */
export function csrfHeaders(): Record<string, string> {
	const token = getCsrfToken();
	return (token ? { "X-Nube-CSRF-Token": token } : {}) as Record<string, string>;
}

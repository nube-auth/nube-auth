/**
 * CSRF token utilities for state-changing requests.
 * All POST/PUT/PATCH/DELETE requests must include the CSRF header.
 */

function getCsrfToken(): string | null {
	const match = document.cookie.match(/proofa_csrf_token=([^;]+)/);
	return match?.[1] ?? null;
}

/** Returns CSRF header object for use in pingpong/fetch calls. */
export function csrfHeaders(): Record<string, string> {
	const token = getCsrfToken();
	return token ? { "X-Proofa-CSRF-Token": token } : {};
}

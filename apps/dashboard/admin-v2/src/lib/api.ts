import { pingpong } from "@proofa/auth";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3001";

// Helper to get CSRF token from cookie
function getCsrfToken(): string | null {
	const match = document.cookie.match(/proofa_csrf_token=([^;]+)/);
	return match?.[1] ? match[1] : null;
}

// Helper to make authenticated API calls
export async function fetchAPI<T>(
	path: string,
	options?: RequestInit,
): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	// Add any custom headers
	if (options?.headers) {
		const customHeaders = options.headers as Record<string, string>;
		Object.assign(headers, customHeaders);
	}

	// Add CSRF token for state-changing requests
	if (
		options?.method &&
		!["GET", "HEAD", "OPTIONS"].includes(options.method.toUpperCase())
	) {
		const csrfToken = getCsrfToken();
		if (csrfToken) {
			headers["X-CSRF-Token"] = csrfToken;
		}
	}

	const response = await pingpong(`${GATEWAY_URL}${path}`, {
		...options,
		headers,
	});

	if (!response.ok()) {
		const error = response.data || { message: response.statusText };
		throw new Error(error.message || "Request failed");
	}

	return response.data as T;
}

// Export gateway URL for direct use
export { GATEWAY_URL };

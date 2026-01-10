import pingpong from "@pingpong-js/fetch";

type PingpongRequestOptions = {
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
};

/**
 * Wrapper for @pingpong-js/fetch with simplified API
 * Uses v1.4.0+ features:
 * - response.data (auto-parsed JSON, no need for .json())
 * - Convenience methods (.get(), .post(), etc.)
 * - Type-safe responses
 */
export async function pingpongFetch(url: string, options: PingpongRequestOptions = {}) {
	const method = (options.method ?? "GET").toUpperCase();
	let body = options.body;
	
	// Handle URLSearchParams
	if (body instanceof URLSearchParams) {
		body = body.toString();
	}

	// Use convenience methods for better performance
	switch (method) {
		case "GET":
			return pingpong.get(url, options.headers ? { headers: options.headers } : {});
		case "POST":
			return pingpong.post(url, body, options.headers ? { headers: options.headers } : {});
		case "PUT":
			return pingpong.put(url, body, options.headers ? { headers: options.headers } : {});
		case "PATCH":
			return pingpong.patch(url, body, options.headers ? { headers: options.headers } : {});
		case "DELETE":
			return pingpong.delete(url, options.headers ? { headers: options.headers } : {});
		default:
			// Fallback for other methods (HEAD, OPTIONS)
			return pingpong.send({
				method: method as any,
				url,
				headers: options.headers || {},
				body: body as any,
			});
	}
}

// Export as default for backward compatibility
export { pingpongFetch as pingpong };

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
 * 
 * @version 1.0.2+ - Headers now properly forwarded in GET/DELETE methods
 */
export async function pingpongFetch(url: string, options: PingpongRequestOptions = {}) {
	const method = (options.method ?? "GET").toUpperCase();
	let body = options.body;
	
	// Handle URLSearchParams
	if (body instanceof URLSearchParams) {
		body = body.toString();
	}

	const requestOptions = options.headers ? { headers: options.headers } : {};

	// Use convenience methods for better performance and cleaner code
	switch (method) {
		case "GET":
			return pingpong.get(url, requestOptions);
		case "POST":
			return pingpong.post(url, body, requestOptions);
		case "PUT":
			return pingpong.put(url, body, requestOptions);
		case "PATCH":
			return pingpong.patch(url, body, requestOptions);
		case "DELETE":
			return pingpong.delete(url, requestOptions);
		case "HEAD":
			return pingpong.head(url, requestOptions);
		case "OPTIONS":
			return pingpong.options(url, requestOptions);
		default:
			// Fallback for any other methods
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

import pingpong from "@pingpong-js/fetch";

type PingpongRequestOptions = {
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
};

export async function pingpongFetch(url: string, options: PingpongRequestOptions = {}): Promise<any> {
	// @pingpong-js/fetch returns HttpResponse which has .ok(), .json(), .text() methods
	// Note: In @pingpong-js/fetch, .json() and .text() are synchronous, not async
	// But our adapters expect async methods, so we wrap them in promises

	// Convert body to string if it's URLSearchParams
	let body = options.body;
	if (body instanceof URLSearchParams) {
		body = body.toString();
	}

	const httpResponse = await pingpong.send({
		method: (options.method ?? "GET") as any,
		url,
		headers: options.headers || {},
		body: body as any,
	});

	// Return a Response-like object that our adapters can use
	// The HttpResponse from @pingpong-js/fetch:
	// - .ok() returns boolean
	// - .json() returns parsed JSON (synchronous)
	// - .text() returns text (synchronous)
	// - .status, .statusText, .headers are available
	return {
		ok: httpResponse.ok(),
		status: httpResponse.status,
		statusText: httpResponse.statusText,
		headers: httpResponse.headers,
		// Wrap synchronous methods in promises to match standard fetch API
		json: async () => Promise.resolve(httpResponse.json()),
		text: async () => Promise.resolve(httpResponse.text()),
	};
}

// Export as default for backward compatibility
export { pingpongFetch as pingpong };

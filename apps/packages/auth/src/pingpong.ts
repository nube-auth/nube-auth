import pingpong from "@pingpong-js/fetch";

type PingpongRequestOptions = {
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
};

export async function pingpongFetch(url: string, options: PingpongRequestOptions = {}) {
	let body = options.body;
	if (body instanceof URLSearchParams) {
		body = body.toString();
	}

	return pingpong.send({
		method: (options.method ?? "GET") as any,
		url,
		headers: options.headers || {},
		body: body as any,
	});
}

// Export as default for backward compatibility
export { pingpongFetch as pingpong };

import pingpongFetch from "@pingpong-js/fetch";

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
	if (!headers) return undefined;
	if (headers instanceof Headers) return Object.fromEntries(headers.entries());
	if (Array.isArray(headers)) return Object.fromEntries(headers);
	return headers;
}

export async function pingpong(url: string, options: RequestInit = {}): Promise<Response> {
	const response = await pingpongFetch.send({
		url,
		method: (options.method ?? "GET") as any,
		headers: normalizeHeaders(options.headers) ?? {},
		body: options.body as any,
		credentials: options.credentials as any,
	});

	const headers = new Headers(response.headers as any);
	return new Response(response.text(), {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

// Back-compat alias
export { pingpong as pingpongFetch };

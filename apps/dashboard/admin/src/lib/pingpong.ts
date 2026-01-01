import { HttpClient } from "pingpong-fetch";

const httpClient = new HttpClient();

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
	if (!headers) return undefined;
	if (headers instanceof Headers) return Object.fromEntries(headers.entries());
	if (Array.isArray(headers)) return Object.fromEntries(headers);
	return headers;
}

export async function pingpong(url: string, options: RequestInit = {}): Promise<Response> {
	const res = await httpClient.send({
		url,
		method: (options.method ?? "GET") as any,
		headers: normalizeHeaders(options.headers),
		body: options.body as any,
		credentials: options.credentials as any,
	} as any);

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: (res as any).headers,
	});
}

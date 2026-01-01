import { HttpClient } from "pingpong-fetch";

const httpClient = new HttpClient();

type PingpongRequestOptions = {
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
};

export async function pingpong(url: string, options: PingpongRequestOptions = {}): Promise<Response> {
	const res = await httpClient.send({
		url,
		method: (options.method ?? "GET") as any,
		headers: options.headers,
		body: options.body as any,
	} as any);

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: (res as any).headers,
	});
}

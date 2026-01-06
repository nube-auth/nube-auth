import { pingpong as pingpongFetch } from "@proofa/auth";

type PingpongRequestOptions = {
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
};

export function pingpong(url: string, options: PingpongRequestOptions = {}) {
	return pingpongFetch(url, {
		...(options.method ? { method: options.method } : {}),
		...(options.headers ? { headers: options.headers } : {}),
		...(options.body !== undefined ? { body: options.body } : {}),
	});
}

import { lookup as defaultLookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeOutboundUrlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UnsafeOutboundUrlError";
	}
}

type LookupFn = typeof defaultLookup;

export interface OutboundUrlOptions {
	allowInsecureHttp?: boolean;
	lookup?: LookupFn;
}

function ipv4Parts(address: string): number[] | null {
	const parts = address.split(".");
	if (parts.length !== 4) return null;
	const numbers = parts.map((part) => Number(part));
	if (numbers.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null;
	return numbers;
}

/** True for loopback, private, link-local, CGNAT, and unspecified addresses. */
export function isBlockedIp(address: string): boolean {
	const raw = address.toLowerCase().replace(/^\[|\]$/g, "");
	if (raw === "::1" || raw === "::") return true;
	if (raw.startsWith("fc") || raw.startsWith("fd") || raw.startsWith("fe80:")) return true;

	const mapped = raw.startsWith("::ffff:") ? raw.slice("::ffff:".length) : raw;
	const parts = ipv4Parts(mapped);
	if (!parts) return !raw.includes(":");
	const a = parts[0] ?? 0;
	const b = parts[1] ?? 0;
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a === 255) return true;
	return false;
}

function blockedHostname(hostname: string): boolean {
	const host = hostname
		.toLowerCase()
		.replace(/^\[|\]$/g, "")
		.replace(/\.$/, "");
	if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
		return true;
	}
	if (host === "metadata.google.internal" || host === "metadata.google.com") return true;
	if (/^\d+$/.test(host)) return true;
	return false;
}

export async function assertSafeOutboundUrl(raw: string, options: OutboundUrlOptions = {}): Promise<URL> {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new UnsafeOutboundUrlError("Webhook URL is invalid");
	}

	if (url.username || url.password) {
		throw new UnsafeOutboundUrlError("Webhook URL must not include credentials");
	}

	const https = url.protocol === "https:";
	const http = url.protocol === "http:" && options.allowInsecureHttp === true;
	if (!https && !http) {
		throw new UnsafeOutboundUrlError("Webhook URL must use HTTPS");
	}

	const hostname = url.hostname.replace(/^\[|\]$/g, "");
	if (blockedHostname(hostname) || (isIP(hostname) && isBlockedIp(hostname))) {
		throw new UnsafeOutboundUrlError("Webhook URL host is not allowed");
	}

	if (!isIP(hostname)) {
		const resolve = options.lookup ?? defaultLookup;
		let records: { address: string }[];
		try {
			records = await resolve(hostname, { all: true, verbatim: true });
		} catch {
			throw new UnsafeOutboundUrlError("Webhook URL host could not be resolved");
		}
		if (records.length === 0 || records.some((record) => isBlockedIp(record.address))) {
			throw new UnsafeOutboundUrlError("Webhook URL resolves to a blocked address");
		}
	}

	return url;
}

export async function postOutboundWebhook(
	url: string,
	init: { headers: Record<string, string>; body: string; timeoutMs: number; allowInsecureHttp?: boolean },
): Promise<Response> {
	await assertSafeOutboundUrl(url, init.allowInsecureHttp ? { allowInsecureHttp: true } : {});
	const response = await fetch(url, {
		method: "POST",
		headers: init.headers,
		body: init.body,
		redirect: "manual",
		signal: AbortSignal.timeout(init.timeoutMs),
	});
	if (response.status >= 300 && response.status < 400) {
		throw new UnsafeOutboundUrlError("Webhook redirects are not allowed");
	}
	return response;
}

import { lookup as defaultLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
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

function blockedIpv4(a: number, b: number): boolean {
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a === 255) return true;
	return false;
}

function ipv6Hextets(raw: string): string[] | null {
	const halves = raw.split("::");
	if (halves.length > 2) return null;
	const head = halves[0] ? halves[0].split(":").filter(Boolean) : [];
	const tail = halves.length === 2 && halves[1] ? halves[1].split(":").filter(Boolean) : [];
	if (halves.length === 1) return head.length === 8 ? head : null;
	const missing = 8 - head.length - tail.length;
	if (missing < 0) return null;
	return [...head, ...Array.from({ length: missing }, () => "0"), ...tail];
}

function blockedEmbeddedV4(hextets: string[], start: number): boolean {
	const value =
		((Number.parseInt(hextets[start] ?? "0", 16) << 16) | Number.parseInt(hextets[start + 1] ?? "0", 16)) >>> 0;
	return blockedIpv4((value >>> 24) & 255, (value >>> 16) & 255);
}

/** True for loopback, private, link-local, CGNAT, metadata, and embedded-private addresses. */
export function isBlockedIp(address: string): boolean {
	const raw = address.toLowerCase().replace(/^\[|\]$/g, "");
	if (!raw.includes(":")) {
		const parts = ipv4Parts(raw);
		if (!parts) return true;
		return blockedIpv4(parts[0] ?? 0, parts[1] ?? 0);
	}

	const mapped = raw.startsWith("::ffff:") ? raw.slice("::ffff:".length) : null;
	if (mapped && !mapped.includes(":")) {
		const parts = ipv4Parts(mapped);
		if (!parts) return true;
		return blockedIpv4(parts[0] ?? 0, parts[1] ?? 0);
	}

	const hextets = ipv6Hextets(raw);
	if (!hextets || hextets.length !== 8) return true;
	const values = hextets.map((part) => Number.parseInt(part, 16));
	if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 0xffff)) return true;
	if (values.every((value) => value === 0)) return true;
	if (values.slice(0, 7).every((value) => value === 0) && values[7] === 1) return true;
	const first = values[0] ?? 0;
	if ((first & 0xfe00) === 0xfc00) return true;
	if ((first & 0xffc0) === 0xfe80) return true;
	if ((first & 0xff00) === 0xff00) return true;
	if (hextets[0] === "2002") return blockedEmbeddedV4(hextets, 1);
	if (hextets[0] === "2001" && hextets[1] === "0") {
		const obscured =
			((Number.parseInt(hextets[6] ?? "0", 16) << 16) | Number.parseInt(hextets[7] ?? "0", 16)) >>> 0;
		const client = (obscured ^ 0xffffffff) >>> 0;
		return blockedIpv4((client >>> 24) & 255, (client >>> 16) & 255);
	}
	if (hextets[0] === "64" && hextets[1] === "ff9b" && values.slice(2, 6).every((value) => value === 0)) {
		return blockedEmbeddedV4(hextets, 6);
	}
	if (hextets[0] === "100" && values.slice(1, 4).every((value) => value === 0)) return true;
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

function pinnedWebhookRequest(
	url: URL,
	address: string,
	init: { headers: Record<string, string>; body: string; timeoutMs: number },
): Promise<Response> {
	const lib = url.protocol === "https:" ? https : http;
	const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
	return new Promise((resolve, reject) => {
		const req = lib.request(
			{
				host: address,
				servername: url.hostname,
				port,
				path: `${url.pathname}${url.search}`,
				method: "POST",
				headers: { ...init.headers, host: url.host },
			},
			(incoming) => {
				const chunks: Buffer[] = [];
				incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
				incoming.on("end", () => {
					const status = incoming.statusCode ?? 0;
					if (status >= 300 && status < 400) {
						reject(new UnsafeOutboundUrlError("Webhook redirects are not allowed"));
						return;
					}
					const headers = new Headers();
					for (const [name, value] of Object.entries(incoming.headers)) {
						if (typeof value === "string") headers.set(name, value);
						else if (Array.isArray(value)) headers.set(name, value.join(", "));
					}
					resolve(new Response(Buffer.concat(chunks), { status, headers }));
				});
			},
		);
		req.setTimeout(init.timeoutMs, () => req.destroy(new Error("Webhook delivery timed out")));
		req.on("error", reject);
		req.end(init.body);
	});
}

export async function postOutboundWebhook(
	url: string,
	init: { headers: Record<string, string>; body: string; timeoutMs: number; allowInsecureHttp?: boolean },
): Promise<Response> {
	let pinned: { address: string }[] = [];
	const safe = await assertSafeOutboundUrl(url, {
		...(init.allowInsecureHttp ? { allowInsecureHttp: true } : {}),
		lookup: (async (hostname: string) => {
			const records = await defaultLookup(hostname, { all: true, verbatim: true });
			pinned = records;
			return records;
		}) as unknown as LookupFn,
	});
	if (isIP(safe.hostname)) pinned = [{ address: safe.hostname }];
	const address = pinned.find((record) => !isBlockedIp(record.address))?.address;
	if (!address || pinned.some((record) => isBlockedIp(record.address))) {
		throw new UnsafeOutboundUrlError("Webhook URL resolves to a blocked address");
	}
	return pinnedWebhookRequest(safe, address, init);
}

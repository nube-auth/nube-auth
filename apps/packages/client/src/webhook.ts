/**
 * Webhook signature verification using the Web Crypto API.
 *
 * Works in Node.js 18+, Cloudflare Workers, Vercel Edge Functions, Deno,
 * and modern browsers — no Node-specific imports required.
 *
 * The comparison is performed inside `crypto.subtle.verify`, which is
 * required by spec to run in constant time, preventing timing attacks.
 */

function hexToBytes(hex: string): Uint8Array {
	if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

/** Extract a plain `ArrayBuffer` from a `Uint8Array` regardless of its backing buffer type. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export interface VerifyWebhookSignatureOptions {
	/**
	 * The raw request body exactly as received — before any JSON parsing.
	 * Parsing and re-serialising will change formatting and break the signature.
	 */
	rawBody: string | Uint8Array;
	/**
	 * Value of the `X-Nube-Signature` header, e.g. `"sha256=abc123..."`.
	 */
	signature: string;
	/**
	 * The signing secret shown once when the webhook endpoint was registered,
	 * or regenerated via "Rotate Secret".
	 */
	secret: string;
}

/**
 * Verify the HMAC-SHA256 signature on an incoming NubeAuth webhook delivery.
 *
 * @returns `true` when the signature is valid, `false` otherwise.
 * @throws if `crypto.subtle` is unavailable (Node.js < 18 without polyfill).
 *
 * @example
 * ```ts
 * // Express (must use raw body parser — NOT express.json())
 * app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
 *   const valid = await verifyWebhookSignature({
 *     rawBody: req.body,          // Buffer from express.raw()
 *     signature: req.headers['x-nube-signature'] as string,
 *     secret: process.env.WEBHOOK_SECRET!,
 *   });
 *   if (!valid) return res.status(401).send('Invalid signature');
 *
 *   const event = JSON.parse(req.body.toString());
 *   // handle event ...
 *   res.sendStatus(200);
 * });
 *
 * // Next.js App Router / Edge Runtime
 * export async function POST(req: Request) {
 *   const rawBody = await req.text();
 *   const valid = await verifyWebhookSignature({
 *     rawBody,
 *     signature: req.headers.get('x-nube-signature') ?? '',
 *     secret: process.env.WEBHOOK_SECRET!,
 *   });
 *   if (!valid) return new Response('Invalid signature', { status: 401 });
 *
 *   const event = JSON.parse(rawBody);
 *   // handle event ...
 *   return new Response(null, { status: 200 });
 * }
 * ```
 */
export async function verifyWebhookSignature({
	rawBody,
	signature,
	secret,
}: VerifyWebhookSignatureOptions): Promise<boolean> {
	if (!signature) return false;

	// Strip the "sha256=" prefix
	const hex = signature.startsWith("sha256=") ? signature.slice(7) : signature;
	if (!/^[0-9a-f]+$/i.test(hex)) return false;

	let sigBytes: Uint8Array;
	try {
		sigBytes = hexToBytes(hex);
	} catch {
		return false;
	}

	const enc = new TextEncoder();
	const bodyEncoded = typeof rawBody === "string" ? enc.encode(rawBody) : rawBody;

	const key = await globalThis.crypto.subtle.importKey(
		"raw",
		toArrayBuffer(enc.encode(secret)),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);

	// crypto.subtle.verify runs in constant time — safe against timing attacks
	return globalThis.crypto.subtle.verify(
		"HMAC",
		key,
		toArrayBuffer(sigBytes),
		toArrayBuffer(typeof rawBody === "string" ? bodyEncoded : new Uint8Array(bodyEncoded)),
	);
}

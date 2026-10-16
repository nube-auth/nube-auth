import { resolveAllowedOrigin } from "@nube-auth/shared";
import { assertSafeOutboundUrl, isBlockedIp, UnsafeOutboundUrlError } from "@nube-auth/shared/outbound-url";
import { describe, expect, it } from "vitest";
import { adminResourceFromPath } from "../middleware/admin-access.js";

describe("resolveAllowedOrigin", () => {
	const base = {
		serviceHostname: "s-api.nubeauth.com",
		explicitOrigins: ["https://admin.nubeauth.com"],
		allowLocalhost: false,
	};

	it("rejects an unrelated registrable domain", () => {
		expect(resolveAllowedOrigin({ ...base, origin: "https://evil.com" })).toBeNull();
	});

	it("allows one subdomain of the service domain", () => {
		expect(resolveAllowedOrigin({ ...base, origin: "https://dashboard.nubeauth.com" })).toBe(
			"https://dashboard.nubeauth.com",
		);
	});

	it("rejects a nested subdomain", () => {
		expect(resolveAllowedOrigin({ ...base, origin: "https://evil.dashboard.nubeauth.com" })).toBeNull();
	});

	it("rejects localhost outside development", () => {
		expect(resolveAllowedOrigin({ ...base, origin: "http://localhost:5173" })).toBeNull();
	});

	it("allows localhost in development", () => {
		expect(resolveAllowedOrigin({ ...base, origin: "http://localhost:5173", allowLocalhost: true })).toBe(
			"http://localhost:5173",
		);
	});
});

describe("outbound webhook URLs", () => {
	it("blocks loopback, private, and metadata addresses", () => {
		expect(isBlockedIp("127.0.0.1")).toBe(true);
		expect(isBlockedIp("10.1.2.3")).toBe(true);
		expect(isBlockedIp("169.254.169.254")).toBe(true);
		expect(isBlockedIp("8.8.8.8")).toBe(false);
	});

	it("rejects private literal URLs and insecure production URLs", async () => {
		await expect(assertSafeOutboundUrl("https://127.0.0.1/hook")).rejects.toBeInstanceOf(UnsafeOutboundUrlError);
		await expect(assertSafeOutboundUrl("http://example.com/hook")).rejects.toBeInstanceOf(UnsafeOutboundUrlError);
	});

	it("rejects a hostname that resolves to a private address", async () => {
		await expect(
			assertSafeOutboundUrl("https://hooks.example.com/hook", {
				lookup: async () => [{ address: "127.0.0.1", family: 4 }],
			}),
		).rejects.toBeInstanceOf(UnsafeOutboundUrlError);
	});

	it("accepts a hostname that resolves to a public address", async () => {
		const url = await assertSafeOutboundUrl("https://hooks.example.com/hook", {
			lookup: async () => [{ address: "8.8.8.8", family: 4 }],
		});
		expect(url.hostname).toBe("hooks.example.com");
	});
});

describe("adminResourceFromPath", () => {
	it("reads project and app public ids", () => {
		expect(adminResourceFromPath("/v1/admin/projects/PRJ0ABCDEFGHJ/apps/APP0ABCDEFGHJ/plans")).toEqual({
			projectPublicId: "PRJ0ABCDEFGHJ",
			appPublicId: "APP0ABCDEFGHJ",
			routingAppInternalId: null,
		});
	});

	it("reads a numeric routing-rule app id", () => {
		expect(adminResourceFromPath("/v1/admin/routing-rules/42")).toMatchObject({
			routingAppInternalId: 42,
		});
	});

	it("ignores collection routes", () => {
		expect(adminResourceFromPath("/v1/admin/projects")).toEqual({
			projectPublicId: null,
			appPublicId: null,
			routingAppInternalId: null,
		});
	});
});

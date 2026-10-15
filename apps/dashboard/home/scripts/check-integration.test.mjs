import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function read(relativePath) {
	return readFileSync(new URL(relativePath, root), "utf8");
}

test("landing actions open the admin console", () => {
	for (const file of ["src/components/Nav.astro", "src/sections/Hero.astro", "src/sections/CTA.astro"]) {
		const source = read(file);
		assert.match(source, /config\.adminLoginUrl/);
		assert.doesNotMatch(source, /href="\/(?:login|signup)"/);
	}
});

test("pricing and support are real pages", () => {
	assert.equal(existsSync(new URL("src/pages/pricing.astro", root)), true);
	assert.equal(existsSync(new URL("src/pages/support.astro", root)), true);
	assert.match(read("src/components/Footer.astro"), /href="\/pricing"/);
	assert.match(read("src/components/Footer.astro"), /href="\/support"/);
});

test("home config exposes every connected surface", () => {
	const source = read("src/config.ts");
	for (const key of ["siteUrl", "docsUrl", "adminUrl", "userUrl", "adminLoginUrl", "userLoginUrl", "gatewayUrl"]) {
		assert.match(source, new RegExp(key));
	}
	assert.match(source, /nube-hosts/);
	assert.doesNotMatch(source, /https:\/\/manage\.nubeauth\.com/);
});

test("hosts follow the domain variable", async () => {
	const { nubeHosts, rewriteHosts } = await import("../../../../scripts/nube-hosts.mjs");
	const staging = nubeHosts("nubeauth.com", "staging");
	assert.equal(staging.site, "https://s-home.nubeauth.com");
	assert.equal(staging.admin, "https://s-manage.nubeauth.com");
	assert.equal(staging.user, "https://s-me.nubeauth.com");
	assert.equal(staging.docs, "https://s-docs.nubeauth.com");
	assert.equal(staging.gateway, "https://s-api.nubeauth.com");

	const production = nubeHosts("example.com", "production");
	assert.equal(production.site, "https://www.example.com");
	assert.equal(production.admin, "https://manage.example.com");
	assert.equal(production.user, "https://me.example.com");
	assert.equal(production.docs, "https://docs.example.com");
	assert.equal(production.gateway, "https://api.example.com");

	const rewritten = rewriteHosts("See https://manage.nubeauth.com and https://api.nubeauth.com", staging);
	assert.match(rewritten, /https:\/\/s-manage\.nubeauth\.com/);
	assert.match(rewritten, /https:\/\/s-api\.nubeauth\.com/);
	assert.doesNotMatch(rewritten, /https:\/\/manage\.nubeauth\.com/);
});

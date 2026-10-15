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
});

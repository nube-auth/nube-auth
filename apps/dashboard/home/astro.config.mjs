import { defineConfig } from "astro/config";
import { nubeHosts } from "../../../scripts/nube-hosts.mjs";

const hosts = nubeHosts(
	process.env.PUBLIC_NUBE_DOMAIN || process.env.NUBE_DOMAIN,
	process.env.PUBLIC_NUBE_ENV || process.env.NUBE_ENV || "production",
);

// https://astro.build/config
export default defineConfig({
	site: process.env.PUBLIC_SITE_URL || hosts.site,
	output: "static",
	server: {
		port: 4321,
	},
});

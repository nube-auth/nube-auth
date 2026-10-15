import { buildArgs, nubeHosts } from "./nube-hosts.mjs";

const domain = process.env.NUBE_DOMAIN;
const env = process.env.NUBE_ENV || "production";
const hosts = nubeHosts(domain, env);

if (process.argv.includes("--json")) {
	console.log(JSON.stringify(hosts, null, 2));
} else {
	process.stdout.write(`${buildArgs(hosts)}\n`);
}

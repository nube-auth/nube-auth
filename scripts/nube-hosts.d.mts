export const DEFAULT_DOMAIN: string;

export function normalizeDomain(domain?: string): string;

export interface NubeHosts {
	domain: string;
	env: "staging" | "production";
	envTag: string;
	site: string;
	admin: string;
	user: string;
	docs: string;
	gateway: string;
}

export function nubeHosts(domain?: string, env?: string): NubeHosts;
export function rewriteHosts(source: string, hosts: NubeHosts): string;
export function buildArgs(hosts: NubeHosts): string;

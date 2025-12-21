/**
 * Maps hostnames to application IDs
 * Used for multi-tenant app resolution
 */

export interface AppHostMapping {
	[hostname: string]: string;
}

const appHostMap: AppHostMapping = {
	localhost: 'local',
	'app1.localhost': 'app1',
	'app2.localhost': 'app2',
	// Add production mappings here
	// 'dashboard.proofa.io': 'main-app',
	// 'app.proofa.io': 'main-app',
};

/**
 * Get app ID from hostname
 */
export function getAppIdFromHost(hostname: string): string | null {
	const host = hostname.split(':')[0]; // Remove port
	return appHostMap[host] || null;
}

/**
 * Add a new hostname mapping
 */
export function addAppHostMapping(hostname: string, appId: string): void {
	appHostMap[hostname] = appId;
}

/**
 * Get all app host mappings
 */
export function getAllAppHostMappings(): AppHostMapping {
	return { ...appHostMap };
}

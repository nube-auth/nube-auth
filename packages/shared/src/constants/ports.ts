/**
 * Centralized port configuration
 * All service ports should be defined here for consistency
 */

/** Default development ports for services */
export const DEFAULT_PORTS = {
  /** Core API service */
  CORE: 3001,
  /** Gateway service */
  GATEWAY: 3004,
  /** User dashboard (Vite dev server) */
  DASHBOARD_USER: 3000,
  /** Admin dashboard (Vite dev server) */
  DASHBOARD_ADMIN: 3002,
  /** Home/marketing site (Astro) */
  HOME: 4321,
} as const;

/** Default development ports for infrastructure */
export const INFRA_PORTS = {
  /** Redis */
  REDIS: 6379,
  /** Redis REST API (serverless-redis-http) */
  REDIS_REST: 8079,
  /** LibSQL database */
  LIBSQL: 8080,
  /** Redis Commander UI */
  REDIS_COMMANDER: 8081,
  /** Mailpit SMTP */
  MAILPIT_SMTP: 1025,
  /** Mailpit Web UI */
  MAILPIT_WEB: 8025,
} as const;

/**
 * Get port from environment variable with fallback
 */
export function getPort(envVar: string, defaultPort: number): number {
  const envValue = process.env[envVar];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
      return parsed;
    }
    console.warn(`Invalid port in ${envVar}: ${envValue}, using default ${defaultPort}`);
  }
  return defaultPort;
}

/**
 * Service port getters with environment override support
 */
export const ports = {
  core: () => getPort('CORE_PORT', DEFAULT_PORTS.CORE),
  gateway: () => getPort('GATEWAY_PORT', DEFAULT_PORTS.GATEWAY),
  dashboardUser: () => getPort('DASHBOARD_USER_PORT', DEFAULT_PORTS.DASHBOARD_USER),
  dashboardAdmin: () => getPort('DASHBOARD_ADMIN_PORT', DEFAULT_PORTS.DASHBOARD_ADMIN),
  home: () => getPort('HOME_PORT', DEFAULT_PORTS.HOME),
  redis: () => getPort('REDIS_PORT', INFRA_PORTS.REDIS),
  redisRest: () => getPort('REDIS_REST_PORT', INFRA_PORTS.REDIS_REST),
  libsql: () => getPort('LIBSQL_PORT', INFRA_PORTS.LIBSQL),
} as const;

/**
 * Build a URL for a service
 */
export function getServiceUrl(
  service: keyof typeof DEFAULT_PORTS,
  options: { protocol?: 'http' | 'https'; host?: string } = {}
): string {
  const { protocol = 'http', host = 'localhost' } = options;
  const port = ports[service.toLowerCase() as keyof typeof ports]?.() ?? DEFAULT_PORTS[service];
  return `${protocol}://${host}:${port}`;
}

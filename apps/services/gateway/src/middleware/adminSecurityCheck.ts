import { createLogger, serializeError } from "@nube-auth/shared";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { env } from "../config/env";

const log = createLogger("admin-security");

/**
 * Additional security checks for admin routes
 * Prevents automated attacks and requires proper browser context
 */
export const adminSecurityCheck = createMiddleware(async (c: Context, next: Next) => {
	try {
		const method = c.req.method;

		// Only apply to state-changing operations
		if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
			return next();
		}

		// Check if authenticated as admin
		const isAuthenticated = c.get("isAuthenticated");
		const audience = c.get("audience");

		if (!isAuthenticated || audience !== "admin") {
			return next(); // Will be caught by auth middleware
		}

		// Get request headers
		const origin = c.req.header("origin");
		const referer = c.req.header("referer");
		const userAgent = c.req.header("user-agent") || "";

		// 1. Require Origin or Referer header (prevents simple curl/postman without headers)
		if (!origin && !referer) {
			log.warn(
				{
					userId: c.get("userId"),
					method,
					path: c.req.path,
					userAgent,
				},
				"Admin request blocked - missing Origin and Referer headers",
			);
			return c.json(
				{
					error: "Forbidden",
					message: "Admin operations require proper browser context",
				},
				403,
			);
		}

		// 2. Validate Origin/Referer matches expected admin domains
		const allowedDomains = [
			"http://localhost:5174", // Local admin dashboard
			env.ADMIN_DASHBOARD_URL, // Configured admin dashboard URL (staging/production)
		].filter(Boolean);

		const requestOrigin = origin || referer || "";
		const isValidOrigin = allowedDomains.some((domain) => requestOrigin.startsWith(domain));

		if (!isValidOrigin) {
			log.warn(
				{
					userId: c.get("userId"),
					method,
					path: c.req.path,
					origin: requestOrigin,
					userAgent,
				},
				"Admin request blocked - invalid origin",
			);
			return c.json(
				{
					error: "Forbidden",
					message: "Request origin not allowed for admin operations",
				},
				403,
			);
		}

		// 3. Detect automation tools (basic detection)
		const lowerUA = userAgent.toLowerCase();
		const automationTools = ["postman", "insomnia", "curl", "wget", "python-requests", "axios", "fetch"];
		const isAutomationTool = automationTools.some((tool) => lowerUA.includes(tool));

		if (isAutomationTool) {
			log.warn(
				{
					userId: c.get("userId"),
					method,
					path: c.req.path,
					userAgent,
				},
				"Admin request blocked - automation tool detected",
			);
			return c.json(
				{
					error: "Forbidden",
					message: "Admin operations must be performed through the web interface",
				},
				403,
			);
		}

		// 4. Require standard browser User-Agent
		const hasBrowserUA =
			lowerUA.includes("mozilla") ||
			lowerUA.includes("chrome") ||
			lowerUA.includes("safari") ||
			lowerUA.includes("firefox") ||
			lowerUA.includes("edge");

		if (!hasBrowserUA) {
			log.warn(
				{
					userId: c.get("userId"),
					method,
					path: c.req.path,
					userAgent,
				},
				"Admin request blocked - non-browser User-Agent",
			);
			return c.json(
				{
					error: "Forbidden",
					message: "Admin operations require a standard web browser",
				},
				403,
			);
		}

		// All checks passed
		await next();
	} catch (error) {
		log.error({ err: serializeError(error as Error) }, "Admin security check error");
		return c.json({ error: "Internal server error" }, 500);
	}
});

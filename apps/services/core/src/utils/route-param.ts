import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Read a path parameter as a string.
 * Hono 4.13 types `c.req.param()` as `string | undefined` on routers whose
 * path generic does not include the key (mounted sub-routers). A matched
 * route always has the value; a missing one is a bad request.
 */
export function requiredParam(c: Context, name: string): string {
	const value = c.req.param(name);
	if (!value) {
		throw new HTTPException(400, { message: `Missing route parameter: ${name}` });
	}
	return value;
}

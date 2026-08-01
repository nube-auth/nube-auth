/**
 * Provider Selection Service
 *
 * Dynamically selects payment provider based on routing rules and context.
 * Supports:
 * - Rule-based routing (country, currency, amount, etc.)
 * - Priority evaluation (lowest priority number = highest precedence)
 * - A/B testing (traffic_percentage)
 * - Catch-all fallback (empty conditions)
 */

import { getDb, paymentProviderConfigQueries, routingRuleQueries } from "@nube-auth/db";
import { createLogger, serializeError } from "@nube-auth/shared";

const log = createLogger("provider-selector");

/**
 * Context for provider selection
 * Used to match against routing rule conditions
 */
export interface SelectionContext {
	country?: string | undefined; // User's country code (US, GB, JP, etc.)
	currency?: string | undefined; // Plan currency (usd, eur, jpy, etc.)
	amountCents?: number; // Transaction amount in cents
	paymentMethod?: string; // card, bank_transfer, wallet, etc.
	userSegment?: string; // free, pro, enterprise, etc.
	userId?: string; // For consistent A/B testing
	planSlug?: string; // Plan identifier (pro, premium, etc.)
}

/**
 * Select appropriate payment provider based on routing rules
 *
 * @param appId - Internal app ID
 * @param context - Selection context (country, currency, etc.)
 * @returns Payment provider config
 * @throws Error if no matching rule found
 */
export async function selectProvider(appId: number, context: SelectionContext) {
	const db = getDb();

	try {
		// Get active routing rules, ordered by priority (ascending)
		const rules = await routingRuleQueries.findActiveByAppId(db, appId);

		if (rules.length === 0) {
			throw new Error(`No routing rules configured for app ${appId}`);
		}

		log.debug(
			{
				appId,
				rulesCount: rules.length,
				context,
			},
			"Evaluating routing rules",
		);

		// Evaluate rules in priority order
		for (const rule of rules) {
			const conditions = rule.conditions as unknown as Record<string, any>;
			if (matchesConditions(context, conditions)) {
				if (shouldRouteTraffic(rule.traffic_percentage, context.userId)) {
					const provider = await paymentProviderConfigQueries.findByInternalId_(db, rule.provider_config_id);

					if (!provider) {
						log.warn(
							{
								ruleId: rule.id,
								providerConfigId: rule.provider_config_id,
							},
							"Provider config not found for matching rule",
						);
						continue; // Try next rule
					}

					log.info(
						{
							appId,
							ruleId: rule.id,
							ruleName: rule.name,
							rulePriority: rule.priority,
							provider: provider.provider,
							environment: provider.environment,
						},
						"Provider selected via routing rule",
					);

					return provider;
				} else {
					log.debug(
						{
							ruleId: rule.id,
							trafficPercentage: rule.traffic_percentage,
						},
						"Rule matched but traffic percentage excluded",
					);
				}
			}
		}

		// Should never reach here if rules include a catch-all (empty conditions)
		throw new Error(`No matching routing rule for app ${appId}. Context: ${JSON.stringify(context)}`);
	} catch (error) {
		log.error(
			{
				err: serializeError(error as Error),
				appId,
				context,
			},
			"Provider selection failed",
		);
		throw error;
	}
}

/**
 * Check if context matches rule conditions
 *
 * Supported matchers:
 * - eq: Exact equality
 * - in: Value in array
 * - gte: Greater than or equal
 * - lte: Less than or equal
 * - ne: Not equal
 *
 * Empty conditions = matches everything (catch-all)
 */
function matchesConditions(context: SelectionContext, conditions: Record<string, any>): boolean {
	// Empty conditions = catch-all rule (matches everything)
	if (!conditions || Object.keys(conditions).length === 0) {
		return true;
	}

	for (const [field, matcher] of Object.entries(conditions)) {
		const value = context[field as keyof SelectionContext];

		// Equality check
		if ((matcher as any).eq !== undefined && value !== (matcher as any).eq) {
			return false;
		}

		// In array check
		if ((matcher as any).in && Array.isArray((matcher as any).in)) {
			if (!(matcher as any).in.includes(value)) {
				return false;
			}
		}

		// Greater than or equal
		if ((matcher as any).gte !== undefined) {
			if (value === undefined || (value as any) < (matcher as any).gte) {
				return false;
			}
		}

		// Less than or equal
		if ((matcher as any).lte !== undefined) {
			if (value === undefined || (value as any) > (matcher as any).lte) {
				return false;
			}
		}

		// Not equal
		if ((matcher as any).ne !== undefined && value === (matcher as any).ne) {
			return false;
		}
	}

	return true;
}

/**
 * Determine if traffic should be routed based on percentage
 *
 * For A/B testing: Uses consistent hashing on userId
 * Without userId: Random distribution
 */
function shouldRouteTraffic(percentage: number, userId?: string): boolean {
	if (percentage === 100) return true;
	if (percentage === 0) return false;

	// Consistent hashing based on userId for A/B testing
	if (userId) {
		const hash = simpleHash(userId);
		return (hash % 100) < percentage;
	}

	// Random if no userId
	return Math.random() * 100 < percentage;
}

/**
 * Simple string hash function for consistent A/B testing
 */
function simpleHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

/**
 * Helper to create a default catch-all routing rule for an app
 * Used when app is created or first provider is configured
 */
export async function createDefaultRoutingRule(
	appId: number,
	providerConfigId: number,
	name = "Default Provider",
) {
	const db = getDb();

	const { createId } = await import("@nube-auth/shared");

	const rule = await routingRuleQueries.create(db, {
		public_id: createId("request"),
		app_id: appId,
		provider_config_id: providerConfigId,
		priority: 100, // Lowest priority = fallback
		conditions: {}, // Empty = catch-all
		name,
		is_active: true,
		traffic_percentage: 100,
	});

	log.info(
		{
			appId,
			ruleId: rule.id,
			providerConfigId,
		},
		"Created default routing rule",
	);

	return rule;
}

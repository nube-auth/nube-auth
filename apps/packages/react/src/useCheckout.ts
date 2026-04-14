import type { CheckoutSession, CreateCheckoutOptions, ValidatePromoResult } from "@nube-auth/client";
import { useMutation } from "@tanstack/react-query";
import { useNubeAuthContext } from "./ProofaProvider";

/**
 * Thrown by `checkout()` / `checkoutAsync()` when `promoCodeBehavior` is
 * `'strict'` and the promo code fails validation before checkout is initiated.
 *
 * `reason` is the machine-readable code from the server, e.g.:
 * `"code_exhausted"` | `"promotion_expired"` | `"plan_not_eligible"` |
 * `"already_redeemed"` | `"code_not_found"` | `"code_inactive"` | ...
 */
export class PromoCodeError extends Error {
	public readonly reason: string;
	constructor(reason: string) {
		super(`Promo code invalid: ${reason}`);
		this.name = "PromoCodeError";
		this.reason = reason;
	}
}

export interface UseCheckoutOptions {
	/**
	 * Promo code to automatically apply at checkout without requiring user input.
	 * Will be validated server-side and resolved to a provider coupon.
	 * The code must exist in Nube Auth with `max_uses` set (e.g. 100) and be synced
	 * to the payment provider before it can be applied.
	 */
	autoPromoCode?: string;
	/**
	 * Controls what happens when the promo code is invalid, exhausted, or not eligible.
	 *
	 * - `'skip'` (default): checkout proceeds without the discount. The server
	 *   already soft-skips invalid codes, so the user is never blocked.
	 * - `'strict'`: the promo code is validated client-side before checkout is
	 *   initiated. If invalid, a `PromoCodeError` is thrown (surfaces via
	 *   `checkoutError` / `onError`) and checkout is aborted.
	 */
	promoCodeBehavior?: "skip" | "strict";
	/**
	 * Called after a checkout session is successfully created.
	 * Use this to redirect: `window.location.href = session.checkoutUrl`
	 */
	onSuccess?: (session: CheckoutSession) => void;
	/**
	 * Called if checkout creation (or promo validation in strict mode) fails.
	 * In strict mode, the error will be a `PromoCodeError` when the code is invalid.
	 */
	onError?: (error: Error) => void;
}

export interface StartCheckoutOptions
	extends Omit<CreateCheckoutOptions, "promoCode"> {
	/**
	 * Override the auto promo code for this specific checkout call.
	 * If provided, takes precedence over the `autoPromoCode` from hook options.
	 */
	promoCode?: string;
}

export function useCheckout(hookOptions: UseCheckoutOptions = {}) {
	const { client } = useNubeAuthContext();

	const mutation = useMutation<CheckoutSession, Error, StartCheckoutOptions>({
		mutationFn: async (options: StartCheckoutOptions) => {
			const promoCode = options.promoCode ?? hookOptions.autoPromoCode;

			// In strict mode, validate the promo before initiating checkout.
			// Any invalid result aborts with a typed PromoCodeError.
			if (promoCode !== undefined && hookOptions.promoCodeBehavior === "strict") {
				const result = await client.payment.validatePromoCode({
					code: promoCode,
					priceId: options.priceId,
					...(options.appId !== undefined && { appId: options.appId }),
				});
				if (!result.valid) {
					throw new PromoCodeError(result.reason);
				}
			}

			return client.payment.createCheckout({
				...options,
				...(promoCode !== undefined && { promoCode }),
			});
		},
		...(hookOptions.onSuccess !== undefined && { onSuccess: hookOptions.onSuccess }),
		...(hookOptions.onError !== undefined && { onError: hookOptions.onError }),
	});

	const validatePromoMutation = useMutation<
		ValidatePromoResult,
		Error,
		{ code: string; priceId: string; appId?: string }
	>({
		mutationFn: ({ code, priceId, appId }) =>
			client.payment.validatePromoCode({ code, priceId, ...(appId !== undefined && { appId }) }),
	});

	return {
		/**
		 * Start a checkout session. On success, redirect the user:
		 * ```ts
		 * checkout({ priceId, userId, customerEmail, successUrl, cancelUrl })
		 * ```
		 * The `autoPromoCode` from hook options is applied automatically.
		 */
		checkout: mutation.mutate,
		checkoutAsync: mutation.mutateAsync,
		isLoading: mutation.isPending,
		checkoutError: mutation.error,
		session: mutation.data,

		/**
		 * Validate a promo code before checkout to show a live discount preview.
		 * Safe to call from the browser.
		 */
		validatePromo: validatePromoMutation.mutate,
		validatePromoAsync: validatePromoMutation.mutateAsync,
		isValidating: validatePromoMutation.isPending,
		promoResult: validatePromoMutation.data,
		promoError: validatePromoMutation.error,

		reset: mutation.reset,
	};
}

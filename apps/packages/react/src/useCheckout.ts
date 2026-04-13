import type { CheckoutSession, CreateCheckoutOptions, ValidatePromoResult } from "@nube-auth/client";
import { useMutation } from "@tanstack/react-query";
import { useNubeAuthContext } from "./ProofaProvider";

export interface UseCheckoutOptions {
	/**
	 * Promo code to automatically apply at checkout without requiring user input.
	 * Will be validated server-side and resolved to a provider coupon.
	 * The code must exist in Nube Auth with `max_uses` set (e.g. 100) and be synced
	 * to the payment provider before it can be applied.
	 */
	autoPromoCode?: string;
	/**
	 * Called after a checkout session is successfully created.
	 * Use this to redirect: `window.location.href = session.checkoutUrl`
	 */
	onSuccess?: (session: CheckoutSession) => void;
	/**
	 * Called if checkout creation fails.
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
		mutationFn: (options: StartCheckoutOptions) => {
			const promoCode = options.promoCode ?? hookOptions.autoPromoCode;
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

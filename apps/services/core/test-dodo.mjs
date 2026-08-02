/**
 * Test Dodo API Credentials
 *
 * Run with: cd /Users/devendrapratapsingh/personal/nube-auth && node --no-warnings --loader ./node_modules/.pnpm/@esbuild-kit+esm-loader@2.6.5/node_modules/@esbuild-kit/esm-loader/loader.js scripts/test-dodo-api.mjs
 * Or simpler: cd apps/services/core && node ../../../scripts/test-dodo-api.mjs
 */

// @ts-check
import DodoPayments from "dodopayments";

const credentials = {
	apiKey: "SJbRCRK9NU_2BfgG.2HmMDvrYp6olSLOTJxJUd3icH_xifTAXz0DL9woJyx8qhZCb",
	webhookSecret: "whsec_dLhaGq0WxXUmpcnHaY4+GnCgk5/D3dzW",
	environment: "test_mode", // Important: must be 'test_mode' or 'live_mode'
};

console.log("=== Testing Dodo API Credentials ===\n");
console.log("API Key:", `${credentials.apiKey.substring(0, 25)}...`);
console.log("Environment:", credentials.environment);
console.log("Webhook Secret:", `${credentials.webhookSecret.substring(0, 15)}...`);
console.log("\n");

const client = new DodoPayments({
	bearerToken: credentials.apiKey,
	environment: credentials.environment, // 'test_mode' or 'live_mode'
});

console.log("Creating Dodo client...");
console.log("Client created successfully\n");

async function testDodoAPI() {
	try {
		// Test 1: List products (simple read operation)
		console.log("Test 1: List Products");
		console.log("-------------------");
		try {
			const products = await client.products.list();
			console.log("✅ SUCCESS: Products listed");
			console.log(`   Found ${products.length || 0} products`);
			if (products.length > 0) {
				console.log(`   First product: ${products[0].product_id} - ${products[0].name}`);
			}
		} catch (error) {
			console.log("❌ FAILED: Could not list products");
			console.log(`   Error message: ${error.message}`);
			console.log(`   Error name: ${error.name}`);
			if (error.status) console.log(`   Status: ${error.status}`);
			if (error.statusCode) console.log(`   Status code: ${error.statusCode}`);
			if (error.body) console.log(`   Body: ${JSON.stringify(error.body)}`);
			if (error.response) console.log(`   Response: ${JSON.stringify(error.response)}`);

			console.log("\n   Full error object:");
			console.dir(error, { depth: 3 });

			if (error.status === 401 || error.statusCode === 401) {
				console.log("\n   💡 Troubleshooting:");
				console.log("   → Your API key might be invalid or expired");
				console.log("   → Check you are using a Test Mode API key (not Live Mode)");
				console.log("   → Verify the key in your Dodo dashboard");
			}
			throw error;
		}
		console.log("\n");

		// Test 2: Create a test product
		console.log("Test 2: Create Test Product");
		console.log("----------------------------");
		try {
			const testProduct = await client.products.create({
				name: "Test Plan - Nube Auth",
				description: "Test product for Nube Auth integration",
				price: {
					currency: "USD",
					discount: 0,
					price: 2900, // $29.00
					purchasing_power_parity: false,
					type: "recurring_price",
					payment_frequency_count: 1,
					payment_frequency_interval: "Month",
					subscription_period_count: 1,
					subscription_period_interval: "Month",
				},
				tax_category: "saas",
			});
			console.log("✅ SUCCESS: Product created");
			console.log(`   Product ID: ${testProduct.product_id}`);
			console.log(`   Name: ${testProduct.name}`);
			console.log(`   Price: $${testProduct.price.price / 100}`);
			console.log("\n");

			// Test 3: Create checkout session with the product
			console.log("Test 3: Create Checkout Session");
			console.log("--------------------------------");
			try {
				const checkoutSession = await client.checkoutSessions.create({
					product_cart: [
						{
							product_id: testProduct.product_id,
							quantity: 1,
						},
					],
					customer: {
						email: "test@example.com",
					},
					return_url: "https://example.com/success",
					metadata: {
						test: "true",
					},
				});
				console.log("✅ SUCCESS: Checkout session created");
				console.log(`   Session ID: ${checkoutSession.session_id}`);
				console.log(`   Checkout URL: ${checkoutSession.checkout_url}`);
				console.log("\n");
			} catch (error) {
				console.log("❌ FAILED: Could not create checkout session");
				console.log(`   Error: ${error.message}`);
				console.log(`   Status: ${error.status || error.statusCode || "unknown"}`);
				throw error;
			}

			// Clean up: Delete the test product
			console.log("Cleanup: Deleting test product...");
			try {
				await client.products.delete(testProduct.product_id);
				console.log("✅ Test product deleted");
			} catch (_cleanupError) {
				console.log("⚠️  Could not delete test product (this is okay)");
			}
		} catch (error) {
			console.log("❌ FAILED: Could not create product");
			console.log(`   Error: ${error.message}`);
			console.log(`   Status: ${error.status || error.statusCode || "unknown"}`);
			throw error;
		}

		console.log("\n=== All Tests Passed! ===");
		console.log("Your Dodo credentials are working correctly.\n");
	} catch (error) {
		console.log("\n=== Tests Failed ===");
		console.log("Please check:");
		console.log("1. Your API key is correct and not expired");
		console.log("2. You are using the correct environment (test_mode vs live_mode)");
		console.log("3. Your Dodo account has API access enabled");
		console.log("\nFull error details:");
		console.error(error);
		process.exit(1);
	}
}

testDodoAPI();

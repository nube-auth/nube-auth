/**
 * Test script to manually enqueue a webhook and verify worker processing
 */
import { getQueue } from "@proofa/queue";

const webhookData = {
	provider: "dodo",
	rawBody: '{"data": {"tax": 50021, "status": "processing", "billing": {"city": "Delhi", "state": "Delhi", "street": "Delhi", "country": "IN", "zipcode": "560038"}, "refunds": [], "brand_id": "bus_0NVcwxZtEQGVlWXnDGCWw", "currency": "INR", "customer": {"name": "Devendra Pratap Singh", "email": "test+dodo+1772641644699@proofa.internal", "metadata": {}, "customer_id": "cus_0NZlyvXQV9HHcimSzur4a", "phone_number": null}, "disputes": [], "metadata": {"appId": "APP0TBBWFpJ8s", "planId": "PLN0bChf6zt4a", "userId": "USR00Dat71FYM", "testSession": "true"}, "card_type": "credit", "created_at": "2026-03-04T16:27:43.109298Z", "error_code": null, "invoice_id": "inv_0NZlyvXx1uY9lnmJaDg4Y", "payment_id": "pay_0NZlyvXe6uvhHzqUxAFbs", "updated_at": null, "business_id": "bus_0NVcwxZtEQGVlWXnDGCWw", "discount_id": null, "invoice_url": "https://test.dodopayments.com/invoices/payments/pay_0NZlyvXe6uvhHzqUxAFbs", "card_network": "visa", "payload_type": "Payment", "payment_link": "https://test.checkout.dodopayments.com/PApKgarY", "product_cart": null, "total_amount": 327913, "error_message": "{\\"message\\":\\"internal Server Error\\",\\"code\\":\\"internal_error\\",\\"type\\":\\"api_error\\"}\\n", "refund_status": null, "card_last_four": "4242", "payment_method": "card", "settlement_tax": 522, "subscription_id": "sub_0NZlyvXhuhabADPgoMK1D", "card_holder_name": "Devendra", "settlement_amount": 3422, "checkout_session_id": "cks_0NZlys229xu4J7lrYmxD1", "payment_method_type": null, "settlement_currency": "USD", "card_issuing_country": null, "custom_field_responses": null, "digital_products_delivered": false}, "type": "payment.processing", "timestamp": "2026-03-04T16:27:57.323494Z", "business_id": "bus_0NVcwxZtEQGVlWXnDGCWw"}',
	signature: '{"webhook-id":"msg_3AUKObc3p0ipdRcUHbErYwbjaql","webhook-signature":"v1,2+gJS1yvehcnPQuQg2ELtYeOBRHsXsGgs47IRdrcNbc=","webhook-timestamp":"1772641677"}',
	ipAddress: "unknown",
	webhookLogId: 7,
};

async function test() {
	console.log("🧪 Enqueuing test webhook (ID 7)...");
	
	const queue = getQueue<any>("billing");
	
	await queue.add("process-webhook", webhookData, {
		jobId: `test-webhook-manual-${Date.now()}`,
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 2000,
		},
	});
	
	console.log("✅ Webhook enqueued! Check worker logs and database...");
	console.log("\nTo monitor:");
	console.log('  psql "postgresql://proofa:proofa_dev_password@localhost:5432/proofa" -c "SELECT id, status, processing_started_at FROM webhook_logs WHERE id = 7"');
	
	process.exit(0);
}

test().catch((err) => {
	console.error("❌ Error:", err);
	process.exit(1);
});

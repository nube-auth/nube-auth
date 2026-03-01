/**
 * Payment Testing Playground
 * Admin-only page for testing payment flows without manual setup
 */

import { useState, useEffect } from "react";
import { pingpong } from "@proofa/auth/pingpong";
import config from "../config";
import { Select } from "../components/Select";
import { Heading, Text, Card, CardBody, Button, Alert } from "@proofa/components";

interface TestSession {
	sessionId: string;
	testData: {
		app: { id: string; name: string; publicId: string };
		user: { id: string; email: string; publicId: string };
		plan: { id: string; name: string; amount: number; interval: string };
	};
	checkoutUrl?: string;
	expiresAt: string;
}

interface SessionStatus {
	sessionId: string;
	status: string;
	provider: string;
	checkoutUrl?: string;
	testData: {
		app: { id: string; name: string; publicId: string } | null;
		user: { id: string; email: string; publicId: string } | null;
		plan: { id: string; name: string };
	};
	transactions: any[];
	license: {
		id: string;
		status: string;
		validUntil: string;
	} | null;
	webhookEvents: any[];
	expiresAt: string;
}

export default function PaymentTestingPlayground() {
	const [provider, setProvider] = useState<"stripe" | "lemonsqueezy" | "dodo">("stripe");
	const [mode, setMode] = useState<"simulate" | "live">("simulate");
	const [session, setSession] = useState<TestSession | null>(null);
	const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Auto-refresh session status every 2 seconds when session is active
	useEffect(() => {
		if (!session) return;

		const interval = setInterval(async () => {
			try {
				const response = await pingpong(`${config.coreUrl}/v1/admin/test/status/${session.sessionId}`, {
					method: "GET",
				});

				if (response.ok()) {
					setSessionStatus(response.data);
				}
			} catch (err) {
				console.error("Failed to fetch session status:", err);
			}
		}, 2000);

		return () => clearInterval(interval);
	}, [session]);

	const handleInitialize = async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await pingpong(`${config.coreUrl}/v1/admin/test/initialize`, {
				method: "POST",
				body: {
					provider,
					mode,
				},
			});

			if (response.ok()) {
				setSession(response.data);
				setSessionStatus(null);
			} else {
				setError(response.data?.error || "Failed to initialize test session");
			}
		} catch (err) {
			setError("Failed to initialize test session");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const handleSimulateEvent = async (eventType: string) => {
		if (!session) return;

		setLoading(true);
		setError(null);

		try {
			const response = await pingpong(`${config.coreUrl}/v1/admin/test/simulate-webhook`, {
				method: "POST",
				body: {
					sessionId: session.sessionId,
					eventType,
				},
			});

			if (response.ok()) {
				// Refresh session status immediately
				const statusResponse = await pingpong(`${config.coreUrl}/v1/admin/test/status/${session.sessionId}`, {
					method: "GET",
				});

				if (statusResponse.ok()) {
					setSessionStatus(statusResponse.data);
				}
			} else {
				setError(response.data?.error || "Failed to simulate webhook");
			}
		} catch (err) {
			setError("Failed to simulate webhook");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const handleCleanup = async () => {
		if (!session) return;

		try {
			await pingpong(`${config.coreUrl}/v1/admin/test/cleanup?sessionId=${session.sessionId}`, {
				method: "DELETE",
			});

			setSession(null);
			setSessionStatus(null);
		} catch (err) {
			console.error("Failed to cleanup:", err);
		}
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{/* Header */}
			<div className="mb-8">
				<Heading level={1} size="lg">Payment Testing Playground</Heading>
				<Text className="mt-2 text-text-secondary">
					Test payment flows for all providers without manual setup
				</Text>
				<div className="flex items-center">
					<Text className="text-2xl mr-3">⚠️</Text>
					<div>
						<Text className="font-semibold text-orange-900">TEST MODE ONLY</Text>
						<Text className="text-sm text-orange-700">
							Using sandbox credentials. No real charges will be made.
						</Text>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left Column - Configuration */}
				<div className="space-y-6">
					{/* Provider Configuration */}
					<Card>
						<CardBody className="p-6">
							<Heading level={2} size="lg" className="mb-4">🔧 Provider Configuration</Heading>
							
							<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-text-primary mb-2">
									Provider
								</label>
								<Select
									value={provider}
									onChange={(value) => setProvider(value as "stripe" | "lemonsqueezy" | "dodo")}
									options={[
										{ value: "stripe", label: "Stripe" },
										{ value: "lemonsqueezy", label: "LemonSqueezy" },
										{ value: "dodo", label: "Dodo Payments" }
									]}
									disabled={!!session}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-text-primary mb-2">
									Mode
								</label>
								<Select
									value={mode}
									onChange={(value) => setMode(value as "simulate" | "live")}
									options={[
										{ value: "simulate", label: "Simulate (Instant)" },
										{ value: "live", label: "Live Checkout" }
									]}
									disabled={!!session}
								/>
<Text className="mt-1 text-xs text-text-tertiary">
										{mode === "simulate" 
											? "Instantly simulate webhook events without real payment provider" 
											: "Create real checkout session with provider sandbox"}
									</Text>
								</div>
							</div>
						</CardBody>
					</Card>

					{/* Quick Test Setup */}
					<Card>
						<CardBody className="p-6">
							<Heading level={2} size="lg" className="mb-4">⚡ Quick Test Setup</Heading>
							
							<Text className="text-sm text-text-secondary mb-4">
								Auto-creates test app, user, and session in one click
							</Text>

							<Button
								variant="primary"
								onClick={handleInitialize}
								disabled={loading || !!session}
								className="w-full"
							>
								{loading ? "Creating..." : session ? "✓ Test Session Active" : "🚀 Start Test Flow"}
							</Button>

							{session && (
								<Button
									variant="secondary"
									onClick={handleCleanup}
									className="w-full mt-2"
								>
									Clear Test Data
								</Button>
							)}
						</CardBody>
					</Card>

					{/* Webhook Simulator */}
					{session && (
						<Card>
							<CardBody className="p-6">
								<Heading level={2} size="lg" className="mb-4">🎭 Simulate Events</Heading>
								
								<div className="grid grid-cols-2 gap-2">
									<Button
										onClick={() => handleSimulateEvent("payment.succeeded")}
										disabled={loading}
										className="bg-success-bg text-success hover:opacity-80 disabled:opacity-50"
									>
										✓ Success
									</Button>
									<Button
										onClick={() => handleSimulateEvent("payment.failed")}
										disabled={loading}
										className="bg-warning-bg text-warning hover:opacity-80 disabled:opacity-50"
									>
										⚠️ Failed
									</Button>
									<Button
										onClick={() => handleSimulateEvent("subscription.canceled")}
										disabled={loading}
										className="bg-danger-bg text-danger hover:opacity-80 disabled:opacity-50"
									>
										❌ Cancel
									</Button>
									<Button
										onClick={() => handleSimulateEvent("charge.refunded")}
										disabled={loading}
										className="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 hover:opacity-80 disabled:opacity-50"
									>
										💰 Refund
									</Button>
								</div>
							</CardBody>
						</Card>
					)}
				</div>

				{/* Right Column - Results */}
				<div className="space-y-6">
					{error && (
						<Alert variant="danger">
							<Text>{error}</Text>
						</Alert>
					)}

					{session && (
						<>
							{/* Checkout URL */}
							{session.checkoutUrl && (
							<Card>
								<CardBody className="p-6">
									<Heading level={3} size="md" className="mb-3">💳 Checkout Session</Heading>
									<div className="bg-bg-muted p-3 rounded border border-border">
										<Text className="text-xs text-text-tertiary mb-1">Checkout URL</Text>
										<Text className="text-sm font-mono break-all">{session.checkoutUrl}</Text>
									</div>
									<div className="mt-3 flex gap-2">
										<Button
											variant="secondary"
											onClick={() => navigator.clipboard.writeText(session.checkoutUrl!)}
											className="flex-1"
										>
											📋 Copy
										</Button>
										<a
											href={session.checkoutUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="flex-1"
										>
											<Button variant="primary" className="w-full">
												🔗 Open
											</Button>
										</a>
									</div>
								</CardBody>
							</Card>
                                                        )}
							{/* Test Data */}
						<Card>
							<CardBody className="p-6">
								<Heading level={3} size="md" className="mb-3">📊 Test Data</Heading>
								<div className="space-y-3 text-sm">
									<div>
										<Text className="text-text-secondary">App</Text>
										<Text className="font-mono">{session.testData.app.name}</Text>
										<Text className="text-xs text-text-tertiary">{session.testData.app.id}</Text>
									</div>
									<div>
										<Text className="text-text-secondary">User</Text>
										<Text className="font-mono">{session.testData.user.email}</Text>
										<Text className="text-xs text-text-tertiary">{session.testData.user.id}</Text>
									</div>
									<div>
										<Text className="text-text-secondary">Plan</Text>
										<Text className="font-mono">{session.testData.plan.name} - ${session.testData.plan.amount / 100}/{session.testData.plan.interval}</Text>
									</div>
								</div>
							</CardBody>
						</Card>
							{/* License Status */}
							{sessionStatus?.license && (
							<Card>
								<CardBody className="p-6">
									<Heading level={3} size="md" className="mb-3">📜 License Status</Heading>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<Text className="text-text-secondary">Status</Text>
											<Text className={`font-semibold ${
												sessionStatus.license.status === "active" ? "text-success" : "text-text-secondary"
											}`}>
												{sessionStatus.license.status === "active" ? "✓ Active" : sessionStatus.license.status}
											</Text>
										</div>
										{sessionStatus.license.validUntil && (
											<div className="flex justify-between">
												<Text className="text-text-secondary">Expires</Text>
												<Text className="font-mono text-xs">
													{new Date(sessionStatus.license.validUntil).toLocaleDateString()}
												</Text>
											</div>
										)}
									</div>
								</CardBody>
							</Card>
                                                        )}
							{/* Transactions */}
							{sessionStatus?.transactions && sessionStatus.transactions.length > 0 && (
							<Card>
								<CardBody className="p-6">
									<Heading level={3} size="md" className="mb-3">💳 Transactions</Heading>
									<div className="space-y-2">
										{sessionStatus.transactions.map((txn: any) => (
											<div key={txn.public_id} className="flex items-center justify-between p-2 bg-bg-muted rounded border border-border text-sm">
												<div>
													<Text className="font-mono text-xs">{txn.public_id}</Text>
													<Text className="text-text-secondary text-xs">{txn.type} · {txn.provider}</Text>
												</div>
												<div className="text-right">
													<Text className="font-semibold">${(txn.amount_cents / 100).toFixed(2)} {txn.currency.toUpperCase()}</Text>
													<Text className={`text-xs font-medium ${
														txn.status === "success" ? "text-success" : txn.status === "failed" ? "text-danger" : "text-text-secondary"
													}`}>{txn.status}</Text>
												</div>
											</div>
										))}
									</div>
								</CardBody>
							</Card>
							)}
							{/* Auto-refresh indicator */}
							<div className="text-center text-xs text-text-tertiary">
								⏱️ Auto-refreshing every 2 seconds
							</div>
						</>
					)}

					{!session && (
						<div className="bg-bg-muted rounded-lg border-2 border-dashed border-border p-12 text-center">
							<Text className="text-text-secondary">
								Click "Start Test Flow" to begin testing
							</Text>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * Payment Testing Playground
 * Admin-only page for testing payment flows without manual setup
 */

import { useState, useEffect } from "react";
import { pingpong } from "@proofa/auth/pingpong";
import config from "../config";
import { Select } from "../components/Select";

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
				<h1 className="text-3xl font-bold text-text-primary">🧪 Payment Testing Playground</h1>
				<p className="mt-2 text-text-secondary">
					Test payment flows for all providers without manual setup
				</p>
			</div>

			{/* Warning Banner */}
			<div className="mb-6 bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
				<div className="flex items-center">
					<span className="text-2xl mr-3">⚠️</span>
					<div>
						<p className="font-semibold text-orange-900">TEST MODE ONLY</p>
						<p className="text-sm text-orange-700">
							Using sandbox credentials. No real charges will be made.
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left Column - Configuration */}
				<div className="space-y-6">
					{/* Provider Configuration */}
					<div className="card p-6">
						<h2 className="text-lg font-semibold mb-4">🔧 Provider Configuration</h2>
						
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
								<p className="mt-1 text-xs text-text-tertiary">
									{mode === "simulate" 
										? "Instantly simulate webhook events without real payment provider" 
										: "Create real checkout session with provider sandbox"}
								</p>
							</div>
						</div>
					</div>

					{/* Quick Test Setup */}
					<div className="card p-6">
						<h2 className="text-lg font-semibold mb-4">⚡ Quick Test Setup</h2>
						
						<p className="text-sm text-text-secondary mb-4">
							Auto-creates test app, user, and session in one click
						</p>

						<button
							onClick={handleInitialize}
							disabled={loading || !!session}
							className="w-full btn-primary px-4 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
						>
							{loading ? "Creating..." : session ? "✓ Test Session Active" : "🚀 Start Test Flow"}
						</button>

						{session && (
							<button
								onClick={handleCleanup}
								className="w-full mt-2 bg-bg-muted text-text-secondary px-4 py-2 rounded-lg text-sm hover:bg-bg-hover transition"
							>
								Clear Test Data
							</button>
						)}
					</div>

					{/* Webhook Simulator */}
					{session && (
						<div className="card p-6">
							<h2 className="text-lg font-semibold mb-4">🎭 Simulate Events</h2>
							
							<div className="grid grid-cols-2 gap-2">
								<button
									onClick={() => handleSimulateEvent("payment.succeeded")}
									disabled={loading}
									className="bg-success-bg text-success px-3 py-2 rounded text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
								>
									✓ Success
								</button>
								<button
									onClick={() => handleSimulateEvent("payment.failed")}
									disabled={loading}
									className="bg-warning-bg text-warning px-3 py-2 rounded text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
								>
									⚠️ Failed
								</button>
								<button
									onClick={() => handleSimulateEvent("subscription.canceled")}
									disabled={loading}
									className="bg-danger-bg text-danger px-3 py-2 rounded text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
								>
									❌ Cancel
								</button>
								<button
									onClick={() => handleSimulateEvent("charge.refunded")}
									disabled={loading}
									className="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 px-3 py-2 rounded text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
								>
									💰 Refund
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Right Column - Results */}
				<div className="space-y-6">
					{error && (
						<div className="alert-danger">
							<p className="text-danger">{error}</p>
						</div>
					)}

					{session && (
						<>
							{/* Checkout URL */}
							{session.checkoutUrl && (
								<div className="card p-6">
									<h3 className="text-lg font-semibold mb-3">💳 Checkout Session</h3>
									<div className="bg-bg-muted p-3 rounded border border-border">
										<p className="text-xs text-text-tertiary mb-1">Checkout URL</p>
										<p className="text-sm font-mono break-all">{session.checkoutUrl}</p>
									</div>
									<div className="mt-3 flex gap-2">
										<button
											onClick={() => navigator.clipboard.writeText(session.checkoutUrl!)}
											className="flex-1 bg-bg-muted text-text-secondary px-3 py-2 rounded text-sm hover:bg-bg-hover transition"
										>
											📋 Copy
										</button>
										<a
											href={session.checkoutUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="flex-1 btn-primary px-3 py-2 rounded text-sm text-center transition"
										>
											🔗 Open
										</a>
									</div>
								</div>
							)}

							{/* Test Data */}
							<div className="card p-6">
								<h3 className="text-lg font-semibold mb-3">📊 Test Data</h3>
								<div className="space-y-3 text-sm">
									<div>
										<p className="text-text-secondary">App</p>
										<p className="font-mono">{session.testData.app.name}</p>
										<p className="text-xs text-text-tertiary">{session.testData.app.id}</p>
									</div>
									<div>
										<p className="text-text-secondary">User</p>
										<p className="font-mono">{session.testData.user.email}</p>
										<p className="text-xs text-text-tertiary">{session.testData.user.id}</p>
									</div>
									<div>
										<p className="text-text-secondary">Plan</p>
										<p className="font-mono">{session.testData.plan.name} - ${session.testData.plan.amount / 100}/{session.testData.plan.interval}</p>
									</div>
								</div>
							</div>

							{/* License Status */}
							{sessionStatus?.license && (
								<div className="card p-6">
									<h3 className="text-lg font-semibold mb-3">📜 License Status</h3>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-text-secondary">Status</span>
											<span className={`font-semibold ${
												sessionStatus.license.status === "active" ? "text-success" : "text-text-secondary"
											}`}>
												{sessionStatus.license.status === "active" ? "✓ Active" : sessionStatus.license.status}
											</span>
										</div>
										{sessionStatus.license.validUntil && (
											<div className="flex justify-between">
												<span className="text-text-secondary">Expires</span>
												<span className="font-mono text-xs">
													{new Date(sessionStatus.license.validUntil).toLocaleDateString()}
												</span>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Auto-refresh indicator */}
							<div className="text-center text-xs text-text-tertiary">
								⏱️ Auto-refreshing every 2 seconds
							</div>
						</>
					)}

					{!session && (
						<div className="bg-bg-muted rounded-lg border-2 border-dashed border-border p-12 text-center">
							<p className="text-text-secondary">
								Click "Start Test Flow" to begin testing
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

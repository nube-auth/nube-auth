/**
 * Payment Testing Playground
 * Admin-only page for testing payment flows with customizable entity selection
 */

import { useState, useEffect } from "react";
import { pingpong } from "@nube-auth/auth";
import config from "../config";
import { csrfHeaders } from "../lib/csrf";
import { Select } from "../components/Select";
import { Heading, Text, Card, CardBody, Button, Alert } from "@nube-auth/components";
import { useProjects, useProjectApps, useAppUsers, useAppPlans } from "../hooks/api";

const CREATE_NEW = "__create_new__";

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
	// Entity selection
	const [projectId, setProjectId] = useState("");
	const [appId, setAppId] = useState("");
	const [userId, setUserId] = useState("");
	const [planId, setPlanId] = useState("");

	// Provider configuration
	const [provider, setProvider] = useState<"stripe" | "lemonsqueezy" | "dodo">("stripe");
	const [mode, setMode] = useState<"simulate" | "live">("simulate");

	// Session state
	const [session, setSession] = useState<TestSession | null>(null);
	const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Fetch entities with cascading dependencies
	const { data: projects, isLoading: projectsLoading } = useProjects();
	const { data: apps, isLoading: appsLoading } = useProjectApps(projectId);
	const { data: appUsers, isLoading: usersLoading } = useAppUsers(projectId, appId && appId !== CREATE_NEW ? appId : "");
	const { data: plans, isLoading: plansLoading } = useAppPlans(projectId, appId && appId !== CREATE_NEW ? appId : "");

	// Reset downstream selections when parent changes
	useEffect(() => { setAppId(""); setUserId(""); setPlanId(""); }, [projectId]);
	useEffect(() => { setUserId(""); setPlanId(""); }, [appId]);

	// Auto-refresh session status every 2 seconds when session is active
	useEffect(() => {
		if (!session) return;

		const interval = setInterval(async () => {
			try {
				const response = await pingpong(`${config.gatewayUrl}/v1/admin/test/status/${session.sessionId}`, {
					method: "GET",
					credentials: "include",
				});

				if (response.ok()) {
					setSessionStatus(response.data);
				}
			} catch (_err) {
				// Status poll failed, will retry
			}
		}, 2000);

		return () => clearInterval(interval);
	}, [session]);

	const canStart = projectId && (appId === CREATE_NEW || appId) && (userId === CREATE_NEW || userId) && (planId === CREATE_NEW || planId);

	const handleInitialize = async () => {
		if (!canStart) return;
		setLoading(true);
		setError(null);

		try {
			const response = await pingpong(`${config.gatewayUrl}/v1/admin/test/initialize`, {
				method: "POST",
				credentials: "include",
				headers: csrfHeaders(),
				body: {
					provider,
					mode,
					projectId,
					appId: appId === CREATE_NEW ? null : appId,
					userId: userId === CREATE_NEW ? null : userId,
					planId: planId === CREATE_NEW ? null : planId,
				},
			});

			if (response.ok()) {
				setSession(response.data);
				setSessionStatus(null);
			} else {
				const errorMsg = response.data?.error || "Failed to initialize test session";
				setError(errorMsg);
			}
		} catch (err) {
			setError("Failed to initialize test session");
		} finally {
			setLoading(false);
		}
	};

	const handleSimulateEvent = async (eventType: string) => {
		if (!session) return;

		setLoading(true);
		setError(null);

		try {
			const response = await pingpong(`${config.gatewayUrl}/v1/admin/test/simulate-webhook`, {
				method: "POST",
				credentials: "include",
				headers: csrfHeaders(),
				body: {
					sessionId: session.sessionId,
					eventType,
				},
			});

			if (response.ok()) {
				const statusResponse = await pingpong(`${config.gatewayUrl}/v1/admin/test/status/${session.sessionId}`, {
					method: "GET",
					credentials: "include",
				});

				if (statusResponse.ok()) {
					setSessionStatus(statusResponse.data);
				}
			} else {
				setError(response.data?.error || "Failed to simulate webhook");
			}
		} catch (_err) {
			setError("Failed to simulate webhook");
		} finally {
			setLoading(false);
		}
	};

	const handleCleanup = async () => {
		if (!session) return;

		try {
			await pingpong(`${config.gatewayUrl}/v1/admin/test/cleanup?sessionId=${session.sessionId}`, {
				method: "DELETE",
				credentials: "include",
				headers: csrfHeaders(),
			});

			setSession(null);
			setSessionStatus(null);
		} catch (_err) {
			// Cleanup failed silently
		}
	};

	// Build dropdown options
	const projectOptions = (projects ?? []).map((p) => ({ value: p.id, label: p.name }));

	const appOptions = [
		...(apps ?? []).map((a) => ({ value: a.id, label: a.name })),
		{ value: CREATE_NEW, label: "+ Create test app" },
	];

	const userOptions = [
		...(appUsers?.users ?? []).map((u) => ({ value: u.id, label: `${u.name || u.email} (${u.email})` })),
		{ value: CREATE_NEW, label: "+ Create test user" },
	];

	const planOptions = [
		...(plans ?? []).map((p) => ({ value: p.planId, label: `${p.name} (${p.slug})` })),
		{ value: CREATE_NEW, label: "+ Create test plan" },
	];

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{/* Header */}
			<div className="mb-8">
				<Heading level={1} size="lg">Payment Testing Playground</Heading>
				<Text className="mt-2 text-text-secondary">
					Test payment flows against your existing projects, apps, users, and plans
				</Text>
				<div className="flex items-center mt-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
					<Text className="text-2xl mr-3">⚠️</Text>
					<div>
						<Text className="font-semibold text-orange-900 dark:text-orange-300">TEST MODE ONLY</Text>
						<Text className="text-sm text-orange-700 dark:text-orange-400">
							Using sandbox credentials. No real charges will be made.
						</Text>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Left Column - Configuration */}
				<div className="space-y-6">
					{/* Entity Selection */}
					<Card>
						<CardBody className="p-6">
							<Heading level={2} size="lg" className="mb-4">📋 Select Entities</Heading>
							<Text className="text-sm text-text-secondary mb-4">
								Choose which project, app, user, and plan to test with. Select "+ Create test..." to auto-generate one.
							</Text>

							<div className="space-y-4">
								{/* Project */}
								<div>
									<label className="block text-sm font-medium text-text-primary mb-1">
										Project
									</label>
									<Select
										value={projectId}
										onChange={setProjectId}
										options={projectOptions}
										disabled={!!session || projectsLoading}
										placeholder={projectsLoading ? "Loading projects..." : "Select a project"}
									/>
								</div>

								{/* App */}
								<div>
									<label className="block text-sm font-medium text-text-primary mb-1">
										App
									</label>
									<Select
										value={appId}
										onChange={setAppId}
										options={appOptions}
										disabled={!!session || !projectId || appsLoading}
										placeholder={!projectId ? "Select a project first" : appsLoading ? "Loading apps..." : "Select an app or create test app"}
									/>
									{appId === CREATE_NEW && (
										<Text className="mt-1 text-xs text-info">A test app will be created in the selected project.</Text>
									)}
								</div>

								{/* User */}
								<div>
									<label className="block text-sm font-medium text-text-primary mb-1">
										User
									</label>
									<Select
										value={userId}
										onChange={setUserId}
										options={userOptions}
										disabled={!!session || !appId || appId === CREATE_NEW || usersLoading}
										placeholder={!appId ? "Select an app first" : appId === CREATE_NEW ? "Test user will be created" : usersLoading ? "Loading users..." : "Select a user or create test user"}
									/>
									{(userId === CREATE_NEW || appId === CREATE_NEW) && (
										<Text className="mt-1 text-xs text-info">A test user will be created for this session.</Text>
									)}
								</div>

								{/* Plan */}
								<div>
									<label className="block text-sm font-medium text-text-primary mb-1">
										Plan
									</label>
									<Select
										value={planId}
										onChange={setPlanId}
										options={planOptions}
										disabled={!!session || !appId || appId === CREATE_NEW || plansLoading}
										placeholder={!appId ? "Select an app first" : appId === CREATE_NEW ? "Test plan will be created" : plansLoading ? "Loading plans..." : "Select a plan or create test plan"}
									/>
									{(planId === CREATE_NEW || appId === CREATE_NEW) && (
										<Text className="mt-1 text-xs text-info">A test plan ($29/month) will be created.</Text>
									)}
								</div>
							</div>
						</CardBody>
					</Card>

					{/* Provider Configuration */}
					<Card>
						<CardBody className="p-6">
							<Heading level={2} size="lg" className="mb-4">🔧 Provider & Mode</Heading>
							
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-text-primary mb-1">
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
									<label className="block text-sm font-medium text-text-primary mb-1">
										Mode
									</label>
									<Select
										value={mode}
										onChange={(value) => setMode(value as "simulate" | "live")}
										options={[
										{ value: "simulate", label: "Simulate (Instant) ✨" },
										{ value: "live", label: "Live Checkout (Requires Webhooks)" }
									]}
									disabled={!!session}
								/>
								{mode === "simulate" ? (
									<div className="mt-2 p-2 bg-success/10 border border-success/30 rounded text-xs">
										<Text className="text-success font-semibold">✓ Recommended for local testing</Text>
										<Text className="text-text-secondary mt-1">
											Instantly simulates webhook events without needing real provider integration or ngrok.
										</Text>
									</div>
								) : (
									<div className="mt-2 p-2 bg-warning/10 border border-warning/30 rounded text-xs">
										<Text className="text-warning font-semibold">⚠️ Requires webhook configuration</Text>
										<Text className="text-text-secondary mt-1">
											Provider must send webhooks to complete payments. In local development, use ngrok or tunnel service to expose localhost. Payment will stay "Processing" until webhook is received.
										</Text>
									</div>
								)}
								</div>
							</div>
						</CardBody>
					</Card>

					{/* Start / Cleanup */}
					<Card>
						<CardBody className="p-6">
							<Button
								variant="primary"
								onClick={handleInitialize}
								disabled={loading || !!session || !canStart}
								className="w-full"
							>
								{loading ? "Creating..." : session ? "✓ Test Session Active" : "🚀 Start Test Flow"}
							</Button>

							{!canStart && !session && (
								<Text className="mt-2 text-xs text-text-tertiary text-center">
									Select a project, app, user, and plan to start
								</Text>
							)}

							{session && (
								<Button
									variant="secondary"
									onClick={handleCleanup}
									className="w-full mt-2"
								>
									🗑️ End Session & Cleanup
								</Button>
							)}
						</CardBody>
					</Card>

					{/* Webhook Simulator */}
					{session && (
						<Card>
							<CardBody className="p-6">
								<Heading level={2} size="lg" className="mb-4">
									{mode === "simulate" ? "🎭 Simulate Events" : "🔧 Manual Webhook Trigger"}
								</Heading>
								
								{mode === "live" && (
									<div className="mb-4 p-2 bg-info/10 border border-info/30 rounded text-xs">
										<Text className="text-info">
											Use these buttons if the real webhook from the provider fails to arrive (e.g., localhost not accessible). 
											Only works after payment is completed on provider's checkout page.
										</Text>
									</div>
								)}
								
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
										variant="danger"
										className="disabled:opacity-50"
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
							{/* Live Mode Webhook Warning */}
							{mode === "live" && !sessionStatus?.license && (
								<Alert variant="warning">
									<div className="space-y-2">
										<Text className="font-semibold">⏳ Waiting for Webhook</Text>
										<Text className="text-sm">
											Payment will remain in "Processing" until the provider sends a webhook to Nube Auth. 
											In local development, make sure your webhook URL is accessible via ngrok or similar tunnel.
										</Text>
										<Text className="text-xs text-text-tertiary mt-2">
											💡 Tip: Use "Simulate" mode for instant local testing without webhook setup.
										</Text>
									</div>
								</Alert>
							)}

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
									<Heading level={3} size="md" className="mb-3">📊 Session Data</Heading>
									<div className="space-y-3 text-sm">
										<div className="flex justify-between items-start">
											<Text className="text-text-secondary">App</Text>
											<div className="text-right">
												<Text className="font-medium">{session.testData.app.name}</Text>
												<Text className="text-xs text-text-tertiary font-mono">{session.testData.app.publicId}</Text>
											</div>
										</div>
										<div className="flex justify-between items-start">
											<Text className="text-text-secondary">User</Text>
											<div className="text-right">
												<Text className="font-medium">{session.testData.user.email}</Text>
												<Text className="text-xs text-text-tertiary font-mono">{session.testData.user.publicId}</Text>
											</div>
										</div>
										<div className="flex justify-between items-start">
											<Text className="text-text-secondary">Plan</Text>
											<div className="text-right">
												<Text className="font-medium">{session.testData.plan.name}</Text>
												<Text className="text-xs text-text-tertiary">${session.testData.plan.amount / 100}/{session.testData.plan.interval}</Text>
											</div>
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
															txn.status === "success" ? "text-success" : txn.status === "failed" ? "text-danger" : "text-warning"
														}`}>
															{txn.status === "processing" ? "⏳ Processing (Webhook Pending)" : txn.status}
														</Text>
													</div>
												</div>
											))}
										</div>
										{sessionStatus.transactions.some((t: any) => t.status === "processing") && mode === "live" && (
											<div className="mt-3 p-2 bg-warning/10 border border-warning/30 rounded text-xs">
												<Text className="text-warning">
													Payment is waiting for webhook from provider. If using localhost, you need ngrok to receive webhooks.
												</Text>
											</div>
										)}
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
							<div className="space-y-3">
								<Text className="text-4xl">🧪</Text>
								<Text className="text-text-secondary font-medium">
									Configure your test entities and click "Start Test Flow"
								</Text>
								<Text className="text-xs text-text-tertiary">
									Choose existing entities to test real flows, or create test ones
								</Text>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

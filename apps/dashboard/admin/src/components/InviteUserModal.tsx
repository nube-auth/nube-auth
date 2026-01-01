import { useCallback, useEffect, useState } from "react";
import { Select } from "./Select";

interface InviteUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	projectId: string;
	appId: string;
}

interface Plan {
	id: number; // Internal numeric ID
	public_id: string;
	name: string;
	slug: string;
	monthlyPrice: number | null;
	yearlyPrice: number | null;
}

export function InviteUserModal({ isOpen, onClose, onSuccess, projectId, appId }: InviteUserModalProps) {
	const [email, setEmail] = useState("");
	const [planId, setPlanId] = useState<number | null>(null);
	const [plans, setPlans] = useState<Plan[]>([]);
	const [plansLoading, setPlansLoading] = useState(false);
	const [grantLicense, setGrantLicense] = useState(true);
	const [licenseDuration, setLicenseDuration] = useState<string>(""); // empty = no expiry
	const [customMessage, setCustomMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<{ message: string; action: string } | null>(null);

	const fetchPlans = useCallback(async () => {
		setPlansLoading(true);
		try {
			const response = await fetch(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/plans`,
				{
					method: "GET",
					credentials: "include",
				},
			);

			if (!response.ok) {
				throw new Error("Failed to fetch plans");
			}

			const data = await response.json();
			setPlans(data.plans || []);

			// Set default plan to first active plan if available
			if (data.plans && data.plans.length > 0) {
				// Find first plan (internal ID, not public_id)
				// We need to convert public_id to internal id, but API should return internal id
				// For now, assume plans[0] is the default
				setPlanId(data.plans[0].id);
			}
		} catch (err) {
			console.error("Failed to fetch plans:", err);
			setError("Failed to load plans. Please try again.");
		} finally {
			setPlansLoading(false);
		}
	}, [projectId, appId]);

	// Fetch plans when modal opens
	useEffect(() => {
		if (isOpen) {
			fetchPlans();
		}
	}, [isOpen, fetchPlans]);

	if (!isOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(null);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_GATEWAY_URL}/v1/admin/projects/${projectId}/apps/${appId}/users/invite`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					credentials: "include",
					body: JSON.stringify({
						email,
						plan_id: grantLicense ? planId : null,
						grant_license: grantLicense,
						license_duration_days: licenseDuration ? Number.parseInt(licenseDuration, 10) : null,
						custom_message: customMessage || null,
					}),
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to invite user");
			}

			const data = await response.json();

			setSuccess({
				message: data.message,
				action: data.action,
			});

			// Reset form
			setEmail("");
			setPlanId(plans.length > 0 ? plans[0].id : null);
			setGrantLicense(true);
			setLicenseDuration("");
			setCustomMessage("");

			// Call onSuccess after a delay to show the success message
			setTimeout(() => {
				onSuccess();
				onClose();
			}, 2000);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to invite user");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (loading) return;
		setEmail("");
		setPlanId(plans.length > 0 ? plans[0].id : null);
		setGrantLicense(true);
		setLicenseDuration("");
		setCustomMessage("");
		setError(null);
		setSuccess(null);
		onClose();
	};

	return (
		<div
			className="modal-overlay"
			onClick={handleClose}
			style={{
				position: "fixed",
				top: 0,
				left: "260px",
				right: 0,
				bottom: 0,
				background: "rgba(0, 0, 0, 0.6)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
				padding: "32px",
			}}
		>
			<div
				className="modal-content"
				onClick={(e) => e.stopPropagation()}
				style={{
					background: "var(--card-bg)",
					borderRadius: "12px",
					padding: "32px",
					maxWidth: "900px",
					width: "100%",
					maxHeight: "calc(100vh - 64px)",
					overflowY: "auto",
					boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
					border: "1px solid var(--card-border)",
				}}
			>
				{/* Header */}
				<div
					style={{
						marginBottom: "24px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div>
						<h2
							style={{
								fontSize: "20px",
								fontWeight: "700",
								color: "var(--text-primary)",
								marginBottom: "4px",
							}}
						>
							Invite User
						</h2>
						<p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
							Send an invitation or grant access to an existing user
						</p>
					</div>
					<button
						type="button"
						onClick={handleClose}
						disabled={loading}
						style={{
							background: "transparent",
							border: "none",
							color: "var(--text-secondary)",
							cursor: loading ? "not-allowed" : "pointer",
							padding: "4px",
							borderRadius: "6px",
							transition: "all 0.2s ease",
						}}
						onMouseEnter={(e) => {
							if (!loading) {
								e.currentTarget.style.background = "var(--content-bg)";
								e.currentTarget.style.color = "var(--text-primary)";
							}
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "transparent";
							e.currentTarget.style.color = "var(--text-secondary)";
						}}
					>
						<svg
							style={{ width: "20px", height: "20px" }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* Success Message */}
				{success && (
					<div
						style={{
							background: "var(--success-bg)",
							border: "1px solid var(--success)",
							borderRadius: "8px",
							padding: "12px 16px",
							marginBottom: "20px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}
					>
						<svg
							style={{ width: "20px", height: "20px", color: "var(--success)", flexShrink: 0 }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
						<div style={{ flex: 1 }}>
							<p style={{ fontSize: "14px", fontWeight: "600", color: "var(--success-text)", margin: 0 }}>
								{success.message}
							</p>
						</div>
					</div>
				)}

				{/* Error Message */}
				{error && (
					<div
						style={{
							background: "var(--danger-bg)",
							border: "1px solid var(--danger)",
							borderRadius: "8px",
							padding: "12px 16px",
							marginBottom: "20px",
							display: "flex",
							alignItems: "center",
							gap: "12px",
						}}
					>
						<svg
							style={{ width: "20px", height: "20px", color: "var(--danger)", flexShrink: 0 }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p style={{ fontSize: "14px", color: "var(--danger-text)", margin: 0 }}>{error}</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit}>
					{/* Email Field */}
					<div style={{ marginBottom: "20px" }}>
						<label
							htmlFor="email"
							style={{
								display: "block",
								fontSize: "13px",
								fontWeight: "600",
								color: "var(--text-secondary)",
								marginBottom: "8px",
							}}
						>
							Email Address <span style={{ color: "var(--danger)" }}>*</span>
						</label>
						<input
							type="email"
							id="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={loading}
							placeholder="user@example.com"
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1px solid var(--card-border)",
								borderRadius: "8px",
								background: "var(--content-bg)",
								color: "var(--text-primary)",
								fontSize: "14px",
								outline: "none",
								transition: "all 0.2s ease",
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = "var(--primary)";
								e.currentTarget.style.boxShadow = "0 0 0 2px rgba(139, 92, 246, 0.2)";
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = "var(--card-border)";
								e.currentTarget.style.boxShadow = "none";
							}}
						/>
						<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
							We'll check if this user exists before sending an invitation
						</p>
					</div>

					{/* Grant License Checkbox */}
					<div style={{ marginBottom: "20px" }}>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "10px",
								cursor: loading ? "not-allowed" : "pointer",
								padding: "12px",
								borderRadius: "8px",
								background: grantLicense ? "var(--primary-light)" : "var(--content-bg)",
								border: "1px solid",
								borderColor: grantLicense ? "var(--primary)" : "var(--card-border)",
								transition: "all 0.2s ease",
							}}
						>
							<input
								type="checkbox"
								checked={grantLicense}
								onChange={(e) => setGrantLicense(e.target.checked)}
								disabled={loading}
								style={{
									width: "18px",
									height: "18px",
									cursor: loading ? "not-allowed" : "pointer",
								}}
							/>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
									Grant License
								</div>
								<div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
									Automatically grant a license when the user signs up
								</div>
							</div>
						</label>
					</div>

					{/* License Plan Select (only if grantLicense is true) */}
					{grantLicense && (
						<>
							<div style={{ marginBottom: "20px" }}>
								<label
									htmlFor="plan"
									style={{
										display: "block",
										fontSize: "13px",
										fontWeight: "600",
										color: "var(--text-secondary)",
										marginBottom: "8px",
									}}
								>
									License Plan <span style={{ color: "var(--danger)" }}>*</span>
								</label>
								<Select
									value={planId?.toString() || ""}
									onChange={(value) => setPlanId(Number(value))}
									options={
										plansLoading
											? [{ value: "", label: "Loading plans..." }]
											: plans.length === 0
												? [{ value: "", label: "No plans available" }]
												: plans.map((plan) => ({
														value: plan.id.toString(),
														label: `${plan.name}${
															plan.monthlyPrice !== null && plan.monthlyPrice > 0
																? ` ($${(plan.monthlyPrice / 100).toFixed(2)}/mo)`
																: plan.yearlyPrice !== null && plan.yearlyPrice > 0
																	? ` ($${(plan.yearlyPrice / 100).toFixed(2)}/yr)`
																	: " (Free)"
														}`,
													}))
									}
									disabled={loading || plansLoading}
									style={{
										width: "100%",
										padding: "10px 12px",
										border: "1px solid var(--card-border)",
										borderRadius: "8px",
										background: "var(--content-bg)",
										color: "var(--text-primary)",
										fontSize: "14px",
										outline: "none",
										transition: "all 0.2s ease",
									}}
								/>
							</div>

							{/* License Duration */}
							<div style={{ marginBottom: "20px" }}>
								<label
									htmlFor="licenseDuration"
									style={{
										display: "block",
										fontSize: "13px",
										fontWeight: "600",
										color: "var(--text-secondary)",
										marginBottom: "8px",
									}}
								>
									License Duration{" "}
									<span style={{ fontSize: "11px", fontWeight: "400" }}>(Optional)</span>
								</label>
								<div style={{ position: "relative" }}>
									<input
										type="number"
										id="licenseDuration"
										value={licenseDuration}
										onChange={(e) => setLicenseDuration(e.target.value)}
										disabled={loading}
										placeholder="Leave empty for no expiry"
										min="1"
										style={{
											width: "100%",
											padding: "10px 12px",
											paddingRight: "60px",
											border: "1px solid var(--card-border)",
											borderRadius: "8px",
											background: "var(--content-bg)",
											color: "var(--text-primary)",
											fontSize: "14px",
											outline: "none",
											transition: "all 0.2s ease",
										}}
										onFocus={(e) => {
											e.currentTarget.style.borderColor = "var(--primary)";
											e.currentTarget.style.boxShadow = "0 0 0 2px rgba(139, 92, 246, 0.2)";
										}}
										onBlur={(e) => {
											e.currentTarget.style.borderColor = "var(--card-border)";
											e.currentTarget.style.boxShadow = "none";
										}}
									/>
									<span
										style={{
											position: "absolute",
											right: "12px",
											top: "50%",
											transform: "translateY(-50%)",
											fontSize: "13px",
											color: "var(--text-tertiary)",
											pointerEvents: "none",
										}}
									>
										days
									</span>
								</div>
								<p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
									Leave empty for lifetime access. Set a number of days for time-limited licenses.
								</p>
							</div>
						</>
					)}

					{/* Custom Message (Optional) */}
					<div style={{ marginBottom: "24px" }}>
						<label
							htmlFor="customMessage"
							style={{
								display: "block",
								fontSize: "13px",
								fontWeight: "600",
								color: "var(--text-secondary)",
								marginBottom: "8px",
							}}
						>
							Custom Message <span style={{ fontSize: "11px", fontWeight: "400" }}>(Optional)</span>
						</label>
						<textarea
							id="customMessage"
							value={customMessage}
							onChange={(e) => setCustomMessage(e.target.value)}
							disabled={loading}
							placeholder="Add a personal message to the invitation..."
							rows={3}
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1px solid var(--card-border)",
								borderRadius: "8px",
								background: "var(--content-bg)",
								color: "var(--text-primary)",
								fontSize: "14px",
								outline: "none",
								resize: "vertical",
								fontFamily: "inherit",
								transition: "all 0.2s ease",
							}}
							onFocus={(e) => {
								e.currentTarget.style.borderColor = "var(--primary)";
								e.currentTarget.style.boxShadow = "0 0 0 2px rgba(139, 92, 246, 0.2)";
							}}
							onBlur={(e) => {
								e.currentTarget.style.borderColor = "var(--card-border)";
								e.currentTarget.style.boxShadow = "none";
							}}
						/>
					</div>

					{/* Form Actions */}
					<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
						<button
							type="button"
							onClick={handleClose}
							disabled={loading}
							style={{
								padding: "10px 20px",
								fontSize: "14px",
								fontWeight: "600",
								border: "1px solid var(--card-border)",
								borderRadius: "8px",
								background: "transparent",
								color: "var(--text-secondary)",
								cursor: loading ? "not-allowed" : "pointer",
								transition: "all 0.2s ease",
								opacity: loading ? 0.5 : 1,
							}}
							onMouseEnter={(e) => {
								if (!loading) {
									e.currentTarget.style.background = "var(--content-bg)";
									e.currentTarget.style.color = "var(--text-primary)";
								}
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = "transparent";
								e.currentTarget.style.color = "var(--text-secondary)";
							}}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading || !email}
							style={{
								padding: "10px 24px",
								fontSize: "14px",
								fontWeight: "600",
								border: "none",
								borderRadius: "8px",
								background: loading || !email ? "var(--text-tertiary)" : "var(--primary)",
								color: "white",
								cursor: loading || !email ? "not-allowed" : "pointer",
								transition: "all 0.2s ease",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
							onMouseEnter={(e) => {
								if (!loading && email) {
									e.currentTarget.style.background = "var(--primary-hover)";
									e.currentTarget.style.transform = "translateY(-1px)";
									e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.3)";
								}
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background =
									loading || !email ? "var(--text-tertiary)" : "var(--primary)";
								e.currentTarget.style.transform = "translateY(0)";
								e.currentTarget.style.boxShadow = "none";
							}}
						>
							{loading ? (
								<>
									<svg
										style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
									Sending...
								</>
							) : (
								<>
									<svg
										style={{ width: "16px", height: "16px" }}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
										/>
									</svg>
									Send Invitation
								</>
							)}
						</button>
					</div>
				</form>

				{/* Add spinning animation */}
				<style>
					{`
						@keyframes spin {
							from { transform: rotate(0deg); }
							to { transform: rotate(360deg); }
						}
					`}
				</style>
			</div>
		</div>
	);
}

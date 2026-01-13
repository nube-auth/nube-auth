import { useCallback, useEffect, useState } from "react";
import { Select } from "./Select";
import { pingpong } from "../lib/pingpong";

interface InviteUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	projectId: string;
	appId: string;
}

interface Plan {
	id: number;
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
	const [licenseDuration, setLicenseDuration] = useState<string>("");
	const [customMessage, setCustomMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<{ message: string; action: string } | null>(null);

	const fetchPlans = useCallback(async () => {
		setPlansLoading(true);
		try {
			const response = await pingpong(
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

			if (data.plans && data.plans.length > 0) {
				const firstPlan = data.plans[0];
				if (firstPlan) {
					setPlanId(firstPlan.id);
				}
			}
		} catch (err) {
			console.error("Failed to fetch plans:", err);
			setError("Failed to load plans. Please try again.");
		} finally {
			setPlansLoading(false);
		}
	}, [projectId, appId]);

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
			const response = await pingpong(
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

			setEmail("");
			setPlanId(plans.length > 0 && plans[0] ? plans[0].id : null);
			setGrantLicense(true);
			setLicenseDuration("");
			setCustomMessage("");

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
		setPlanId(plans.length > 0 && plans[0] ? plans[0].id : null);
		setGrantLicense(true);
		setLicenseDuration("");
		setCustomMessage("");
		setError(null);
		setSuccess(null);
		onClose();
	};

	return (
		<div
			className="modal-overlay fixed top-0 left-[260px] right-0 bottom-0 bg-black/60 flex items-center justify-center z-1000 p-8"
			onClick={handleClose}
		>
			<div
				className="modal-content bg-card-bg rounded-xl p-8 max-w-[900px] w-full max-h-[calc(100vh-64px)] overflow-y-auto shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.2)] border border-card-border"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h2 className="text-20px font-bold text-text-primary mb-1">Invite User</h2>
						<p className="text-14px text-text-secondary m-0">Send an invitation or grant access to an existing user</p>
					</div>
					<button
						type="button"
						onClick={handleClose}
						disabled={loading}
						className={`bg-transparent border-none text-text-secondary p-1 rounded-md transition-all duration-200 ${loading ? "cursor-not-allowed" : "cursor-pointer hover:bg-content-bg hover:text-text-primary"}`}
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Success Message */}
				{success && (
					<div className="bg-success-bg border border-success rounded-lg p-3 mb-5 flex items-center gap-3">
						<svg
							className="w-5 h-5 text-success flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
						<div className="flex-1">
							<p className="text-14px font-semibold text-success-text m-0">{success.message}</p>
						</div>
					</div>
				)}

				{/* Error Message */}
				{error && (
					<div className="bg-danger-bg border border-danger rounded-lg p-3 mb-5 flex items-center gap-3">
						<svg
							className="w-5 h-5 text-danger flex-shrink-0"
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
						<p className="text-14px text-danger-text m-0">{error}</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit}>
					{/* Email Field */}
					<div className="mb-5">
						<label htmlFor="email" className="form-label">
							Email Address <span className="text-danger">*</span>
						</label>
						<input
							type="email"
							id="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={loading}
							placeholder="user@example.com"
							className="form-control w-full px-3 py-2.5 border border-card-border rounded-lg bg-content-bg text-text-primary text-14px outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_2px_rgba(139,92,246,0.2)]"
						/>
						<p className="text-12px text-text-tertiary mt-1.5">We'll check if this user exists before sending an invitation</p>
					</div>

					{/* Grant License Checkbox */}
					<div className="mb-5">
						<label
							className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all duration-200 ${loading ? "cursor-not-allowed" : "cursor-pointer"} ${grantLicense ? "bg-primary-light border-primary" : "bg-content-bg border-card-border"}`}
						>
							<input
								type="checkbox"
								checked={grantLicense}
								onChange={(e) => setGrantLicense(e.target.checked)}
								disabled={loading}
								className={`w-4.5 h-4.5 ${loading ? "cursor-not-allowed" : "cursor-pointer"}`}
							/>
							<div className="flex-1">
								<div className="text-14px font-semibold text-text-primary">Grant License</div>
								<div className="text-12px text-text-secondary mt-0.5">Automatically grant a license when the user signs up</div>
							</div>
						</label>
					</div>

					{/* License Plan Select */}
					{grantLicense && (
						<>
							<div className="mb-5">
								<label htmlFor="plan" className="form-label">
									License Plan <span className="text-danger">*</span>
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
								/>
							</div>

							{/* License Duration */}
							<div className="mb-5">
								<label htmlFor="licenseDuration" className="form-label">
									License Duration <span className="text-11px font-normal">(Optional)</span>
								</label>
								<div className="relative">
									<input
										type="number"
										id="licenseDuration"
										value={licenseDuration}
										onChange={(e) => setLicenseDuration(e.target.value)}
										disabled={loading}
										placeholder="Leave empty for no expiry"
										min="1"
										className="form-control w-full px-3 py-2.5 pr-15 border border-card-border rounded-lg bg-content-bg text-text-primary text-14px outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_2px_rgba(139,92,246,0.2)]"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-13px text-text-tertiary pointer-events-none">
										days
									</span>
								</div>
								<p className="text-12px text-text-tertiary mt-1.5">
									Leave empty for lifetime access. Set a number of days for time-limited licenses.
								</p>
							</div>
						</>
					)}

					{/* Custom Message */}
					<div className="mb-6">
						<label htmlFor="customMessage" className="form-label">
							Custom Message <span className="text-11px font-normal">(Optional)</span>
						</label>
						<textarea
							id="customMessage"
							value={customMessage}
							onChange={(e) => setCustomMessage(e.target.value)}
							disabled={loading}
							placeholder="Add a personal message to the invitation..."
							rows={3}
							className="form-control w-full px-3 py-2.5 border border-card-border rounded-lg bg-content-bg text-text-primary text-14px outline-none resize-vertical font-inherit transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_2px_rgba(139,92,246,0.2)]"
						/>
					</div>

					{/* Form Actions */}
					<div className="flex gap-3 justify-end">
						<button
							type="button"
							onClick={handleClose}
							disabled={loading}
							className={`px-5 py-2.5 text-14px font-semibold border border-card-border rounded-lg bg-transparent text-text-secondary transition-all duration-200 ${loading ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-content-bg hover:text-text-primary"}`}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading || !email}
							className={`px-6 py-2.5 text-14px font-semibold border-none rounded-lg text-white transition-all duration-200 flex items-center gap-2 ${loading || !email ? "bg-text-tertiary cursor-not-allowed" : "bg-primary cursor-pointer hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)]"}`}
						>
							{loading ? (
								<>
									<svg
										className="w-4 h-4 animate-spin"
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
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
			</div>
		</div>
	);
}

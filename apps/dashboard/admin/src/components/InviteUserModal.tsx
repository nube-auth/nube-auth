import {
	Alert,
	Button,
	Checkbox,
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	DialogPopup,
	DialogTitle,
	Icon,
	IconType,
	Input,
	Label,
	Text,
	Textarea,
} from "@nube-auth/components";
import { useCallback, useEffect, useState } from "react";
import config from "../config";
import { csrfHeaders } from "../lib/csrf";
import { pingpong } from "../lib/pingpong";
import { Select } from "./Select";

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
			const response = await pingpong(`${config.gatewayUrl}/v1/admin/projects/${projectId}/apps/${appId}/plans`, {
				method: "GET",
				credentials: "include",
			});

			if (!response.ok()) {
				throw new Error("Failed to fetch plans");
			}

			setPlans(response.data?.plans || []);

			if (response.data?.plans && response.data.plans.length > 0) {
				const firstPlan = response.data.plans[0];
				if (firstPlan) {
					setPlanId(firstPlan.id);
				}
			}
		} catch (_err) {
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
				`${config.gatewayUrl}/v1/admin/projects/${projectId}/apps/${appId}/users/invite`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...csrfHeaders(),
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

			if (!response.ok()) {
				throw new Error(response.data?.error || "Failed to invite user");
			}

			setSuccess({
				message: response.data?.message,
				action: response.data?.action,
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
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogPopup className="max-w-[900px] w-full">
				<DialogHeader>
					<DialogTitle>Invite User</DialogTitle>
					<Text className="text-muted text-sm mt-1">
						Send an invitation or grant access to an existing user
					</Text>
				</DialogHeader>

				<DialogBody>
					{/* Success Message */}
					{success && (
						<Alert variant="success" className="mb-5">
							<Icon icon={IconType.Check} size={20} className="text-success shrink-0" />
							{success.message}
						</Alert>
					)}

					{/* Error Message */}
					{error && (
						<Alert variant="danger" className="mb-5">
							<Icon icon={IconType.AlertCircle} size={20} className="text-danger shrink-0" />
							{error}
						</Alert>
					)}

					{/* Form */}
					<form id="invite-form" onSubmit={handleSubmit}>
						<div className="mb-5">
							<Label>
								Email Address <span className="text-danger">*</span>
							</Label>
							<Input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={loading}
								placeholder="user@example.com"
							/>
							<Text className="text-xs text-muted mt-1.5">
								We'll check if this user exists before sending an invitation
							</Text>
						</div>

						<div className="mb-5">
							<label
								className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all duration-200 ${loading ? "cursor-not-allowed" : "cursor-pointer"} ${grantLicense ? "bg-primary-light border-primary" : "bg-content-bg border-card-border"}`}
							>
								<Checkbox
									checked={grantLicense}
									onCheckedChange={(checked) => setGrantLicense(!!checked)}
									disabled={loading}
								/>
								<div className="flex-1">
									<div className="text-14px font-semibold text-text-primary">Grant License</div>
									<div className="text-12px text-muted mt-0.5">
										Automatically grant a license when the user signs up
									</div>
								</div>
							</label>
						</div>

						{/* License Plan Select */}
						{grantLicense && (
							<>
								<div className="mb-5">
									<Label>
										License Plan <span className="text-danger">*</span>
									</Label>
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

								<div className="mb-5">
									<Label>
										License Duration <span className="text-11px font-normal">(Optional)</span>
									</Label>
									<div className="relative">
										<Input
											type="number"
											value={licenseDuration}
											onChange={(e) => setLicenseDuration(e.target.value)}
											disabled={loading}
											placeholder="Leave empty for no expiry"
											min="1"
										/>
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-13px text-muted pointer-events-none">
											days
										</span>
									</div>
									<Text className="text-xs text-muted mt-1.5">
										Leave empty for lifetime access. Set a number of days for time-limited licenses.
									</Text>
								</div>
							</>
						)}

						<div className="mb-2">
							<Label>
								Custom Message <span className="text-11px font-normal">(Optional)</span>
							</Label>
							<Textarea
								value={customMessage}
								onChange={(e) => setCustomMessage(e.target.value)}
								disabled={loading}
								placeholder="Add a personal message to the invitation..."
								rows={3}
							/>
						</div>
					</form>
				</DialogBody>

				<DialogFooter>
					<Button variant="secondary" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button variant="primary" type="submit" form="invite-form" disabled={loading || !email}>
						{loading ? (
							<>
								<Icon icon={IconType.Refresh} size={16} className="animate-spin" />
								Sending...
							</>
						) : (
							<>
								<Icon icon={IconType.ArrowRight} size={16} />
								Send Invitation
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}

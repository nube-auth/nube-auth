import { useCallback, useEffect, useState } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "./Modal";

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: "danger" | "warning" | "info";
	requireCaptcha?: boolean;
	isLoading?: boolean;
}

export function ConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "info",
	requireCaptcha = false,
	isLoading = false,
}: ConfirmModalProps) {
	const [captchaAnswer, setCaptchaAnswer] = useState("");
	const [captchaNumbers, setCaptchaNumbers] = useState<{ num1: number; num2: number }>({ num1: 0, num2: 0 });
	const [error, setError] = useState("");

	const generateCaptcha = useCallback(() => {
		// Generate two 2-digit numbers where sum is less than 99
		const num1 = Math.floor(Math.random() * 90) + 10; // 10-99
		const maxNum2 = Math.min(99 - num1, 99);
		const num2 = Math.floor(Math.random() * (maxNum2 - 10 + 1)) + 10; // 10 to maxNum2
		setCaptchaNumbers({ num1, num2 });
	}, []);

	// Generate captcha numbers when modal opens
	useEffect(() => {
		if (isOpen && requireCaptcha) {
			generateCaptcha();
			setCaptchaAnswer("");
			setError("");
		}
	}, [isOpen, requireCaptcha, generateCaptcha]);

	const handleConfirm = () => {
		if (requireCaptcha) {
			const correctAnswer = captchaNumbers.num1 + captchaNumbers.num2;
			const userAnswer = parseInt(captchaAnswer, 10);

			if (Number.isNaN(userAnswer) || userAnswer !== correctAnswer) {
				setError("Incorrect answer. Please try again.");
				generateCaptcha();
				setCaptchaAnswer("");
				return;
			}
		}

		onConfirm();
	};

	const getVariantStyles = () => {
		switch (variant) {
			case "danger":
				return {
					iconColor: "#ef4444",
					iconBg: "#fee2e2",
					confirmBg: "#ef4444",
					confirmHoverBg: "#dc2626",
				};
			case "warning":
				return {
					iconColor: "#f59e0b",
					iconBg: "#fef3c7",
					confirmBg: "#f59e0b",
					confirmHoverBg: "#d97706",
				};
			default:
				return {
					iconColor: "var(--primary)",
					iconBg: "var(--primary-light)",
					confirmBg: "var(--primary)",
					confirmHoverBg: "var(--primary-dark)",
				};
		}
	};

	const styles = getVariantStyles();

	const getIcon = () => {
		switch (variant) {
			case "danger":
				return (
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				);
			case "warning":
				return (
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				);
			default:
				return (
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="sm">
			<ModalHeader onClose={onClose}>{title}</ModalHeader>
			<ModalBody>
					<div className="flex gap-4">
						<div
							className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
							style={{
								background: styles.iconBg,
								color: styles.iconColor,
							}}
						>
							{getIcon()}
						</div>
						<div className="flex-1">
						<p className="text-14px text-text-secondary leading-relaxed m-0">{message}</p>

						{requireCaptcha && (
							<div className="mt-5">
								<label
									style={{
										display: "block",
										fontSize: "13px",
										fontWeight: "500",
										color: "var(--text-primary)",
										marginBottom: "8px",
									}}
								>
									To confirm, solve this math problem:
								</label>
								<div
									style={{
										padding: "12px 16px",
										background: "var(--surface-secondary)",
										borderRadius: "8px",
										marginBottom: "12px",
										textAlign: "center",
									}}
								>
									<span
										style={{
											fontSize: "20px",
											fontWeight: "700",
											color: "var(--text-primary)",
											fontFamily: "monospace",
										}}
									>
										{captchaNumbers.num1} + {captchaNumbers.num2} = ?
									</span>
								</div>
								<input
									type="number"
									value={captchaAnswer}
									onChange={(e) => {
										setCaptchaAnswer(e.target.value);
										setError("");
									}}
									placeholder="Enter the answer"
									style={{
										width: "100%",
										padding: "10px 14px",
										fontSize: "14px",
										border: `1px solid ${error ? "#ef4444" : "var(--border-primary)"}`,
										borderRadius: "6px",
										background: "var(--surface-primary)",
										color: "var(--text-primary)",
										outline: "none",
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" && captchaAnswer) {
											handleConfirm();
										}
									}}
								/>
								{error && (
									<p
										style={{
											fontSize: "13px",
											color: "#ef4444",
											marginTop: "8px",
											marginBottom: 0,
										}}
									>
										{error}
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			</ModalBody>
			<ModalFooter>
				<button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>
					{cancelText}
				</button>
				<button
					type="button"
					onClick={handleConfirm}
					disabled={isLoading || (requireCaptcha && !captchaAnswer)}
					className="px-5 py-2.5 text-14px font-medium rounded-md border-none text-white transition-all duration-150 inline-flex items-center gap-2"
					style={{
						cursor: isLoading || (requireCaptcha && !captchaAnswer) ? "not-allowed" : "pointer",
						background:
							isLoading || (requireCaptcha && !captchaAnswer)
								? "var(--surface-tertiary)"
								: styles.confirmBg,
						opacity: isLoading || (requireCaptcha && !captchaAnswer) ? 0.5 : 1,
					}}
					onMouseEnter={(e) => {
						if (!isLoading && !(requireCaptcha && !captchaAnswer)) {
							e.currentTarget.style.background = styles.confirmHoverBg;
						}
					}}
					onMouseLeave={(e) => {
						if (!isLoading && !(requireCaptcha && !captchaAnswer)) {
							e.currentTarget.style.background = styles.confirmBg;
						}
					}}
				>
					{isLoading && (
						<div className="spinner w-3.5 h-3.5 border-2 border-white border-t-transparent" />
					)}
					{confirmText}
				</button>
			</ModalFooter>
		</Modal>
	);
}

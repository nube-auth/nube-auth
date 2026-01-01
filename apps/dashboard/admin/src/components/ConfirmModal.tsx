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
				<div style={{ display: "flex", gap: "16px" }}>
					<div
						style={{
							width: "48px",
							height: "48px",
							borderRadius: "50%",
							background: styles.iconBg,
							color: styles.iconColor,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						{getIcon()}
					</div>
					<div style={{ flex: 1 }}>
						<p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6", margin: 0 }}>
							{message}
						</p>

						{requireCaptcha && (
							<div style={{ marginTop: "20px" }}>
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
					style={{
						padding: "10px 20px",
						fontSize: "14px",
						fontWeight: "500",
						borderRadius: "6px",
						border: "none",
						cursor: isLoading || (requireCaptcha && !captchaAnswer) ? "not-allowed" : "pointer",
						background:
							isLoading || (requireCaptcha && !captchaAnswer)
								? "var(--surface-tertiary)"
								: styles.confirmBg,
						color: "white",
						transition: "all 0.15s ease",
						display: "inline-flex",
						alignItems: "center",
						gap: "8px",
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
						<div
							className="spinner"
							style={{
								width: "14px",
								height: "14px",
								borderWidth: "2px",
								borderColor: "white transparent",
							}}
						/>
					)}
					{confirmText}
				</button>
			</ModalFooter>
		</Modal>
	);
}

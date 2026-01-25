import { useEffect, useState } from "react";
import { Button, Input, Label, Spinner, Icon, IconType } from "@proofa/components";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "./Modal";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    requireCaptcha?: boolean;
}

const variantStyles = {
	danger: {
		iconBg: "color-mix(in oklch, var(--danger) 12%, transparent)",
		iconText: "var(--danger)",
		buttonVariant: "danger" as const,
	},
	warning: {
		iconBg: "color-mix(in oklch, var(--warning) 12%, transparent)",
		iconText: "var(--warning)",
		buttonVariant: "secondary" as const,
	},
	info: {
		iconBg: "color-mix(in oklch, var(--info) 12%, transparent)",
		iconText: "var(--info)",
		buttonVariant: "primary" as const,
	},
} as const;

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
}: ConfirmModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [captchaNumbers, setCaptchaNumbers] = useState({ num1: 0, num2: 0 });
    const [captchaAnswer, setCaptchaAnswer] = useState("");
    const [error, setError] = useState("");

    const styles = variantStyles[variant];
    const isDisabled = isLoading || (requireCaptcha && !captchaAnswer);

    useEffect(() => {
        if (isOpen && requireCaptcha) {
            const num1 = Math.floor(Math.random() * 20) + 1;
            const num2 = Math.floor(Math.random() * 20) + 1;
            setCaptchaNumbers({ num1, num2 });
            setCaptchaAnswer("");
            setError("");
        }
    }, [isOpen, requireCaptcha]);

    const handleConfirm = async () => {
        if (requireCaptcha) {
            const expectedAnswer = captchaNumbers.num1 + captchaNumbers.num2;
            const userAnswer = Number.parseInt(captchaAnswer, 10);

            if (Number.isNaN(userAnswer) || userAnswer !== expectedAnswer) {
                setError("Incorrect answer. Please try again.");
                const num1 = Math.floor(Math.random() * 20) + 1;
                const num2 = Math.floor(Math.random() * 20) + 1;
                setCaptchaNumbers({ num1, num2 });
                setCaptchaAnswer("");
                return;
            }
        }

        try {
            setIsLoading(true);
            await onConfirm();
            onClose();
        } catch (_err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderIcon = () => {
        if (variant === "info") {
            return <Icon icon={IconType.Info} size={24} />;
        }

        if (variant === "warning") {
            return <Icon icon={IconType.UserWarning} size={24} />;
        }

        return <Icon icon={IconType.AlertCircle} size={24} />;
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>{title}</ModalHeader>
            <ModalBody>
                <div className="flex gap-4">
                    <div
						className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
						style={{ backgroundColor: styles.iconBg, color: styles.iconText }}
					>
						{renderIcon()}
					</div>
                    <div className="flex-1">
                        <p className="text-sm leading-relaxed m-0" style={{ color: "var(--muted)" }}>
							{message}
						</p>

                        {requireCaptcha && (
                            <div className="mt-5">
								<Label className="font-medium">To confirm, solve this math problem:</Label>
								<div
									className="p-3 rounded-lg mb-3 text-center"
									style={{ backgroundColor: "var(--accent)" }}
								>
									<span className="text-xl font-bold font-mono" style={{ color: "var(--foreground)" }}>
										{captchaNumbers.num1} + {captchaNumbers.num2} = ?
									</span>
								</div>
								<Input
									type="number"
									value={captchaAnswer}
									onChange={(e) => {
										setCaptchaAnswer(e.target.value);
										setError("");
									}}
									placeholder="Enter the answer"
									onKeyDown={(e) => {
										if (e.key === "Enter" && captchaAnswer) {
											handleConfirm();
										}
									}}
								/>
								{error && (
									<p className="text-sm mt-2 mb-0" style={{ color: "var(--danger)" }}>
										{error}
									</p>
								)}
							</div>
                        )}
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
					{cancelText}
				</Button>
				<Button
					type="button"
					variant={styles.buttonVariant}
					onClick={handleConfirm}
					disabled={isDisabled}
					progress={isLoading}
				>
					{isLoading && <Spinner className="size-4" />}
					{confirmText}
				</Button>
            </ModalFooter>
        </Modal>
    );
}

import { useEffect, useState } from "react";
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
        iconBg: "bg-[var(--danger-bg)]",
        iconText: "text-[var(--danger)]",
        buttonBg: "bg-danger",
        buttonHover: "hover:bg-danger-hover",
    },
    warning: {
        iconBg: "bg-[var(--warning-bg)]",
        iconText: "text-[var(--warning)]",
        buttonBg: "bg-warning",
        buttonHover: "hover:bg-warning-hover",
    },
    info: {
        iconBg: "bg-[var(--primary-light)]",
        iconText: "text-[var(--primary)]",
        buttonBg: "bg-primary",
        buttonHover: "hover:bg-primary-hover",
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
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderIcon = () => {
        const commonProps = {
            className: "w-6 h-6",
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
        } as const;

        if (variant === "info") {
            return (
                <svg {...commonProps}>
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            );
        }

        return (
            <svg {...commonProps}>
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
            </svg>
        );
    };

    if (!isOpen) return null;

    const buttonBase =
        "px-5 py-2.5 text-14px font-medium rounded-md border-none text-white transition-all duration-150 inline-flex items-center gap-2";
    const enabledClasses = `${styles.buttonBg} ${styles.buttonHover} cursor-pointer`;
    const disabledClasses = "bg-surface-tertiary opacity-50 cursor-not-allowed";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>{title}</ModalHeader>
            <ModalBody>
                <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${styles.iconBg} ${styles.iconText}`}>
                        {renderIcon()}
                    </div>
                    <div className="flex-1">
                        <p className="text-14px text-text-secondary leading-relaxed m-0">{message}</p>

                        {requireCaptcha && (
                            <div className="mt-5">
                                <label className="block text-13px font-medium text-text-primary mb-2">
                                    To confirm, solve this math problem:
                                </label>
                                <div className="p-3 bg-surface-secondary rounded-lg mb-3 text-center">
                                    <span className="text-20px font-bold text-text-primary font-mono">
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
                                    className={`w-full px-3.5 py-2.5 text-14px rounded-md bg-surface-primary text-text-primary outline-none ${
                                        error ? "border border-red-500" : "border border-border-primary"
                                    }`}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && captchaAnswer) {
                                            handleConfirm();
                                        }
                                    }}
                                />
                                {error && <p className="text-13px text-red-500 mt-2 mb-0">{error}</p>}
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
                    disabled={isDisabled}
                    className={`${buttonBase} ${isDisabled ? disabledClasses : enabledClasses}`}
                >
                    {isLoading && <div className="spinner w-3.5 h-3.5 border-2 border-white border-t-transparent" />}
                    {confirmText}
                </button>
            </ModalFooter>
        </Modal>
    );
}

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { AlertCircleIcon, InformationCircleIcon, UserWarningIcon } from "@hugeicons/core-free-icons";
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
        iconBg: "bg-error/10",
        iconText: "text-error",
        btnClass: "btn-error",
    },
    warning: {
        iconBg: "bg-warning/10",
        iconText: "text-warning",
        btnClass: "btn-warning",
    },
    info: {
        iconBg: "bg-primary/10",
        iconText: "text-primary",
        btnClass: "btn-primary",
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
        if (variant === "info") {
            return <Icon icon={InformationCircleIcon} size={24} />;
        }

        if (variant === "warning") {
            return <Icon icon={UserWarningIcon} size={24} />;
        }

        return <Icon icon={AlertCircleIcon} size={24} />;
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>{title}</ModalHeader>
            <ModalBody>
                <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg} ${styles.iconText}`}>
                        {renderIcon()}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-base-content/70 leading-relaxed m-0">{message}</p>

                        {requireCaptcha && (
                            <div className="mt-5">
                                <label className="label">
                                    <span className="label-text font-medium">To confirm, solve this math problem:</span>
                                </label>
                                <div className="p-3 bg-base-200 rounded-lg mb-3 text-center">
                                    <span className="text-xl font-bold text-base-content font-mono">
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
                                    className={`input input-bordered w-full ${error ? "input-error" : ""}`}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && captchaAnswer) {
                                            handleConfirm();
                                        }
                                    }}
                                />
                                {error && <p className="text-sm text-error mt-2 mb-0">{error}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <button type="button" onClick={onClose} className="btn btn-outline" disabled={isLoading}>
                    {cancelText}
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isDisabled}
                    className={`btn ${styles.btnClass}`}
                >
                    {isLoading && <span className="loading loading-spinner loading-sm" />}
                    {confirmText}
                </button>
            </ModalFooter>
        </Modal>
    );
}

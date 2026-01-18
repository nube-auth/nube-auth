import { createContext, type ReactNode, useContext, useState } from "react";
import { Icon, IconType } from "@proofa/components";

interface Toast {
	id: string;
	message: string;
	type: "success" | "error" | "info" | "warning";
}

interface ToastContextType {
	showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within ToastProvider");
	}
	return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = (message: string, type: Toast["type"] = "info") => {
		const id = Math.random().toString(36).substr(2, 9);
		const newToast: Toast = { id, message, type };

		setToasts((prev) => [...prev, newToast]);

		// Auto-remove after 5 seconds
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 5000);
	};

	const removeToast = (id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	};

	const getAlertClass = (type: Toast["type"]) => {
		switch (type) {
			case "success":
				return "alert-success";
			case "error":
				return "alert-error";
			case "warning":
				return "alert-warning";
			default:
				return "alert-info";
		}
	};

	const getIcon = (type: Toast["type"]) => {
		switch (type) {
			case "success":
				return <Icon icon={IconType.Tick02Icon} size={20} className="shrink-0" />;
			case "error":
				return <Icon icon={IconType.Cancel01Icon} size={20} className="shrink-0" />;
			case "warning":
				return <Icon icon={IconType.AlertCircleIcon} size={20} className="shrink-0" />;
			default:
				return <Icon icon={IconType.InformationCircleIcon} size={20} className="shrink-0" />;
		}
	};

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div className="toast toast-end toast-top z-10000">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`alert ${getAlertClass(toast.type)} shadow-lg animate-[slideInRight_0.3s_ease-out]`}
					>
						{getIcon(toast.type)}
						<span className="text-sm font-medium">{toast.message}</span>
						<button
							type="button"
							onClick={() => removeToast(toast.id)}
							className="btn btn-ghost btn-xs btn-circle"
						>
							<Icon icon={IconType.Cancel01Icon} size={16} />
						</button>
					</div>
				))}
			</div>
			<style>
				{`
					@keyframes slideInRight {
						from {
							transform: translateX(100%);
							opacity: 0;
						}
						to {
							transform: translateX(0);
							opacity: 1;
						}
					}
				`}
			</style>
		</ToastContext.Provider>
	);
}

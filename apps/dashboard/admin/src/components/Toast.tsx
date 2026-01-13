import { createContext, type ReactNode, useContext, useState } from "react";

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

	const getToastStyles = (type: Toast["type"]) => {
		switch (type) {
			case "success":
				return {
					bg: "#10b981",
					icon: (
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					),
				};
			case "error":
				return {
					bg: "#ef4444",
					icon: (
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					),
				};
			case "warning":
				return {
					bg: "#f59e0b",
					icon: (
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					),
				};
			default:
				return {
					bg: "var(--primary)",
					icon: (
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					),
				};
		}
	};

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div className="fixed top-5 right-5 z-[10000] flex flex-col gap-3 max-w-400px">
				{toasts.map((toast) => {
					const styles = getToastStyles(toast.type);
					return (
						<div
							key={toast.id}
							className="text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-[slideInRight_0.3s_ease-out]"
							style={{ background: styles.bg }}
						>
							<div className="w-5 h-5 flex-shrink-0">{styles.icon}</div>
							<p className="m-0 text-14px font-medium flex-1">{toast.message}</p>
							<button
								type="button"
								onClick={() => removeToast(toast.id)}
								className="bg-transparent border-none text-white cursor-pointer p-1 flex items-center opacity-80 hover:opacity-100 transition-opacity"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					);
				})}
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

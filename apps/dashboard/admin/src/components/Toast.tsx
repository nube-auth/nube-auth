import { createContext, type ReactNode, useContext } from "react";

/**
 * Legacy Toast API adapter for existing code.
 * Currently provides a simple context-based toast that logs to console.
 * Can be extended with a proper toast library later.
 */

interface ToastContextType {
	showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
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
	const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
		// Simple console implementation for now
		console.log(`[Toast ${type.toUpperCase()}] ${message}`);
		// TODO(@devendra): Integrate with Selia toast component when available
		// Tracking: https://github.com/nauvalazhar/selia/issues/...
	};

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
		</ToastContext.Provider>
	);
}

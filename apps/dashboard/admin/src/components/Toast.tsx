import { createContext, type ReactNode, useContext } from "react";
import { toastManager } from "@proofa/components";

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
		toastManager.add({ title: message, type });
	};

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
		</ToastContext.Provider>
	);
}

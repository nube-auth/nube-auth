import { type ReactNode, useEffect } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, children, size = "md" }: ModalProps) {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const sizeClass = size === "sm" ? "max-w-600px" : size === "lg" ? "max-w-1200px" : "max-w-900px";

	return (
		<div
			className="fixed top-0 left-260px right-0 bottom-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center z-[9999] p-8"
			onClick={onClose}
		>
			<div
				className={`bg-surface-primary rounded-xl ${sizeClass} w-full max-h-[calc(100vh-64px)] overflow-auto shadow-2xl border border-border-primary`}
				onClick={(e) => e.stopPropagation()}
			>
				{children}
			</div>
		</div>
	);
}

interface ModalHeaderProps {
	children: ReactNode;
	onClose?: () => void;
}

export function ModalHeader({ children, onClose }: ModalHeaderProps) {
	return (
		<div className="p-6 pb-4 border-b border-border-primary flex items-center justify-between">
			<h2 className="text-20px font-bold text-text-primary m-0">{children}</h2>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="p-2 bg-transparent border-none rounded-md cursor-pointer text-text-tertiary flex items-center justify-center transition-all duration-150 hover:bg-surface-secondary hover:text-text-primary"
				>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			)}
		</div>
	);
}

interface ModalBodyProps {
	children: ReactNode;
}

export function ModalBody({ children }: ModalBodyProps) {
	return <div className="p-6">{children}</div>;
}

interface ModalFooterProps {
	children: ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
	return (
		<div className="p-4 px-6 border-t border-border-primary flex items-center justify-end gap-3">
			{children}
		</div>
	);
}

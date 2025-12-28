import { useEffect, type ReactNode } from "react";

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

	const maxWidth = size === "sm" ? "400px" : size === "lg" ? "800px" : "500px";

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "rgba(0, 0, 0, 0.6)",
				backdropFilter: "blur(4px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
				padding: "20px",
			}}
			onClick={onClose}
		>
			<div
				style={{
					background: "var(--surface-primary)",
					borderRadius: "12px",
					maxWidth,
					width: "100%",
					maxHeight: "90vh",
					overflow: "auto",
					boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
					border: "1px solid var(--border-primary)",
				}}
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
		<div
			style={{
				padding: "24px 24px 16px",
				borderBottom: "1px solid var(--border-primary)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
				{children}
			</h2>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					style={{
						padding: "8px",
						background: "transparent",
						border: "none",
						borderRadius: "6px",
						cursor: "pointer",
						color: "var(--text-tertiary)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						transition: "all 0.15s ease",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = "var(--surface-secondary)";
						e.currentTarget.style.color = "var(--text-primary)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "transparent";
						e.currentTarget.style.color = "var(--text-tertiary)";
					}}
				>
					<svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
	return (
		<div style={{ padding: "24px" }}>
			{children}
		</div>
	);
}

interface ModalFooterProps {
	children: ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
	return (
		<div
			style={{
				padding: "16px 24px",
				borderTop: "1px solid var(--border-primary)",
				display: "flex",
				alignItems: "center",
				justifyContent: "flex-end",
				gap: "12px",
			}}
		>
			{children}
		</div>
	);
}

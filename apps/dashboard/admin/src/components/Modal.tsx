import { type ReactNode, useEffect, useRef } from "react";
import { Icon, IconType } from "@proofa/components";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, children, size = "md" }: ModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (isOpen) {
			dialog.showModal();
		} else {
			dialog.close();
		}
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

	const sizeClass = size === "sm" ? "max-w-600px" : size === "lg" ? "max-w-1200px" : "max-w-900px";

	return (
		<dialog
			ref={dialogRef}
			className="modal modal-middle"
			onClose={onClose}
		>
			<div className={`modal-box ${sizeClass} w-full max-h-[calc(100vh-64px)] p-0`}>
				{children}
			</div>
			<form method="dialog" className="modal-backdrop">
				<button type="button" onClick={onClose}>close</button>
			</form>
		</dialog>
	);
}

interface ModalHeaderProps {
	children: ReactNode;
	onClose?: () => void;
}

export function ModalHeader({ children, onClose }: ModalHeaderProps) {
	return (
		<div className="p-6 pb-4 border-b border-base-300 flex items-center justify-between">
			<h2 className="text-xl font-bold text-base-content m-0">{children}</h2>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="btn btn-ghost btn-sm btn-circle"
				>
					<Icon icon={IconType.Cancel01Icon} size={20} />
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
		<div className="modal-action p-4 px-6 border-t border-base-300">
			{children}
		</div>
	);
}

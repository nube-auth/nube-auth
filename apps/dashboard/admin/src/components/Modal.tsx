import { type ReactNode } from "react";
import {
	Dialog,
	DialogPopup,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@proofa/components";
import { Icon, IconType } from "@proofa/components";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	size?: "sm" | "md" | "lg";
}

export function Modal({ isOpen, onClose, children, size = "md" }: ModalProps) {
	// Size mapping for responsive breakpoints
	const sizeClass =
		size === "sm"
			? "w-96"
			: size === "lg"
				? "w-2xl"
				: "w-xl";

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogPopup className={sizeClass}>
				{children}
			</DialogPopup>
		</Dialog>
	);
}

interface ModalHeaderProps {
	children: ReactNode;
	onClose?: () => void;
}

export function ModalHeader({ children, onClose }: ModalHeaderProps) {
	return (
		<DialogHeader className="flex items-center justify-between pr-8">
			<DialogTitle>{children}</DialogTitle>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
				>
					<Icon icon={IconType.Close} size={20} />
					<span className="sr-only">Close</span>
				</button>
			)}
		</DialogHeader>
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
	return <DialogFooter className="border-t pt-4">{children}</DialogFooter>;
}

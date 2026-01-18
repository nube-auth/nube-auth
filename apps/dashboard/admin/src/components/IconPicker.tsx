import { useState } from "react";
import { Icon, IconType } from "@proofa/components";
import type { IconSvgElement } from "@hugeicons/react";
import {
	GridIcon,
	CodeIcon,
	DatabaseIcon,
	CloudIcon,
	Rocket01Icon,
	SecurityCheckIcon,
	ShieldCheck,
	PackageIcon,
	Folder01Icon,
	FlashIcon,
	StarIcon,
	Settings02Icon,
	DashboardSquare02Icon,
	WorkflowSquare03Icon,
} from "@hugeicons/core-free-icons";

export interface IconOption {
	id: string;
	icon: IconSvgElement;
	name: string;
}

export const AVAILABLE_ICONS: IconOption[] = [
	{ id: "application", icon: DashboardSquare02Icon, name: "Application" },
	{ id: "grid", icon: GridIcon, name: "Grid" },
	{ id: "code", icon: CodeIcon, name: "Code" },
	{ id: "database", icon: DatabaseIcon, name: "Database" },
	{ id: "cloud", icon: CloudIcon, name: "Cloud" },
	{ id: "rocket", icon: Rocket01Icon, name: "Rocket" },
	{ id: "security", icon: SecurityCheckIcon, name: "Security" },
	{ id: "shield", icon: ShieldCheck, name: "Shield" },
	{ id: "package", icon: PackageIcon, name: "Package" },
	{ id: "workflow", icon: WorkflowSquare03Icon, name: "Workflow" },
	{ id: "folder", icon: Folder01Icon, name: "Folder" },
	{ id: "flash", icon: FlashIcon, name: "Flash" },
	{ id: "star", icon: StarIcon, name: "Star" },
	{ id: "settings", icon: Settings02Icon, name: "Settings" },
];

interface IconPickerProps {
	selectedIconId?: string;
	onSelect: (iconId: string) => void;
	label?: string;
}

export function IconPicker({ selectedIconId = "application", onSelect, label = "Icon" }: IconPickerProps) {
	const [isOpen, setIsOpen] = useState(false);

	const selectedIcon = AVAILABLE_ICONS.find((i) => i.id === selectedIconId) || AVAILABLE_ICONS[0];

	if (!selectedIcon) {
		return null;
	}

	return (
		<div className="form-group">
			<label>{label}</label>
			<div className="relative">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="w-full px-3.5 py-2.5 text-13px border border-card-border rounded-md bg-card-bg text-text-primary transition-all hover:border-card-hover-border flex items-center gap-3"
				>
					<div className="w-9 h-9 bg-surface-secondary rounded-md flex items-center justify-center">
						<Icon icon={selectedIcon.icon} size={20} className="text-primary" />
					</div>
					<span className="flex-1 text-left">{selectedIcon.name}</span>
					<svg
						className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{isOpen && (
					<>
						{/* Backdrop */}
						<div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

						{/* Dropdown */}
				<div className="absolute top-full left-0 right-0 mt-2 bg-content-bg border border-card-border rounded-lg shadow-xl z-50 max-h-[320px] overflow-y-auto">
							<div className="grid grid-cols-4 gap-2 p-3">
								{AVAILABLE_ICONS.map((iconOption) => (
									<button
										key={iconOption.id}
										type="button"
										onClick={() => {
											onSelect(iconOption.id);
											setIsOpen(false);
										}}
										className={`flex flex-col items-center gap-2 p-3 rounded-md transition-all hover:bg-surface-hover ${
											iconOption.id === selectedIconId
												? "bg-surface-secondary border-2 border-primary"
												: "border-2 border-transparent"
										}`}
									>
										<div
											className={`w-10 h-10 rounded-md flex items-center justify-center ${
												iconOption.id === selectedIconId
													? "bg-surface-secondary"
													: "bg-surface-secondary"
											}`}
										>
											<Icon
												icon={iconOption.icon}
												size={20}
												className={iconOption.id === selectedIconId ? "text-primary" : "text-text-secondary"}
											/>
										</div>
										<span className="text-11px text-text-secondary text-center">
											{iconOption.name}
										</span>
									</button>
								))}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

// Helper function to get icon by ID
export function getIconById(iconId: string): IconSvgElement {
	const iconOption = AVAILABLE_ICONS.find((i) => i.id === iconId);
	return iconOption ? iconOption.icon : DashboardSquare02Icon;
}

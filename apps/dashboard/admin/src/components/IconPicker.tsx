import { useState } from "react";
import { Icon, IconType, type IconTypeName } from "@proofa/components";

export interface IconOption {
	id: string;
	iconName: IconTypeName;
	name: string;
}

export const AVAILABLE_ICONS: IconOption[] = [
	{ id: "application", iconName: "Dashboard", name: "Application" },
	{ id: "grid", iconName: "Grid", name: "Grid" },
	{ id: "code", iconName: "Code", name: "Code" },
	{ id: "folder", iconName: "Folder", name: "Folder" },
	{ id: "cloud", iconName: "CloudUpload", name: "Cloud" },
	{ id: "rocket", iconName: "Flash", name: "Rocket" },
	{ id: "security", iconName: "SecurityCheck", name: "Security" },
	{ id: "shield", iconName: "Shield", name: "Shield" },
	{ id: "bookmark", iconName: "Bookmark", name: "Package" },
	{ id: "menu", iconName: "Menu", name: "Workflow" },
	{ id: "settings", iconName: "Settings", name: "Settings" },
	{ id: "lock", iconName: "Lock", name: "Lock" },
	{ id: "star", iconName: "Star", name: "Star" },
	{ id: "bell", iconName: "Bell", name: "Notification" },
	{ id: "help", iconName: "Help", name: "Help" },
	{ id: "download", iconName: "Download", name: "Download" },
	{ id: "search", iconName: "Search", name: "Search" },
	{ id: "user", iconName: "User", name: "User" },
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
						<Icon icon={IconType[selectedIcon.iconName]} size={20} className="text-primary" />
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
						<div 
							className="absolute top-full left-0 right-0 mt-2 border border-card-border rounded-lg shadow-xl z-50 max-h-[320px] overflow-y-auto"
							style={{ backgroundColor: 'var(--card)' }}
						>
							<div className="grid grid-cols-6 gap-2 p-3">
								{AVAILABLE_ICONS.map((iconOption) => (
									<button
										key={iconOption.id}
										type="button"
										onClick={() => {
											onSelect(iconOption.id);
											setIsOpen(false);
										}}
										className={`flex flex-col items-center gap-2 p-3 rounded-md transition-all cursor-pointer ${
											iconOption.id === selectedIconId
												? "bg-surface-secondary border-2 border-primary"
												: "border-2 border-transparent hover:bg-surface-hover hover:border-border"
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
												icon={IconType[iconOption.iconName]}
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
export function getIconById(iconId: string) {
	const iconOption = AVAILABLE_ICONS.find((i) => i.id === iconId);
	return iconOption ? IconType[iconOption.iconName] : IconType.Dashboard;
}

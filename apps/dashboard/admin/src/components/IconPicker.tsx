import { useState, useMemo } from "react";
import { Icon, IconType, type IconTypeName, Label, Input } from "@nube-auth/components";

export interface IconOption {
	id: string;
	iconName: IconTypeName;
	name: string;
	category: string;
	keywords: string[];
}

export const AVAILABLE_ICONS: IconOption[] = [
	{ id: "dashboard", iconName: "Dashboard", name: "Dashboard", category: "Interface", keywords: ["home", "main", "panel"] },
	{ id: "grid", iconName: "Grid", name: "Grid", category: "Interface", keywords: ["layout", "tiles", "blocks"] },
	{ id: "code", iconName: "Code", name: "Code", category: "Development", keywords: ["programming", "developer", "script"] },
	{ id: "folder", iconName: "Folder", name: "Folder", category: "Files", keywords: ["directory", "files", "storage"] },
	{ id: "cloud", iconName: "CloudUpload", name: "Cloud", category: "Files", keywords: ["upload", "storage", "sync"] },
	{ id: "flash", iconName: "Flash", name: "Flash", category: "Interface", keywords: ["lightning", "fast", "speed", "rocket"] },
	{ id: "security", iconName: "SecurityCheck", name: "Security", category: "Security", keywords: ["protection", "safe", "verified"] },
	{ id: "shield", iconName: "Shield", name: "Shield", category: "Security", keywords: ["protection", "guard", "defense"] },
	{ id: "bookmark", iconName: "Bookmark", name: "Bookmark", category: "Interface", keywords: ["save", "favorite", "mark"] },
	{ id: "menu", iconName: "Menu", name: "Menu", category: "Interface", keywords: ["navigation", "hamburger", "list"] },
	{ id: "settings", iconName: "Settings", name: "Settings", category: "Interface", keywords: ["config", "preferences", "options"] },
	{ id: "lock", iconName: "Lock", name: "Lock", category: "Security", keywords: ["secure", "private", "password"] },
	{ id: "star", iconName: "Star", name: "Star", category: "Interface", keywords: ["favorite", "rating", "bookmark"] },
	{ id: "bell", iconName: "Bell", name: "Bell", category: "Interface", keywords: ["notification", "alert", "reminder"] },
	{ id: "help", iconName: "Help", name: "Help", category: "Interface", keywords: ["info", "question", "support"] },
	{ id: "download", iconName: "Download", name: "Download", category: "Files", keywords: ["save", "export", "get"] },
	{ id: "search", iconName: "Search", name: "Search", category: "Interface", keywords: ["find", "lookup", "magnify"] },
	{ id: "user", iconName: "User", name: "User", category: "Users", keywords: ["person", "profile", "account"] },
	{ id: "users", iconName: "UserGroup", name: "Users", category: "Users", keywords: ["people", "team", "group"] },
	{ id: "user-add", iconName: "UserAdd", name: "Add User", category: "Users", keywords: ["invite", "new", "create"] },
	{ id: "user-multiple", iconName: "UserMultiple", name: "Multiple Users", category: "Users", keywords: ["team", "group", "people"] },
	{ id: "user-warning", iconName: "UserWarning", name: "User Warning", category: "Users", keywords: ["alert", "caution", "error"] },
	{ id: "home", iconName: "Home", name: "Home", category: "Interface", keywords: ["house", "main", "start"] },
	{ id: "computer", iconName: "Computer", name: "Computer", category: "Devices", keywords: ["desktop", "pc", "monitor"] },
	{ id: "phone", iconName: "Phone", name: "Phone", category: "Devices", keywords: ["mobile", "smartphone", "device"] },
	{ id: "check", iconName: "Check", name: "Check", category: "Interface", keywords: ["tick", "done", "complete", "success"] },
	{ id: "check-circle", iconName: "CheckCircle", name: "Check Circle", category: "Interface", keywords: ["verified", "approved", "success"] },
	{ id: "check-badge", iconName: "CheckBadge", name: "Check Badge", category: "Interface", keywords: ["verified", "certified", "approved"] },
	{ id: "alert", iconName: "Alert", name: "Alert", category: "Interface", keywords: ["warning", "caution", "attention"] },
	{ id: "alert-circle", iconName: "AlertCircle", name: "Alert Circle", category: "Interface", keywords: ["info", "warning", "notification"] },
	{ id: "info", iconName: "Info", name: "Info", category: "Interface", keywords: ["information", "help", "details"] },
	{ id: "cancel", iconName: "Cancel", name: "Cancel", category: "Interface", keywords: ["close", "remove", "delete", "x"] },
	{ id: "add", iconName: "Add", name: "Add", category: "Interface", keywords: ["plus", "new", "create"] },
	{ id: "edit", iconName: "Edit", name: "Edit", category: "Interface", keywords: ["pencil", "modify", "change"] },
	{ id: "delete", iconName: "Delete", name: "Delete", category: "Interface", keywords: ["trash", "remove", "bin"] },
	{ id: "copy", iconName: "Copy", name: "Copy", category: "Interface", keywords: ["duplicate", "clone", "paste"] },
	{ id: "refresh", iconName: "Refresh", name: "Refresh", category: "Interface", keywords: ["reload", "sync", "update"] },
	{ id: "rotate", iconName: "RotateClockwise", name: "Rotate", category: "Interface", keywords: ["spin", "turn", "cycle"] },
	{ id: "filter", iconName: "Filter", name: "Filter", category: "Interface", keywords: ["sort", "organize", "funnel"] },
	{ id: "logout", iconName: "Logout", name: "Logout", category: "Interface", keywords: ["signout", "exit", "leave"] },
	{ id: "layers", iconName: "Layers", name: "Layers", category: "Interface", keywords: ["stack", "levels", "group"] },
	{ id: "layout-grid", iconName: "LayoutGrid", name: "Layout Grid", category: "Interface", keywords: ["tiles", "blocks", "grid"] },
	{ id: "dollar", iconName: "DollarCircle", name: "Dollar", category: "Finance", keywords: ["money", "payment", "price", "currency"] },
	{ id: "credit-card", iconName: "CreditCard", name: "Credit Card", category: "Finance", keywords: ["payment", "card", "billing"] },
	{ id: "ticket", iconName: "Ticket", name: "Ticket", category: "Commerce", keywords: ["coupon", "voucher", "pass"] },
	{ id: "license", iconName: "License", name: "License", category: "Security", keywords: ["certificate", "permit", "key"] },
	{ id: "key", iconName: "Key", name: "Key", category: "Security", keywords: ["password", "access", "unlock"] },
	{ id: "shield-key", iconName: "ShieldKey", name: "Shield Key", category: "Security", keywords: ["secure", "protected", "auth"] },
	{ id: "arrow-right", iconName: "ArrowRight", name: "Arrow Right", category: "Arrows", keywords: ["next", "forward", "go"] },
	{ id: "arrow-left", iconName: "ArrowLeft", name: "Arrow Left", category: "Arrows", keywords: ["back", "previous", "return"] },
	{ id: "arrow-up", iconName: "ArrowUp", name: "Arrow Up", category: "Arrows", keywords: ["increase", "rise", "top"] },
	{ id: "arrow-down", iconName: "ArrowDown", name: "Arrow Down", category: "Arrows", keywords: ["decrease", "fall", "bottom"] },
	{ id: "return", iconName: "ReturnRequest", name: "Return", category: "Interface", keywords: ["back", "undo", "revert"] },
	{ id: "export", iconName: "FileExport", name: "Export", category: "Files", keywords: ["download", "save", "output"] },
	{ id: "test-tube", iconName: "TestTube", name: "Test Tube", category: "Science", keywords: ["experiment", "lab", "testing"] },
	{ id: "book", iconName: "BookOpen", name: "Book", category: "Education", keywords: ["read", "documentation", "manual"] },
	{ id: "chart", iconName: "ChartColumn", name: "Chart", category: "Analytics", keywords: ["graph", "statistics", "data"] },
	{ id: "sun", iconName: "Sun", name: "Sun", category: "Interface", keywords: ["light", "day", "brightness"] },
	{ id: "moon", iconName: "Moon", name: "Moon", category: "Interface", keywords: ["dark", "night", "theme"] },
	{ id: "clock", iconName: "Clock", name: "Clock", category: "Interface", keywords: ["time", "schedule", "timer"] },
	{ id: "eye", iconName: "Eye", name: "Eye", category: "Interface", keywords: ["view", "visible", "show"] },
	{ id: "google", iconName: "Google", name: "Google", category: "Brands", keywords: ["oauth", "login", "auth"] },
	{ id: "github", iconName: "GitHub", name: "GitHub", category: "Brands", keywords: ["git", "code", "repository"] },
	{ id: "stripe", iconName: "Stripe", name: "Stripe", category: "Brands", keywords: ["payment", "billing", "checkout"] },
	{ id: "nextjs", iconName: "NextJS", name: "Next.js", category: "Brands", keywords: ["react", "framework", "web"] },
	{ id: "react", iconName: "React", name: "React", category: "Brands", keywords: ["javascript", "library", "ui"] },
	{ id: "javascript", iconName: "JavaScript", name: "JavaScript", category: "Brands", keywords: ["js", "programming", "code"] },
	{ id: "flutter", iconName: "Flutter", name: "Flutter", category: "Brands", keywords: ["mobile", "app", "dart"] },
	{ id: "nodejs", iconName: "NodeJS", name: "Node.js", category: "Brands", keywords: ["javascript", "backend", "server"] },
	{ id: "tailwind", iconName: "Tailwind", name: "Tailwind", category: "Brands", keywords: ["css", "styling", "design"] },
];

interface IconPickerProps {
	selectedIconId?: string;
	onSelect: (iconId: string) => void;
	label?: string;
}

export function IconPicker({ selectedIconId = "dashboard", onSelect, label = "Icon" }: IconPickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string>("All");

	const selectedIcon = AVAILABLE_ICONS.find((i) => i.id === selectedIconId) || AVAILABLE_ICONS[0];

	const categories = useMemo(() => {
		const cats = new Set(AVAILABLE_ICONS.map(icon => icon.category));
		return ["All", ...Array.from(cats).sort()];
	}, []);

	const filteredIcons = useMemo(() => {
		let icons = AVAILABLE_ICONS;

		if (selectedCategory !== "All") {
			icons = icons.filter(icon => icon.category === selectedCategory);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			icons = icons.filter(icon => 
				icon.name.toLowerCase().includes(query) ||
				icon.category.toLowerCase().includes(query) ||
				icon.keywords.some(keyword => keyword.toLowerCase().includes(query))
			);
		}

		return icons;
	}, [searchQuery, selectedCategory]);

	if (!selectedIcon) {
		return null;
	}

	return (
		<div className="space-y-1.5">
			{label && <Label>{label}</Label>}
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
							className="absolute top-full left-0 right-0 mt-2 border border-card-border rounded-lg shadow-xl z-50"
							style={{ backgroundColor: 'var(--card)' }}
						>
							{/* Search and Filter Header */}
							<div className="p-3 border-b border-card-border space-y-3">
								<div className="relative">
									<Icon 
										icon={IconType.Search} 
										size={16} 
										className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" 
									/>
									<Input
										type="text"
										placeholder="Search icons..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-9 pr-3 py-2 text-13px w-full"
										autoFocus
									/>
								</div>
								
								{/* Category Filter */}
								<div className="flex flex-wrap gap-1.5">
									{categories.map((category) => (
										<button
											key={category}
											type="button"
											onClick={() => setSelectedCategory(category)}
											className={`px-2.5 py-1 text-11px rounded-md transition-all ${
												selectedCategory === category
													? "bg-primary text-white"
														: "bg-surface-secondary text-muted hover:bg-surface-hover"
											}`}
										>
											{category}
										</button>
									))}
								</div>
							</div>

							{/* Icons Grid */}
							<div className="max-h-[400px] overflow-y-auto">
								{filteredIcons.length > 0 ? (
									<div className="grid grid-cols-6 gap-2 p-3">
										{filteredIcons.map((iconOption) => (
											<button
												key={iconOption.id}
												type="button"
												onClick={() => {
													onSelect(iconOption.id);
													setIsOpen(false);
													setSearchQuery("");
													setSelectedCategory("All");
												}}
												className={`flex flex-col items-center gap-2 p-3 rounded-md transition-all cursor-pointer ${
													iconOption.id === selectedIconId
														? "bg-surface-secondary border-2 border-primary"
														: "border-2 border-transparent hover:bg-surface-hover hover:border-border"
												}`}
												title={`${iconOption.name} - ${iconOption.category}`}
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
														className={iconOption.id === selectedIconId ? "text-primary" : "text-muted"}
													/>
												</div>
												<span className="text-11px text-muted text-center line-clamp-2">
													{iconOption.name}
												</span>
											</button>
										))}
									</div>
								) : (
									<div className="p-8 text-center">
									<Icon icon={IconType.Search} size={32} className="text-muted mx-auto mb-2" />
									<p className="text-13px text-muted">No icons found</p>
									<p className="text-11px text-muted mt-1">Try a different search term</p>
									</div>
								)}
							</div>

							{/* Footer */}
							<div className="p-2 border-t border-card-border bg-surface-secondary text-center">
								<p className="text-11px text-muted">
									{filteredIcons.length} of {AVAILABLE_ICONS.length} icons
								</p>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

// Helper function to get icon by ID
export function getIconById(iconId: string): IconTypeName {
	const iconOption = AVAILABLE_ICONS.find((i) => i.id === iconId);
	return iconOption ? iconOption.iconName : "Dashboard";
}

// Helper function to get icon name for display
export function getIconNameById(iconId: string): string {
	const iconOption = AVAILABLE_ICONS.find((i) => i.id === iconId);
	return iconOption ? iconOption.name : "Dashboard";
}

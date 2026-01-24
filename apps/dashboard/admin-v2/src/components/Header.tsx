import { Button } from "@proofa/components";
import { Breadcrumbs } from "./Breadcrumbs";

// Icon placeholders
const MenuIcon = () => <span>☰</span>;
const CloseIcon = () => <span>✕</span>;
const SunIcon = () => <span>☀️</span>;
const MoonIcon = () => <span>🌙</span>;

interface AppHeaderProps {
	sidebarOpen: boolean;
	onSidebarToggle: () => void;
	theme: "light" | "dark";
	onToggleTheme: () => void;
}

export function AppHeader({
	sidebarOpen,
	onSidebarToggle,
	theme,
	onToggleTheme,
}: AppHeaderProps) {
	return (
		<header className="app-header">
			{/* Sidebar toggle (mobile) */}
			<Button
				variant="plain"
				size="sm-icon"
				onClick={onSidebarToggle}
				className="lg:hidden"
			>
				{sidebarOpen ? <CloseIcon /> : <MenuIcon />}
			</Button>

			{/* Breadcrumbs */}
			<Breadcrumbs />

			{/* Spacer */}
			<div className="flex-1" />

			{/* Theme toggle */}
			<Button
				variant="plain"
				size="sm-icon"
				onClick={onToggleTheme}
				aria-label="Toggle theme"
			>
				{theme === "light" ? <MoonIcon /> : <SunIcon />}
			</Button>
		</header>
	);
}

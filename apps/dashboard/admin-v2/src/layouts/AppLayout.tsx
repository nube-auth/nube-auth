import { useState, useEffect, type ReactNode } from "react";
import { AppSidebar } from "@/components/Sidebar";
import { AppHeader } from "@/components/Header";

interface AppLayoutProps {
	children: ReactNode;
	theme: "light" | "dark";
	onToggleTheme: () => void;
}

export function AppLayout({ children, theme, onToggleTheme }: AppLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(true);

	// Responsive sidebar behavior
	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 1024) {
				setSidebarOpen(false);
			} else {
				setSidebarOpen(true);
			}
		};

		handleResize(); // Initial check
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const handleSidebarToggle = () => {
		setSidebarOpen(!sidebarOpen);
	};

	return (
		<div className="app-layout">
			{/* Mobile backdrop overlay */}
			<div
				className={`mobile-backdrop ${sidebarOpen ? "is-visible" : ""}`}
				onClick={handleSidebarToggle}
			/>

			{/* Sidebar */}
			<aside className={`app-sidebar ${sidebarOpen ? "is-open" : ""}`}>
				<AppSidebar />
			</aside>

			{/* Main content area */}
			<main className="app-main">
				{/* Top header */}
				<AppHeader
					sidebarOpen={sidebarOpen}
					onSidebarToggle={handleSidebarToggle}
					theme={theme}
					onToggleTheme={onToggleTheme}
				/>

				{/* Page content */}
				<div className="app-content">{children}</div>
			</main>
		</div>
	);
}

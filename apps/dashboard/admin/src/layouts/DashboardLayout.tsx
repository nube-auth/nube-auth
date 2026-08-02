import { Button, cn } from "@nube-auth/components";
import { type ReactNode, useEffect, useState } from "react";

// Panel icons for sidebar toggle
function PanelLeftClose() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M9 3v18" />
			<path d="m16 15-3-3 3-3" />
		</svg>
	);
}

function PanelLeftOpen() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M9 3v18" />
			<path d="m15 9 3 3-3 3" />
		</svg>
	);
}

export interface DashboardLayoutProps {
	children: ReactNode;
	sidebar: ReactNode;
	topBar?: ReactNode;
}

export function DashboardLayout({ children, sidebar, topBar }: DashboardLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(true);

	useEffect(() => {
		const windowResize = () => {
			if (window.innerWidth < 1024) {
				setSidebarOpen(false);
			} else {
				setSidebarOpen(true);
			}
		};

		windowResize();
		window.addEventListener("resize", windowResize);
		return () => window.removeEventListener("resize", windowResize);
	}, []);

	function handleSidebarToggle() {
		setSidebarOpen(!sidebarOpen);
	}

	return (
		<>
			{/* Backdrop overlay for mobile */}
			<div
				className={cn(
					"fixed inset-0 bg-black backdrop-blur-sm z-10 transition-all",
					"max-lg:block hidden",
					sidebarOpen ? "opacity-40 visible" : "opacity-0 invisible",
				)}
				onClick={handleSidebarToggle}
			/>

			{/* Sidebar */}
			<div
				className={cn(
					"fixed top-0 z-50 w-full max-w-72 md:w-72 h-dvh *:h-full transition-all border-r border-border",
					sidebarOpen ? "left-0" : "-left-full",
				)}
			>
				{sidebar}
			</div>

			{/* Main content */}
			<main className={cn("transition-all", sidebarOpen ? "xl:ml-72" : "xl:ml-0")}>
				{/* Top navigation bar */}
				<nav className={cn("h-16 flex items-center gap-2.5 px-4 xl:px-6 border-b border-border")}>
					<Button variant="plain" size="sm-icon" onClick={handleSidebarToggle}>
						{sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
					</Button>
					{topBar}
				</nav>

				{/* Page content */}
				<div className={cn("min-h-[calc(100vh-4rem)] flex flex-col gap-6 px-4 xl:px-6 py-6 max-w-7xl mx-auto")}>
					{children}
				</div>
			</main>
		</>
	);
}

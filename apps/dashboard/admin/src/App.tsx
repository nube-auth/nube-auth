import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LicensesPage } from "./pages/Licenses";
import { LoginPage } from "./pages/Login";
import { ProjectDetailPage } from "./pages/ProjectDetail";
import { ProjectsPage } from "./pages/Projects";

const queryClient = new QueryClient();

// Theme hook
function useTheme() {
	const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
		if (typeof window !== "undefined") {
			return (localStorage.getItem("theme") as "light" | "dark" | "system") || "system";
		}
		return "system";
	});

	useEffect(() => {
		const root = document.documentElement;
		
		if (theme === "system") {
			root.removeAttribute("data-theme");
			localStorage.removeItem("theme");
		} else {
			root.setAttribute("data-theme", theme);
			localStorage.setItem("theme", theme);
		}
	}, [theme]);

	return { theme, setTheme };
}

// Simple user API hook for auth check
function useMe() {
	return useQuery({
		queryKey: ["me"],
		queryFn: async () => {
			const res = await fetch("/api/me", { credentials: "include" });
			if (!res.ok) throw new Error("Not authenticated");
			return res.json();
		},
	});
}

function SidebarLink({ to, children, icon }: { to: string; children: React.ReactNode; icon: React.ReactNode }) {
	const location = useLocation();
	const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

	return (
		<Link to={to} className={`sidebar-link ${isActive ? "active" : ""}`}>
			{icon}
			{children}
		</Link>
	);
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
	const { data, isLoading } = useMe();
	const { theme, setTheme } = useTheme();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="spinner" style={{ margin: "0 auto 16px" }} />
					<p style={{ color: "var(--text-secondary)" }}>Loading...</p>
				</div>
			</div>
		);
	}

	if (!data) {
		return <Navigate to="/login" replace />;
	}

	const initials = data.name
		? data.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: data.email?.charAt(0).toUpperCase() || "U";

	const cycleTheme = () => {
		if (theme === "system") setTheme("light");
		else if (theme === "light") setTheme("dark");
		else setTheme("system");
	};

	const getThemeIcon = () => {
		if (theme === "light") {
			return (
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Light mode">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
				</svg>
			);
		}
		if (theme === "dark") {
			return (
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Dark mode">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
				</svg>
			);
		}
		return (
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="System theme">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
			</svg>
		);
	};

	return (
		<div className="app-layout">
			{/* Sidebar */}
			<aside className="sidebar">
				<div className="sidebar-header">
					<Link to="/projects" className="sidebar-logo">
						<img src="/favicon.png" alt="Proofa" className="sidebar-logo-img" />
						<div className="sidebar-logo-text">
							<span className="sidebar-logo-name">Proofa</span>
							<span className="sidebar-logo-badge">Admin Console</span>
						</div>
					</Link>
				</div>

				{/* Project Selector */}
				<div className="project-selector">
					<div className="project-selector-info">
						<div className="project-selector-icon">P</div>
						<span className="project-selector-name">All Projects</span>
					</div>
					<div className="project-selector-env">Development</div>
				</div>

				<nav className="sidebar-nav">
					<div className="sidebar-section">
						<div className="sidebar-section-title">Overview</div>
						<SidebarLink
							to="/projects"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
								</svg>
							}
						>
							Home
						</SidebarLink>
					</div>

					<div className="sidebar-section">
						<div className="sidebar-section-title">Management</div>
						<SidebarLink
							to="/projects"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
								</svg>
							}
						>
							Projects
						</SidebarLink>
						<SidebarLink
							to="/licenses"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
								</svg>
							}
						>
							Licenses
						</SidebarLink>
					</div>

					<div className="sidebar-section">
						<div className="sidebar-section-title">Configuration</div>
						<SidebarLink
							to="/settings/authentication"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
							}
						>
							Authentication
						</SidebarLink>
						<SidebarLink
							to="/settings/branding"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
								</svg>
							}
						>
							Branding
						</SidebarLink>
						<SidebarLink
							to="/settings/security"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							}
						>
							Security
						</SidebarLink>
					</div>

					<div className="sidebar-section">
						<div className="sidebar-section-title">Support</div>
						<SidebarLink
							to="/support"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
							}
						>
							Get Support
						</SidebarLink>
						<SidebarLink
							to="/feedback"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
								</svg>
							}
						>
							Give Feedback
						</SidebarLink>
					</div>
				</nav>

				{/* Sidebar Footer - User */}
				<div className="sidebar-footer">
					<div className="sidebar-user">
						<div className="sidebar-avatar">{initials}</div>
						<div className="sidebar-user-info">
							<div className="sidebar-user-name">{data.name || "Admin"}</div>
							<div className="sidebar-user-email">{data.email}</div>
						</div>
						<a href="/api/auth/logout" title="Logout" style={{ color: "var(--sidebar-text)", padding: "4px" }}>
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: "18px", height: "18px" }}>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
							</svg>
						</a>
					</div>
				</div>
			</aside>

			{/* Main Content */}
			<main className="main-content">
				{/* Top Header */}
				<header className="top-header">
					<div className="top-header-left">
						<nav className="breadcrumb">
							<Link to="/projects" className="breadcrumb-item">Dashboard</Link>
						</nav>
					</div>
					<div className="top-header-right">
						<button 
							type="button"
							onClick={cycleTheme} 
							className="header-btn theme-toggle" 
							title={`Current: ${theme} mode (click to change)`}
						>
							{getThemeIcon()}
							<span className="theme-label">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
						</button>
						<a href="https://docs.proofa.io" target="_blank" rel="noopener noreferrer" className="header-btn">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
							</svg>
							Docs
						</a>
						<button type="button" className="header-btn header-btn-primary">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							New Project
						</button>
					</div>
				</header>

				{/* Page Content */}
				<div className="page-content">{children}</div>
			</main>
		</div>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route
						path="/projects"
						element={
							<ProtectedLayout>
								<ProjectsPage />
							</ProtectedLayout>
						}
					/>
					<Route
						path="/projects/:projectId"
						element={
							<ProtectedLayout>
								<ProjectDetailPage />
							</ProtectedLayout>
						}
					/>
					<Route
						path="/licenses"
						element={
							<ProtectedLayout>
								<LicensesPage />
							</ProtectedLayout>
						}
					/>
					<Route path="/" element={<Navigate to="/projects" replace />} />
				</Routes>
			</BrowserRouter>
		</QueryClientProvider>
	);
}

export default App;

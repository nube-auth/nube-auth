import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import config from "./config";
import { useLogout, useProjects } from "./hooks/api";
import { AppDetailPage } from "./pages/AppDetail";
import { AppLicensesPage } from "./pages/AppLicenses";
import { AppSetupPage } from "./pages/AppSetup";
import { AppSettingsPage } from "./pages/AppSettings";
import { AppUsersPage } from "./pages/AppUsers";
import { LicensesPage } from "./pages/Licenses";
import { LoginPage } from "./pages/Login";
import { OnboardingPage } from "./pages/Onboarding";
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

// User auth hook using Proofa client
function useMe() {
	return useQuery({
		queryKey: ["admin", "me"],
		queryFn: async () => {
			const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";
			const res = await fetch(`${gatewayUrl}/v1/admin/me`, { credentials: "include" });
			if (!res.ok) throw new Error("Unauthorized");
			return res.json() as Promise<{ id: string; email?: string; name?: string; primary_email?: string }>;
		},
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		staleTime: Number.POSITIVE_INFINITY,
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
	const { data: projects = [] } = useProjects();
	const { theme, setTheme } = useTheme();
	const { mutate: logout, isPending: isLoggingOut } = useLogout();
	const [showProjectDropdown, setShowProjectDropdown] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	// Detect current project from URL
	const urlMatch = location.pathname.match(/\/projects\/([^/]+)/);
	const selectedProject = urlMatch ? urlMatch[1] : null;

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
		: (data.email || data.primary_email)?.charAt(0).toUpperCase() || "U";

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
							<span className="sidebar-logo-badge">Beta</span>
						</div>
					</Link>
				</div>

				{/* Project Selector Dropdown */}
				<div style={{ position: "relative", margin: "16px 12px" }}>
					<button
						type="button"
						onClick={() => setShowProjectDropdown(!showProjectDropdown)}
						className="project-selector"
						style={{
							width: "100%",
							cursor: "pointer",
							border: showProjectDropdown ? "1px solid var(--primary)" : "1px solid var(--sidebar-border)",
							outline: "none",
							transition: "all 0.2s ease",
						}}
					>
						<div className="project-selector-info">
							<div className="project-selector-icon">
								{selectedProject
									? projects.find((p) => p.id === selectedProject)?.name?.charAt(0).toUpperCase() || "P"
									: "A"}
							</div>
							<span className="project-selector-name">
								{selectedProject
									? projects.find((p) => p.id === selectedProject)?.name || "Unknown Project"
									: "All Projects"}
							</span>
						</div>
						<svg
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							style={{
								width: "16px",
								height: "16px",
								transition: "transform 0.2s",
								transform: showProjectDropdown ? "rotate(180deg)" : "rotate(0deg)",
								color: "var(--text-tertiary)",
							}}
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
						</svg>
					</button>

					{/* Dropdown Menu */}
					{showProjectDropdown && (
						<div
							style={{
								position: "absolute",
								top: "calc(100% + 4px)",
								left: "0",
								right: "0",
								backgroundColor: "var(--sidebar-bg)",
								border: "1px solid var(--sidebar-border)",
								borderRadius: "8px",
								boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
								zIndex: 10000,
								maxHeight: "280px",
								overflowY: "auto",
								overflowX: "hidden",
							}}
						>
							{projects.length === 0 ? (
								<div style={{ padding: "20px", color: "var(--text-secondary)", fontSize: "13px", textAlign: "center" }}>
									No projects available
								</div>
							) : (
								<>
									{/* All Projects Option */}
									<button
										type="button"
										onClick={() => {
											navigate("/projects");
											setShowProjectDropdown(false);
										}}
										style={{
											width: "100%",
											padding: "12px",
											textAlign: "left",
											background: !selectedProject ? "rgba(139, 92, 246, 0.15)" : "transparent",
											border: "none",
											borderBottom: "1px solid var(--sidebar-border)",
											cursor: "pointer",
											color: !selectedProject ? "var(--primary)" : "rgba(255, 255, 255, 0.8)",
											fontSize: "13px",
											fontWeight: "500",
											transition: "all 0.15s ease",
											display: "flex",
											alignItems: "center",
											gap: "10px",
											outline: "none",
										}}
										onMouseEnter={(e) => {
											if (selectedProject !== null) {
												(e.currentTarget).style.backgroundColor = "rgba(255, 255, 255, 0.05)";
											}
										}}
										onMouseLeave={(e) => {
											if (selectedProject !== null) {
												(e.currentTarget).style.backgroundColor = "transparent";
											}
										}}
									>
										<svg style={{ width: "16px", height: "16px", flexShrink: 0, opacity: 0.7 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
										</svg>
										<span>All Projects</span>
									</button>
									{projects.map((project) => (
									<button
										key={project.id}
										type="button"
										onClick={() => {
											navigate(`/projects/${project.id}`);
											setShowProjectDropdown(false);
										}}
										style={{
											width: "100%",
											padding: "10px 12px",
											textAlign: "left",
											background: selectedProject === project.id ? "rgba(139, 92, 246, 0.15)" : "transparent",
											border: "none",
											borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
											cursor: "pointer",
											color: selectedProject === project.id ? "var(--primary)" : "rgba(255, 255, 255, 0.8)",
											fontSize: "13px",
											transition: "all 0.15s ease",
											display: "block",
											outline: "none",
										}}
										onMouseEnter={(e) => {
											if (selectedProject !== project.id) {
												(e.currentTarget).style.backgroundColor = "rgba(255, 255, 255, 0.05)";
											}
										}}
										onMouseLeave={(e) => {
											if (selectedProject !== project.id) {
												(e.currentTarget).style.backgroundColor = "transparent";
											}
										}}
									>
										<div style={{ 
											display: "flex", 
											alignItems: "center", 
											gap: "10px",
										}}>
											<div style={{
												width: "32px",
												height: "32px",
												borderRadius: "6px",
												background: selectedProject === project.id 
													? "var(--primary)" 
													: "rgba(139, 92, 246, 0.2)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "13px",
												fontWeight: "600",
												color: selectedProject === project.id ? "white" : "var(--primary)",
												flexShrink: 0,
											}}>
												{project.name.charAt(0).toUpperCase()}
											</div>
											<div style={{ flex: 1, minWidth: 0 }}>
												<div style={{ 
													fontWeight: "500", 
													marginBottom: project.slug ? "2px" : "0",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}>
													{project.name}
												</div>
												{project.slug && (
													<div style={{ 
														fontSize: "11px", 
														opacity: 0.5,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}>
														{project.slug}
													</div>
												)}
											</div>
										</div>
									</button>
								))}
								</>
							)}
						</div>
					)}
				</div>

				{/* Close dropdown when clicking outside */}
				{showProjectDropdown && (
					<div
						onClick={() => setShowProjectDropdown(false)}
						style={{
							position: "fixed",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							zIndex: 9999,
							background: "transparent",
						}}
					/>
				)}

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
							to="/onboarding"
							icon={
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
							}
						>
							Getting Started
						</SidebarLink>
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
							<div className="sidebar-user-email">{data.email || data.primary_email}</div>
						</div>
						<button 
							type="button"
							onClick={() => logout()} 
							disabled={isLoggingOut}
							title="Logout" 
							style={{ 
								color: "var(--sidebar-text)", 
								padding: "4px", 
								background: "none", 
								border: "none", 
								cursor: isLoggingOut ? "wait" : "pointer",
								opacity: isLoggingOut ? 0.5 : 1
							}}
						>
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: "18px", height: "18px" }}>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
							</svg>
						</button>
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
					<a href={config.docsUrl} target="_blank" rel="noopener noreferrer" className="header-btn">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
						Docs
					</a>
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
						path="/onboarding"
						element={
							<ProtectedLayout>
								<OnboardingPage />
							</ProtectedLayout>
						}
					/>
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
						path="/projects/:projectId/apps/new"
						element={
							<ProtectedLayout>
								<AppSetupPage />
							</ProtectedLayout>
						}
					/>
				<Route
					path="/projects/:projectId/apps/:appId/users"
					element={
						<ProtectedLayout>
							<AppUsersPage />
						</ProtectedLayout>
					}
				/>
				<Route
					path="/projects/:projectId/apps/:appId/settings"
					element={
						<ProtectedLayout>
							<AppSettingsPage />
						</ProtectedLayout>
					}
				/>
				<Route
					path="/projects/:projectId/apps/:appId/licenses"
					element={
						<ProtectedLayout>
							<AppLicensesPage />
						</ProtectedLayout>
					}
				/>
					<Route
						path="/projects/:projectId/apps/:appId"
						element={
							<ProtectedLayout>
								<AppDetailPage />
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

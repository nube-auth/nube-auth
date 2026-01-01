import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import config from "./config";
import { useLogout, useProjects } from "./hooks/api";
import { AppApiKeysPage } from "./pages/AppApiKeys";
import { AppDetailPage } from "./pages/AppDetail";
import { AppDevelopersPage } from "./pages/AppDevelopers";
import { AppLicensesPage } from "./pages/AppLicenses";
import AppOAuthPage from "./pages/AppOAuth";
import AppPaymentSettingsPage from "./pages/AppPaymentSettings";
import { AppSettingsPage } from "./pages/AppSettings";
import { AppSetupPage } from "./pages/AppSetup";
import { AppUsersPage } from "./pages/AppUsers";
import { LicensesPage } from "./pages/Licenses";
import { LoginPage } from "./pages/Login";
import { OnboardingPage } from "./pages/Onboarding";
import { ProfilePage } from "./pages/Profile";
import { ProjectAppsPage } from "./pages/ProjectApps";
import { ProjectDetailPage } from "./pages/ProjectDetail";
import ProjectPaymentProvidersPage from "./pages/ProjectPaymentProviders";
import ProjectPaymentSettingsPage from "./pages/ProjectPaymentSettings";
import { ProjectSettingsPage } from "./pages/ProjectSettings";
import { ProjectStatsPage } from "./pages/ProjectStats";
import { ProjectsPage } from "./pages/Projects";
import { ProjectTeamPage } from "./pages/ProjectTeam";

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
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
					/>
				</svg>
			);
		}
		if (theme === "dark") {
			return (
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Dark mode">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
					/>
				</svg>
			);
		}
		return (
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="System theme">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
				/>
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
							border: showProjectDropdown
								? "1px solid var(--primary)"
								: "1px solid var(--sidebar-border)",
							outline: "none",
							transition: "all 0.2s ease",
						}}
					>
						<div className="project-selector-info">
							<div className="project-selector-icon">
								{selectedProject
									? projects
											.find((p) => p.id === selectedProject)
											?.name?.charAt(0)
											.toUpperCase() || "P"
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
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 14l-7 7m0 0l-7-7m7 7V3"
							/>
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
								<div
									style={{
										padding: "20px",
										color: "var(--text-secondary)",
										fontSize: "13px",
										textAlign: "center",
									}}
								>
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
												e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
											}
										}}
										onMouseLeave={(e) => {
											if (selectedProject !== null) {
												e.currentTarget.style.backgroundColor = "transparent";
											}
										}}
									>
										<svg
											style={{ width: "16px", height: "16px", flexShrink: 0, opacity: 0.7 }}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
											/>
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
												background:
													selectedProject === project.id
														? "rgba(139, 92, 246, 0.15)"
														: "transparent",
												border: "none",
												borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
												cursor: "pointer",
												color:
													selectedProject === project.id
														? "var(--primary)"
														: "rgba(255, 255, 255, 0.8)",
												fontSize: "13px",
												transition: "all 0.15s ease",
												display: "block",
												outline: "none",
											}}
											onMouseEnter={(e) => {
												if (selectedProject !== project.id) {
													e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
												}
											}}
											onMouseLeave={(e) => {
												if (selectedProject !== project.id) {
													e.currentTarget.style.backgroundColor = "transparent";
												}
											}}
										>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "10px",
												}}
											>
												<div
													style={{
														width: "32px",
														height: "32px",
														borderRadius: "6px",
														background:
															selectedProject === project.id
																? "var(--primary)"
																: "rgba(139, 92, 246, 0.2)",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														fontSize: "13px",
														fontWeight: "600",
														color:
															selectedProject === project.id ? "white" : "var(--primary)",
														flexShrink: 0,
													}}
												>
													{project.name.charAt(0).toUpperCase()}
												</div>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div
														style={{
															fontWeight: "500",
															marginBottom: project.slug ? "2px" : "0",
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
														}}
													>
														{project.name}
													</div>
													{project.slug && (
														<div
															style={{
																fontSize: "11px",
																opacity: 0.5,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
															}}
														>
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
					{/* Context 1: Global View (at /projects) */}
					{location.pathname === "/projects" && (
						<div className="sidebar-section">
							<SidebarLink
								to="/projects"
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
										/>
									</svg>
								}
							>
								Projects
							</SidebarLink>
							<a href={config.docsUrl} target="_blank" rel="noopener noreferrer" className="sidebar-link">
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
								Documentation
							</a>
						</div>
					)}

					{/* Context 2: Project View (at /projects/:projectId but not in app) */}
					{selectedProject && !location.pathname.includes("/apps/") && location.pathname !== "/projects" && (
						<>
							<div className="sidebar-section">
								<div className="sidebar-section-title">Project</div>
								<SidebarLink
									to={`/projects/${selectedProject}`}
									icon={
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
											/>
										</svg>
									}
								>
									Overview
								</SidebarLink>
								<SidebarLink
									to={`/projects/${selectedProject}/stats`}
									icon={
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									}
								>
									Statistics
								</SidebarLink>
							</div>
							<div className="sidebar-section">
								<div className="sidebar-section-title">Management</div>
								<SidebarLink
									to={`/projects/${selectedProject}/apps`}
									icon={
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
											/>
										</svg>
									}
								>
									Apps
								</SidebarLink>
								<SidebarLink
									to={`/projects/${selectedProject}/team`}
									icon={
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
											/>
										</svg>
									}
								>
									Team
								</SidebarLink>
								<SidebarLink
									to={`/projects/${selectedProject}/payment-providers`}
									icon={
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
											/>
										</svg>
									}
								>
									Payment Providers
								</SidebarLink>
								<SidebarLink
									to={`/projects/${selectedProject}/settings`}
									icon={
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
									}
								>
									Settings
								</SidebarLink>
							</div>
						</>
					)}

					{/* Context 3: App View (at /projects/:projectId/apps/:appId) */}
					{selectedProject && location.pathname.includes("/apps/") && (
						<div className="sidebar-section">
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}`}
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
										/>
									</svg>
								}
							>
								Dashboard
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/users`}
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
										/>
									</svg>
								}
							>
								Users
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/licenses`}
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
										/>
									</svg>
								}
							>
								Licenses & Plans
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/api-keys`}
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
										/>
									</svg>
								}
							>
								API Keys
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/oauth`}
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
										/>
									</svg>
								}
							>
								OAuth Config
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/payment`}
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
										/>
									</svg>
								}
							>
								Payment Config
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/developers`}
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
										/>
									</svg>
								}
							>
								Integration Guide
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/settings`}
								icon={
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								}
							>
								App Settings
							</SidebarLink>
						</div>
					)}
				</nav>

				{/* Sidebar Footer - User */}
				<div className="sidebar-footer">
					<Link to="/profile" className="sidebar-user" style={{ textDecoration: "none", cursor: "pointer" }}>
						<div className="sidebar-avatar">{initials}</div>
						<div className="sidebar-user-info">
							<div className="sidebar-user-name">{data.name || "Admin"}</div>
							<div className="sidebar-user-email">{data.email || data.primary_email}</div>
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								logout();
							}}
							disabled={isLoggingOut}
							title="Logout"
							style={{
								color: "var(--sidebar-text)",
								padding: "4px",
								background: "none",
								border: "none",
								cursor: isLoggingOut ? "wait" : "pointer",
								opacity: isLoggingOut ? 0.5 : 1,
							}}
						>
							<svg
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								style={{ width: "18px", height: "18px" }}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
						</button>
					</Link>
				</div>
			</aside>

			{/* Main Content */}
			<main className="main-content">
				{/* Top Header */}
				<header className="top-header">
					<div className="top-header-left">
						<nav className="breadcrumb">
							<Link to="/projects" className="breadcrumb-item">
								Dashboard
							</Link>
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
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
								/>
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
			<ToastProvider>
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
							path="/profile"
							element={
								<ProtectedLayout>
									<ProfilePage />
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
							path="/projects/:projectId/apps"
							element={
								<ProtectedLayout>
									<ProjectAppsPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/projects/:projectId/stats"
							element={
								<ProtectedLayout>
									<ProjectStatsPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/projects/:projectId/team"
							element={
								<ProtectedLayout>
									<ProjectTeamPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/projects/:projectId/settings"
							element={
								<ProtectedLayout>
									<ProjectSettingsPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/projects/:projectId/payment"
							element={
								<ProtectedLayout>
									<ProjectPaymentSettingsPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/projects/:projectId/payment-providers"
							element={
								<ProtectedLayout>
									<ProjectPaymentProvidersPage />
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
							path="/projects/:projectId/apps/:appId/oauth"
							element={
								<ProtectedLayout>
									<AppOAuthPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/projects/:projectId/apps/:appId/payment"
							element={
								<ProtectedLayout>
									<AppPaymentSettingsPage />
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
							path="/projects/:projectId/apps/:appId/api-keys"
							element={
								<ProtectedLayout>
									<AppApiKeysPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/projects/:projectId/apps/:appId/developers"
							element={
								<ProtectedLayout>
									<AppDevelopersPage />
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
			</ToastProvider>
		</QueryClientProvider>
	);
}

export default App;

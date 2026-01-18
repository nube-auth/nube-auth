import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { Icon } from "./components/Icon";
import { getIconById } from "./components/IconPicker";
import {
	Home01Icon,
	CreditCardIcon,
	CloudUploadIcon,
	ReturnRequestIcon,
	FileExportIcon,
	TestTubeIcon,
	BookOpen01Icon,
	BarChartIcon,
	ChartColumnIcon,
	LayoutGridIcon,
	UserGroupIcon,
	Settings02Icon,
	DashboardSquare02Icon,
	UserMultiple02Icon,
	LicenseIcon,
	Key01Icon,
	ShieldKeyIcon,
	CodeIcon,
	Logout03Icon,
	ArrowDown01Icon,
	Sun03Icon,
	Moon02Icon,
	ComputerIcon,
	Layers01Icon,
} from "@hugeicons/core-free-icons";
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
import { BillingDashboardPage } from "./pages/BillingDashboard";
import WebhookMonitoringPage from "./pages/WebhookMonitoring";
import RefundProcessingPage from "./pages/RefundProcessing";
import TransactionExportPage from "./pages/TransactionExport";
import { LicensesPage } from "./pages/Licenses";
import PaymentTestingPlayground from "./pages/PaymentTestingPlayground";
import { LoginPage } from "./pages/Login";
import { OnboardingPage } from "./pages/Onboarding";
import { ProfilePage } from "./pages/Profile";
import { ProjectAppsPage } from "./pages/ProjectApps";
import { ProjectDetailPage } from "./pages/ProjectDetail";
import ProjectPaymentProvidersPage from "./pages/ProjectPaymentProviders";
import { ProjectSettingsPage } from "./pages/ProjectSettings";
import { ProjectStatsPage } from "./pages/ProjectStats";
import { ProjectsPage } from "./pages/Projects";
import { ProjectTeamPage } from "./pages/ProjectTeam";
import { pingpong } from "./lib/pingpong";

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

			// 1) Check session status first (mirrors user dashboard flow)
			const statusRes = await pingpong(`${gatewayUrl}/v1/auth/status?audience=admin`, {
				credentials: "include",
			});
			if (!statusRes.ok) throw new Error("Unauthorized");
			const status = (await statusRes.json()) as { loggedIn?: boolean };
			if (!status.loggedIn) throw new Error("Unauthorized");

			// 2) Then fetch admin profile
			const res = await pingpong(`${gatewayUrl}/v1/admin/me`, { credentials: "include" });
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
		<Link to={to} className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}>
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

	// Close dropdown when location changes
	useEffect(() => {
		setShowProjectDropdown(false);
	}, [location.pathname]);

	// Detect current project from URL
	const urlMatch = location.pathname.match(/\/projects\/([^/]+)/);
	const selectedProject = urlMatch ? urlMatch[1] : null;

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="spinner mx-auto mb-4" />
					<p className="text-text-secondary">Loading...</p>
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
			return <Icon icon={Sun03Icon} size={16} className="text-current" />;
		}
		if (theme === "dark") {
			return <Icon icon={Moon02Icon} size={16} className="text-current" />;
		}
		return <Icon icon={ComputerIcon} size={16} className="text-current" />;
	};

	return (
		<div className="app-layout">
			{/* Sidebar */}
			<aside className="sidebar">
				<div className="sidebar-header">
					<Link to="/projects" className="sidebar-logo">
						<img src="/favicon.png" alt="Proofa" className="sidebar-logo-img" />
						<span className="sidebar-logo-name">Proofa</span>
						<span className="sidebar-logo-badge">Beta</span>
					</Link>
				</div>

				{/* Project Selector Dropdown */}
				<div className="relative mx-3 my-4 z-10000">
					<button
						type="button"
						onClick={() => setShowProjectDropdown(!showProjectDropdown)}
						className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-white/5 rounded-md cursor-pointer outline-none transition-all duration-200 ${showProjectDropdown ? "border border-primary" : "border border-sidebar-border"}`}
					>
						<div className="flex items-center gap-2.5 min-w-0">
							<div className="w-8 h-8 rounded-md bg-surface-secondary flex items-center justify-center flex-shrink-0">
								{selectedProject ? (
									<Icon 
										icon={getIconById(
											projects.find((p) => p.id === selectedProject)?.icon || "folder"
										)} 
										size={18} 
										className="text-primary" 
									/>
								) : (
									<Icon icon={Layers01Icon} size={18} className="text-primary" />
								)}
							</div>
							<span className="text-13px font-medium text-white truncate">
								{selectedProject
									? projects.find((p) => p.id === selectedProject)?.name || "Unknown Project"
									: "All Projects"}
							</span>
						</div>
						<Icon
							icon={ArrowDown01Icon}
							size={16}
							className={`text-text-tertiary transition-transform duration-200 ${showProjectDropdown ? "rotate-180" : "rotate-0"}`}
						/>
					</button>

					{/* Dropdown Menu */}
					{showProjectDropdown && (
						<div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-content-bg border border-sidebar-border rounded-lg shadow-2xl z-10000 max-h-[180px] overflow-y-auto overflow-x-hidden">
							{projects.length === 0 ? (
								<div className="p-5 text-text-secondary text-13px text-center">
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
									className={`w-full p-3 text-left border-none border-b border-sidebar-border cursor-pointer text-13px font-medium transition-all duration-150 flex items-center gap-2.5 outline-none hover:bg-white/5 ${!selectedProject ? "bg-white/5 text-primary" : "bg-transparent text-text-secondary"}` }
									>
										<Icon icon={Layers01Icon} size={16} className="shrink-0 opacity-70" />
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
										className={`w-full py-2.5 px-3 text-left border-none border-b border-white/5 cursor-pointer text-13px transition-all duration-150 block outline-none hover:bg-white/5 ${selectedProject === project.id ? "bg-white/5 text-primary" : "bg-transparent text-text-secondary"}` }
										>
											<div className="flex items-center gap-2.5">
												<div
												className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${selectedProject === project.id ? "bg-surface-secondary" : "bg-white/5"}` }
												>
													<Icon 
														icon={getIconById(project.icon || "folder")} 
														size={18} 
														className={selectedProject === project.id ? "text-primary" : "text-text-secondary"}
													/>
												</div>
												<div className="flex-1 min-w-0">
											<div className={`font-medium overflow-hidden text-ellipsis whitespace-nowrap ${project.slug ? "mb-0.5" : ""}`}>
														{project.name}
													</div>
													{project.slug && (
														<div className="text-11px opacity-50 overflow-hidden text-ellipsis whitespace-nowrap">
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
						className="fixed inset-0 z-9999 bg-transparent"
					/>
				)}

				<nav className="sidebar-nav">
					{/* Context 1: Global View (at /projects or /billing) */}
					{(location.pathname === "/projects" || location.pathname === "/billing") && (
						<div className="sidebar-section">
							<SidebarLink
								to="/projects"
								icon={<Icon icon={Home01Icon} size={18} />}
							>
								Projects
							</SidebarLink>
							<SidebarLink
								to="/billing"
								icon={<Icon icon={CreditCardIcon} size={18} />}
							>
								Billing
							</SidebarLink>
							<SidebarLink
								to="/webhooks"
								icon={<Icon icon={CloudUploadIcon} size={18} />}
							>
								Webhooks
							</SidebarLink>
							<SidebarLink
								to="/refunds"
								icon={<Icon icon={ReturnRequestIcon} size={18} />}
							>
								Refunds
							</SidebarLink>
							<SidebarLink
								to="/export"
								icon={<Icon icon={FileExportIcon} size={18} />}
							>
								Export
							</SidebarLink>
							<SidebarLink
								to="/playground/payments"
								icon={<Icon icon={TestTubeIcon} size={18} />}
							>
								Test Playground
							</SidebarLink>
						</div>
					)}

					{/* Context 2: Project View (at /projects/:projectId but not in app) */}
					{selectedProject && !location.pathname.includes("/apps/") && location.pathname !== "/projects" && (
						<>
							<div className="sidebar-section">
								<div className="sidebar-section-title">Project</div>
								<SidebarLink
									to={`/projects/${selectedProject}`}
									icon={<Icon icon={DashboardSquare02Icon} size={18} />}
								>
									Overview
								</SidebarLink>
								<SidebarLink
									to={`/projects/${selectedProject}/stats`}
									icon={<Icon icon={ChartColumnIcon} size={18} />}
								>
									Statistics
								</SidebarLink>
							</div>
							<div className="sidebar-section">
								<div className="sidebar-section-title">Management</div>
								<SidebarLink
									to={`/projects/${selectedProject}/apps`}
									icon={<Icon icon={LayoutGridIcon} size={18} />}
								>
									Apps
								</SidebarLink>
								<SidebarLink
									to={`/projects/${selectedProject}/team`}
									icon={<Icon icon={UserGroupIcon} size={18} />}
								>
									Team
								</SidebarLink>
								<SidebarLink
									to={`/projects/${selectedProject}/payment-providers`}
									icon={<Icon icon={CreditCardIcon} size={18} />}
								>
									Payment Providers
								</SidebarLink>
								<SidebarLink
									to={`/projects/${selectedProject}/settings`}
									icon={<Icon icon={Settings02Icon} size={18} />}
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
								icon={<Icon icon={DashboardSquare02Icon} size={18} />}
							>
								Dashboard
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/users`}
								icon={<Icon icon={UserMultiple02Icon} size={18} />}
							>
								Users
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/licenses`}
								icon={<Icon icon={LicenseIcon} size={18} />}
							>
								Licenses & Plans
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/api-keys`}
								icon={<Icon icon={Key01Icon} size={18} />}
							>
								API Keys
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/oauth`}
								icon={<Icon icon={ShieldKeyIcon} size={18} />}
							>
								OAuth Config
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/payment`}
								icon={<Icon icon={CreditCardIcon} size={18} />}
							>
								Payment Config
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/developers`}
								icon={<Icon icon={CodeIcon} size={18} />}
							>
								Integration Guide
							</SidebarLink>
							<SidebarLink
								to={`/projects/${selectedProject}/apps/${location.pathname.match(/apps\/([^/]+)/)?.[1]}/settings`}
								icon={<Icon icon={Settings02Icon} size={18} />}
							>
								App Settings
							</SidebarLink>
						</div>
					)}
				</nav>

				{/* Sidebar Footer - User */}
				<div className="sidebar-footer">
					<Link to="/profile" className="sidebar-user no-underline cursor-pointer">
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
							className={`text-sidebar-text p-1 bg-none border-none ${isLoggingOut ? "cursor-wait opacity-50" : "cursor-pointer opacity-100"}`}
						>
							<Icon icon={Logout03Icon} size={18} className="text-current" />
						</button>
				</Link>
			</div>
		</aside>

		{/* Main Content */}
		<main className="main-content">
			{/* Top Header */}
			<header className="top-header">
				<nav className="breadcrumb">
					<Link to="/projects" className="breadcrumb-item">
						Dashboard
					</Link>
					{selectedProject && (
						<>
							<span className="breadcrumb-divider">/</span>
							<Link to={`/projects/${selectedProject}`} className="breadcrumb-item">
								{projects.find((p) => p.id === selectedProject)?.name || "Project"}
							</Link>
						</>
					)}
					{location.pathname.includes("/apps/") && (
						<>
							<span className="breadcrumb-divider">/</span>
							<span className="breadcrumb-current">
								{location.pathname.includes("/api-keys") ? "API Keys" :
								 location.pathname.includes("/oauth") ? "OAuth" :
								 location.pathname.includes("/payment") ? "Payment" :
								 location.pathname.includes("/developers") ? "Integration" :
								 location.pathname.includes("/settings") ? "Settings" :
								 location.pathname.includes("/licenses") ? "Licenses" :
								 location.pathname.includes("/users") ? "Users" :
								 "App"}
							</span>
						</>
					)}
					{location.pathname.includes("/team") && (
						<>
							<span className="breadcrumb-divider">/</span>
							<span className="breadcrumb-current">Team</span>
						</>
					)}
					{location.pathname.includes("/payment-providers") && (
						<>
							<span className="breadcrumb-divider">/</span>
							<span className="breadcrumb-current">Payment Providers</span>
						</>
					)}
					{location.pathname === "/billing" && (
						<>
							<span className="breadcrumb-divider">/</span>
							<span className="breadcrumb-current">Billing</span>
						</>
					)}
				</nav>
				<div className="flex items-center gap-3">
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
						<Icon icon={BookOpen01Icon} size={16} />
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
						<Route
							path="/billing"
							element={
								<ProtectedLayout>
									<BillingDashboardPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/webhooks"
							element={
								<ProtectedLayout>
									<WebhookMonitoringPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/refunds"
							element={
								<ProtectedLayout>
									<RefundProcessingPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/export"
							element={
								<ProtectedLayout>
									<TransactionExportPage />
								</ProtectedLayout>
							}
						/>
						<Route
							path="/playground/payments"
							element={
								<ProtectedLayout>
									<PaymentTestingPlayground />
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

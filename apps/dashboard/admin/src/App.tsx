import { Button, Heading, Icon, IconType, Spinner, ThemeToggle, Toast, useTheme } from "@nube-auth/components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import config from "./config";
import { useLogout, useMe } from "./hooks/api";
import { AppSidebar } from "./layouts/AppSidebar";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { AppApiKeysPage } from "./pages/AppApiKeys";
import { AppDetailPage } from "./pages/AppDetail";
import { AppDevelopersPage } from "./pages/AppDevelopers";
import { AppLicensesPage } from "./pages/AppLicenses";
import AppOAuthPage from "./pages/AppOAuth";
import AppPaymentSettingsPage from "./pages/AppPaymentSettings";
import { AppPromotionsPage } from "./pages/AppPromotions";
import { AppSettingsPage } from "./pages/AppSettings";
import { AppSetupPage } from "./pages/AppSetup";
import { AppSubscriptionsPage } from "./pages/AppSubscriptions";
import { AppUsersPage } from "./pages/AppUsers";
import { AppWebhooksPage } from "./pages/AppWebhooks";
import { BillingDashboardPage } from "./pages/BillingDashboard";
import { CreateProjectPage } from "./pages/CreateProject";
import { HomePage } from "./pages/Home";
import { LicensesPage } from "./pages/Licenses";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { OnboardingPage } from "./pages/Onboarding";
import PaymentTestingPlayground from "./pages/PaymentTestingPlayground";
import { ProfilePage } from "./pages/Profile";
import { ProjectAppsPage } from "./pages/ProjectApps";
import { ProjectDetailPage } from "./pages/ProjectDetail";
import ProjectPaymentProvidersPage from "./pages/ProjectPaymentProviders";
import { ProjectSettingsPage } from "./pages/ProjectSettings";
import { ProjectStatsPage } from "./pages/ProjectStats";
import ProjectsPage from "./pages/Projects";
import { ProjectTeamPage } from "./pages/ProjectTeam";
import RefundProcessingPage from "./pages/RefundProcessing";
import { RootPage } from "./pages/Root";
import TransactionExportPage from "./pages/TransactionExport";
import WebhookMonitoringPage from "./pages/WebhookMonitoring";

const queryClient = new QueryClient();

// Theme wrapper to apply theme globally to all routes
function ThemeWrapper({ children }: { children: React.ReactNode }) {
	useTheme(); // Initialize theme on document root
	return <>{children}</>;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
	const { data: user, isLoading } = useMe();
	const { theme, setTheme } = useTheme();
	const { mutate: logout, isPending: isLoggingOut } = useLogout();
	const _location = useLocation();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<Spinner className="mx-auto mb-4" />
					<p className="text-muted">Loading...</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/" replace />;
	}

	const cycleTheme = () => {
		if (theme === "system") setTheme("light");
		else if (theme === "light") setTheme("dark");
		else setTheme("system");
	};

	const topBar = (
		<>
			<Heading size="sm">Dashboard</Heading>
			<div className="ml-auto flex items-center gap-3">
				<ThemeToggle theme={theme} onToggle={cycleTheme} />
				<Button
					variant="outline"
					size="sm"
					onClick={() => window.open(config.docsUrl, "_blank", "noopener,noreferrer")}
				>
					<Icon icon={IconType.BookOpen} size={16} />
					Docs
				</Button>
			</div>
		</>
	);

	return (
		<DashboardLayout
			sidebar={<AppSidebar user={user} onLogout={logout} isLoggingOut={isLoggingOut} />}
			topBar={topBar}
		>
			{children}
		</DashboardLayout>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<Toast />
				<BrowserRouter>
					<ErrorBoundary>
						<ThemeWrapper>
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
									path="/projects/new"
									element={
										<ProtectedLayout>
											<CreateProjectPage />
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
									path="/projects/:projectId/apps/:appId/subscriptions"
									element={
										<ProtectedLayout>
											<AppSubscriptionsPage />
										</ProtectedLayout>
									}
								/>
								<Route
									path="/projects/:projectId/apps/:appId/promotions"
									element={
										<ProtectedLayout>
											<AppPromotionsPage />
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
									path="/projects/:projectId/apps/:appId/webhooks"
									element={
										<ProtectedLayout>
											<AppWebhooksPage />
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
								<Route path="/" element={<RootPage />} />
								<Route
									path="/home"
									element={
										<ProtectedLayout>
											<HomePage />
										</ProtectedLayout>
									}
								/>
								<Route path="*" element={<NotFoundPage />} />
							</Routes>
						</ThemeWrapper>
					</ErrorBoundary>
				</BrowserRouter>
			</ToastProvider>
		</QueryClientProvider>
	);
}

export default App;

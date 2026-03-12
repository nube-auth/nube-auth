import type React from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { Spinner, useTheme, ThemeToggle, Button, Icon, IconType } from "@nube-auth/components";
import { config } from "./config";
import { useAuth } from "./hooks/api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoginPage } from "./pages/Login";
import { ProfilePage } from "./pages/Profile";
import { SessionsPage } from "./pages/Sessions";
import { SecurityPage } from "./pages/Security";
import { NotFoundPage } from "./pages/NotFound";

function ProtectedLayout({ 
	children, 
	theme, 
	setTheme 
}: { 
	children: React.ReactNode;
	theme: "light" | "dark" | "system";
	setTheme: (theme: "light" | "dark" | "system") => void;
}) {
	const { isAuthenticated, user, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="app-layout">
				<div className="loading min-h-screen">
					<Spinner />
					<span className="loading-text">Loading...</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	const cycleTheme = () => {
		if (theme === "system") setTheme("light");
		else if (theme === "light") setTheme("dark");
		else setTheme("system");
	};

	return (
		<div className="app-layout">
			{/* Top Header */}
			<header className="top-header">
				<div className="header-left">
					<Link to="/profile" className="header-logo">
						<img src="/favicon.png" alt="Nube Auth" className="header-logo-img" />
						<span className="header-logo-text">Nube Auth</span>
						<span className="header-beta-badge">Beta</span>
					</Link>
				</div>

				<div className="header-right">
					<ThemeToggle theme={theme} onToggle={cycleTheme} />
					<Button
						variant="outline"
						size="sm"
						onClick={() => window.open(config.homeUrl, '_blank', 'noopener,noreferrer')}
					>
						<Icon icon={IconType.Home} size={16} />
						Home
					</Button>
				</div>
			</header>

			{/* Main Content */}
			<main className="main-content">{children}</main>
		</div>
	);
}

function App() {
	// Initialize theme for all pages (including login)
	const { theme, setTheme } = useTheme();
	
	return (
		<BrowserRouter>
			<ErrorBoundary>
			<Routes>
				<Route path="/login" element={<LoginPage />} />
				<Route
					path="/profile"
					element={
						<ProtectedLayout theme={theme} setTheme={setTheme}>
							<ProfilePage />
						</ProtectedLayout>
					}
				/>
				<Route
					path="/sessions"
					element={
						<ProtectedLayout theme={theme} setTheme={setTheme}>
							<SessionsPage />
						</ProtectedLayout>
					}
				/>
				<Route
					path="/security"
					element={
						<ProtectedLayout theme={theme} setTheme={setTheme}>
							<SecurityPage />
						</ProtectedLayout>
					}
				/>
				<Route path="/" element={<Navigate to="/profile" replace />} />
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
			</ErrorBoundary>
		</BrowserRouter>
	);
}

export default App;

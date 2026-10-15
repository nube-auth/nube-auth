import {
	BrandLockup,
	Button,
	ConsoleHeader,
	ConsoleShell,
	cycleTheme,
	DocsLink,
	Icon,
	IconType,
	Spinner,
	useTheme,
} from "@nube-auth/components";
import type React from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { config } from "./config";
import { useAuth } from "./hooks/api";
import { HomePage } from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";
import { ProfilePage } from "./pages/Profile";
import { RootPage } from "./pages/Root";
import { SecurityPage } from "./pages/Security";
import { SessionsPage } from "./pages/Sessions";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();
	const { theme, setTheme } = useTheme();

	if (isLoading) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
				<Spinner />
				<span className="text-sm text-muted">Loading...</span>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/" replace />;
	}

	return (
		<ConsoleShell
			header={
				<ConsoleHeader
					brand={
						<Link to="/profile" className="text-foreground no-underline">
							<BrandLockup envTag={config.envTag} />
						</Link>
					}
					theme={theme}
					onToggleTheme={() => setTheme(cycleTheme(theme))}
				>
					<DocsLink href={config.docsUrl} />
					<Button
						variant="outline"
						size="sm"
						className="max-sm:hidden"
						onClick={() => window.open(config.homeUrl, "_blank", "noopener,noreferrer")}
					>
						<Icon icon={IconType.Home} size={16} />
						Home
					</Button>
				</ConsoleHeader>
			}
		>
			{children}
		</ConsoleShell>
	);
}

function App() {
	useTheme();

	return (
		<BrowserRouter>
			<ErrorBoundary>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route
						path="/profile"
						element={
							<ProtectedLayout>
								<ProfilePage />
							</ProtectedLayout>
						}
					/>
					<Route
						path="/sessions"
						element={
							<ProtectedLayout>
								<SessionsPage />
							</ProtectedLayout>
						}
					/>
					<Route
						path="/security"
						element={
							<ProtectedLayout>
								<SecurityPage />
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
			</ErrorBoundary>
		</BrowserRouter>
	);
}

export default App;

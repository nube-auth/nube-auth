import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Spinner } from "@proofa/components";

// Layouts
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";

// Hooks
import { useAuth } from "@/hooks/useAuth";

// Pages
import LoginPage from "@/pages/Login";
import ProjectsPage from "@/pages/Projects";
import ProjectDetailPage from "@/pages/ProjectDetail";
import SettingsPage from "@/pages/Settings";
import ProfilePage from "@/pages/Profile";

const AppDetailPage = () => <div className="p-6">App Detail Page (Placeholder)</div>;

// Theme management hook
function useTheme() {
	const [theme, setTheme] = useState<"light" | "dark">("dark");

	useEffect(() => {
		const stored = localStorage.getItem("theme");
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const initialTheme = (stored as "light" | "dark") || (prefersDark ? "dark" : "light");
		
		setTheme(initialTheme);
		document.documentElement.setAttribute("data-theme", initialTheme);
	}, []);

	const toggleTheme = () => {
		const newTheme = theme === "light" ? "dark" : "light";
		setTheme(newTheme);
		localStorage.setItem("theme", newTheme);
		document.documentElement.setAttribute("data-theme", newTheme);
	};

	return { theme, toggleTheme };
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { data: authData, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (!authData?.authenticated) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}

function App() {
	const { theme, toggleTheme } = useTheme();

	return (
		<BrowserRouter>
			<Routes>
				{/* Auth routes */}
				<Route
					path="/login"
					element={
						<AuthLayout>
							<LoginPage />
						</AuthLayout>
					}
				/>

				{/* Protected routes */}
				<Route
					path="/*"
					element={
						<ProtectedRoute>
							<AppLayout theme={theme} onToggleTheme={toggleTheme}>
								<Routes>
									<Route path="/" element={<Navigate to="/projects" replace />} />
									<Route path="/projects" element={<ProjectsPage />} />
									<Route path="/projects/:projectId" element={<ProjectDetailPage />} />
									<Route path="/projects/:projectId/apps/:appId" element={<AppDetailPage />} />
									<Route path="/settings" element={<SettingsPage />} />
									<Route path="/profile" element={<ProfilePage />} />
								</Routes>
							</AppLayout>
						</ProtectedRoute>
					}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;


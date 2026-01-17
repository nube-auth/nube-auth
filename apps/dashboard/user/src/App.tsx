import type React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { Icon } from "./components/Icon";
import { Sun01Icon, Moon01Icon, CpuIcon } from "@hugeicons/core-free-icons";
import { useAuth } from "./hooks/api";
import { LoginPage } from "./pages/Login";
import { ProfilePage } from "./pages/Profile";
import { SessionsPage } from "./pages/Sessions";

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

function ProtectedLayout({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, user, isLoading } = useAuth();
	const { theme, setTheme } = useTheme();

	if (isLoading) {
		return (
			<div className="app-layout">
				<div className="loading min-h-screen">
					<div className="spinner" />
					<span className="loading-text">Loading...</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	const initials = user?.name
		? user.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user?.email?.charAt(0).toUpperCase() || "U";

	const cycleTheme = () => {
		if (theme === "system") setTheme("light");
		else if (theme === "light") setTheme("dark");
		else setTheme("system");
	};

	const getThemeIcon = () => {
		if (theme === "light") {
			return <Icon icon={Sun01Icon} size={16} />;
		}
		if (theme === "dark") {
			return <Icon icon={Moon01Icon} size={16} />;
		}
		return <Icon icon={CpuIcon} size={16} />;
	};

	return (
		<div className="app-layout">
			{/* Top Header */}
			<header className="top-header">
				<div className="header-left">
					<Link to="/profile" className="header-logo">
						<img src="/favicon.png" alt="Proofa" className="header-logo-img" />
						<span className="header-logo-text">Proofa</span>
						<span className="header-beta-badge">Beta</span>
					</Link>
				</div>

				<div className="header-right">
					<button type="button" onClick={cycleTheme} className="header-theme-btn" title={`Current: ${theme} mode`}>
						{getThemeIcon()}
						<span className="header-theme-label">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
					</button>

					<div className="header-user">
						<div className="header-avatar">{initials}</div>
						<span className="header-user-name">{user?.name || user?.email?.split("@")[0]}</span>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="main-content">{children}</main>
		</div>
	);
}

function App() {
	return (
		<BrowserRouter>
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
				<Route path="/" element={<Navigate to="/profile" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;

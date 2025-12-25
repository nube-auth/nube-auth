import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuthStatus } from "./hooks/api";
import { LoginPage } from "./pages/Login";
import { ProfilePage } from "./pages/Profile";
import { SessionsPage } from "./pages/Sessions";

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

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<Link to={to} className={`nav-link ${isActive ? "active" : ""}`}>
			{children}
		</Link>
	);
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
	const { data: authStatus, isLoading } = useAuthStatus();
	const { theme, setTheme } = useTheme();

	if (isLoading) {
		return (
			<div className="app-layout">
				<div className="loading" style={{ minHeight: "100vh" }}>
					<div className="spinner" />
					<span className="loading-text">Loading...</span>
				</div>
			</div>
		);
	}

	if (!authStatus?.loggedIn) {
		return <Navigate to="/login" replace />;
	}

	const user = authStatus.user;
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
			return (
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
				</svg>
			);
		}
		if (theme === "dark") {
			return (
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
				</svg>
			);
		}
		return (
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
			</svg>
		);
	};

	return (
		<div className="app-layout">
			{/* Top Header */}
			<header className="top-header">
				<div className="header-left">
					<Link to="/profile" className="header-logo">
						<div className="header-logo-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
						</div>
						<span className="header-logo-text">Proofa</span>
					</Link>

					<nav className="header-nav">
						<NavLink to="/profile">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							Profile
						</NavLink>
						<NavLink to="/sessions">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
							Sessions
						</NavLink>
					</nav>
				</div>

				<div className="header-right">
					<button 
						type="button"
						onClick={cycleTheme} 
						className="header-btn" 
						title={`Current: ${theme} mode`}
					>
						{getThemeIcon()}
						<span className="theme-label">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
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
		<QueryClientProvider client={queryClient}>
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
		</QueryClientProvider>
	);
}

export default App;

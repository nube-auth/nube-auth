import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type React from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { LicensesPage } from './pages/Licenses';
import { LoginPage } from './pages/Login';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { ProjectsPage } from './pages/Projects';

const queryClient = new QueryClient();

// Simple user API hook for auth check
function useMe() {
	return useQuery({
		queryKey: ['me'],
		queryFn: async () => {
			const res = await fetch('/api/me', { credentials: 'include' });
			if (!res.ok) throw new Error('Not authenticated');
			return res.json();
		},
	});
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
	const { data, isLoading } = useMe();

	if (isLoading) {
		return <div className="p-4">Loading...</div>;
	}

	if (!data) {
		return <Navigate to="/login" replace />;
	}

	return (
		<div className="min-h-screen bg-gray-100">
			<nav className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex items-center gap-8">
							<span className="font-bold text-xl">Proofa Admin</span>
							<Link to="/projects" className="text-gray-700 hover:text-gray-900">
								Projects
							</Link>
							<Link to="/licenses" className="text-gray-700 hover:text-gray-900">
								Licenses
							</Link>
						</div>
						<div className="flex items-center gap-4">
							<span className="text-gray-700">{data.email}</span>
							<a href="/api/auth/logout" className="text-gray-700 hover:text-gray-900">
								Logout
							</a>
						</div>
					</div>
				</div>
			</nav>
			<div className="max-w-7xl mx-auto">{children}</div>
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

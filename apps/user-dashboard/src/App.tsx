import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useAuthStatus } from './hooks/api';
import { LoginPage } from './pages/Login';
import { ProfilePage } from './pages/Profile';
import { SessionsPage } from './pages/Sessions';

const queryClient = new QueryClient();

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: authStatus, isLoading } = useAuthStatus();

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!authStatus?.loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <span className="flex items-center font-bold text-xl">Proofa</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/profile" className="text-gray-700 hover:text-gray-900">
                Profile
              </Link>
              <Link to="/sessions" className="text-gray-700 hover:text-gray-900">
                Sessions
              </Link>
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

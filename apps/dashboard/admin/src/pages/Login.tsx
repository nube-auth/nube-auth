import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const sessionCookie = searchParams.get('session');
    if (sessionCookie) {
      document.cookie = `core_session=${sessionCookie}; path=/; SameSite=Lax`;
      fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
      })
        .then((res) => {
          if (res.ok) {
            navigate('/projects');
          }
        })
        .catch(console.error);
      return;
    }

    const coreAuthUrl = `${import.meta.env.VITE_CORE_URL || 'http://localhost:3001'}/v1/auth/start?provider=google&redirect_uri=${encodeURIComponent(window.location.origin + '/login')}`;
    window.location.href = coreAuthUrl;
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Redirecting to login...</h1>
        <p className="text-gray-600">Please wait while we redirect you to Core authentication.</p>
      </div>
    </div>
  );
}

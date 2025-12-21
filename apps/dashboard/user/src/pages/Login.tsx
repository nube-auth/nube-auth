import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function LoginPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	useEffect(() => {
		const sessionCookie = searchParams.get('session');
		if (sessionCookie) {
			// Core passed back the session, store it and redirect
			document.cookie = `core_session=${sessionCookie}; path=/; SameSite=Lax`;
			// Complete the login on Gateway
			fetch('/api/auth/login', {
				method: 'POST',
				credentials: 'include',
			})
				.then((res) => {
					if (res.ok) {
						navigate('/profile');
					}
				})
				.catch(console.error);
			return;
		}

		// No session param, redirect to Core for OAuth
		const coreAuthUrl = `${import.meta.env.VITE_CORE_URL || 'http://localhost:3003'}/v1/auth/start?provider=google&redirect_uri=${encodeURIComponent(`${window.location.origin}/login`)}`;
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

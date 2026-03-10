import { Link } from "react-router-dom";

export function NotFoundPage() {
	return (
		<div className="app-layout">
			<div className="loading min-h-screen flex-col gap-3 text-center">
				<p className="text-5xl font-bold text-text-tertiary">404</p>
				<p className="text-xl font-semibold">Page not found</p>
				<p className="text-sm text-text-secondary">
					The page you're looking for doesn't exist or has been moved.
				</p>
				<Link to="/profile" className="mt-2 text-primary text-sm underline">
					Back to Profile
				</Link>
			</div>
		</div>
	);
}

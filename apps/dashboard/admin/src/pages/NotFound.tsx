import { useNavigate } from "react-router-dom";
import { Button, Icon, IconType } from "@nube-auth/components";

export function NotFoundPage() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground">
			{/* Top bar */}
			<header className="flex items-center gap-2 px-6 py-4 border-b border-border">
				<img src="/favicon.png" alt="Nube Auth" className="w-7 h-7" />
				<span className="text-base font-bold tracking-tight">Nube Auth</span>
			</header>

			{/* Content */}
			<main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
				<div className="w-full max-w-md">
					{/* Large 404 */}
					<p className="text-[120px] font-black leading-none tracking-tighter text-border select-none">
						404
					</p>

					<h1 className="text-2xl font-bold mt-2 mb-3">Page not found</h1>
					<p className="text-text-secondary text-base mb-8">
						The page you're looking for doesn't exist or has been moved.
					</p>

					<div className="flex gap-3 justify-center">
						<Button variant="outline" size="md" onClick={() => navigate(-1)}>
							<Icon icon={IconType.ArrowLeft} size={16} />
							Go Back
						</Button>
						<Button variant="primary" size="md" onClick={() => navigate("/")}>
							<Icon icon={IconType.Home} size={16} />
							Home
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}

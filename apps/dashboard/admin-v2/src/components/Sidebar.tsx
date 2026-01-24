import { Link, useLocation } from "react-router-dom";
import { cn } from "@proofa/components";

// Icons placeholder - replace with actual icons from @proofa/components
const HomeIcon = () => <span>🏠</span>;
const FolderIcon = () => <span>📁</span>;
const SettingsIcon = () => <span>⚙️</span>;
const UsersIcon = () => <span>👥</span>;

export function AppSidebar() {
	const location = useLocation();

	const isActive = (path: string) => {
		return location.pathname === path || location.pathname.startsWith(path + "/");
	};

	return (
		<div className="h-full bg-background border-r border-border flex flex-col">
			{/* Logo */}
			<div className="px-4 py-6 border-b border-border">
				<div className="flex items-center gap-3">
					<div className="size-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
						P
					</div>
					<span className="font-semibold text-lg">Proofa</span>
				</div>
			</div>

			{/* Navigation menu */}
			<nav className="flex-1 overflow-y-auto px-3 py-4">
				{/* Main section */}
				<div className="mb-6">
					<h3 className="px-3 mb-2 text-xs font-semibold text-muted uppercase tracking-wider">
						Main
					</h3>
					<ul className="space-y-1">
						<li>
							<Link
								to="/projects"
								className={cn(
									"flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
									isActive("/projects")
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-muted"
								)}
							>
								<FolderIcon />
								Projects
							</Link>
						</li>
					</ul>
				</div>

				{/* Settings section */}
				<div>
					<h3 className="px-3 mb-2 text-xs font-semibold text-muted uppercase tracking-wider">
						Settings
					</h3>
					<ul className="space-y-1">
						<li>
							<Link
								to="/profile"
								className={cn(
									"flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
									isActive("/profile")
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-muted"
								)}
							>
								<UsersIcon />
								Profile
							</Link>
						</li>
						<li>
							<Link
								to="/settings"
								className={cn(
									"flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
									isActive("/settings")
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-muted"
								)}
							>
								<SettingsIcon />
								Settings
							</Link>
						</li>
					</ul>
				</div>
			</nav>

			{/* Footer with user info */}
			<div className="px-4 py-4 border-t border-border">
				<div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
					<div className="size-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm shrink-0">
						A
					</div>
					<div className="flex flex-col min-w-0 flex-1">
						<span className="font-medium text-sm truncate">Admin User</span>
						<span className="text-xs text-muted truncate">admin@proofa.sh</span>
					</div>
				</div>
			</div>
		</div>
	);
}

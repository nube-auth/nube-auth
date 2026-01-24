import { Link, useLocation, useParams } from "react-router-dom";

export function Breadcrumbs() {
	const location = useLocation();
	const params = useParams();

	// Parse pathname into breadcrumb segments
	const pathSegments = location.pathname.split("/").filter(Boolean);

	// Map segments to readable names
	const getBreadcrumbName = (segment: string, _index: number) => {
		// Check if it's a param (UUID or ID-like)
		const paramKeys = Object.keys(params);
		const firstParamKey = paramKeys[0];
		if (firstParamKey && params[firstParamKey] === segment) {
			// Try to get friendly name from context (placeholder)
			return segment.slice(0, 8) + "...";
		}

		// Capitalize and format
		return segment
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	// Build breadcrumb path
	const getBreadcrumbPath = (index: number) => {
		return "/" + pathSegments.slice(0, index + 1).join("/");
	};

	if (pathSegments.length === 0) {
		return null;
	}

	return (
		<nav className="flex items-center gap-2 text-sm">
			{/* Home */}
			<Link
				to="/"
				className="text-muted hover:text-foreground transition-colors"
			>
				Home
			</Link>

			{pathSegments.map((segment, index) => {
				const isLast = index === pathSegments.length - 1;
				const path = getBreadcrumbPath(index);
				const name = getBreadcrumbName(segment, index);

				return (
					<span key={path} className="flex items-center gap-2">
						<span className="text-muted">/</span>
						{isLast ? (
							<span className="text-foreground font-medium">{name}</span>
						) : (
							<Link
								to={path}
								className="text-muted hover:text-foreground transition-colors"
							>
								{name}
							</Link>
						)}
					</span>
				);
			})}
		</nav>
	);
}

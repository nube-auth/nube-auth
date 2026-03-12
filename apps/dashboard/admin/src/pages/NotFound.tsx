import { Link } from "react-router-dom";
import { Button, Heading, Text } from "@nube-auth/components";

export function NotFoundPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
			<Heading size="lg" className="text-6xl font-bold text-text-tertiary mb-4">
				404
			</Heading>
			<Heading size="md" className="mb-2">
				Page not found
			</Heading>
			<Text className="text-text-secondary mb-6 max-w-sm">
				The page you're looking for doesn't exist or has been moved.
			</Text>
			<Button variant="primary" render={<Link to="/projects" />}>
				Back to Projects
			</Button>
		</div>
	);
}

import { Link } from "react-router-dom";
import {
	Icon,
	IconType,
	Card,
	CardBody,
	Heading,
	Text,
	Spinner,
} from "@nube-auth/components";
import { useMe } from "../hooks/api";

interface NavCardProps {
	to: string;
	icon: IconType;
	title: string;
	description: string;
}

function NavCard({ to, icon, title, description }: NavCardProps) {
	return (
		<Link to={to} className="block group no-underline">
			<Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
				<CardBody className="py-6 px-6 flex flex-col gap-2">
					<div className="flex items-center gap-3 mb-1">
						<div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center">
							<Icon icon={icon} size={18} className="text-secondary-foreground" />
						</div>
						<Heading level={3} size="sm" className="font-semibold m-0">
							{title}
						</Heading>
					</div>
					<Text className="text-muted text-sm leading-relaxed">{description}</Text>
					<div className="flex items-center gap-1 mt-1 text-primary text-sm font-medium">
						<span>Go to {title}</span>
						<Icon icon={IconType.ChevronRight} size={14} />
					</div>
				</CardBody>
			</Card>
		</Link>
	);
}

export function HomePage() {
	const { user, isLoading } = useMe();

	const firstName = user?.name?.split(" ")[0] ?? "there";

	return (
		<div className="flex flex-col gap-8 max-w-3xl">
			{/* Greeting */}
			<div>
				{isLoading ? (
					<div className="flex items-center gap-3">
						<Spinner className="w-5 h-5" />
						<Text className="text-muted">Loading...</Text>
					</div>
				) : (
					<>
						<Heading level={1} size="xl" className="font-bold">
							Welcome back, {firstName}
						</Heading>
						{user?.email && (
							<Text className="text-muted mt-1">{user.email}</Text>
						)}
					</>
				)}
				<Text className="text-muted mt-2">
					Manage your account, sessions, and security settings.
				</Text>
			</div>

			{/* Navigation cards */}
			<div>
				<Heading level={2} size="sm" className="font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
					Your Account
				</Heading>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<NavCard
						to="/profile"
						icon={IconType.User}
						title="Profile"
						description="View and update your personal information and display name."
					/>
					<NavCard
						to="/sessions"
						icon={IconType.Key}
						title="Sessions"
						description="See where you're logged in and revoke active sessions."
					/>
					<NavCard
						to="/security"
						icon={IconType.Shield}
						title="Security"
						description="Manage two-factor authentication and connected accounts."
					/>
				</div>
			</div>
		</div>
	);
}

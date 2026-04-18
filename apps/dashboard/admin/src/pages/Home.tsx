import { Link } from "react-router-dom";
import {
	Icon,
	IconType,
	Button,
	Card,
	CardBody,
	Heading,
	Text,
	Spinner,
} from "@nube-auth/components";
import { useMe, useProjects, useProjectsStats } from "../hooks/api";

function StatCard({
	label,
	value,
	isLoading,
}: {
	label: string;
	value: number | string;
	isLoading: boolean;
}) {
	return (
		<Card>
			<CardBody className="py-5 px-6">
				<Text className="text-muted text-sm mb-1">{label}</Text>
				{isLoading ? (
					<Spinner className="w-5 h-5 mt-1" />
				) : (
					<Heading level={2} size="lg" className="font-bold leading-tight">
						{value}
					</Heading>
				)}
			</CardBody>
		</Card>
	);
}

interface QuickActionProps {
	to: string;
	icon: IconType;
	title: string;
	description: string;
}

function QuickAction({ to, icon, title, description }: QuickActionProps) {
	return (
		<Link to={to} className="block group no-underline">
			<Card className="h-full transition-colors hover:border-primary/50 cursor-pointer">
				<CardBody className="py-5 px-6 flex flex-col gap-2">
					<div className="flex items-center gap-3 mb-1">
						<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<Icon icon={icon} size={16} className="text-primary" />
						</div>
						<Heading level={3} size="sm" className="font-semibold m-0">
							{title}
						</Heading>
					</div>
					<Text className="text-muted text-sm leading-relaxed">{description}</Text>
				</CardBody>
			</Card>
		</Link>
	);
}

export function HomePage() {
	const { data: user, isLoading: userLoading } = useMe();
	const { data: projects, isLoading: projectsLoading } = useProjects();
	const { data: statsMap, isLoading: statsLoading } = useProjectsStats();

	const totalProjects = projects?.length ?? 0;
	const totalApps = projects?.reduce((sum, p) => sum + (statsMap?.[p.id]?.totalApps ?? 0), 0) ?? 0;
	const totalUsers = projects?.reduce((sum, p) => sum + (statsMap?.[p.id]?.totalUsers ?? 0), 0) ?? 0;

	const firstName = user?.name?.split(" ")[0] ?? "there";

	return (
		<div className="flex flex-col gap-8 max-w-5xl">
			{/* Greeting */}
			<div>
				{userLoading ? (
					<div className="h-8 w-48 bg-border rounded animate-pulse" />
				) : (
					<Heading level={1} size="xl" className="font-bold">
						Welcome back, {firstName}
					</Heading>
				)}
				<Text className="text-muted mt-1">
					Here's an overview of your Nube Auth workspace.
				</Text>
			</div>

			{/* Stats */}
			<div>
				<Heading level={2} size="sm" className="font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
					Overview
				</Heading>
				<div className="grid grid-cols-3 gap-4">
					<StatCard
						label="Total Projects"
						value={totalProjects}
						isLoading={projectsLoading}
					/>
					<StatCard
						label="Total Apps"
						value={totalApps}
						isLoading={statsLoading}
					/>
					<StatCard
						label="Total Users"
						value={totalUsers}
						isLoading={statsLoading}
					/>
				</div>
			</div>

			{/* Quick Actions */}
			<div>
				<Heading level={2} size="sm" className="font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
					Quick Actions
				</Heading>
				<div className="grid grid-cols-2 gap-4">
					<QuickAction
						to="/projects"
						icon={IconType.Grid}
						title="Projects"
						description="View and manage all your authentication projects."
					/>
					<QuickAction
						to="/projects/new"
						icon={IconType.Add}
						title="New Project"
						description="Create a new project to start integrating Nube Auth."
					/>
					<QuickAction
						to="/billing"
						icon={IconType.CreditCard}
						title="Billing"
						description="Manage subscriptions, payments, and invoices."
					/>
					<QuickAction
						to="/profile"
						icon={IconType.User}
						title="Profile"
						description="Update your personal information and preferences."
					/>
				</div>
			</div>

			{/* CTA for empty state */}
			{!projectsLoading && totalProjects === 0 && (
				<Card className="border-dashed">
					<CardBody className="flex flex-col items-center justify-center py-12 text-center gap-4">
						<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
							<Icon icon={IconType.Add} size={24} className="text-primary" />
						</div>
						<div>
							<Heading level={3} size="md" className="font-semibold mb-1">
								No projects yet
							</Heading>
							<Text className="text-muted">Create your first project to get started with Nube Auth.</Text>
						</div>
						<Button variant="primary" size="md" asChild>
							<Link to="/projects/new">Create Project</Link>
						</Button>
					</CardBody>
				</Card>
			)}
		</div>
	);
}

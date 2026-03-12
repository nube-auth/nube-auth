import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp, useAppStats, useProject } from "../hooks/api";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Card,
	CardBody,
	Heading,
	Text,
	Button,
	Chip,
	IconBox,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
} from "@nube-auth/components";

export function AppDetailPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { data: stats, isLoading: statsLoading } = useAppStats(projectId || "", appId || "");

	if (projectLoading || appLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Spinner />
			</div>
		);
	}

	if (!project) {
		return (
			<Alert variant="danger">
				Project not found
			</Alert>
		);
	}

	if (!app) {
		return (
			<Alert variant="danger">
				App not found
			</Alert>
		);
	}

	const statItems = [
		{
			label: "Total Users",
			value: statsLoading ? "—" : stats?.totalUsers || 0,
			icon: IconType.Users,
			variant: "primary-subtle" as const,
		},
		{
			label: "Active Licenses",
			value: statsLoading ? "—" : stats?.activeLicenses || 0,
			icon: IconType.CheckCircle,
			variant: "success-subtle" as const,
		},
		{
			label: "Active Sessions",
			value: statsLoading ? "—" : stats?.totalSessions || 0,
			icon: IconType.Flash,
			variant: "info-subtle" as const,
		},
		{
			label: "Revenue",
			value: statsLoading ? "—" : `$${(stats?.totalRevenue || 0).toFixed(2)}`,
			icon: IconType.DollarCircle,
			variant: "warning-subtle" as const,
		},
	];

	const quickActions = [
		{
			label: "Manage Users",
			description: "View & invite",
			icon: IconType.UserMultiple,
			iconVariant: "primary-subtle" as const,
			path: `/projects/${projectId}/apps/${appId}/users`,
		},
		{
			label: "Licenses",
			description: "Plans & billing",
			icon: IconType.License,
			iconVariant: "success-subtle" as const,
			path: `/projects/${projectId}/apps/${appId}/licenses`,
		},
		{
			label: "Settings",
			description: "Auth & config",
			icon: IconType.Settings,
			iconVariant: "info-subtle" as const,
			path: `/projects/${projectId}/apps/${appId}/settings`,
		},
		{
			label: "API Keys",
			description: "Integration",
			icon: IconType.Key,
			iconVariant: "warning-subtle" as const,
			path: `/projects/${projectId}/apps/${appId}/api-keys`,
		},
	];

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>{project.name}</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}/apps`} />}>Apps</BreadcrumbButton>
					</BreadcrumbItem>
					/
					<BreadcrumbItem>
						<BreadcrumbButton active>{app.name}</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* App Header */}
			<Card>
				<CardBody>
					<div className="flex items-start justify-between gap-8">
						{/* Left: Main Info */}
						<div className="flex items-start gap-5 flex-1">
							<IconBox size="lg" variant="primary-subtle">
								<Icon icon={IconType.Key} size={28} />
							</IconBox>
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<Heading size="lg" className="mb-0">
										{app.name}
									</Heading>
									<Chip variant="success" size="sm">Active</Chip>
								</div>
								{(app.description) && (
									<Text className="text-muted-foreground mb-4 max-w-2xl">
										{app.description}
									</Text>
								)}
								<div className="flex items-start gap-6">
									<div>
										<Text className="text-muted-foreground mb-1 uppercase font-medium text-xs">
											Slug
										</Text>
										<Chip variant="info" size="sm">{app.slug}</Chip>
									</div>
									<div>
										<Text className="text-muted-foreground mb-1 uppercase font-medium text-xs">
											App ID
										</Text>
										<Chip variant="info" size="sm">{app.id}</Chip>
									</div>
								</div>
							</div>
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Stats */}
			<div className="grid grid-cols-4 gap-4">
				{statItems.map((stat) => (
					<Card key={stat.label}>
						<CardBody className="flex items-center gap-4">
							<IconBox variant={stat.variant} size="lg">
								<Icon icon={stat.icon} size={22} />
							</IconBox>
							<div>
								<Text className="text-muted-foreground text-sm">{stat.label}</Text>
								<Heading level={3} size="lg">{stat.value}</Heading>
							</div>
						</CardBody>
					</Card>
				))}
			</div>

			{/* Quick Actions */}
			<div>
				<Heading level={3} size="lg" className="mb-4">
					Quick Actions
				</Heading>
				<div className="grid grid-cols-4 gap-4">
					{quickActions.map((action) => (
						<Card
							key={action.label}
							className="cursor-pointer transition-all hover:ring-primary/50 hover:-translate-y-0.5 hover:shadow-md"
							onClick={() => navigate(action.path)}
						>
							<CardBody className="flex flex-col items-center gap-3 text-center">
								<IconBox variant={action.iconVariant} size="lg" circle>
									<Icon icon={action.icon} size={22} />
								</IconBox>
								<div>
									<Text className="font-semibold mb-0.5">{action.label}</Text>
									<Text className="text-muted-foreground text-sm">{action.description}</Text>
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}

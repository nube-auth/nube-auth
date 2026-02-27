import { useState } from "react";
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
	IconBox,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
} from "@proofa/components";

export function AppDetailPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: app, isLoading: appLoading } = useApp(projectId || "", appId || "");
	const { data: stats, isLoading: statsLoading } = useAppStats(projectId || "", appId || "");

	const [copied, setCopied] = useState(false);

	const copyPublicId = () => {
		if (app?.id) {
			navigator.clipboard.writeText(app.id);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

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
					<div className="flex justify-between items-start">
						<div className="flex-1">
							<Heading level={1} size="lg" className="mb-1">{app.name}</Heading>
							<Text className="text-muted-foreground">
								{app.description || "No description provided"}
							</Text>
						</div>
						<Button
							onClick={() => navigate(`/projects/${projectId}/apps/${appId}/settings`)}
							variant="secondary"
							className="shrink-0"
						>
							<Icon icon={IconType.Settings} size={14} />
							Settings
						</Button>
					</div>

					{/* App ID */}
					<div className="mt-5 pt-5 border-t border-card-border flex items-center gap-3">
						<Text className="text-muted-foreground text-xs font-medium uppercase tracking-wider shrink-0">App ID</Text>
						<button
							type="button"
							onClick={copyPublicId}
							className="group inline-flex items-center gap-2.5 bg-surface ring-1 ring-border rounded-lg px-3 py-1.5 transition-colors cursor-pointer border-none hover:ring-primary/40"
							title={copied ? "Copied!" : "Click to copy"}
						>
							<code className="font-mono text-sm text-foreground/90 tracking-wide">{app.id}</code>
							<span className="text-muted-foreground group-hover:text-foreground transition-colors">
								{copied
									? <Icon icon={IconType.CheckCircle} size={14} className="text-success" />
									: <Icon icon={IconType.Copy} size={14} />
								}
							</span>
						</button>
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

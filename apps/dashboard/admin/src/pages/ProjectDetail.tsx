import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	Alert,
	Avatar,
	Chip,
	Button,
	Card,
	CardBody,
	CardHeader,
	CardTitle,
	DataTable,
	DataTableHeader,
	DataTableRow,
	EmptyState,
	Heading,
	Icon,
	IconBox,
	IconType,
	Spinner,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	Text,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
} from "@nube-auth/components";
import { getIconById } from "../components/IconPicker";
import { useProject, useProjectApps, useProjectMembers, useProjectStats } from "../hooks/api";

export function ProjectDetailPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: apps, isLoading: appsLoading } = useProjectApps(projectId || "");
	const { data: members, isLoading: membersLoading } = useProjectMembers(projectId || "");
	const { data: stats, isLoading: statsLoading } = useProjectStats(projectId || "");

	if (projectLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner />
			</div>
		);
	}

	if (!project) {
		return (
			<Alert variant="danger">
				<Icon icon={IconType.AlertCircle} size={20} />
				Project not found
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton active>{project.name}</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Project Header Card */}
			<Card>
				<CardBody>
					<div className="flex items-start justify-between gap-8">
						{/* Left: Main Info */}
						<div className="flex items-start gap-5 flex-1">
							<IconBox size="lg" variant="primary-subtle">
								<Icon icon={IconType[getIconById(project.icon || "dashboard")]} size={28} />
							</IconBox>
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2">
									<Heading size="lg" className="mb-0">
										{project.name}
									</Heading>
									<Chip variant="success" size="sm">Active</Chip>
								</div>
								{project.description && (
									<Text className="text-text-secondary mb-4 max-w-2xl">
										{project.description}
									</Text>
								)}
								<div className="flex items-start gap-6">
									<div>
										<Text className="text-text-muted mb-1 uppercase font-medium text-xs">
											Slug
										</Text>
										<Chip variant="info" size="sm">{project.slug}</Chip>
									</div>
									<div>
										<Text className="text-text-muted mb-1 uppercase font-medium text-xs">
											Project ID
										</Text>
										<Chip variant="info" size="sm">{project.id}</Chip>
									</div>
								</div>
							</div>
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
				<Card>
					<CardBody>
						<IconBox size="md" variant="danger-subtle" className="mb-3">
							<Icon icon={IconType.Dashboard} size={20} />
						</IconBox>
						<Heading className="mb-1">
							{statsLoading ? "—" : stats?.totalApps || 0}
						</Heading>
						<Text className="text-text-muted">Applications</Text>
					</CardBody>
				</Card>

				<Card>
					<CardBody>
						<IconBox size="md" variant="warning-subtle" className="mb-3">
							<Icon icon={IconType.UserMultiple} size={20} />
						</IconBox>
						<Heading className="mb-1">
							{statsLoading ? "—" : stats?.totalUsers || 0}
						</Heading>
						<Text className="text-text-muted">Total Users</Text>
					</CardBody>
				</Card>

				<Card>
					<CardBody>
						<IconBox size="md" variant="success-subtle" className="mb-3">
							<Icon icon={IconType.Key} size={20} />
						</IconBox>
						<Heading className="mb-1">
							{statsLoading ? "—" : stats?.activeLicenses || 0}
						</Heading>
						<Text className="text-text-muted">Active Licenses</Text>
						{!statsLoading && stats && (
							<Text className="text-text-muted mt-1">
								{stats.totalLicenses} total
							</Text>
						)}
					</CardBody>
				</Card>

				<Card>
					<CardBody>
						<IconBox size="md" variant="warning-subtle" className="mb-3">
							<Icon icon={IconType.DollarCircle} size={20} />
						</IconBox>
						<Heading className="mb-1">
							${statsLoading ? "—" : (stats?.totalRevenue || 0).toFixed(2)}
						</Heading>
						<Text className="text-text-muted">Revenue</Text>
					</CardBody>
				</Card>
			</div>

			{/* Applications Section */}
			{appsLoading ? (
				<Card>
					<CardHeader>
						<div className="flex-1">
							<CardTitle>Applications</CardTitle>
							<Text className="text-text-muted">Apps registered under this project</Text>
						</div>
					</CardHeader>
					<CardBody>
						<div className="flex items-center justify-center py-8">
							<Spinner />
						</div>
					</CardBody>
				</Card>
			) : (
				<DataTable
					header={<DataTableHeader title="Applications" description="Apps registered under this project" />}
					isEmpty={!apps || apps.length === 0}
					emptyState={
						<EmptyState
							icon={IconType.Dashboard}
							title="No applications yet"
							description="Create your first app to start managing authentication."
							action={
								<Button
									variant="primary"
									onClick={() => navigate(`/projects/${projectId}/apps/new`)}
								>
									<Icon icon={IconType.Add} size={16} />
									Create App
								</Button>
							}
						/>
					}
				>
					<TableHeader>
						<tr>
							<TableHead>Name</TableHead>
							<TableHead>App ID</TableHead>
							<TableHead>Session TTL</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-8"></TableHead>
						</tr>
					</TableHeader>
					<TableBody>
						{(apps || []).map((app) => (
							<DataTableRow
								key={app.id}
								onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
							>
								<TableCell>
									<div className="flex items-center gap-3">
									<IconBox size="sm" variant="secondary-subtle">
											<Icon icon={IconType[getIconById(app.icon || "dashboard")]} size={18} />
										</IconBox>
										<Text className="font-medium">
											{app.name}
										</Text>
									</div>
								</TableCell>
								<TableCell>
									<code className="px-2 py-1 bg-surface-secondary rounded text-xs font-mono">
										{app.id}
									</code>
								</TableCell>
								<TableCell>
									<Text className="text-text-secondary">
										{app.sessionTtlDays || 30} days
									</Text>
								</TableCell>
								<TableCell>
									<Chip variant="success" size="sm">Active</Chip>
								</TableCell>
								<TableCell className="text-right pr-4">
									<Icon icon={IconType.ArrowRight} size={18} className="text-primary" />
								</TableCell>
							</DataTableRow>
						))}
					</TableBody>
				</DataTable>
			)}

			{/* Members Section */}
			{membersLoading ? (
				<Card>
					<CardHeader>
						<div>
							<CardTitle>Team Members</CardTitle>
							<Text className="text-text-muted">People with access to this project</Text>
						</div>
					</CardHeader>
					<CardBody>
						<div className="flex items-center justify-center py-8">
							<Spinner />
						</div>
					</CardBody>
				</Card>
			) : (
				<DataTable
					header={<DataTableHeader title="Team Members" description="People with access to this project" />}
					isEmpty={!members || members.length === 0}
					emptyState={<Text className="text-center py-8 text-text-muted">No team members found</Text>}
				>
					<TableHeader>
						<tr>
							<TableHead>User</TableHead>
							<TableHead>User Id</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Joined</TableHead>
						</tr>
					</TableHeader>
					<TableBody>
						{(members || []).map((member) => (
							<DataTableRow key={member.id}>
								<TableCell>
									<div className="flex items-center gap-3">
										<Avatar size="sm">
											{member.name?.charAt(0).toUpperCase() || "?"}
										</Avatar>
										<Text className="font-medium">
											{member.name}
										</Text>
									</div>
								</TableCell>
								<TableCell>
									<code className="px-2 py-1 bg-surface-secondary rounded text-xs font-mono">
										{member.userId}
									</code>
								</TableCell>
								<TableCell>
									<Chip variant={member.role === "owner" ? "info" : "default"} size="sm">
										{member.role}
									</Chip>
								</TableCell>
								<TableCell>
									<Text className="text-text-secondary">
										{new Date(member.createdAt).toLocaleDateString()}
									</Text>
								</TableCell>
							</DataTableRow>
						))}
					</TableBody>
				</DataTable>
			)}
		</div>
	);
}

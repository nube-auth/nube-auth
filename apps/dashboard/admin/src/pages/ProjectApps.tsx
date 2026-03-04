import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	Icon,
	IconType,
	Spinner,
	Alert,
	Heading,
	Text,
	Button,
	Card,
	CardBody,
	EmptyState,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
	BreadcrumbSeparator,
	Chip,
	DataTable,
	DataTableRow,
	TableHeader,
	TableHead,
	TableBody,
	TableCell
} from "@proofa/components";
import { useProject, useProjectApps } from "../hooks/api";

type ViewMode = "grid" | "table";

export function ProjectAppsPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const navigate = useNavigate();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: apps, isLoading: appsLoading } = useProjectApps(projectId || "");
	const [viewMode, setViewMode] = useState<ViewMode>("table");

	if (projectLoading || appsLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Spinner />
			</div>
		);
	}

	if (!project) {
		return <Alert variant="danger">Project not found</Alert>;
	}

	return (
		<div className="page">
			{/* Breadcrumb */}
			<Breadcrumb className="mb-6">
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
						<BreadcrumbButton active>Apps</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div className="flex justify-between items-center mb-8">
				<div>
					<Heading level={1} size="lg" className="mb-2">Applications</Heading>
					<Text className="text-muted">
						{apps?.length || 0} {apps?.length === 1 ? "app" : "apps"} in {project.name}
					</Text>
				</div>
				<div className="flex gap-3 items-center">
					{/* View Mode Toggle */}
					<div className="flex bg-surface-secondary/50 border border-border rounded-lg p-1 gap-1">
						<Button
							variant={viewMode === "grid" ? "primary" : "plain"}
							size="sm"
							onClick={() => setViewMode("grid")}
						>
							<Icon icon={IconType.LayoutGrid} size={14} bold={viewMode === "grid"} />
							Grid
						</Button>
						<Button
							variant={viewMode === "table" ? "primary" : "plain"}
							size="sm"
							onClick={() => setViewMode("table")}
						>
							<Icon icon={IconType.Menu} size={14} bold={viewMode === "table"} />
							Table
						</Button>
					</div>

					<Button
						variant="primary"
						onClick={() => navigate(`/projects/${projectId}/apps/new`)}
					>
						<Icon icon={IconType.Add} size={16} bold />
						New App
					</Button>
				</div>
			</div>

			{/* Apps Content */}
			{!apps || apps.length === 0 ? (
				<EmptyState
					
					title="No apps yet"
					description="Get started by creating your first application in this project"
				>
					<Button
						variant="primary"
						onClick={() => navigate(`/projects/${projectId}/apps/new`)}
					>
						Create First App
					</Button>
				</EmptyState>
			) : viewMode === "grid" ? (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
					{apps.map((app) => (
						<Card
							key={app.id}
							className="transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
							onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
						>
							<CardBody>
								{/* Header */}
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2.5">
										<div className="w-9 h-9 bg-surface-secondary rounded-lg flex items-center justify-center">
											<Icon icon={IconType.Key} size={20} className="text-primary" />
										</div>
										<div>
											<Heading level={3} size="sm" className="font-semibold">
												{app.name}
											</Heading>
											{app.slug && (
												<Text className="text-xs text-muted">
													{app.slug}
												</Text>
											)}
										</div>
									</div>
									<div className="flex items-center justify-center">
										<Icon icon={IconType.Check} size={18} className="text-success" bold />
									</div>
								</div>

								{/* Description */}
								{app.description && (
									<Text className="text-sm text-muted leading-relaxed line-clamp-2">
										{app.description}
									</Text>
								)}

								{/* Stats Grid */}
								<div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-surface-secondary rounded-lg">
									<div className="text-center">
										<div className="text-xl font-bold text-foreground mb-0.5">0</div>
										<Text className="text-xs text-muted">Users</Text>
									</div>
									<div className="text-center">
										<div className="text-xl font-bold text-foreground mb-0.5">0</div>
										<Text className="text-xs text-muted">Licenses</Text>
									</div>
								</div>

								{/* Footer */}
								<div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
									<Text className="text-xs text-muted">
										{new Date(app.createdAt).toLocaleDateString()}
									</Text>
									<Chip variant="info" size="sm">{app.id}</Chip>
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			) : (
				<DataTable>
						<TableHeader>
							<tr>
								<TableHead>Application</TableHead>
								<TableHead>Users</TableHead>
								<TableHead>Licenses</TableHead>
								<TableHead>Created</TableHead>
								<TableHead align="right">Actions</TableHead>
							</tr>
						</TableHeader>
						<TableBody>
							{apps.map((app) => (
								<DataTableRow
									key={app.id}
									onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
								>
											<TableCell>
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 bg-surface-secondary rounded-md flex items-center justify-center shrink-0">
														<Icon icon={IconType.Key} size={18} className="text-primary" />
													</div>
													<div>
														<Text className="font-medium mb-0.5">
															{app.name}
														</Text>
														<Text className="text-xs text-muted">
															{app.slug}
														</Text>
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Text className="font-semibold">0</Text>
											</TableCell>
											<TableCell>
												<Text className="font-semibold">0</Text>
											</TableCell>
											<TableCell>
												<Text className="text-muted">
													{new Date(app.createdAt).toLocaleDateString()}
												</Text>
											</TableCell>
											<TableCell align="right">
												<Button
													size="sm"
													variant="secondary"
													onClick={(e) => {
														e.stopPropagation();
														navigate(`/projects/${projectId}/apps/${app.id}/settings`);
													}}
												>
													Settings
												</Button>
											</TableCell>
										</DataTableRow>
									))}
								</TableBody>
				</DataTable>
			)}
		</div>
	);
}

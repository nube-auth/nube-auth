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
	Table,
	TableContainer,
	TableHeader,
	TableHead,
	TableBody,
	TableRow,
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
					<Text className="text-text-tertiary">
						{apps?.length || 0} {apps?.length === 1 ? "app" : "apps"} in {project.name}
					</Text>
				</div>
				<div className="flex gap-3 items-center">
					{/* View Mode Toggle */}
					<div className="flex gap-1 p-1 bg-card-bg border border-card-border rounded-lg">
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`px-3 py-1.5 border-none rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-13px font-medium ${
								viewMode === "grid" ? "bg-primary text-white" : "bg-transparent text-text-secondary hover:text-text-primary"
							}`}
						>
							<Icon icon={IconType.LayoutGrid} size={14} bold={viewMode === "grid"} />
							Grid
						</button>
						<button
							type="button"
							onClick={() => setViewMode("table")}
							className={`px-3 py-1.5 border-none rounded-md cursor-pointer transition-all flex items-center gap-1.5 text-13px font-medium ${
								viewMode === "table" ? "bg-primary text-white" : "bg-transparent text-text-secondary hover:text-text-primary"
							}`}
						>
							<Icon icon={IconType.Menu} size={14} bold={viewMode === "table"} />
							Table
						</button>
					</div>

					<Button
						variant="primary"
						onClick={() => navigate(`/projects/${projectId}/apps/new`)}
					>
						+ New App
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
				<div className="grid gap-5 grid-cols-auto-fill-320">
					{apps.map((app) => (
						<Card
							key={app.id}
							className="cursor-pointer transition-all border border-border hover:border-primary hover:-translate-y-0.5"
							onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
						>
							<CardBody>
								<div className="flex items-start gap-4 mb-4">
									<div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-light to-purple-200">
										<Icon icon={IconType.Key} size={24} className="text-primary" />
									</div>
									<div className="flex-1 min-w-0">
										<Heading level={3} size="md" className="mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
											{app.name}
										</Heading>
										<Text className="text-text-tertiary overflow-hidden text-ellipsis whitespace-nowrap">
											{app.slug}
										</Text>
									</div>
								</div>

								{app.description && (
									<Text className="text-text-secondary mb-4 leading-1.5 line-clamp-2">
										{app.description}
									</Text>
								)}

								<div className="flex gap-4 pt-4 border-t border-border">
									<Text>
										<span className="text-text-tertiary">Users: </span>
										<span className="text-text-primary font-semibold">0</span>
									</Text>
									<Text>
										<span className="text-text-tertiary">Licenses: </span>
										<span className="text-text-primary font-semibold">0</span>
									</Text>
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			) : (
				<Card className="overflow-hidden">
					<CardBody className="p-0">
						<TableContainer>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Application</TableHead>
										<TableHead>Users</TableHead>
										<TableHead>Licenses</TableHead>
										<TableHead>Created</TableHead>
										<TableHead align="right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{apps.map((app) => (
										<TableRow
											key={app.id}
											className="cursor-pointer hover:bg-accent transition-colors"
											onClick={() => navigate(`/projects/${projectId}/apps/${app.id}`)}
										>
											<TableCell>
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-light to-purple-200">
														<Icon icon={IconType.Key} size={20} className="text-primary" />
													</div>
													<div>
														<Text className="font-medium text-text-primary">
															{app.name}
														</Text>
														<Text className="text-text-secondary">
															{app.slug}
														</Text>
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Text className="text-text-secondary">0</Text>
											</TableCell>
											<TableCell>
												<Text className="text-text-secondary">0</Text>
											</TableCell>
											<TableCell>
												<Text className="text-text-secondary">
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
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardBody>
				</Card>
			)}
		</div>
	);
}

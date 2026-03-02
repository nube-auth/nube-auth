import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProjects, useProjectsStats } from "../hooks/api";
import { 
	Icon, 
	IconType,
	Button,
	Spinner,
	Alert,
	Card,
	CardBody,
	DataTable,
	DataTableRow,
	TableHeader,
	TableHead,
	TableBody,
	TableCell,
	Heading,
	Text,
	Chip,
} from "@proofa/components";
import { getIconById } from "../components/IconPicker";
import type { Project } from "../types/admin";

type ViewMode = "grid" | "table";

export default function Projects() {
	const { data: projects, isLoading, error } = useProjects();
	const { data: statsMap } = useProjectsStats();
	const navigate = useNavigate();
	const [viewMode, setViewMode] = useState<ViewMode>("table");

	const hasProjects = projects && projects.length > 0;

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20">
				<Spinner className="w-12 h-12 mb-4" />
				<Text className="text-muted">Loading projects...</Text>
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="danger">
				<Icon icon={IconType.AlertCircle} size={20} />
				<span>Error loading projects. Please try again.</span>
			</Alert>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<Heading level={1} size="lg">Projects</Heading>
					<Text className="text-muted mt-1">Manage your authentication projects</Text>
				</div>
				{hasProjects && (
					<div className="flex gap-3 items-center">
						<div className="flex bg-surface-secondary/50 border border-border rounded-lg p-1 gap-1">
							<Button
								variant={viewMode === "grid" ? "primary" : "plain"}
								size="sm"
								onClick={() => setViewMode("grid")}
							>
								<Icon icon={IconType.Grid} size={14} bold={viewMode === "grid"} />
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
						<Button variant="primary" onClick={() => navigate("/projects/new")}>
							<Icon icon={IconType.Add} size={16} bold />
							New Project
						</Button>
					</div>
				)}
			</div>

			{/* Empty State */}
			{!hasProjects && (
				<div className="flex flex-col items-center justify-center py-20 px-5 text-center">
					<div className="relative mb-6">
						<div className="w-25 h-25 rounded-full flex items-center justify-center border border-primary/25">
							<Icon icon={IconType.Layers} size={44} className="text-primary" />
						</div>
						<div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background">
							<Icon icon={IconType.Add} size={16} className="text-white" bold />
						</div>
					</div>
					<Heading level={2} size="md" className="mb-3">
						Create your first project
					</Heading>
					<Text className="text-muted max-w-100 mb-8 leading-relaxed">
						Projects help you organize your applications and manage authentication across your services.
					</Text>
					<Button
						variant="primary"
						size="lg"
						onClick={() => navigate("/projects/new")}
					>
						<Icon icon={IconType.Add} size={18} bold />
						New Project
					</Button>
					<div className="mt-10 flex gap-8 text-muted text-sm">
						<div className="flex items-center gap-2">
							<Icon icon={IconType.Flash} size={16} className="text-blue-400" />
							<span>Quick Setup</span>
						</div>
						<div className="flex items-center gap-2">
							<Icon icon={IconType.Lock} size={16} className="text-green-400" />
							<span>Secure by Default</span>
						</div>
						<div className="flex items-center gap-2">
							<Icon icon={IconType.SecurityCheck} size={16} className="text-purple-400" />
							<span>Production Ready</span>
						</div>
					</div>
				</div>
			)}

			{/* Grid View */}
			{hasProjects && viewMode === "grid" && (
				<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
					{projects.map((project: Project) => (
						<Link key={project.id} to={`/projects/${project.id}`} className="no-underline">
							<Card className="transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-lg cursor-pointer">
								<CardBody>
								{/* Header */}
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2.5">
										<div className="w-9 h-9 bg-surface-secondary rounded-lg flex items-center justify-center">
											<Icon icon={getIconById(project.icon || "folder")} size={20} className="text-primary" />
										</div>
										<div>
											<Heading level={3} size="sm" className="font-semibold">
												{project.name}
											</Heading>
											{project.slug && (
												<Text className="text-xs text-muted">
													{project.slug}
												</Text>
											)}
										</div>
									</div>
									<div className="flex items-center justify-center">
										<Icon icon={IconType.Check} size={18} className="text-success" bold />
									</div>
								</div>

								{/* Stats Grid */}
								<div className="grid grid-cols-3 gap-3 mt-4 p-3 bg-surface-secondary rounded-lg">
									<div className="text-center">
										<div className="text-xl font-bold text-foreground mb-0.5">
											{statsMap?.[project.id]?.totalApps ?? 0}
										</div>
										<Text className="text-xs text-muted">Apps</Text>
									</div>
									<div className="text-center">
										<div className="text-xl font-bold text-foreground mb-0.5">
											{statsMap?.[project.id]?.totalUsers ?? 0}
										</div>
										<Text className="text-xs text-muted">Users</Text>
									</div>
									<div className="text-center">
										<div className="text-xl font-bold text-foreground mb-0.5">
											{statsMap?.[project.id]?.activeLicenses ?? 0}
										</div>
										<Text className="text-xs text-muted">Licenses</Text>
									</div>
								</div>

								{/* Footer */}
								<div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
									<div className="flex items-center gap-1.5">
										<Icon icon={IconType.DollarCircle} size={14} className="text-success" />
										<span className="text-sm font-semibold text-success">
											${(statsMap?.[project.id]?.totalRevenue ?? 0).toFixed(2)}
										</span>
									</div>
									<Chip variant="info" size="sm"> {project.id} </Chip>
								</div>
							</CardBody>
						</Card>
						</Link>
					))}
				</div>
			)}

			{/* Table View */}
			{hasProjects && viewMode === "table" && (
				<DataTable>
						<TableHeader>
							<tr>
								<TableHead>Name</TableHead>
								<TableHead className="text-center">Apps</TableHead>
								<TableHead className="text-center">Users</TableHead>
								<TableHead className="text-center">Licenses</TableHead>
								<TableHead className="text-right">Revenue</TableHead>
								<TableHead className="text-center">Status</TableHead>
								<TableHead className="w-12"></TableHead>
							</tr>
						</TableHeader>
						<TableBody>
							{projects.map((project: Project) => (
								<DataTableRow
									key={project.id}
									onClick={() => navigate(`/projects/${project.id}`)}
								>
										<TableCell>
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 bg-surface-secondary rounded-md flex items-center justify-center flex-shrink-0">
													<Icon icon={getIconById(project.icon || "folder")} size={18} className="text-primary" />
												</div>
												<div>
													<Text className="font-medium mb-0.5">
														{project.name}
													</Text>
													{project.slug && (
														<Text className="text-xs text-muted">
															{project.slug}
														</Text>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell className="text-center">
											<Text className="font-semibold">
												{statsMap?.[project.id]?.totalApps ?? 0}
											</Text>
										</TableCell>
										<TableCell className="text-center">
											<Text className="font-semibold">
												{statsMap?.[project.id]?.totalUsers ?? 0}
											</Text>
										</TableCell>
										<TableCell className="text-center">
											<Text className="font-semibold">
												{statsMap?.[project.id]?.activeLicenses ?? 0}
												<span className="text-sm text-muted font-normal ml-0.5">
													/ {statsMap?.[project.id]?.totalLicenses ?? 0}
												</span>
											</Text>
										</TableCell>
										<TableCell className="text-right">
											<Text className="font-semibold text-success">
												${(statsMap?.[project.id]?.totalRevenue ?? 0).toFixed(2)}
											</Text>
										</TableCell>
										<TableCell>
											<div className="flex items-center justify-center">
												<Icon icon={IconType.Check} size={18} className="text-success" bold />
											</div>
										</TableCell>
										<TableCell className="text-center">
											<Icon icon={IconType.ArrowRight} size={16} className="text-muted" />
										</TableCell>
									</DataTableRow>
								))}
							</TableBody>
				</DataTable>
			)}
		</div>
	);
}

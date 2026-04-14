import { Link, useParams } from "react-router-dom";
import { useProject, useProjectStats } from "../hooks/api";
import {
	Spinner,
	Alert,
	Text,
	Heading,
	Card,
	CardBody,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbButton,
} from "@nube-auth/components";

export function ProjectStatsPage() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project, isLoading: projectLoading } = useProject(projectId || "");
	const { data: stats, isLoading: statsLoading } = useProjectStats(projectId || "");

	if (projectLoading || statsLoading) {
		return (
			<div className="flex justify-center items-center py-12">
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
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to="/projects" />}>Projects</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton render={<Link to={`/projects/${projectId}`} />}>
							{project.name}
						</BreadcrumbButton>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbButton active>Statistics</BreadcrumbButton>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Page Header */}
			<div className="mb-8">
				<Heading level={1} size="lg">
					Project Statistics
				</Heading>
				<Text className="text-text-secondary">View detailed analytics and insights for {project.name}</Text>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-8">
				<Card>
					<CardBody>
						<Text className="text-13px text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
							Total Apps
						</Text>
						<Text className="text-32px font-bold text-text-primary">{stats?.totalApps || 0}</Text>
					</CardBody>
				</Card>

				<Card>
					<CardBody>
						<Text className="text-13px text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
							Total Users
						</Text>
						<Text className="text-32px font-bold text-text-primary">{stats?.totalUsers || 0}</Text>
					</CardBody>
				</Card>

				<Card>
					<CardBody>
						<Text className="text-13px text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
							Active Licenses
						</Text>
						<Text className="text-32px font-bold text-text-primary">{stats?.activeLicenses || 0}</Text>
					</CardBody>
				</Card>

				<Card>
					<CardBody>
						<Text className="text-13px text-text-tertiary mb-2 font-semibold uppercase tracking-wider">
							Total Revenue
						</Text>
						<Text className="text-32px font-bold text-text-primary">
							${(stats?.totalRevenue ?? 0).toFixed(2)}
						</Text>
						{stats?.revenueByCurrency &&
							Object.keys(stats.revenueByCurrency).filter((c) => c !== "usd").length > 0 && (
								<Text className="text-11px text-text-tertiary mt-1">
									+
									{Object.entries(stats.revenueByCurrency)
										.filter(([c]) => c !== "usd")
										.map(([c, v]) => `${c.toUpperCase()} ${(v as number).toFixed(2)}`)
										.join(", ")}
								</Text>
							)}
					</CardBody>
				</Card>
			</div>

			{/* Coming Soon Section */}
			<Card>
				<CardBody className="p-12 text-center">
					<div className="text-48px mb-4">📊</div>
					<Heading level={2} size="lg" className="mb-2">
						Advanced Analytics Coming Soon
					</Heading>
					<Text className="text-text-secondary max-w-[480px] mx-auto">
						We're working on detailed charts, user growth trends, retention analytics, and more. Stay tuned
						for updates!
					</Text>
				</CardBody>
			</Card>
		</div>
	);
}

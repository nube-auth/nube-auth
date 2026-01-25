import React from "react";
import { Link } from "react-router-dom";
import {
	Icon,
	IconType,
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbSeparator,
	Card,
	CardHeader,
	CardTitle,
	CardBody,
	Button,
	Alert,
} from "@proofa/components";
import { ProfileHeader } from "@proofa/components";
import { useMe } from "../hooks/api";

export function SecurityPage() {
	const { user, isLoading } = useMe();

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
				<div className="animate-spin">
					<Icon icon={IconType.Refresh} size={24} />
				</div>
				<span className="text-sm text-muted">Loading security settings...</span>
			</div>
		);
	}

	if (!user) {
		return (
			<Card>
				<CardBody className="flex flex-col items-center justify-center py-12 text-center">
					<Icon icon={IconType.Alert} size={28} bold className="text-amber-500 mb-4" />
					<h3 className="text-lg font-semibold mb-2">User not found</h3>
					<p className="text-sm text-muted">Unable to load security settings.</p>
				</CardBody>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<Link to="/profile" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
							<Icon icon={IconType.Home} size={14} />
							Home
						</Link>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<span className="text-sm font-medium">Security</span>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Header */}
			<ProfileHeader
				name={user.name || user.email || "User"}
				email={user.email || ""}
				meta={`Member since ${new Date(user.createdAt).toLocaleDateString()}`}
			/>

			{/* Two-Factor Authentication */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon icon={IconType.Shield} size={18} />
						Two-Factor Authentication
					</CardTitle>
				</CardHeader>
				<CardBody className="space-y-4">
					<Alert variant="info">
						<Icon icon={IconType.Info} size={18} />
						Two-factor authentication is not yet available but coming soon.
					</Alert>
					<Button variant="primary" disabled>
						Enable 2FA
					</Button>
				</CardBody>
			</Card>

			{/* Password Management */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon icon={IconType.Lock} size={18} />
						Password Management
					</CardTitle>
				</CardHeader>
				<CardBody className="space-y-4">
					<Alert variant="info">
						<Icon icon={IconType.Info} size={18} />
						Password management features are coming soon.
					</Alert>
					<Button variant="primary" disabled>
						Change Password
					</Button>
				</CardBody>
			</Card>

			{/* Connected Applications */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
					<Icon icon={IconType.Flash} size={18} />
						Connected Applications
					</CardTitle>
				</CardHeader>
				<CardBody className="space-y-4">
					<Alert variant="info">
						<Icon icon={IconType.Info} size={18} />
						No connected applications yet. Connect apps to enhance your Proofa experience.
					</Alert>
				</CardBody>
			</Card>
		</div>
	);
}

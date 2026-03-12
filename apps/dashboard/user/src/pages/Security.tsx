import React from "react";
import {
	Icon,
	IconType,
	Card,
	CardHeader,
	CardTitle,
	CardBody,
	Button,
	Alert,
	Chip,
	Spinner,
} from "@nube-auth/components";
import { ProfileHeader, InfoGrid } from "@nube-auth/components";
import { TabNavigation } from "../components/TabNavigation";
import { useMe } from "../hooks/api";
import { PageLoader } from "../components/PageLoader";

export function SecurityPage() {
	const { user, isLoading } = useMe();

	if (isLoading) {
		return <PageLoader message="Loading security settings..." />;
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

	const initials = user.name
		? user.name
				.split(" ")
				.map((n) => n.charAt(0))
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user.email?.charAt(0).toUpperCase() || "U";

	return (
		<div className="space-y-6">
			{/* Header */}
			<ProfileHeader
				name={user.name || user.email || "User"}
				email={user.email || ""}
				meta={`Member since ${new Date(user.createdAt).toLocaleDateString()}`}
				avatar={<div className="size-16 rounded-full bg-primary text-white grid place-items-center font-semibold ring-2 ring-card-border/80 shadow-sm">{initials}</div>}
			/>

			{/* Security Stats */}
			<Card>
				<CardBody className="py-6">
					<InfoGrid
						items={[
							{ label: "Security Level", value: (<span className="inline-flex items-center gap-2"><Icon icon={IconType.Shield} size={16} /><Chip variant="info" size="sm">Standard</Chip></span>) },
							{ label: "Two-Factor Auth", value: (<span className="inline-flex items-center gap-2"><Chip variant="warning" size="sm">Not Enabled</Chip></span>) },
							{ label: "Password", value: (<Chip variant="success" size="sm">Secure</Chip>) },
							{ label: "Connected Apps", value: "0 apps" },
						]}
						columns={4}
					/>
				</CardBody>
			</Card>

			{/* Tab Navigation */}
			<TabNavigation />

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
						No connected applications yet. Connect apps to enhance your Nube Auth experience.
					</Alert>
				</CardBody>
			</Card>
		</div>
	);
}

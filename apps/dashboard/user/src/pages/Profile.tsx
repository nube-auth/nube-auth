import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMe } from "../hooks/api";
import { 
	Icon, 
	IconType,
	Card,
	CardHeader,
	CardTitle,
	CardBody,
	Button,
	Field,
	Label,
	Input,
	Alert,
	Chip,
	Tabs,
	TabsList,
	TabsTrigger
} from "@proofa/components";

export function ProfilePage() {
	const location = useLocation();
	const { user, isLoading, update, isUpdating } = useMe();
	const [name, setName] = useState("");
	const [showSuccess, setShowSuccess] = useState(false);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return dateString;
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	React.useEffect(() => {
		if (user) {
			setName(user.name || "");
		}
	}, [user]);

	if (isLoading) {
		return (
			<div className="loading">
				<div className="spinner w-4 h-4 border-2" />
				<span className="loading-text">Loading profile...</span>
			</div>
		);
	}

	if (!user) {
		return (
			<Card>
				<CardBody className="flex flex-col items-center justify-center py-12 text-center">
					<Icon icon={IconType.Alert} size={28} bold className="text-amber-500 mb-4" />
					<h3 className="text-lg font-semibold mb-2">User not found</h3>
					<p className="text-sm text-muted">Unable to load your profile information.</p>
				</CardBody>
			</Card>
		);
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		update(
			{ name },
			{
				onSuccess: () => {
					setShowSuccess(true);
					setTimeout(() => setShowSuccess(false), 3000);
				},
			},
		);
	};

	const initials = user.name
		? user.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user.email?.charAt(0).toUpperCase() || "U";

	return (
		<div>
			{/* Breadcrumbs */}
			<nav className="breadcrumbs">
				<Link to="/profile" className="breadcrumb-item">
					Account
				</Link>
				<span className="breadcrumb-divider">/</span>
				<span className="breadcrumb-current">Profile</span>
			</nav>

			{/* Profile Header */}
			<div className="profile-header">
				<div className="profile-avatar has-icon">{initials}</div>
				<div className="profile-info">
					<h1>{user.name || "User"}</h1>
					<p className="profile-meta">Last updated recently</p>
				</div>
			</div>

			{/* Info Grid */}
			<div className="info-grid">
				<div className="info-item">
					<div className="info-label">Email</div>
					<div className="info-value">{user.email}</div>
				</div>
				<div className="info-item">
					<div className="info-label">Status</div>
					<div className="info-value">
						<span className="status-dot" />
						Active
					</div>
				</div>
				<div className="info-item">
					<div className="info-label">Account Type</div>
					<div className="info-value">
						<Icon icon={IconType.User} size={16} bold className="text-indigo-500" />
						User
					</div>
				</div>
				<div className="info-item">
					<div className="info-label">Joined</div>
					<div className="info-value">{formatDate(user.createdAt)}</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="tabs">
				<Link to="/profile" className={location.pathname === "/profile" ? "tab tab-active" : "tab"}>
					<Icon icon={IconType.User} size={18} bold={location.pathname === "/profile"} />
					Profile
				</Link>
				<Link to="/sessions" className={location.pathname === "/sessions" ? "tab tab-active" : "tab"}>
					<Icon icon={IconType.Computer} size={18} bold={location.pathname === "/sessions"} />
					Sessions
				</Link>
				<button type="button" className="tab" disabled>
					<Icon icon={IconType.SecurityCheck} size={18} />
					Security
				</button>
			</div>

			{/* Success Alert */}
			{showSuccess && (
				<Alert variant="success" className="mb-4">
					<Icon icon={IconType.CheckCircle} size={20} bold className="flex-shrink-0" />
					<span>Profile updated successfully!</span>
				</Alert>
			)}

			{/* Profile Form Card */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Personal Information</CardTitle>
				</CardHeader>
				<CardBody>
					<form onSubmit={handleSubmit} className="flex flex-col gap-6">
						<Field>
							<Label>Email Address</Label>
							<div className="flex items-center gap-2">
								<Input type="email" value={user.email} disabled className="flex-1" />
								<Chip variant="primary" size="sm">Verified</Chip>
							</div>
							<p className="text-sm text-muted mt-1">Email cannot be changed</p>
						</Field>

						<Field>
							<Label htmlFor="name">Display Name</Label>
							<Input
								type="text"
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter your name"
							/>
							<p className="text-sm text-muted mt-1">This name will be displayed across all apps</p>
						</Field>

						<div className="flex justify-between items-center">
							<Button type="submit" disabled={isUpdating} variant="primary">
								{isUpdating ? (
									<>
										<div className="spinner w-4 h-4 border-2" />
										Saving...
									</>
								) : (
									<>
										<Icon icon={IconType.Check} size={18} bold />
										Save Changes
									</>
								)}
							</Button>
						</div>
					</form>
				</CardBody>
			</Card>

			{/* Account Information Card */}
			<Card>
				<CardHeader>
					<CardTitle>Account Information</CardTitle>
				</CardHeader>
				<CardBody>
					<div className="flex flex-col divide-y divide-border">
						<div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
							<div className="flex flex-col gap-1">
								<span className="text-sm font-medium">Account ID</span>
								<span className="text-sm text-muted">Your unique identifier</span>
							</div>
							<code className="text-sm bg-accent px-2 py-1 rounded">{user.id}</code>
						</div>
						<div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
							<div className="flex flex-col gap-1">
								<span className="text-sm font-medium">Account Created</span>
								<span className="text-sm text-muted">When you first signed up</span>
							</div>
							<span className="text-sm">{formatDate(user.createdAt)}</span>
						</div>
						<div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
							<div className="flex flex-col gap-1">
								<span className="text-sm font-medium">Authentication</span>
								<span className="text-sm text-muted">Sign-in method</span>
							</div>
							<Chip variant="default" size="sm">
								<Icon icon={IconType.Google} size={12} />
								Google
							</Chip>
						</div>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
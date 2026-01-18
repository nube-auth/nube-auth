import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMe } from "../hooks/api";
import { Icon, IconType } from "@proofa/components";

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
			<div className="card">
				<div className="empty-state">
					<div className="empty-state-icon">
						<Icon icon={IconType.Alert} size={28} bold className="text-amber-500" />
					</div>
					<h3 className="empty-state-title">User not found</h3>
					<p className="empty-state-desc">Unable to load your profile information.</p>
				</div>
			</div>
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
				<div className="alert alert-success">
					<Icon icon={IconType.CheckCircle} size={20} bold className="flex-shrink-0 text-emerald-600" />
					<span>Profile updated successfully!</span>
				</div>
			)}

			{/* Profile Form Card */}
			<div className="card mb-6">
				<div className="card-header">
					<h3 className="card-title">Personal Information</h3>
				</div>
				<div className="card-body">
					<form onSubmit={handleSubmit}>
						<div className="form-group">
							<label className="form-label">Email Address</label>
							<div className="input-group">
								<input type="email" value={user.email} disabled />
								<span className="badge badge-success">Verified</span>
							</div>
							<p className="form-hint">Email cannot be changed</p>
						</div>

						<div className="form-group">
							<label htmlFor="name" className="form-label">
								Display Name
							</label>
							<input
								type="text"
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Enter your name"
							/>
							<p className="form-hint">This name will be displayed across all apps</p>
						</div>

						<div className="flex justify-between items-center mt-6">
							<button type="submit" disabled={isUpdating} className="btn-primary">
								{isUpdating ? (
									<>
										<div
											className="spinner w-4 h-4 border-2"
										/>
										Saving...
									</>
								) : (
									<>
										<Icon icon={IconType.Check} size={18} bold />
										Save Changes
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>

			{/* Account Information Card */}
			<div className="card">
				<div className="card-header">
					<h3 className="card-title">Account Information</h3>
				</div>
				<div className="card-body">
					<div className="info-list">
						<div className="info-list-item">
							<div className="info-list-label">
								<span>Account ID</span>
								<span>Your unique identifier</span>
							</div>
							<div className="info-list-value">
								<code>{user.id}</code>
							</div>
						</div>
						<div className="info-list-item">
							<div className="info-list-label">
								<span>Account Created</span>
								<span>When you first signed up</span>
							</div>
							<div className="info-list-value">{formatDate(user.createdAt)}</div>
						</div>
						<div className="info-list-item">
							<div className="info-list-label">
								<span>Authentication</span>
								<span>Sign-in method</span>
							</div>
							<div className="info-list-value">
								<span className="badge badge-info">
									<Icon icon={IconType.Google} size={12} />
									Google
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

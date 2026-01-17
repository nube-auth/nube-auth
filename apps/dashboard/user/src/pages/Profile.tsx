import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMe } from "../hooks/api";
import { Icon } from "../components/Icon";
import {
	UserIcon,
	ComputerIcon,
	SecurityCheckIcon,
	CheckmarkCircle02Icon,
	Tick02Icon,
	Alert02Icon,
} from "@hugeicons/core-free-icons";

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
						<Icon icon={Alert02Icon} size={28} bold className="text-amber-500" />
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
						<Icon icon={UserIcon} size={16} bold className="text-indigo-500" />
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
					<Icon icon={UserIcon} size={18} bold={location.pathname === "/profile"} />
					Profile
				</Link>
				<Link to="/sessions" className={location.pathname === "/sessions" ? "tab tab-active" : "tab"}>
					<Icon icon={ComputerIcon} size={18} bold={location.pathname === "/sessions"} />
					Sessions
				</Link>
				<button type="button" className="tab" disabled>
					<Icon icon={SecurityCheckIcon} size={18} />
					Security
				</button>
			</div>

			{/* Success Alert */}
			{showSuccess && (
				<div className="alert alert-success">
					<Icon icon={CheckmarkCircle02Icon} size={20} bold className="flex-shrink-0 text-emerald-600" />
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
										<Icon icon={Tick02Icon} size={18} bold />
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
									<svg
									className="w-3 h-3"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
										<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
										<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
										<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
									</svg>
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

import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMe, useUpdateProfile } from "../hooks/api";

export function ProfilePage() {
	const location = useLocation();
	const { data: user, isLoading } = useMe();
	const { mutate: updateProfile, isPending, isSuccess } = useUpdateProfile();
	const [name, setName] = useState("");

	React.useEffect(() => {
		if (user) {
			setName(user.name || "");
		}
	}, [user]);

	if (isLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
				<span className="loading-text">Loading profile...</span>
			</div>
		);
	}

	if (!user) {
		return (
			<div className="card">
				<div className="empty-state">
					<div className="empty-state-icon">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<h3 className="empty-state-title">User not found</h3>
					<p className="empty-state-desc">Unable to load your profile information.</p>
				</div>
			</div>
		);
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		updateProfile({ name });
	};

	const initials = user.name
		? user.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user.email?.charAt(0).toUpperCase() || "U";

	const formatDate = (date: string | undefined) => {
		if (!date) return "Unknown";
		return new Date(date).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric"
		});
	};

	return (
		<div>
			{/* Breadcrumbs */}
			<nav className="breadcrumbs">
				<Link to="/profile" className="breadcrumb-item">Account</Link>
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
						<svg className="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
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
				<Link to="/profile" className={`tab ${location.pathname === "/profile" ? "active" : ""}`}>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
					Profile
				</Link>
				<Link to="/sessions" className={`tab ${location.pathname === "/sessions" ? "active" : ""}`}>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
					Sessions
				</Link>
				<button type="button" className="tab" disabled>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
					</svg>
					Security
				</button>
			</div>

			{/* Success Alert */}
			{isSuccess && (
				<div className="alert alert-success">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
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
							<label htmlFor="name" className="form-label">Display Name</label>
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
							<button type="submit" disabled={isPending} className="btn btn-primary">
								{isPending ? (
									<>
										<div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
										Saving...
									</>
								) : (
									<>
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
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
							<div className="info-list-value">
								{formatDate(user.createdAt)}
							</div>
						</div>
						<div className="info-list-item">
							<div className="info-list-label">
								<span>Authentication</span>
								<span>Sign-in method</span>
							</div>
							<div className="info-list-value">
								<span className="badge badge-info">
									<svg style={{ width: "12px", height: "12px" }} viewBox="0 0 24 24" fill="currentColor">
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

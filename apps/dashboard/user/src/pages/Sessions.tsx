import { Link, useLocation } from "react-router-dom";
import { useAuth, useMe, useSessions } from "../hooks/api";

export function SessionsPage() {
	const location = useLocation();
	const { user } = useMe();
	const { sessions, isLoading } = useSessions();
	const { logout, isLoggingOut } = useAuth();

	if (isLoading) {
		return (
			<div className="loading">
				<div className="spinner" />
				<span className="loading-text">Loading sessions...</span>
			</div>
		);
	}

	const activeSessions = sessions?.filter((s) => new Date(s.expiresAt) > new Date()) || [];
	const currentSession = sessions?.[0];

	const initials = user?.name
		? user.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user?.email?.charAt(0).toUpperCase() || "U";

	const formatDate = (date: string | number) => {
		const timestamp = typeof date === "number" ? date * 1000 : new Date(date).getTime();
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<div>
			{/* Breadcrumbs */}
			<nav className="breadcrumbs">
				<Link to="/profile" className="breadcrumb-item">
					Account
				</Link>
				<span className="breadcrumb-divider">/</span>
				<span className="breadcrumb-current">Sessions</span>
			</nav>

			{/* Profile Header */}
			<div className="profile-header">
				<div className="profile-avatar has-icon">{initials}</div>
				<div className="profile-info">
					<h1>{user?.name || "User"}</h1>
					<p className="profile-meta">Active sessions across your devices</p>
				</div>
			</div>

			{/* Info Grid */}
			<div className="info-grid">
				<div className="info-item">
					<div className="info-label">Total Sessions</div>
					<div className="info-value">{sessions?.length || 0}</div>
				</div>
				<div className="info-item">
					<div className="info-label">Active</div>
					<div className="info-value">
						<span className="status-dot" />
						{activeSessions.length}
					</div>
				</div>
				<div className="info-item">
					<div className="info-label">Current Expires</div>
					<div className="info-value">{currentSession ? formatDate(currentSession.expiresAt) : "N/A"}</div>
				</div>
				<div className="info-item">
					<div className="info-label">Last Activity</div>
					<div className="info-value">Just now</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="tabs">
				<Link to="/profile" className={location.pathname === "/profile" ? "tab tab-active" : "tab"}>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
					Profile
				</Link>
				<Link to="/sessions" className={location.pathname === "/sessions" ? "tab tab-active" : "tab"}>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
						/>
					</svg>
					Sessions
					<span className="tab-badge">{sessions?.length || 0}</span>
				</Link>
				<button type="button" className="tab" disabled>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
						/>
					</svg>
					Security
				</button>
			</div>

			{/* Alert Bar */}
			{activeSessions.length > 1 && (
				<div className="alert-bar">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					You have {activeSessions.length} active sessions across your devices.
					<button
						type="button"
						onClick={() => logout()}
						className="bg-transparent border-none text-primary cursor-pointer underline p-0 font-inherit"
					>
						Logout all
					</button>
				</div>
			)}

			{/* Current Session Card */}
			{currentSession && (
				<div className="current-session-card">
					<div className="current-session-header">
						<div className="current-session-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<div className="current-session-info">
							<h3>Current Session</h3>
							<p>This device</p>
						</div>
						<span className="badge badge-success ml-auto">Active</span>
					</div>
					<div className="current-session-meta">
						<div className="current-session-meta-item">
							<label>Started</label>
							<span>{new Date(currentSession.createdAt).toLocaleString()}</span>
						</div>
						<div className="current-session-meta-item">
							<label>Expires</label>
							<span>{new Date(currentSession.expiresAt).toLocaleString()}</span>
						</div>
					</div>
				</div>
			)}

			{/* Sessions Table */}
			<div className="card">
				<div className="card-header">
					<h3 className="card-title">All Sessions</h3>
					<button
						type="button"
						onClick={() => logout()}
						disabled={isLoggingOut}
						className="btn-danger btn-sm"
					>
						{isLoggingOut ? (
							<>
								<div className="spinner w-3.5 h-3.5 border-2" />
								Logging out...
							</>
						) : (
							<>
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
									/>
								</svg>
								Logout All
							</>
						)}
					</button>
				</div>

				{sessions && sessions.length > 0 ? (
					<div className="table-container border-none rounded-none">
						<table>
							<thead>
								<tr>
									<th>Device</th>
									<th>Created</th>
									<th>Expires</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{sessions.map((session) => {
									const isExpired = new Date(session.expiresAt) < new Date();
									const isCurrent = session.isCurrent === true;
									return (
										<tr key={session.id}>
											<td>
												<div className="table-account">
													<div className="table-account-icon">
														<svg
														className="w-4.5 h-4.5 text-text-tertiary"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
															/>
														</svg>
													</div>
													<div className="table-account-info">
														<span className="table-account-name">
															{isCurrent ? "This Device" : "Other Device"}
														</span>
														<span className="table-account-email">
															ID: {session.id.slice(0, 12)}...
														</span>
													</div>
												</div>
											</td>
											<td className="table-date">{formatDate(session.createdAt)}</td>
											<td className="table-date">{formatDate(session.expiresAt)}</td>
											<td>
												{isCurrent ? (
													<span className="badge badge-success">
													<span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
														Current
													</span>
												) : isExpired ? (
													<span className="badge badge-danger">Expired</span>
												) : (
													<span className="badge badge-info">Active</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<div className="empty-state">
						<div className="empty-state-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<h3 className="empty-state-title">No active sessions</h3>
						<p className="empty-state-desc">You don't have any active sessions at the moment.</p>
					</div>
				)}
			</div>
		</div>
	);
}

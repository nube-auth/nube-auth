import { Link, useLocation } from "react-router-dom";
import { useAuth, useMe, useSessions } from "../hooks/api";

// Common country codes to names mapping
const COUNTRY_NAMES: Record<string, string> = {
	US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
	DE: "Germany", FR: "France", JP: "Japan", CN: "China", IN: "India",
	BR: "Brazil", MX: "Mexico", ES: "Spain", IT: "Italy", NL: "Netherlands",
	RU: "Russia", KR: "South Korea", SG: "Singapore", HK: "Hong Kong",
	SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", CH: "Switzerland",
	AT: "Austria", BE: "Belgium", IE: "Ireland", NZ: "New Zealand", PL: "Poland",
	PT: "Portugal", CZ: "Czech Republic", GR: "Greece", IL: "Israel", AE: "UAE",
	ZA: "South Africa", AR: "Argentina", CL: "Chile", CO: "Colombia", PH: "Philippines",
	TH: "Thailand", VN: "Vietnam", MY: "Malaysia", ID: "Indonesia", TW: "Taiwan",
};

// Convert country code to flag emoji (using regional indicator symbols)
function getCountryFlag(code: string): string {
	const codePoints = [...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
}

// Get country display with flag
function getCountryDisplay(country: string | null | undefined): { flag: string; name: string } | null {
	if (!country) return null;
	const code = country.toUpperCase();
	return {
		flag: getCountryFlag(code),
		name: COUNTRY_NAMES[code] || code,
	};
}

// Parse user-agent string to extract browser and OS info
function parseUserAgent(ua: string | null | undefined): { browser: string; os: string; device: string } {
	if (!ua) return { browser: "Unknown", os: "Unknown", device: "Unknown Device" };
	
	const uaLower = ua.toLowerCase();
	
	// Detect browser
	let browser = "Unknown";
	if (uaLower.includes("edg/")) browser = "Edge";
	else if (uaLower.includes("chrome") && !uaLower.includes("edg")) browser = "Chrome";
	else if (uaLower.includes("firefox")) browser = "Firefox";
	else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";
	else if (uaLower.includes("opera") || uaLower.includes("opr")) browser = "Opera";
	
	// Detect OS
	let os = "Unknown";
	if (uaLower.includes("windows")) os = "Windows";
	else if (uaLower.includes("mac os") || uaLower.includes("macos")) os = "macOS";
	else if (uaLower.includes("linux") && !uaLower.includes("android")) os = "Linux";
	else if (uaLower.includes("android")) os = "Android";
	else if (uaLower.includes("iphone") || uaLower.includes("ipad") || uaLower.includes("ios")) os = "iOS";
	
	// Combine for device name
	const device = `${browser} on ${os}`;
	
	return { browser, os, device };
}

// Get device icon based on OS
function getDeviceIcon(os: string) {
	if (os === "iOS" || os === "Android") {
		// Mobile icon
		return (
			<svg className="w-4.5 h-4.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
		);
	}
	// Desktop icon
	return (
		<svg className="w-4.5 h-4.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
		</svg>
	);
}

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
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
			{currentSession && (() => {
				const currentDeviceInfo = parseUserAgent(currentSession.userAgent);
				return (
					<div className="current-session-card">
						<div className="current-session-header">
							<div className="current-session-icon">
								{getDeviceIcon(currentDeviceInfo.os)}
							</div>
							<div className="current-session-info">
								<h3>Current Session</h3>
								<p>{currentDeviceInfo.device}</p>
							</div>
							<span className="badge badge-success ml-auto">Active</span>
						</div>
						<div className="current-session-meta">
							<div className="current-session-meta-item">
								<label>Browser</label>
								<span>{currentDeviceInfo.browser}</span>
							</div>
							<div className="current-session-meta-item">
								<label>Operating System</label>
								<span>{currentDeviceInfo.os}</span>
							</div>
							<div className="current-session-meta-item">
								<label>Location</label>
								<span>
									{(() => {
										const countryInfo = getCountryDisplay(currentSession.country);
										if (countryInfo) {
											return `${countryInfo.flag} ${countryInfo.name}`;
										}
										return currentSession.ipAddress || "Unknown";
									})()}
								</span>
							</div>
							<div className="current-session-meta-item">
								<label>IP Address</label>
								<span>{currentSession.ipAddress || "Unknown"}</span>
							</div>
							<div className="current-session-meta-item">
								<label>Started</label>
								<span>{new Date(currentSession.createdAt).toLocaleString()}</span>
							</div>
						</div>
					</div>
				);
			})()}

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
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
									<th>Location</th>
									<th>Created</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{sessions.map((session) => {
									const isExpired = new Date(session.expiresAt) < new Date();
									const isCurrent = session.isCurrent === true;
									const deviceInfo = parseUserAgent(session.userAgent);
									return (
										<tr key={session.id}>
											<td>
												<div className="table-account">
													<div className="table-account-icon">
														{getDeviceIcon(deviceInfo.os)}
													</div>
													<div className="table-account-info">
														<span className="table-account-name">
															{deviceInfo.device}
															{isCurrent && <span className="text-primary ml-1">(This device)</span>}
														</span>
														<span className="table-account-email">
															{deviceInfo.browser} • {deviceInfo.os}
														</span>
													</div>
												</div>
											</td>
											<td>
												<div className="table-account-info">
													{(() => {
														const countryInfo = getCountryDisplay(session.country);
														if (countryInfo) {
															return (
																<>
																	<span className="table-account-name">
																		{countryInfo.flag} {countryInfo.name}
																	</span>
																	<span className="table-account-email">
																		{session.ipAddress || "Unknown IP"}
																	</span>
																</>
															);
														}
														return (
															<>
																<span className="table-account-name">
																	{session.ipAddress || "Unknown"}
																</span>
																<span className="table-account-email">
																	IP Address
																</span>
															</>
														);
													})()}
												</div>
											</td>
											<td className="table-date">{formatDate(session.createdAt)}</td>
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
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

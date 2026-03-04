import { useAuth, useMe, useSessions } from "../hooks/api";
import {
	Icon,
	IconType,
	Card,
	CardHeader,
	CardTitle,
	CardBody,
	Button,
	Alert,
  Spinner,
	Table,
	TableContainer,
	TableHeader,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	Chip,
} from "@proofa/components";
import { ProfileHeader, InfoGrid, SessionCard } from "@proofa/components";
import { TabNavigation } from "../components/TabNavigation";
import { PageLoader } from "../components/PageLoader";

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
		return <Icon icon={IconType.Phone} size={18} className="text-text-tertiary" />;
	}
	// Desktop icon
	return <Icon icon={IconType.Computer} size={18} className="text-text-tertiary" />;
}

export function SessionsPage() {
	const { user } = useMe();
	const { sessions, isLoading, deleteSession, isDeleting, deleteAll, isDeletingAll } = useSessions();
	const { logout, isLoggingOut } = useAuth();

	if (isLoading) {
		return <PageLoader message="Loading sessions..." />;
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
		<div className="space-y-6">
			{/* Header */}
			<ProfileHeader
				name={user?.name || "User"}
				email={user?.email || ""}
				meta="Active sessions across your devices"
				avatar={<div className="size-16 rounded-full bg-primary text-white grid place-items-center font-semibold ring-2 ring-card-border/80 shadow-sm">{initials}</div>}
			/>

			{/* Stats */}
			<Card>
				<CardBody className="py-6">
					<InfoGrid
						items={[
							{ label: "Total Sessions", value: sessions?.length || 0 },
							{ label: "Active", value: (<span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> {activeSessions.length}</span>) },
							{ label: "Current Expires", value: currentSession ? formatDate(currentSession.expiresAt) : "N/A" },
							{ label: "Last Activity", value: "Just now" },
						]}
						columns={4}
					/>
				</CardBody>
			</Card>

			{/* Tab Navigation */}
			<TabNavigation />

			{/* Alert */}
			{activeSessions.length > 1 && (
				<Alert variant="info" className="items-center justify-between">
					<div className="inline-flex items-center gap-2">
						<Icon icon={IconType.Info} size={18} />
						<span>You have {activeSessions.length} active sessions across your devices.</span>
					</div>
					<Button variant="danger" size="sm" onClick={() => deleteAll()} disabled={isDeletingAll}>
						{isDeletingAll ? (
							<>
							<Spinner className="size-3.5" />
							<span>Revoking...</span>
						</>
					) : (
						"Revoke All Other Sessions"
					)}
				</Button>
			</Alert>		)}

		{/* Current Session */}
		{currentSession && (() => {
			const currentDeviceInfo = parseUserAgent(currentSession.userAgent);
			const countryInfo = getCountryDisplay(currentSession.country);
			return (
				<SessionCard
					title="Current Session (This Device)"
					isCurrent={true}
					metadata={[
							{ label: "Browser", value: currentDeviceInfo.browser },
							{ label: "Operating System", value: currentDeviceInfo.os },
							{ label: "Location", value: countryInfo ? `${countryInfo.flag} ${countryInfo.name}` : (currentSession.ipAddress || "Unknown") },
							{ label: "IP Address", value: currentSession.ipAddress || "Unknown" },
							{ label: "Started", value: new Date(currentSession.createdAt).toLocaleString() },
						]}
						className="border border-card-border"
					/>
				);
			})()}

			{/* Sessions Table (Selia) */}
			<Card>
				<CardHeader className="flex items-center justify-between">
					<CardTitle>All Sessions</CardTitle>
					<Button variant="danger" size="sm" onClick={() => deleteAll()} disabled={isDeletingAll}>
						{isDeletingAll ? (
							<>
								<Spinner className="size-3.5" />
								Revoking...
							</>
						) : (
							<>
								<Icon icon={IconType.Logout} size={16} bold />
								Revoke All
							</>
						)}
					</Button>
				</CardHeader>
				<CardBody>
					{sessions && sessions.length > 0 ? (
						<TableContainer className="border border-table-separator rounded">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Device</TableHead>
										<TableHead>Location</TableHead>
										<TableHead>Created</TableHead>
										<TableHead>Status</TableHead>
										<TableHead></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sessions.map((session) => {
										const isExpired = new Date(session.expiresAt) < new Date();
										const isCurrent = session.isCurrent === true;
										const deviceInfo = parseUserAgent(session.userAgent);
										const countryInfo = getCountryDisplay(session.country);
										return (
											<TableRow key={session.id}>
												<TableCell>
													<div className="flex items-center gap-3">
														<div className="size-9 grid place-items-center rounded bg-accent">
															{getDeviceIcon(deviceInfo.os)}
														</div>
														<div className="flex flex-col">
															<span className="text-sm font-medium">
																{deviceInfo.device}
																{isCurrent && <span className="text-primary ml-1">(This device)</span>}
															</span>
															<span className="text-xs text-muted">
																{deviceInfo.browser} • {deviceInfo.os}
															</span>
														</div>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex flex-col">
														<span className="text-sm font-medium">
															{countryInfo ? `${countryInfo.flag} ${countryInfo.name}` : (session.ipAddress || "Unknown")}
														</span>
														<span className="text-xs text-muted">
															{countryInfo ? (session.ipAddress || "Unknown IP") : "IP Address"}
														</span>
													</div>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted">{formatDate(session.createdAt)}</span>
												</TableCell>
												<TableCell>
													{isCurrent ? (
														<Chip variant="success" size="sm" pill>
															<span className="size-1.5 bg-current rounded-full animate-pulse" /> Current
														</Chip>
													) : isExpired ? (
														<Chip variant="danger" size="sm" pill>Expired</Chip>
													) : (
														<Chip variant="info" size="sm" pill>Active</Chip>
													)}
												</TableCell>
												<TableCell>
													{!isCurrent && !isExpired && (
														<Button
															variant="danger"
															size="sm"
															onClick={() => deleteSession(session.id)}
															disabled={isDeleting}
														>
															Revoke
														</Button>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					) : (
						<div className="flex flex-col items-center justify-center py-14 text-center">
							<div className="size-16 grid place-items-center rounded bg-accent mb-3">
								<Icon icon={IconType.Computer} size={28} bold className="text-muted" />
							</div>
							<h3 className="text-base font-semibold mb-1">No active sessions</h3>
							<p className="text-sm text-muted">You don't have any active sessions at the moment.</p>
						</div>
					)}
				</CardBody>
			</Card>
		</div>
	);
}

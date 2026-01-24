export default function Settings() {
	return (
		<div className="p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-text-primary">Settings</h1>
				<p className="text-text-muted mt-1">Manage your account settings and preferences</p>
			</div>

			<div className="bg-card-bg border border-card-border rounded-lg p-8 text-center">
				<div className="inline-flex items-center justify-center w-16 h-16 bg-bg-muted rounded-full mb-4">
					<svg
						className="w-8 h-8 text-text-muted"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
				<h3 className="text-lg font-semibold text-text-primary mb-2">
					Settings page coming soon
				</h3>
				<p className="text-text-muted text-sm">
					This page will display account settings. Implementation in future phases.
				</p>
			</div>
		</div>
	);
}

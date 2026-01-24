import { Button } from "@proofa/components";
import { Chip } from "@proofa/components";
import { Alert, AlertTitle, AlertDescription } from "@proofa/components";

export default function Settings() {
	return (
		<div className="p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-text-primary">Settings</h1>
				<p className="text-text-muted mt-1">Manage your account settings and preferences</p>
			</div>

			{/* Selia Theme Test Section */}
			<div className="mb-6 bg-card-bg border border-card-border rounded-lg p-6">
				<h2 className="text-lg font-semibold text-text-primary mb-4">
					🎨 Selia Theme Test
				</h2>
				<p className="text-text-muted text-sm mb-6">
					These Selia components should now use your Proofa theme colors (purple primary, etc.)
				</p>

				{/* Button Variants */}
				<div className="mb-6">
					<h3 className="text-sm font-medium text-text-primary mb-3">Button Variants</h3>
					<div className="flex flex-wrap gap-3">
						<Button variant="primary" size="md">Primary Button</Button>
						<Button variant="secondary" size="md">Secondary Button</Button>
						<Button variant="tertiary" size="md">Tertiary Button</Button>
						<Button variant="danger" size="md">Danger Button</Button>
						<Button variant="outline" size="md">Outline Button</Button>
						<Button variant="plain" size="md">Plain Button</Button>
					</div>
				</div>

				{/* Button Sizes */}
				<div className="mb-6">
					<h3 className="text-sm font-medium text-text-primary mb-3">Button Sizes</h3>
					<div className="flex flex-wrap items-center gap-3">
						<Button variant="primary" size="xs">Extra Small</Button>
						<Button variant="primary" size="sm">Small</Button>
						<Button variant="primary" size="md">Medium</Button>
						<Button variant="primary" size="lg">Large</Button>
					</div>
				</div>

				{/* Chips */}
				<div className="mb-6">
					<h3 className="text-sm font-medium text-text-primary mb-3">Chips (Badges)</h3>
					<div className="flex flex-wrap gap-2">
						<Chip>Default Chip</Chip>
						<Chip>Active Status</Chip>
						<Chip>Tag Example</Chip>
					</div>
				</div>

				{/* Alerts */}
				<div className="mb-6">
					<h3 className="text-sm font-medium text-text-primary mb-3">Alerts</h3>
					<div className="space-y-3">
						<Alert>
							<AlertTitle>Information</AlertTitle>
							<AlertDescription>
								This is an informational alert using Selia components.
							</AlertDescription>
						</Alert>
					</div>
				</div>

				{/* Progress Button */}
				<div className="mb-6">
					<h3 className="text-sm font-medium text-text-primary mb-3">Loading State</h3>
					<Button variant="primary" size="md" progress>
						Loading...
					</Button>
				</div>

				{/* Theme Check */}
				<div className="p-4 bg-bg-muted rounded border border-border">
					<p className="text-sm text-text-secondary">
						<strong>✅ Theme Check:</strong> If the buttons above are purple/indigo (not generic gray/black),
						your Selia theme is working correctly!
					</p>
				</div>
			</div>

			{/* Original Coming Soon Section */}
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

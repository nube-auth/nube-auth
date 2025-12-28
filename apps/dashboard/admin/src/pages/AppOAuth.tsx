import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApp, useUpdateApp } from "../hooks/api";
import { useToast } from "../components/Toast";

export default function AppOAuthPage() {
	const { projectId, appId } = useParams<{ projectId: string; appId: string }>();
	const { showToast } = useToast();

	const { data: app, isLoading, error } = useApp(projectId!, appId!);
	const updateAppMutation = useUpdateApp(projectId!, appId!);

	const [isEditing, setIsEditing] = useState(false);
	const [oauthForm, setOauthForm] = useState({
		googleClientId: "",
		googleClientSecret: "",
		githubClientId: "",
		githubClientSecret: "",
	});

	// Initialize form when app data loads
	useState(() => {
		if (app) {
			setOauthForm({
				googleClientId: app.googleClientId || "",
				googleClientSecret: "", // Don't populate secrets for security
				githubClientId: app.githubClientId || "",
				githubClientSecret: "", // Don't populate secrets for security
			});
		}
	});

	const handleSave = async () => {
		try {
			// Only send fields that have values
			const updates: any = {};
			if (oauthForm.googleClientId !== (app?.googleClientId || "")) {
				updates.googleClientId = oauthForm.googleClientId || null;
			}
			if (oauthForm.googleClientSecret) {
				updates.googleClientSecret = oauthForm.googleClientSecret;
			}
			if (oauthForm.githubClientId !== (app?.githubClientId || "")) {
				updates.githubClientId = oauthForm.githubClientId || null;
			}
			if (oauthForm.githubClientSecret) {
				updates.githubClientSecret = oauthForm.githubClientSecret;
			}

			await updateAppMutation.mutateAsync(updates);
			showToast("OAuth credentials updated successfully", "success");
			setIsEditing(false);
			// Clear secret fields after save
			setOauthForm((prev) => ({
				...prev,
				googleClientSecret: "",
				githubClientSecret: "",
			}));
		} catch (error) {
			console.error("Failed to update OAuth credentials:", error);
			showToast("Failed to update OAuth credentials", "error");
		}
	};

	const handleCancel = () => {
		setIsEditing(false);
		// Reset form to app data
		if (app) {
			setOauthForm({
				googleClientId: app.googleClientId || "",
				googleClientSecret: "",
				githubClientId: app.githubClientId || "",
				githubClientSecret: "",
			});
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-500">Loading OAuth configuration...</div>
			</div>
		);
	}

	if (error || !app) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-red-500">Failed to load OAuth configuration</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">OAuth Configuration</h1>
					<p className="mt-1 text-sm text-gray-500">
						Configure OAuth providers for {app.name}
					</p>
				</div>
				{!isEditing ? (
					<button
						type="button"
						onClick={() => setIsEditing(true)}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Edit
					</button>
				) : (
					<div className="flex gap-3">
						<button
							type="button"
							onClick={handleCancel}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							disabled={updateAppMutation.isPending}
							className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{updateAppMutation.isPending ? "Saving..." : "Save"}
						</button>
					</div>
				)}
			</div>

			{/* Google OAuth */}
			<div className="bg-white shadow rounded-lg">
				<div className="px-6 py-4 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<svg className="w-6 h-6" viewBox="0 0 24 24">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						<h2 className="text-lg font-medium text-gray-900">Google OAuth</h2>
					</div>
				</div>
				<div className="px-6 py-5 space-y-4">
					<div>
						<label htmlFor="googleClientId" className="block text-sm font-medium text-gray-700 mb-1">
							Client ID
						</label>
						{isEditing ? (
							<input
								type="text"
								id="googleClientId"
								value={oauthForm.googleClientId}
								onChange={(e) => setOauthForm({ ...oauthForm, googleClientId: e.target.value })}
								placeholder="Enter Google Client ID"
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						) : (
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900 font-mono">
								{app.googleClientId || <span className="text-gray-400">Not configured</span>}
							</div>
						)}
					</div>
					<div>
						<label htmlFor="googleClientSecret" className="block text-sm font-medium text-gray-700 mb-1">
							Client Secret
						</label>
						{isEditing ? (
							<div className="space-y-2">
								<input
									type="password"
									id="googleClientSecret"
									value={oauthForm.googleClientSecret}
									onChange={(e) => setOauthForm({ ...oauthForm, googleClientSecret: e.target.value })}
									placeholder={app.googleClientSecret ? "Enter new secret to update" : "Enter Google Client Secret"}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								{app.googleClientSecret && (
									<p className="text-xs text-gray-500">
										Leave empty to keep existing secret
									</p>
								)}
							</div>
						) : (
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900 font-mono">
								{app.googleClientSecret || <span className="text-gray-400">Not configured</span>}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* GitHub OAuth */}
			<div className="bg-white shadow rounded-lg">
				<div className="px-6 py-4 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<svg className="w-6 h-6" viewBox="0 0 24 24" fill="#181717">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
						</svg>
						<h2 className="text-lg font-medium text-gray-900">GitHub OAuth</h2>
					</div>
				</div>
				<div className="px-6 py-5 space-y-4">
					<div>
						<label htmlFor="githubClientId" className="block text-sm font-medium text-gray-700 mb-1">
							Client ID
						</label>
						{isEditing ? (
							<input
								type="text"
								id="githubClientId"
								value={oauthForm.githubClientId}
								onChange={(e) => setOauthForm({ ...oauthForm, githubClientId: e.target.value })}
								placeholder="Enter GitHub Client ID"
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						) : (
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900 font-mono">
								{app.githubClientId || <span className="text-gray-400">Not configured</span>}
							</div>
						)}
					</div>
					<div>
						<label htmlFor="githubClientSecret" className="block text-sm font-medium text-gray-700 mb-1">
							Client Secret
						</label>
						{isEditing ? (
							<div className="space-y-2">
								<input
									type="password"
									id="githubClientSecret"
									value={oauthForm.githubClientSecret}
									onChange={(e) => setOauthForm({ ...oauthForm, githubClientSecret: e.target.value })}
									placeholder={app.githubClientSecret ? "Enter new secret to update" : "Enter GitHub Client Secret"}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								{app.githubClientSecret && (
									<p className="text-xs text-gray-500">
										Leave empty to keep existing secret
									</p>
								)}
							</div>
						) : (
							<div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900 font-mono">
								{app.githubClientSecret || <span className="text-gray-400">Not configured</span>}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Info Box */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div className="flex gap-3">
					<svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clipRule="evenodd"
						/>
					</svg>
					<div className="text-sm text-blue-800">
						<p className="font-medium mb-1">Security Note</p>
						<ul className="list-disc list-inside space-y-1 text-blue-700">
							<li>Client secrets are encrypted before storage</li>
							<li>Existing secrets are masked and cannot be viewed</li>
							<li>Leave secret fields empty to keep existing values</li>
							<li>Only enter new secrets when you need to update them</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}

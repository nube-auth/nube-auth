import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useLogout";
import { Button, Spinner } from "@proofa/components";

export default function Profile() {
	const { data: authData, isLoading } = useAuth();
	const logout = useLogout();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	const user = authData?.user;

	return (
		<div className="p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-text-primary">Profile</h1>
				<p className="text-text-muted mt-1">Manage your profile information</p>
			</div>

			<div className="bg-card-bg border border-card-border rounded-lg p-6">
				<div className="flex items-center gap-4 mb-6">
					{user?.avatarUrl ? (
						<img
							src={user.avatarUrl}
							alt={user.name || user.email}
							className="w-16 h-16 rounded-full"
						/>
					) : (
						<div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">
							{user?.name?.[0] || user?.email?.[0] || "U"}
						</div>
					)}
					<div>
						<h2 className="text-lg font-semibold text-text-primary">
							{user?.name || "Admin User"}
						</h2>
						<p className="text-text-muted">{user?.email || "admin@proofa.dev"}</p>
					</div>
				</div>

				<div className="pt-6 border-t border-border">
					<Button
						variant="danger"
						onClick={() => logout.mutate()}
						disabled={logout.isPending}
					>
						{logout.isPending ? "Logging out..." : "Logout"}
					</Button>
				</div>
			</div>
		</div>
	);
}

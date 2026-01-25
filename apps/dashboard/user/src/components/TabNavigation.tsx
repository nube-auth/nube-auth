import { Link, useLocation } from "react-router-dom";
import { Icon, IconType, Tabs, TabsList, TabsItem } from "@proofa/components";

export function TabNavigation() {
	const location = useLocation();

	const getActiveTab = () => {
		if (location.pathname === "/sessions") return "sessions";
		if (location.pathname === "/security") return "security";
		return "profile";
	};

	return (
		<Tabs value={getActiveTab()}>
			<TabsList>
				<Link to="/profile" className="no-underline flex-1">
					<TabsItem value="profile" className="flex items-center gap-2 w-full">
						<Icon icon={IconType.User} size={16} />
						Profile
					</TabsItem>
				</Link>
				<Link to="/sessions" className="no-underline flex-1">
					<TabsItem value="sessions" className="flex items-center gap-2 w-full">
						<Icon icon={IconType.Layers} size={16} />
						Sessions
					</TabsItem>
				</Link>
				<Link to="/security" className="no-underline flex-1">
					<TabsItem value="security" className="flex items-center gap-2 w-full">
						<Icon icon={IconType.Shield} size={16} />
						Security
					</TabsItem>
				</Link>
			</TabsList>
		</Tabs>
	);
}

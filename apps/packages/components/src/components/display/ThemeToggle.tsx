import { Button } from "../../base";
import type { Theme } from "../../hooks/useTheme";
import { Icon, IconType } from "../../icons";

const THEME_META: Record<Theme, { label: string; icon: (typeof IconType)[keyof typeof IconType] }> = {
	light: { label: "Light", icon: IconType.Sun },
	dark: { label: "Dark", icon: IconType.Moon },
	system: { label: "System", icon: IconType.Computer },
};

export interface ThemeToggleProps {
	/** Current theme: 'light', 'dark', or 'system' */
	theme: Theme;
	/** Callback when theme toggle button is clicked */
	onToggle: () => void;
	/** Show theme label text */
	showLabel?: boolean;
	/** Additional CSS class names */
	className?: string;
}

/**
 * Theme toggle button component.
 *
 * Displays the current theme with an icon and optional label text.
 * Clicking the button triggers the onToggle callback to cycle through themes.
 *
 * @example
 * ```tsx
 * import { useTheme, ThemeToggle } from '@nube-auth/components';
 *
 * function App() {
 *   const { theme, setTheme } = useTheme();
 *
 *   const cycleTheme = () => {
 *     if (theme === "system") setTheme("light");
 *     else if (theme === "light") setTheme("dark");
 *     else setTheme("system");
 *   };
 *
 *   return <ThemeToggle theme={theme} onToggle={cycleTheme} />;
 * }
 * ```
 */
export function ThemeToggle({ theme, onToggle, showLabel = true, className = "" }: ThemeToggleProps) {
	const current = THEME_META[theme];

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={onToggle}
			className={`min-w-28 ${className}`}
			title={`Current theme: ${current.label}`}
		>
			<Icon icon={current.icon} size={16} />
			{showLabel && <span>{current.label}</span>}
		</Button>
	);
}

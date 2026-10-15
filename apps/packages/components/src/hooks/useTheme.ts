import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

/** Next theme in the system → light → dark cycle shared by every Nube Auth surface. */
export function cycleTheme(theme: Theme): Theme {
	if (theme === "system") return "light";
	if (theme === "light") return "dark";
	return "system";
}

function systemIsDark(): boolean {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	const dark = theme === "dark" || (theme === "system" && systemIsDark());

	root.classList.toggle("dark", dark);
	root.classList.toggle("light", theme === "light");

	if (theme === "system") {
		root.removeAttribute("data-theme");
		localStorage.removeItem("theme");
		return;
	}

	root.setAttribute("data-theme", theme);
	localStorage.setItem("theme", theme);
}

/**
 * Custom hook to manage theme state across light, dark, and system preferences.
 *
 * - Persists theme selection to localStorage
 * - Applies 'dark' class to document root for Selia components
 * - Sets data-theme attribute for custom components
 * - Automatically detects system theme preference when set to 'system'
 *
 * @returns {object} Object containing current theme and setter function
 * @returns {Theme} theme - Current theme: 'light', 'dark', or 'system'
 * @returns {function} setTheme - Function to update theme
 *
 * @example
 * ```tsx
 * function App() {
 *   const { theme, setTheme } = useTheme();
 *   const cycleTheme = () => {
 *     if (theme === "system") setTheme("light");
 *     else if (theme === "light") setTheme("dark");
 *     else setTheme("system");
 *   };
 *   return <button onClick={cycleTheme}>{theme}</button>;
 * }
 * ```
 */
export function useTheme() {
	const [theme, setTheme] = useState<Theme>(() => {
		if (typeof window !== "undefined") {
			return (localStorage.getItem("theme") as Theme) || "system";
		}
		return "system";
	});

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	useEffect(() => {
		if (theme !== "system") return;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyTheme("system");
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [theme]);

	return { theme, setTheme };
}

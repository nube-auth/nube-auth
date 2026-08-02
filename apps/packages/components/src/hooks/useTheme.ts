import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

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
		const root = document.documentElement;

		// Determine effective theme
		let effectiveTheme: "light" | "dark" = "light";
		if (theme === "system") {
			effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		} else {
			effectiveTheme = theme;
		}

		// Apply dark class for Selia components
		if (effectiveTheme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}

		// Also set data-theme for custom components
		if (theme === "system") {
			root.removeAttribute("data-theme");
			localStorage.removeItem("theme");
		} else {
			root.setAttribute("data-theme", theme);
			localStorage.setItem("theme", theme);
		}
	}, [theme]);

	return { theme, setTheme };
}

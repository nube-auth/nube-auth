import { useState } from "react";

interface ColorSwatchProps {
	name: string;
	variable: string;
	value: string;
	description?: string;
	contrast?: string;
}

interface ColorSectionProps {
	title: string;
	description?: string;
	colors: ColorSwatchProps[];
}

const ColorSwatch = ({ name, variable, value, description, contrast }: ColorSwatchProps) => {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="color-swatch">
			<div className="color-preview" style={{ background: value }} onClick={() => copyToClipboard(variable)}>
				{copied && <span className="copied-badge">Copied!</span>}
			</div>
			<div className="color-info">
				<div className="color-name">{name}</div>
				<code className="color-variable" onClick={() => copyToClipboard(variable)}>
					{variable}
				</code>
				<div className="color-value">{value}</div>
				{description && <div className="color-description">{description}</div>}
				{contrast && (
					<div className="color-contrast">
						<span className="contrast-badge">WCAG {contrast}</span>
					</div>
				)}
			</div>
		</div>
	);
};

const ColorSection = ({ title, description, colors }: ColorSectionProps) => (
	<div className="color-section">
		<div className="section-header">
			<h3>{title}</h3>
			{description && <p>{description}</p>}
		</div>
		<div className="color-grid">
			{colors.map((color) => (
				<ColorSwatch key={color.variable} {...color} />
			))}
		</div>
	</div>
);

export default function ColorPalette() {
	const [theme, setTheme] = useState<"light" | "dark">("light");

	const primaryColors: ColorSwatchProps[] = [
		{
			name: "Primary",
			variable: "--primary",
			value: "#5B5FC7",
			description: "Main brand color, CTAs, active states",
			contrast: "AA",
		},
		{
			name: "Primary Hover",
			variable: "--primary-hover",
			value: "#464AB0",
			description: "Hover state for primary elements",
			contrast: "AA",
		},
		{
			name: "Primary Light",
			variable: "--primary-light",
			value: "#E8E9FA",
			description: "Backgrounds, subtle highlights",
			contrast: "AAA",
		},
		{
			name: "Primary Border",
			variable: "--primary-border",
			value: "#A5A8E5",
			description: "Borders and outlines",
			contrast: "AA",
		},
	];

	const secondaryColors: ColorSwatchProps[] = [
		{
			name: "Secondary",
			variable: "--secondary",
			value: "#0EA5E9",
			description: "Links, informational elements",
			contrast: "AA",
		},
		{
			name: "Accent",
			variable: "--accent",
			value: "#8B5CF6",
			description: "Special features, premium badges",
			contrast: "AA",
		},
	];

	const semanticColors: ColorSwatchProps[] = [
		{
			name: "Success",
			variable: "--success",
			value: "#059669",
			description: "Positive actions, verified states",
			contrast: "AA",
		},
		{
			name: "Success Background",
			variable: "--success-bg",
			value: "#D1FAE5",
			description: "Success alert backgrounds",
			contrast: "AAA",
		},
		{
			name: "Warning",
			variable: "--warning",
			value: "#D97706",
			description: "Cautions, important notices",
			contrast: "AA",
		},
		{
			name: "Warning Background",
			variable: "--warning-bg",
			value: "#FEF3C7",
			description: "Warning alert backgrounds",
			contrast: "AAA",
		},
		{
			name: "Danger",
			variable: "--danger",
			value: "#DC2626",
			description: "Destructive actions, errors",
			contrast: "AA",
		},
		{
			name: "Danger Background",
			variable: "--danger-bg",
			value: "#FEE2E2",
			description: "Error alert backgrounds",
			contrast: "AAA",
		},
		{
			name: "Info",
			variable: "--info",
			value: "#0EA5E9",
			description: "Helpful information, tips",
			contrast: "AA",
		},
		{
			name: "Info Background",
			variable: "--info-bg",
			value: "#E0F2FE",
			description: "Info alert backgrounds",
			contrast: "AAA",
		},
	];

	const lightNeutrals: ColorSwatchProps[] = [
		{
			name: "Background Base",
			variable: "--bg-base",
			value: "#FAFBFC",
			description: "Page background",
		},
		{
			name: "Background Surface",
			variable: "--bg-surface",
			value: "#FFFFFF",
			description: "Cards, modals, dropdowns",
		},
		{
			name: "Background Muted",
			variable: "--bg-muted",
			value: "#F1F3F5",
			description: "Subtle backgrounds, hover states",
		},
		{
			name: "Text Primary",
			variable: "--text-primary",
			value: "#18181B",
			description: "Main text content",
			contrast: "AAA",
		},
		{
			name: "Text Secondary",
			variable: "--text-secondary",
			value: "#52525B",
			description: "Supporting text, labels",
			contrast: "AA",
		},
		{
			name: "Text Tertiary",
			variable: "--text-tertiary",
			value: "#A1A1AA",
			description: "Placeholder, disabled text",
			contrast: "AA",
		},
		{
			name: "Border Default",
			variable: "--border",
			value: "#E4E4E7",
			description: "Default borders",
		},
	];

	const darkNeutrals: ColorSwatchProps[] = [
		{
			name: "Background Base",
			variable: "--bg-base",
			value: "#0B0F19",
			description: "Page background (deep navy)",
		},
		{
			name: "Background Surface",
			variable: "--bg-surface",
			value: "#12172A",
			description: "Cards, elevated elements",
		},
		{
			name: "Background Muted",
			variable: "--bg-muted",
			value: "#1A1F35",
			description: "Subtle backgrounds",
		},
		{
			name: "Text Primary",
			variable: "--text-primary",
			value: "#F8FAFC",
			description: "Main text content",
			contrast: "AAA",
		},
		{
			name: "Text Secondary",
			variable: "--text-secondary",
			value: "#CBD5E1",
			description: "Supporting text, labels",
			contrast: "AA",
		},
		{
			name: "Text Tertiary",
			variable: "--text-tertiary",
			value: "#94A3B8",
			description: "Placeholder, disabled text",
			contrast: "AA",
		},
		{
			name: "Border Default",
			variable: "--border",
			value: "rgba(203, 213, 225, 0.12)",
			description: "Default borders (12% white)",
		},
	];

	return (
		<div className="color-palette-wrapper" data-theme={theme}>
			<div className="palette-controls">
				<div className="theme-toggle">
					<button
						className={`toggle-btn ${theme === "light" ? "active" : ""}`}
						onClick={() => setTheme("light")}
					>
						☀️ Light
					</button>
					<button
						className={`toggle-btn ${theme === "dark" ? "active" : ""}`}
						onClick={() => setTheme("dark")}
					>
						🌙 Dark
					</button>
				</div>
				<p className="palette-hint">Click any color to copy its CSS variable</p>
			</div>

			<ColorSection
				title="Primary Colors"
				description="Core brand identity, main CTAs, and active states"
				colors={primaryColors}
			/>

			<ColorSection
				title="Secondary & Accent"
				description="Supporting colors for variety and emphasis"
				colors={secondaryColors}
			/>

			<ColorSection
				title="Semantic Colors"
				description="Colors with specific meaning for user feedback"
				colors={semanticColors}
			/>

			<ColorSection
				title={theme === "light" ? "Light Mode Neutrals" : "Dark Mode Neutrals"}
				description="Foundation colors for backgrounds, text, and borders"
				colors={theme === "light" ? lightNeutrals : darkNeutrals}
			/>

			<style>{`
        .color-palette-wrapper {
          padding: 24px 0;
        }

        [data-theme="dark"] {
          background: #0B0F19;
          color: #F8FAFC;
        }

        .palette-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          padding: 16px 20px;
          background: var(--bg-muted, #F1F3F5);
          border: 1px solid var(--border, #E4E4E7);
          border-radius: 12px;
        }

        [data-theme="dark"] .palette-controls {
          background: #1A1F35;
          border-color: rgba(203, 213, 225, 0.12);
        }

        .theme-toggle {
          display: flex;
          gap: 8px;
          background: var(--bg-surface, #FFFFFF);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid var(--border, #E4E4E7);
        }

        [data-theme="dark"] .theme-toggle {
          background: #12172A;
          border-color: rgba(203, 213, 225, 0.12);
        }

        .toggle-btn {
          padding: 8px 16px;
          background: transparent;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary, #52525B);
        }

        [data-theme="dark"] .toggle-btn {
          color: #CBD5E1;
        }

        .toggle-btn.active {
          background: #5B5FC7;
          color: white;
        }

        .palette-hint {
          font-size: 13px;
          color: var(--text-tertiary, #A1A1AA);
          margin: 0;
        }

        [data-theme="dark"] .palette-hint {
          color: #94A3B8;
        }

        .color-section {
          margin-bottom: 48px;
        }

        .section-header {
          margin-bottom: 24px;
        }

        .section-header h3 {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: var(--text-primary, #18181B);
        }

        [data-theme="dark"] .section-header h3 {
          color: #F8FAFC;
        }

        .section-header p {
          font-size: 14px;
          color: var(--text-secondary, #52525B);
          margin: 0;
        }

        [data-theme="dark"] .section-header p {
          color: #CBD5E1;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
        }

        .color-swatch {
          background: var(--bg-surface, #FFFFFF);
          border: 1px solid var(--border, #E4E4E7);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }

        [data-theme="dark"] .color-swatch {
          background: #12172A;
          border-color: rgba(203, 213, 225, 0.12);
        }

        .color-swatch:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        [data-theme="dark"] .color-swatch:hover {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
        }

        .color-preview {
          height: 120px;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }

        .color-preview:hover {
          opacity: 0.9;
        }

        .copied-badge {
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          animation: fadeIn 0.2s;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .color-info {
          padding: 16px;
        }

        .color-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary, #18181B);
          margin-bottom: 8px;
        }

        [data-theme="dark"] .color-name {
          color: #F8FAFC;
        }

        .color-variable {
          display: inline-block;
          font-family: 'SF Mono', 'Monaco', 'Fira Code', monospace;
          font-size: 12px;
          background: var(--bg-muted, #F1F3F5);
          padding: 4px 8px;
          border-radius: 4px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: background 0.2s;
          color: #5B5FC7;
        }

        [data-theme="dark"] .color-variable {
          background: #1A1F35;
          color: #A5A8E5;
        }

        .color-variable:hover {
          background: var(--border, #E4E4E7);
        }

        [data-theme="dark"] .color-variable:hover {
          background: rgba(203, 213, 225, 0.12);
        }

        .color-value {
          font-size: 13px;
          font-family: 'SF Mono', 'Monaco', monospace;
          color: var(--text-tertiary, #A1A1AA);
          margin-bottom: 8px;
        }

        [data-theme="dark"] .color-value {
          color: #94A3B8;
        }

        .color-description {
          font-size: 12px;
          color: var(--text-secondary, #52525B);
          line-height: 1.5;
          margin-bottom: 8px;
        }

        [data-theme="dark"] .color-description {
          color: #CBD5E1;
        }

        .color-contrast {
          margin-top: 8px;
        }

        .contrast-badge {
          display: inline-block;
          background: #059669;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media (max-width: 768px) {
          .palette-controls {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .color-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
		</div>
	);
}

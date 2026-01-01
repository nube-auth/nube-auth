import type React from "react";
import { useEffect, useRef, useState } from "react";

interface SelectOption {
	value: string;
	label: string;
}

interface SelectProps {
	value: string;
	onChange: (value: string) => void;
	options: SelectOption[];
	disabled?: boolean;
	placeholder?: string;
	className?: string;
	style?: React.CSSProperties;
}

export const Select: React.FC<SelectProps> = ({
	value,
	onChange,
	options,
	disabled = false,
	placeholder = "Select...",
	className,
	style,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const selectedOption = options.find((opt) => opt.value === value);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const handleSelect = (optionValue: string) => {
		onChange(optionValue);
		setIsOpen(false);
	};

	return (
		<div
			ref={dropdownRef}
			className={className}
			style={{
				position: "relative",
				...style,
			}}
		>
			<button
				type="button"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				style={{
					width: "100%",
					padding: "10px 12px",
					border: "1px solid var(--border-primary)",
					borderRadius: "8px",
					background: disabled ? "var(--surface-secondary)" : "var(--content-bg)",
					color: "var(--text-primary)",
					fontSize: "14px",
					cursor: disabled ? "not-allowed" : "pointer",
					opacity: disabled ? 0.6 : 1,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					textAlign: "left",
					transition: "all 0.2s ease",
				}}
				onMouseEnter={(e) => {
					if (!disabled) {
						e.currentTarget.style.borderColor = "var(--primary)";
						e.currentTarget.style.boxShadow = "0 0 0 2px rgba(139, 92, 246, 0.1)";
					}
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.borderColor = "var(--border-primary)";
					e.currentTarget.style.boxShadow = "none";
				}}
			>
				<span>{selectedOption ? selectedOption.label : placeholder}</span>
				<svg
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					style={{
						transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
						transition: "transform 0.2s ease",
					}}
				>
					<path
						d="M4 6L8 10L12 6"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{isOpen && (
				<div
					style={{
						position: "absolute",
						top: "calc(100% + 4px)",
						left: 0,
						right: 0,
						background: "var(--content-bg)",
						border: "1px solid var(--border-primary)",
						borderRadius: "8px",
						boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
						zIndex: 1000,
						maxHeight: "240px",
						overflowY: "auto",
						animation: "slideDown 0.15s ease-out",
					}}
				>
					<style>
						{`
							@keyframes slideDown {
								from {
									opacity: 0;
									transform: translateY(-8px);
								}
								to {
									opacity: 1;
									transform: translateY(0);
								}
							}
						`}
					</style>
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => handleSelect(option.value)}
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "none",
								background: option.value === value ? "var(--primary-light)" : "transparent",
								color: option.value === value ? "var(--primary)" : "var(--text-primary)",
								fontSize: "14px",
								cursor: "pointer",
								textAlign: "left",
								transition: "background 0.15s ease",
								fontWeight: option.value === value ? "600" : "400",
							}}
							onMouseEnter={(e) => {
								if (option.value !== value) {
									e.currentTarget.style.background = "var(--surface-secondary)";
								}
							}}
							onMouseLeave={(e) => {
								if (option.value !== value) {
									e.currentTarget.style.background = "transparent";
								}
							}}
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

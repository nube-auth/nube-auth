import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Icon, IconType } from "@proofa/components";

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
		<div ref={dropdownRef} className={`relative ${className || ''}`} style={style}>
			<button
				type="button"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={`w-full px-3 py-2.5 border border-border-primary rounded-lg text-14px transition-all duration-200 flex justify-between items-center text-left ${disabled ? "bg-surface-secondary cursor-not-allowed opacity-60" : "bg-content-bg cursor-pointer hover:border-primary hover:ring-2 hover:ring-primary/10"} text-text-primary`}
			>
				<span>{selectedOption ? selectedOption.label : placeholder}</span>
				<Icon
					icon={IconType.ArrowDown}
					size={16}
					className={`transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
				/>
			</button>

			{isOpen && (
				<div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-content-bg border border-border-primary rounded-lg shadow-lg z-1000 max-h-60 overflow-y-auto animate-slideDown">
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
							.animate-slideDown {
								animation: slideDown 0.15s ease-out;
							}
						`}
					</style>
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => handleSelect(option.value)}
							className={`w-full px-3 py-2.5 border-none text-14px cursor-pointer text-left transition-background duration-150 ${option.value === value ? "bg-primary-light text-primary font-semibold" : "bg-transparent text-text-primary hover:bg-surface-secondary"}`}
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

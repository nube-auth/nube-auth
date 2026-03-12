import type React from "react";
import {
	Select as SeliaSelect,
	SelectTrigger,
	SelectValue,
	SelectPopup,
	SelectList,
	SelectItem,
} from "@nube-auth/components";

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
}

export const Select: React.FC<SelectProps> = ({
	value,
	onChange,
	options,
	disabled = false,
	placeholder = "Select...",
	className,
}) => {
	const handleValueChange = (newValue: unknown) => {
		if (typeof newValue === "string") {
			onChange(newValue);
		}
	};

	return (
		<SeliaSelect value={value} onValueChange={handleValueChange} disabled={disabled}>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectPopup>
				<SelectList>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectList>
			</SelectPopup>
		</SeliaSelect>
	);
};

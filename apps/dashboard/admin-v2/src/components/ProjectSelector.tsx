import { useState } from "react";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectPopup,
	SelectList,
	SelectItem,
} from "@proofa/components";

// Placeholder component - will be replaced with real project data
export function ProjectSelector() {
	const [selectedProject, setSelectedProject] = useState("");

	// Mock projects (replace with real data from API)
	const projects = [
		{ id: "1", name: "Project Alpha" },
		{ id: "2", name: "Project Beta" },
		{ id: "3", name: "Project Gamma" },
	];

	const handleValueChange = (value: unknown) => {
		if (typeof value === "string") {
			setSelectedProject(value);
		}
	};

	return (
		<Select value={selectedProject} onValueChange={handleValueChange}>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="Select project" />
			</SelectTrigger>
			<SelectPopup>
				<SelectList>
					{projects.map((project) => (
						<SelectItem key={project.id} value={project.id}>
							{project.name}
						</SelectItem>
					))}
				</SelectList>
			</SelectPopup>
		</Select>
	);
}

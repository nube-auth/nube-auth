import { Spinner } from "@proofa/components";

export function PageLoader() {
	return (
		<div className="flex items-center justify-center py-12">
			<Spinner />
		</div>
	);
}

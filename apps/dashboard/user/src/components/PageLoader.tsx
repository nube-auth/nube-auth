import { Spinner } from "@proofa/components";

export function PageLoader({ message }: { message?: string }) {
	return (
		<div className="flex flex-col items-center justify-center min-h-75 gap-3">
			<Spinner />
			{message && <span className="text-sm text-muted">{message}</span>}
		</div>
	);
}

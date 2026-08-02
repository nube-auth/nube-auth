import { Alert } from "@nube-auth/components";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	override componentDidCatch(error: Error, info: ErrorInfo) {
		if (import.meta.env.DEV) {
			console.error("ErrorBoundary caught:", error, info.componentStack);
		}
	}

	override render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;

			return (
				<div className="flex items-center justify-center min-h-[50vh] p-8">
					<div className="max-w-md w-full">
						<Alert variant="danger">
							<div>
								<strong className="block mb-1">Something went wrong</strong>
								<p className="text-sm text-muted m-0">
									{this.state.error?.message ?? "An unexpected error occurred."}
								</p>
								<button
									type="button"
									className="mt-3 text-sm underline cursor-pointer bg-transparent border-none p-0 text-inherit"
									onClick={() => this.setState({ hasError: false, error: null })}
								>
									Try again
								</button>
							</div>
						</Alert>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

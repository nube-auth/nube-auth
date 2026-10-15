import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
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
			return (
				<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
					<div className="flex flex-col items-center gap-4">
						<p className="text-lg font-semibold">Something went wrong</p>
						<p className="text-sm text-muted">
							{this.state.error?.message ?? "An unexpected error occurred."}
						</p>
						<button
							type="button"
							className="mt-2 text-sm underline cursor-pointer bg-transparent border-none p-0"
							onClick={() => this.setState({ hasError: false, error: null })}
						>
							Try again
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

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
				<div className="app-layout">
					<div className="loading min-h-screen flex-col gap-4">
						<p className="text-lg font-semibold">Something went wrong</p>
						<p className="text-sm text-text-secondary">
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

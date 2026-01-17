import { ProofaProvider } from "@proofa/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@unocss/reset/tailwind.css";
import "daisyui/daisyui.css";
import "@proofa/styles/base.css";
import "@proofa/styles/theme.css";
import "virtual:uno.css";
import "./index.css";

// Use direct Gateway URL for API calls (with CORS + credentials)
const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ProofaProvider config={{ gatewayUrl }}>
			<App />
		</ProofaProvider>
	</React.StrictMode>,
);

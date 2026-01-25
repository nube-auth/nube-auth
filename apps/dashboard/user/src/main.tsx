import { ProofaProvider } from "@proofa/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
// import "./index.css"; // Temporarily disabled to test base Selia setup

// Use direct Gateway URL for API calls (with CORS + credentials)
const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || "http://localhost:3004";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ProofaProvider config={{ gatewayUrl }}>
			<App />
		</ProofaProvider>
	</React.StrictMode>,
);

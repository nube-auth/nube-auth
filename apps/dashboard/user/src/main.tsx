import { ProofaProvider } from "@proofa/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./index.css";
import { config } from "./config";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ProofaProvider config={{ gatewayUrl: config.gatewayUrl }}>
			<App />
		</ProofaProvider>
	</React.StrictMode>,
);

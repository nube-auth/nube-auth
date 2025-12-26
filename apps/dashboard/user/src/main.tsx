import React from "react";
import ReactDOM from "react-dom/client";
import { ProofaProvider } from "@proofa/react";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ProofaProvider config={{ gatewayUrl: "/api" }}>
			<App />
		</ProofaProvider>
	</React.StrictMode>,
);

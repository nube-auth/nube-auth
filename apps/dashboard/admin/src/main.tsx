import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@proofa/dashboard-style/base.css";
import "virtual:uno.css";
import "@unocss/reset/tailwind.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

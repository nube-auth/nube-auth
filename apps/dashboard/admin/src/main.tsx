import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@unocss/reset/tailwind.css";
import "daisyui/daisyui.css";
import "@proofa/styles/base.css";
import "virtual:uno.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

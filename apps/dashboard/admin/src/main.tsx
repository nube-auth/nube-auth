import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Removed UnoCSS reset and DaisyUI base; using Tailwind + shared theme
// import "@unocss/reset/tailwind.css";
// import "daisyui/daisyui.css";
// import "@proofa/components/styles/base.css";
import "@proofa/components/styles/theme.css";
// Removed UnoCSS virtual CSS
// import "virtual:uno.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

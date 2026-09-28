import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";\nimport ErrorBoundary from "./components/shell/ErrorBoundary.jsx";
import "./index.css";
import "./styles/pacman.css";

ReactDOM.createRoot(
 document.getElementById("root")
).render(
<React.StrictMode>
<ErrorBoundary><App /></ErrorBoundary>
</React.StrictMode>
);
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Create and render the app
createRoot(rootElement).render(<App />);
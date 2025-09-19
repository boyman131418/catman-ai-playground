import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add console logging for debugging
console.log("main.tsx loaded successfully");
console.log("Current location:", window.location);
console.log("Base path configured:", "/catman-ai-playground/");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
  throw new Error("Root element not found");
}

console.log("Creating React root...");
const root = createRoot(rootElement);

console.log("Rendering App component...");
root.render(<App />);

console.log("App rendered successfully");
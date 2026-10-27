
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./mobile.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import { startSyncEngine } from "./db/syncEngine";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);

/*
 * Install the offline app shell in production only.
 *
 * Registration is fire-and-forget: if a browser blocks service
 * workers (private mode, older iOS) the app still works exactly as
 * before — it just will not be installable/offline-capable.
 */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
            /* Enhancement only — never block the app on this. */
        });
    });
}

startSyncEngine();

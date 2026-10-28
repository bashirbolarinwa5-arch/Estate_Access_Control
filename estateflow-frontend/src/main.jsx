
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
        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
                /* Check for a newer worker right away. */
                registration.update().catch(() => {});

                /* ...and again whenever the tab comes back to the foreground. */
                document.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === "visible") {
                        registration.update().catch(() => {});
                    }
                });

                /*
                 * When a newly deployed worker takes control, reload once so
                 * the page runs the current bundle. Only armed when a worker
                 * already controlled the page, so the first install does not
                 * trigger a pointless reload.
                 */
                if (navigator.serviceWorker.controller) {
                    let reloading = false;
                    navigator.serviceWorker.addEventListener("controllerchange", () => {
                        if (reloading) return;
                        reloading = true;
                        window.location.reload();
                    });
                }
            })
            .catch(() => {
                /* Enhancement only — never block the app on this. */
            });
    });
}

startSyncEngine();

/*
 * A deploy changes the hashed bundle name. A service worker that is still
 * serving an older cached shell (or a tab left open across a deploy) would
 * otherwise keep running yesterday's code — including older form logic.
 *
 * Compare the bundle this page is running with the one the server serves
 * and reload when they differ. Only checked when the tab becomes visible
 * again after at least a minute hidden, so typing is never interrupted.
 */
(function watchForDeploy() {
    if (!import.meta.env.PROD) return;

    let hiddenAt = 0;
    let lastReloadAt = Number(sessionStorage.getItem("estateflow:last-update-reload") || 0);

    async function reloadIfBundleChanged() {
        if (!navigator.onLine) return;
        if (Date.now() - lastReloadAt < 60_000) return;

        try {
            const response = await fetch(`/index.html?deploy-check=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) return;

            const html = await response.text();
            const deployed = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
            if (!deployed) return;

            const running = Array.from(document.scripts)
                .map((script) => script.src)
                .find((src) => /assets\/index-[A-Za-z0-9_-]+\.js/.test(src));

            if (!running || running.includes(deployed)) return;

            lastReloadAt = Date.now();
            sessionStorage.setItem("estateflow:last-update-reload", String(lastReloadAt));
            window.location.reload();
        } catch {
            /* Offline or blocked: keep running the current bundle. */
        }
    }

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            hiddenAt = Date.now();
            return;
        }
        if (hiddenAt && Date.now() - hiddenAt > 60_000) {
            void reloadIfBundleChanged();
        }
    });

    window.addEventListener("online", () => void reloadIfBundleChanged());
})();

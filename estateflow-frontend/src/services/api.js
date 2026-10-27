import axios from "axios";
import { currentOwnerKey, loadSnapshot, saveSnapshot } from "../db/offlineStore";

const CACHEABLE_GET_PATHS = [
    /^\/(resident|resident\/me|resident\/directory|resident\/search|resident\/\d+)$/,
    /^\/visitor(\/me|\/resident\/\d+|\/\d+)?$/,
    /^\/visit(\/me|\/(pending|approved|checked-in)|\/\d+)?$/,
    /^\/security(\/\d+)?$/,
    /^\/(activity-log|activity-logs|reports|dashboard)(\/.*)?$/,
    /^\/super-admin\/(admins|estates|activity)(\/.*)?$/,
];

function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
        );
    }
    return value;
}

function cacheIdentity(config, ownerKey) {
    const path = String(config.url || "").split("?")[0];
    if (!CACHEABLE_GET_PATHS.some((pattern) => pattern.test(path))) return null;
    const params = JSON.stringify(stableValue(config.params || {}));
    return `${ownerKey}:${String(config.method || "get").toUpperCase()}:${path}:${params}`;
}

const api = axios.create({
    baseURL:
        import.meta.env.VITE_API_BASE_URL ||
        "http://localhost:8081",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const storedAuth = localStorage.getItem("estateflow_auth");

        if (storedAuth) {
            try {
                const auth = JSON.parse(storedAuth);

                if (auth?.token) {
                    config.headers.Authorization =
                        `Bearer ${auth.token}`;
                }

                if (String(config.method || "get").toLowerCase() === "get") {
                    const ownerKey = currentOwnerKey();
                    const requestKey = ownerKey && cacheIdentity(config, ownerKey);
                    if (requestKey) {
                        config._offlineSnapshot = {
                            ownerKey,
                            requestKey,
                            actorPublicId: auth?.publicId || null,
                            estatePublicId: auth?.estatePublicId || null,
                        };
                    }
                }
            } catch (error) {
                console.error(
                    "Failed to read authentication data:",
                    error
                );
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    async (response) => {
        const snapshot = response.config?._offlineSnapshot;
        if (snapshot) {
            try {
                await saveSnapshot({ ...snapshot, value: response.data });
            } catch {
                // Cache failure must never turn a successful online read into an error.
            }
        }
        return response;
    },
    async (error) => {
        const status = error.response?.status;

        // An expired or invalid token should send the user
        // back to the login screen instead of leaving the
        // app stuck on empty data.
        if (status === 401) {
            localStorage.removeItem("estateflow_auth");

            if (!window.location.pathname.startsWith("/login")) {
                window.location.replace("/login");
            }
        }

        const snapshot = error.config?._offlineSnapshot;
        if (!error.response && snapshot) {
            try {
                const cached = await loadSnapshot(snapshot);
                if (cached) {
                    window.dispatchEvent(new CustomEvent("estateflow:offline-cache-served", {
                        detail: { stale: cached.stale, updatedAt: cached.updatedAt },
                    }));
                    return {
                        data: cached.value,
                        status: 200,
                        statusText: "Offline cached response",
                        headers: {},
                        config: error.config,
                        request: null,
                        fromOfflineCache: true,
                        stale: cached.stale,
                        cacheUpdatedAt: cached.updatedAt,
                    };
                }
            } catch {
                // No usable encrypted snapshot; return the original network error.
            }
        }

        return Promise.reject(error);
    }
);

export default api;

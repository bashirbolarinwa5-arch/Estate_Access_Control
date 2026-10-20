import axios from "axios";

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
    (response) => response,
    (error) => {
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

        return Promise.reject(error);
    }
);

export default api;

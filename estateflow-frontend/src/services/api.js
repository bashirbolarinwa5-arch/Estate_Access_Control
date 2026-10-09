import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8081",
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

export default api;
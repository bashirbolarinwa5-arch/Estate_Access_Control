
const API_BASE_URL = "http://localhost:8081";

export async function login(username, password) {
    const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                username,
                password,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Invalid username or password"
        );
    }

    const authData = data.data || data;

    return authData;
}

export async function register(
    username,
    password,
    role
) {
    const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                username,
                password,
                role,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Registration failed"
        );
    }

    return data;
}


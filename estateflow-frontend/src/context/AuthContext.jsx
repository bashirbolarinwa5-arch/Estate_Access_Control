import { useState } from "react";

import { AuthContext } from "./authContextValue";

export function AuthProvider({ children }) {

    const [user, setUser] = useState(() => {

        const savedAuth =
            localStorage.getItem(
                "estateflow_auth"
            );

        if (!savedAuth) {
            return null;
        }

        try {

            return JSON.parse(savedAuth);

        } catch (error) {

            console.error(
                "Invalid authentication data:",
                error
            );

            localStorage.removeItem(
                "estateflow_auth"
            );

            return null;
        }
    });


    function loginUser(authData) {

        const userData = {
            token: authData.token,
            username: authData.username,
            role: authData.role,

            /*
             * Temporary passwords force a change on the
             * change-password screen the first time the user
             * signs in.
             */
            mustChangePassword:
                Boolean(authData.mustChangePassword),
        };

        localStorage.setItem(
            "estateflow_auth",
            JSON.stringify(userData)
        );

        setUser(userData);
    }


    function clearMustChangePassword() {

        setUser((current) => {

            if (!current) {
                return current;
            }

            const updated = {
                ...current,
                mustChangePassword: false,
            };

            localStorage.setItem(
                "estateflow_auth",
                JSON.stringify(updated)
            );

            return updated;
        });
    }


    function logout() {

        localStorage.removeItem(
            "estateflow_auth"
        );

        setUser(null);
    }


    return (

        <AuthContext.Provider
            value={{
                user,
                loginUser,
                logout,
                clearMustChangePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

import {
    createContext,
    useContext,
    useState,
} from "react";

const AuthContext = createContext(null);

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
        };

        localStorage.setItem(
            "estateflow_auth",
            JSON.stringify(userData)
        );

        setUser(userData);
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
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {
    return useContext(AuthContext);
}
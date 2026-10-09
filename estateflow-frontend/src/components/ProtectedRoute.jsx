import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({
                            children,
                            allowedRoles,
                        }) {

    const { user } = useAuth();

    // User is not logged in
    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    // If no roles were specified,
    // simply allow any authenticated user.
    if (
        !allowedRoles ||
        allowedRoles.length === 0
    ) {
        return children;
    }

    // Check whether the logged-in user's
    // role is allowed to access this route.
    const hasPermission =
        allowedRoles.includes(user.role);

    if (!hasPermission) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return children;
}

export default ProtectedRoute;
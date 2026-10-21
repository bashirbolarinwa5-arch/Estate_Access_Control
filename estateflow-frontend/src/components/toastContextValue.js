import { createContext } from "react";

/*
 * Bare toast context — kept in its own file so hot
 * reload of the provider component keeps working
 * (same pattern as AuthContext).
 */
export const ToastContext = createContext(null);

import { useContext } from "react";

import { ToastContext } from "./toastContextValue";

/*
 * Hook for pages to raise app-wide notifications:
 *
 *   const { showSuccess, showError, showInfo } = useToast();
 */
export function useToast() {

    const context = useContext(ToastContext);

    if (!context) {
        throw new Error(
            "useToast must be used inside <ToastProvider>"
        );
    }

    return context;

}

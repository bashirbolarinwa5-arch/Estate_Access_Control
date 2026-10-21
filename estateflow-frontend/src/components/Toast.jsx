import { useCallback, useEffect, useRef, useState } from "react";

import {
    CheckCircle2,
    Info,
    TriangleAlert,
} from "lucide-react";

import { ToastContext } from "./toastContextValue";

import "./Toast.css";

/*
 * App-wide toast notifications.
 *
 * Any page inside <ToastProvider> can call:
 *
 *   const { showSuccess, showError, showInfo } = useToast();
 *
 *   showSuccess("Estate created successfully");
 *   showError("Unable to load estates.");
 *
 * Toasts stack top-right and dismiss themselves.
 */

export function ToastProvider({ children }) {

    const [toast, setToast] = useState(null);

    const hideTimerRef = useRef(null);

    const show = useCallback((message, type) => {

        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }

        setToast({
            id: Date.now(),
            message,
            type,
        });

        hideTimerRef.current = setTimeout(() => {
            setToast(null);
            hideTimerRef.current = null;
        }, 3800);

    }, []);

    const showSuccess = useCallback(
        (message) => show(message, "success"),
        [show]
    );

    const showError = useCallback(
        (message) => show(message, "error"),
        [show]
    );

    const showInfo = useCallback(
        (message) => show(message, "info"),
        [show]
    );

    useEffect(() => {
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, []);

    const value = {
        showSuccess,
        showError,
        showInfo,
    };

    return (
        <ToastContext.Provider value={value}>

            {children}

            <div
                className={`toast-stack ${
                    toast ? "has-toast" : ""
                }`}
            >

                {toast && (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type}`}
                        role="status"
                    >
                        <div className="toast-icon">
                            {toast.type === "success" && (
                                <CheckCircle2 size={18} />
                            )}

                            {toast.type === "error" && (
                                <TriangleAlert size={18} />
                            )}

                            {toast.type === "info" && (
                                <Info size={18} />
                            )}
                        </div>

                        <span className="toast-message">
                            {toast.message}
                        </span>

                        <button
                            type="button"
                            className="toast-close"
                            aria-label="Dismiss notification"
                            onClick={() => {
                                if (hideTimerRef.current) {
                                    clearTimeout(hideTimerRef.current);
                                    hideTimerRef.current = null;
                                }
                                setToast(null);
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

            </div>

        </ToastContext.Provider>
    );

}

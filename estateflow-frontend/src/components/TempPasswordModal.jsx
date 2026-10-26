import { useEffect } from "react";
import { Copy, KeyRound, X } from "lucide-react";

import { useToast } from "./useToast";

/*
 * Shows a freshly generated temporary password exactly once.
 *
 * The server stores only the BCrypt hash, so if this window is
 * closed before the credential is copied, the admin has to
 * reset the password again.
 */
function TempPasswordModal({
    open,
    title = "Password reset",
    personName,
    username,
    password,
    onClose,
}) {
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function handleKeyDown(event) {
            if (event.key === "Escape") onClose();
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    function copy() {
        const text = `Username: ${username}\nTemporary password: ${password}`;

        if (navigator.clipboard?.writeText) {
            navigator.clipboard
                .writeText(text)
                .then(() => showSuccess("Credentials copied."))
                .catch(() =>
                    showError("Could not copy. Write it down instead.")
                );
        }
    }

    return (
        <div className="temp-pass-overlay" role="presentation">
            <div
                className="temp-pass-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="temp-pass-title"
            >
                <div className="temp-pass-header">
                    <div>
                        <h2 id="temp-pass-title">{title}</h2>
                        <p>{personName}</p>
                    </div>

                    <button
                        type="button"
                        className="temp-pass-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="temp-pass-body">
                    <div className="temp-pass-row">
                        <span>Username</span>
                        <code>{username}</code>
                    </div>

                    <div className="temp-pass-row highlight">
                        <span>Temporary password</span>
                        <code>{password}</code>
                    </div>

                    <p className="temp-pass-note">
                        This password is shown only once. The person must
                        change it the first time they sign in.
                    </p>

                    <div className="temp-pass-actions">
                        <button
                            type="button"
                            className="temp-pass-btn ghost"
                            onClick={onClose}
                        >
                            Close
                        </button>

                        <button
                            type="button"
                            className="temp-pass-btn primary"
                            onClick={copy}
                        >
                            <Copy size={15} />
                            Copy credentials
                        </button>
                    </div>

                    <div className="temp-pass-tip">
                        <KeyRound size={14} />
                        <span>
                            Lost again later? Run the same reset action to
                            generate a new one.
                        </span>
                    </div>
                </div>
            </div>

            <style>{tempPassStyles}</style>
        </div>
    );
}

const tempPassStyles = `
.temp-pass-overlay {
    position: fixed;
    inset: 0;
    z-index: 1300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(11, 16, 32, 0.62);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
}

.temp-pass-modal {
    width: 100%;
    max-width: 440px;
    max-height: calc(100dvh - 32px);
    overflow: auto;
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 30px 70px rgba(15, 23, 42, 0.28);
}

.temp-pass-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 20px 14px;
    border-bottom: 1px solid #eef1f6;
}

.temp-pass-header h2 {
    margin: 0;
    font-size: 17px;
    color: #172033;
}

.temp-pass-header p {
    margin: 4px 0 0;
    font-size: 12.5px;
    color: #8a99b0;
}

.temp-pass-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 9px;
    background: #f3f5fa;
    color: #5b6b85;
    cursor: pointer;
}

.temp-pass-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 20px 20px;
}

.temp-pass-row {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px 13px;
    border: 1px solid #eef1f6;
    border-radius: 11px;
    background: #fafbfe;
}

.temp-pass-row span {
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: #8a99b0;
}

.temp-pass-row code {
    font-size: 15px;
    color: #172033;
    word-break: break-all;
}

.temp-pass-row.highlight {
    border-color: #ddd6fe;
    background: #f5f3ff;
}

.temp-pass-row.highlight code {
    font-size: 17px;
    font-weight: 700;
    color: #5b21b6;
    letter-spacing: .02em;
}

.temp-pass-note {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: #64748b;
}

.temp-pass-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.temp-pass-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 10px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
}

.temp-pass-btn.ghost {
    background: #f3f5fa;
    color: #475467;
    border-color: #e6eaf2;
}

.temp-pass-btn.primary {
    background: linear-gradient(135deg, #863bff, #6d28d9);
    color: #ffffff;
}

.temp-pass-tip {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 11.5px;
    line-height: 1.5;
    color: #8a99b0;
}

@media (max-width: 560px) {
    .temp-pass-overlay { padding: 10px; align-items: flex-end; }
    .temp-pass-modal { border-radius: 16px; }
    .temp-pass-actions { flex-direction: column-reverse; }
    .temp-pass-btn { width: 100%; }
}
`;

export default TempPasswordModal;

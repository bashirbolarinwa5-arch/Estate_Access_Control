import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";

import api from "../services/api";
import { useToast } from "./useToast";

/*
 * One bulk-creation modal, reused by every admin page.
 *
 * The admin pastes a JSON array, the modal posts it to the
 * endpoint, then shows exactly what was created and what failed.
 * It stays open when there are failures so the list can be read
 * (and the input fixed) instead of disappearing into a toast.
 *
 * Styling is self-contained: the shared styles live here, so the
 * modal looks the same on any page without depending on that
 * page's <style> block.
 */
function BulkCreateModal({
    open,
    onClose,
    onCreated,
    title,
    subtitle,
    endpoint,
    fields,
    sample,
    successNoun,
}) {
    const [jsonText, setJsonText] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const { showSuccess, showError } = useToast();

    useEffect(() => {
        if (!open) return;

        function handleKeyDown(event) {
            if (event.key === "Escape" && !busy) {
                onClose();
            }
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, busy, onClose]);

    if (!open) {
        return null;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        let parsed;

        try {
            parsed = JSON.parse(jsonText);
        } catch {
            showError("Invalid JSON. Paste a valid array and try again.");
            return;
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
            showError("Paste a JSON array with at least one entry.");
            return;
        }

        const items = parsed.map((raw) => {
            const item = {};

            fields.forEach((field) => {
                const value = raw?.[field];

                item[field] =
                    typeof value === "string"
                        ? value.trim()
                        : value ?? "";
            });

            return item;
        });

        setBusy(true);

        try {
            const response = await api.post(endpoint, items);
            const data = response?.data?.data ?? response?.data ?? {};
            const created = data?.created?.length || 0;
            const failed = data?.failed || [];

            setResult({ created, failed });

            if (created > 0 && typeof onCreated === "function") {
                onCreated(created);
            }

            if (failed.length > 0) {
                showError(
                    `${created} created, ${failed.length} failed. Check the list below.`
                );
            } else if (created > 0) {
                showSuccess(`${created} ${successNoun} created.`);
                setJsonText("");
                onClose();
            } else {
                showError("Nothing was created. Check the entries and try again.");
            }
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Unable to complete the bulk creation.";

            showError(message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="bulk-modal-overlay" role="presentation">
            <div
                className="bulk-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bulk-modal-title"
            >
                <div className="bulk-modal-header">
                    <div>
                        <h2 id="bulk-modal-title">{title}</h2>
                        <p>{subtitle}</p>
                    </div>

                    <button
                        type="button"
                        className="bulk-modal-close"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form className="bulk-modal-body" onSubmit={handleSubmit}>
                    <div className="bulk-field">
                        <div className="bulk-field-top">
                            <label htmlFor="bulk-json">JSON array</label>

                            <button
                                type="button"
                                className="bulk-example"
                                onClick={() => setJsonText(sample)}
                                disabled={busy}
                            >
                                Load example
                            </button>
                        </div>

                        <textarea
                            id="bulk-json"
                            className="bulk-textarea"
                            rows={11}
                            value={jsonText}
                            onChange={(event) => setJsonText(event.target.value)}
                            placeholder={sample}
                            disabled={busy}
                            spellCheck="false"
                        />

                        <p className="bulk-hint">
                            Required keys: <code>{fields.join(", ")}</code>.
                            Each entry creates one account.
                        </p>
                    </div>

                    {result && (
                        <div className="bulk-result">
                            <div className="bulk-result-counts">
                                <span className="bulk-count ok">
                                    <CheckCircle2 size={15} />
                                    {result.created} created
                                </span>

                                <span
                                    className={
                                        result.failed.length
                                            ? "bulk-count bad"
                                            : "bulk-count"
                                    }
                                >
                                    <AlertTriangle size={15} />
                                    {result.failed.length} failed
                                </span>
                            </div>

                            {result.failed.length > 0 && (
                                <ul className="bulk-failures">
                                    {result.failed.map((failure, index) => (
                                        <li key={`${failure.username}-${index}`}>
                                            <strong>
                                                {failure.username || "unknown"}
                                            </strong>
                                            <span>{failure.reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <div className="bulk-modal-footer">
                        <button
                            type="button"
                            className="bulk-btn ghost"
                            onClick={onClose}
                            disabled={busy}
                        >
                            {result && result.created > 0 ? "Done" : "Cancel"}
                        </button>

                        <button
                            type="submit"
                            className="bulk-btn primary"
                            disabled={busy}
                        >
                            {busy ? (
                                <>
                                    <Loader2 size={16} className="bulk-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create accounts"
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style>{bulkStyles}</style>
        </div>
    );
}

const bulkStyles = `
.bulk-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(11, 16, 32, 0.62);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
}

.bulk-modal {
    width: 100%;
    max-width: 620px;
    max-height: calc(100dvh - 32px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 30px 70px rgba(15, 23, 42, 0.28);
}

.bulk-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 20px 22px 16px;
    border-bottom: 1px solid #eef1f6;
}

.bulk-modal-header h2 {
    margin: 0;
    font-size: 19px;
    color: #172033;
}

.bulk-modal-header p {
    margin: 5px 0 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #8a99b0;
    max-width: 460px;
}

.bulk-modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 10px;
    background: #f3f5fa;
    color: #5b6b85;
    cursor: pointer;
}

.bulk-modal-close:hover:not(:disabled) { background: #e9edf6; }
.bulk-modal-close:disabled { opacity: .55; cursor: not-allowed; }

.bulk-modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 22px 20px;
    overflow-y: auto;
    min-height: 0;
}

.bulk-field { display: flex; flex-direction: column; gap: 8px; }

.bulk-field-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.bulk-field-top label {
    font-size: 12.5px;
    font-weight: 700;
    color: #45536b;
    letter-spacing: .02em;
}

.bulk-example {
    border: none;
    background: none;
    padding: 0;
    font-size: 12px;
    font-weight: 700;
    color: #7c3aed;
    cursor: pointer;
}

.bulk-example:hover:not(:disabled) { text-decoration: underline; }
.bulk-example:disabled { opacity: .55; cursor: not-allowed; }

.bulk-textarea {
    width: 100%;
    min-height: 190px;
    padding: 13px 14px;
    border: 1.5px solid #e2e7f0;
    border-radius: 12px;
    background: #fbfcfe;
    color: #172033;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12.5px;
    line-height: 1.55;
    resize: vertical;
    outline: none;
}

.bulk-textarea:focus {
    border-color: #a78bfa;
    background: #ffffff;
    box-shadow: 0 0 0 4px rgba(134, 59, 255, .12);
}

.bulk-hint {
    margin: 0;
    font-size: 11.5px;
    color: #8a99b0;
}

.bulk-hint code {
    font-size: 11px;
    color: #5b3fd6;
    background: #f4f1ff;
    padding: 1px 5px;
    border-radius: 5px;
}

.bulk-result {
    border: 1px solid #eef1f6;
    border-radius: 12px;
    background: #fafbfe;
    padding: 12px 13px;
}

.bulk-result-counts {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
}

.bulk-count {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
}

.bulk-count.ok { color: #15803d; }
.bulk-count.bad { color: #b91c1c; }

.bulk-failures {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 150px;
    overflow-y: auto;
}

.bulk-failures li {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 11.5px;
    color: #64748b;
}

.bulk-failures strong { color: #172033; }

.bulk-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 4px;
}

.bulk-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 42px;
    padding: 0 18px;
    border-radius: 11px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
}

.bulk-btn.ghost {
    background: #f3f5fa;
    color: #475467;
    border-color: #e6eaf2;
}

.bulk-btn.ghost:hover:not(:disabled) { background: #e9edf6; }

.bulk-btn.primary {
    background: linear-gradient(135deg, #863bff, #6d28d9);
    color: #ffffff;
    box-shadow: 0 10px 22px rgba(109, 40, 217, .26);
}

.bulk-btn.primary:hover:not(:disabled) { filter: brightness(1.06); }
.bulk-btn:disabled { opacity: .6; cursor: not-allowed; }

.bulk-spin { animation: bulk-spin .9s linear infinite; }

@keyframes bulk-spin {
    to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
    .bulk-modal-overlay { padding: 10px; align-items: flex-end; }
    .bulk-modal { max-height: calc(100dvh - 20px); border-radius: 18px; }
    .bulk-modal-header, .bulk-modal-body { padding-left: 16px; padding-right: 16px; }
    .bulk-modal-footer { flex-direction: column-reverse; }
    .bulk-btn { width: 100%; }
}
`;

export default BulkCreateModal;

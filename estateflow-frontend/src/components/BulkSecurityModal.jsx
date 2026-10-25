import { useState } from "react";

import api from "../services/api";
import { useToast } from "./useToast";

import { X } from "lucide-react";

/*
 * Bulk create security personnel via POST /security/bulk.
 *
 * The admin pastes a JSON array, e.g.:
 *
 * [
 *   {
 *     "name": "Tunde Balogun",
 *     "phoneNumber": "08076543210",
 *     "email": "tunde@example.com",
 *     "username": "tundeb",
 *     "password": "Str0ng!Pass"
 *   }
 * ]
 */
function BulkSecurityModal({ open, onClose }) {
    const [jsonText, setJsonText] = useState("");
    const [busy, setBusy] = useState(false);

    const { showSuccess, showError } = useToast();

    async function handleSubmit(event) {
        event.preventDefault();

        let parsed;

        try {
            parsed = JSON.parse(jsonText);
        } catch {
            showError("Invalid JSON. Paste a valid JSON array and retry.");
            return;
        }

        const securityPersonnel = (Array.isArray(parsed) ? parsed : []).map(
            (person) => ({
                name: person.name || "",
                phoneNumber: person.phoneNumber || "",
                email: person.email || "",
                username: person.username || "",
                password: person.password || "",
            })
        );

        if (securityPersonnel.length === 0) {
            showError("Nothing to create — the JSON array is empty.");
            return;
        }

        setBusy(true);

        try {
            const response = await api.post("/security/bulk", securityPersonnel);
            const data = response?.data?.data || response?.data;
            const created = data?.created?.length || 0;
            const failed = data?.failed?.length || 0;

            showSuccess(
                `Bulk creation finished — ${created} security personnel account(s) created, ${failed} failed.`
            );

            setJsonText("");
            onClose();
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Unable to complete the bulk creation.";

            showError(message);
        } finally {
            setBusy(false);
        }
    }

    if (!open) {
        return null;
    }

    return (
        <div className="security-modal-overlay">
            <div className="security-modal">
                <div className="security-modal-header">
                    <div>
                        <h2>Bulk Create Security Personnel</h2>
                        <p>
                            Paste a JSON array of security accounts.
                            Each entry becomes an account.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="resident-close"
                        onClick={onClose}
                        disabled={busy}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="security-modal-form"
                >
                    <div className="resident-field full">
                        <label>JSON array of security personnel</label>
                        <textarea
                            className="resident-field-input"
                            rows={10}
                            value={jsonText}
                            onChange={(event) => setJsonText(event.target.value)}
                            placeholder={
                                '[{"name":"Tunde Balogun","phoneNumber":"08076543210","email":"tunde@example.com","username":"tundeb","password":"Str0ng!Pass"}]'
                            }
                            disabled={busy}
                        />
                    </div>

                    <div className="security-modal-actions">
                        <button
                            type="button"
                            className="resident-cancel"
                            onClick={onClose}
                            disabled={busy}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="security-primary-button"
                            disabled={busy}
                        >
                            {busy ? "Creating..." : "Create bulk security personnel"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BulkSecurityModal;

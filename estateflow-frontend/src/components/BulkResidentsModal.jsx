import { useState } from "react";

import api from "../services/api";
import { useToast } from "./useToast";

import { X, Users } from "lucide-react";
/*
 * Bulk create residents via POST /resident/bulk.
 *
 * The admin pastes a JSON array, e.g.:
 *
 * [
 *   {
 *     "fullName": "Adaeze Okonkwo",
 *     "phoneNumber": "08012345678",
 *     "houseNumber": "12B",
 *     "email": "adaeze@example.com",
 *     "username": "adaeze",
 *     "password": "Str0ng!Pass"
 *   }
 * ]
 *
 * The backend creates each account, reuses the normal
 * validation, and reports per-item failures.
 */
function BulkResidentsModal({ open, onClose }) {
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

        const residents = (Array.isArray(parsed) ? parsed : []).map(
            (resident) => ({
                fullName: resident.fullName || "",
                phoneNumber: resident.phoneNumber || "",
                houseNumber: resident.houseNumber || "",
                email: resident.email || "",
                username: resident.username || "",
                password: resident.password || "",
            })
        );

        if (residents.length === 0) {
            showError("Nothing to create — the JSON array is empty.");
            return;
        }

        setBusy(true);

        try {
            const response = await api.post("/resident/bulk", residents);
            const data = response?.data?.data || response?.data;
            const created = data?.created?.length || 0;
            const failed = data?.failed?.length || 0;

            showSuccess(
                `Bulk creation finished — ${created} resident(s) created, ${failed} failed.`
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
        <div className="resident-modal-backdrop">
            <div className="resident-modal">
                <div className="resident-modal-header">
                    <div className="resident-modal-title">
                        <div className="resident-modal-title-icon">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2>Bulk Create Residents</h2>
                            <p>
                                Paste a JSON array of residents. Each
                                entry becomes an account.
                            </p>
                        </div>
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
                    className="resident-modal-body"
                >
                    <div className="resident-field full">
                        <label>JSON array of residents</label>
                        <textarea
                            className="resident-field-input"
                            rows={10}
                            value={jsonText}
                            onChange={(event) => setJsonText(event.target.value)}
                            placeholder={
                                '[{"fullName":"Adaeze Okonkwo","phoneNumber":"08012345678","houseNumber":"12B","email":"adaeze@example.com","username":"adaeze","password":"Str0ng!Pass"}]'
                            }
                            disabled={busy}
                        />
                    </div>

                    <div className="resident-modal-footer">
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
                            className="resident-save"
                            disabled={busy}
                        >
                            {busy ? "Creating..." : "Create bulk residents"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default BulkResidentsModal;

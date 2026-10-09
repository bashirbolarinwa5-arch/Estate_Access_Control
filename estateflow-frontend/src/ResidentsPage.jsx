
import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Edit3,
    Mail,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8081";

const emptyForm = {
    fullName: "",
    phoneNumber: "",
    houseNumber: "",
    email: "",
    username: "",
    password: "",
};

function getAuth() {
    try {
        return JSON.parse(localStorage.getItem("estateflow_auth")) || {};
    } catch {
        return {};
    }
}

async function apiRequest(endpoint, options = {}) {
    const auth = getAuth();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(auth.token
                ? { Authorization: `Bearer ${auth.token}` }
                : {}),
            ...(options.headers || {}),
        },
    });

    if (!response.ok) {
        let message = `Request failed (${response.status})`;

        try {
            const data = await response.json();

            message =
                data.message ||
                data.error ||
                data.data ||
                message;
        } catch {
            // Keep default message.
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

function getData(response) {
    if (
        response &&
        typeof response === "object" &&
        "data" in response
    ) {
        return response.data;
    }

    return response;
}

function getInitials(name) {
    if (!name) return "R";

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

export default function ResidentsPage() {
    const [residents, setResidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingResident, setEditingResident] = useState(null);

    const [form, setForm] = useState(emptyForm);

    async function loadResidents() {
        setLoading(true);
        setError("");

        try {
            const response = await apiRequest("/resident");
            const data = getData(response);

            setResidents(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || "Unable to load residents.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadResidents();
    }, []);

    const filteredResidents = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return residents;
        }

        return residents.filter((resident) =>
            [
                resident.fullName,
                resident.phoneNumber,
                resident.houseNumber,
                resident.email,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(query)
                )
        );
    }, [residents, search]);

    function openCreateModal() {
        setEditingResident(null);
        setForm(emptyForm);
        setError("");
        setSuccess("");
        setShowModal(true);
    }

    function openEditModal(resident) {
        setEditingResident(resident);

        setForm({
            fullName: resident.fullName || "",
            phoneNumber: resident.phoneNumber || "",
            houseNumber: resident.houseNumber || "",
            email: resident.email || "",
            username: "",
            password: "",
        });

        setError("");
        setSuccess("");
        setShowModal(true);
    }

    function closeModal() {
        if (saving) return;

        setShowModal(false);
        setEditingResident(null);
        setForm(emptyForm);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!form.fullName.trim()) {
            setError("Full name is required.");
            return;
        }

        if (!form.phoneNumber.trim()) {
            setError("Phone number is required.");
            return;
        }

        if (!form.houseNumber.trim()) {
            setError("House number is required.");
            return;
        }

        if (!form.email.trim()) {
            setError("Email is required.");
            return;
        }

        if (!editingResident) {
            if (!form.username.trim()) {
                setError("Username is required.");
                return;
            }

            if (!form.password.trim()) {
                setError("Password is required.");
                return;
            }
        }

        setSaving(true);

        const payload = {
            fullName: form.fullName.trim(),
            phoneNumber: form.phoneNumber.trim(),
            houseNumber: form.houseNumber.trim(),
            email: form.email.trim(),
        };

        if (!editingResident) {
            payload.username = form.username.trim();
            payload.password = form.password;
        }

        try {
            if (editingResident) {
                await apiRequest(
                    `/resident/update/${editingResident.id}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(payload),
                    }
                );

                setSuccess("Resident updated successfully.");
            } else {
                await apiRequest("/resident", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });

                setSuccess("Resident added successfully.");
            }

            await loadResidents();

            setTimeout(() => {
                setShowModal(false);
                setEditingResident(null);
                setForm(emptyForm);
                setSuccess("");
            }, 600);
        } catch (err) {
            setError(err.message || "Unable to save resident.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(resident) {
        const confirmed = window.confirm(
            `Delete ${resident.fullName}? This action cannot be undone.`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            await apiRequest(
                `/resident/${resident.id}`,
                {
                    method: "DELETE",
                }
            );

            setResidents((current) =>
                current.filter((item) => item.id !== resident.id)
            );

            setSuccess("Resident deleted successfully.");

            setTimeout(() => {
                setSuccess("");
            }, 2500);
        } catch (err) {
            setError(err.message || "Unable to delete resident.");
        }
    }

    return (
        <div className="residents-page">

            <style>{`
    .residents-page {
    max-width: 1500px;
    margin: 0 auto;
}

.residents-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 28px;
}

.residents-header h1 {
    margin: 0;
    color: #172033;
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -1px;
}

.residents-header p {
    margin: 8px 0 0;
    color: #7c899e;
    font-size: 14px;
}

.residents-header-actions {
    display: flex;
    gap: 10px;
}

.resident-btn {
    border: 0;
    border-radius: 11px;
    min-height: 44px;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: .2s ease;
}

.resident-btn.refresh {
    background: white;
    color: #536178;
    border: 1px solid #e0e6ef;
}

.resident-btn.refresh:hover {
    background: #f7f9fc;
}

.resident-btn.primary {
    color: white;
    background: linear-gradient(
        135deg,
#3474ff,
#2258d8
);
    box-shadow: 0 9px 22px rgba(37, 99, 235, .2);
}

.resident-btn.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(37, 99, 235, .28);
}

.resident-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    margin-bottom: 22px;
}

.resident-summary-card {
    background: white;
    border: 1px solid #e5eaf2;
    border-radius: 18px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 7px 25px rgba(30, 50, 80, .04);
}

.resident-summary-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: #edf4ff;
    color: #2867ed;
    display: flex;
    align-items: center;
    justify-content: center;
}

.resident-summary strong {
    display: block;
    color: #1e2940;
    font-size: 25px;
}

.resident-summary span {
    display: block;
    color: #8a96a9;
    font-size: 12px;
    margin-top: 4px;
}

.resident-toolbar {
    background: white;
    border: 1px solid #e5eaf2;
    border-radius: 18px;
    padding: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 18px;
}

.resident-search {
    position: relative;
    width: 100%;
    max-width: 550px;
}

.resident-search svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #9aa7ba;
}

.resident-search input {
    width: 100%;
    height: 45px;
    padding: 0 15px 0 43px;
    border: 1px solid #dfe5ee;
    border-radius: 11px;
    outline: none;
    background: #fbfcfe;
    color: #1f2a3d;
    font-size: 13px;
}

.resident-search input:focus {
    border-color: #3474ff;
    box-shadow: 0 0 0 4px rgba(52,116,255,.09);
    background: white;
}

.resident-results {
    color: #8996aa;
    font-size: 12px;
    white-space: nowrap;
}

.resident-table-card {
    background: white;
    border: 1px solid #e5eaf2;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(27,45,78,.035);
}

.resident-table-wrapper {
    overflow-x: auto;
}

.resident-table {
    width: 100%;
    min-width: 780px;
    border-collapse: collapse;
}

.resident-table th {
    background: #f8faff;
    color: #7c899d;
    padding: 15px 20px;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .08em;
    border-bottom: 1px solid #edf0f5;
}

.resident-table td {
    padding: 16px 20px;
    color: #344158;
    font-size: 13px;
    border-bottom: 1px solid #f0f2f6;
}

.resident-table tbody tr:hover {
    background: #fbfcff;
}

.resident-person {
    display: flex;
    align-items: center;
    gap: 12px;
}

.resident-avatar {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #eaf1ff;
    color: #2867ed;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
}

.resident-name {
    color: #263249;
    font-weight: 750;
}

.resident-id {
    margin-top: 3px;
    color: #a0a9b8;
    font-size: 10px;
}

.resident-contact {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #68768d;
}

.resident-contact svg {
    color: #9aa7ba;
}

.house-badge {
    display: inline-flex;
    padding: 7px 10px;
    border-radius: 9px;
    background: #f1f5fb;
    color: #46536b;
    font-size: 12px;
    font-weight: 700;
}

.resident-actions {
    display: flex;
    justify-content: flex-end;
    gap: 7px;
}

.resident-action {
    width: 35px;
    height: 35px;
    border-radius: 9px;
    border: 1px solid #e1e6ee;
    background: white;
    color: #718097;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.resident-action:hover {
    color: #2867ed;
    border-color: #b9c9e6;
    background: #f5f8ff;
}

.resident-action.delete:hover {
    color: #dc2626;
    border-color: #fecaca;
    background: #fff5f5;
}

.resident-loading,
.resident-empty {
    padding: 65px 20px;
    text-align: center;
    color: #8996aa;
}

.resident-empty-icon {
    width: 58px;
    height: 58px;
    margin: 0 auto 14px;
    border-radius: 17px;
    background: #edf4ff;
    color: #2867ed;
    display: flex;
    align-items: center;
    justify-content: center;
}

.resident-empty strong {
    display: block;
    color: #2d394e;
    font-size: 15px;
}

.resident-empty span {
    display: block;
    margin-top: 6px;
    font-size: 12px;
}

.resident-alert {
    margin-bottom: 18px;
    padding: 12px 14px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
}

.resident-alert.error {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #be123c;
}

.resident-alert.success {
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #047857;
}

.resident-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(15,23,42,.52);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
}

.resident-modal {
    width: 100%;
    max-width: 530px;
    background: white;
    border-radius: 22px;
    box-shadow: 0 30px 80px rgba(15,23,42,.22);
    overflow: hidden;
}

.resident-modal-header {
    padding: 22px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #edf0f5;
}

.resident-modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
}

.resident-modal-title-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: #edf4ff;
    color: #2867ed;
    display: flex;
    align-items: center;
    justify-content: center;
}

.resident-modal h2 {
    margin: 0;
    color: #172033;
    font-size: 19px;
}

.resident-modal-title p {
    margin: 3px 0 0;
    color: #8996aa;
    font-size: 11px;
}

.resident-close {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 9px;
    background: #f5f7fa;
    color: #69768b;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.resident-modal-body {
    padding: 24px;
}

.resident-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.resident-field.full {
    grid-column: 1 / -1;
}

.resident-field label {
    display: block;
    margin-bottom: 7px;
    color: #344158;
    font-size: 12px;
    font-weight: 700;
}

.resident-field input {
    width: 100%;
    height: 45px;
    padding: 0 13px;
    border: 1px solid #dce3ed;
    border-radius: 10px;
    outline: none;
    color: #1f2a3d;
    font-size: 13px;
    box-sizing: border-box;
}

.resident-field input:focus {
    border-color: #3474ff;
    box-shadow: 0 0 0 4px rgba(52,116,255,.09);
}

.resident-account-section {
    grid-column: 1 / -1;
    margin-top: 4px;
    padding-top: 18px;
    border-top: 1px solid #edf0f5;
}

.resident-account-title {
    margin: 0 0 12px;
    color: #263249;
    font-size: 13px;
    font-weight: 800;
}

.resident-account-note {
    margin: -5px 0 15px;
    color: #8996aa;
    font-size: 11px;
    line-height: 1.5;
}

.resident-modal-footer {
    padding: 16px 24px 22px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.resident-cancel {
    min-height: 43px;
    padding: 0 17px;
    border-radius: 10px;
    border: 1px solid #dce3ed;
    background: white;
    color: #56637a;
    font-weight: 700;
    cursor: pointer;
}

.resident-save {
    min-height: 43px;
    padding: 0 20px;
    border: 0;
    border-radius: 10px;
    background: #2867ed;
    color: white;
    font-weight: 700;
    cursor: pointer;
}

.resident-save:disabled {
    opacity: .65;
    cursor: not-allowed;
}

.resident-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,.4);
    border-top-color: white;
    border-radius: 50%;
    animation: resident-spin .7s linear infinite;
}

@keyframes resident-spin {
    to {
        transform: rotate(360deg);
    }
}

.resident-refresh-spin {
    animation: resident-refresh 1s linear infinite;
}

@keyframes resident-refresh {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 850px) {
.residents-header {
        align-items: flex-start;
        flex-direction: column;
    }

.resident-summary {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 600px) {
.resident-toolbar {
        align-items: stretch;
        flex-direction: column;
    }

.resident-results {
        align-self: flex-end;
    }

.resident-form-grid {
        grid-template-columns: 1fr;
    }

.resident-field.full {
        grid-column: auto;
    }

.resident-account-section {
        grid-column: auto;
    }

.residents-header-actions {
        width: 100%;
    }

.residents-header-actions .resident-btn {
        flex: 1;
    }
}
`}</style>

            <div className="residents-header">
                <div>
                    <h1>Residents</h1>
                    <p>
                        Manage residents registered within the estate.
                    </p>
                </div>

                <div className="residents-header-actions">
                    <button
                        className="resident-btn refresh"
                        onClick={loadResidents}
                        disabled={loading}
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? "resident-refresh-spin" : ""}
                        />
                        Refresh
                    </button>

                    <button
                        className="resident-btn primary"
                        onClick={openCreateModal}
                    >
                        <Plus size={17} />
                        Add Resident
                    </button>
                </div>
            </div>

            {error && (
                <div className="resident-alert error">
                    <AlertCircle size={17} />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="resident-alert success">
                    <CheckCircle2 size={17} />
                    <span>{success}</span>
                </div>
            )}

            <div className="resident-summary">
                <div className="resident-summary-card">
                    <div className="resident-summary-icon">
                        <Users size={22} />
                    </div>

                    <div>
                        <strong>{residents.length}</strong>
                        <span>Total residents</span>
                    </div>
                </div>

                <div className="resident-summary-card">
                    <div className="resident-summary-icon">
                        <Search size={22} />
                    </div>

                    <div>
                        <strong>{filteredResidents.length}</strong>
                        <span>Matching residents</span>
                    </div>
                </div>

                <div className="resident-summary-card">
                    <div className="resident-summary-icon">
                        <UserPlus size={22} />
                    </div>

                    <div>
                        <strong>{residents.length}</strong>
                        <span>Registered residents</span>
                    </div>
                </div>
            </div>

            <div className="resident-toolbar">
                <div className="resident-search">
                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search by name, phone, house number or email..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                    />
                </div>

                <div className="resident-results">
                    Showing {filteredResidents.length} of {residents.length}
                </div>
            </div>

            <div className="resident-table-card">
                {loading ? (
                    <div className="resident-loading">
                        Loading residents...
                    </div>
                ) : filteredResidents.length === 0 ? (
                    <div className="resident-empty">
                        <div className="resident-empty-icon">
                            <Users size={25} />
                        </div>

                        <strong>
                            {search
                                ? "No residents match your search"
                                : "No residents found"}
                        </strong>

                        <span>
                            {search
                                ? "Try a different search term."
                                : "Add your first resident to get started."}
                        </span>
                    </div>
                ) : (
                    <div className="resident-table-wrapper">
                        <table className="resident-table">
                            <thead>
                            <tr>
                                <th>Resident</th>
                                <th>Phone</th>
                                <th>House</th>
                                <th>Email</th>
                                <th>Actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            {filteredResidents.map((resident) => (
                                <tr key={resident.id}>
                                    <td>
                                        <div className="resident-person">
                                            <div className="resident-avatar">
                                                {getInitials(
                                                    resident.fullName
                                                )}
                                            </div>

                                            <div>
                                                <div className="resident-name">
                                                    {resident.fullName}
                                                </div>

                                                <div className="resident-id">
                                                    ID: {resident.id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <div className="resident-contact">
                                            <Phone size={14} />
                                            {resident.phoneNumber || "—"}
                                        </div>
                                    </td>

                                    <td>
                                        <span className="house-badge">
                                            {resident.houseNumber || "—"}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="resident-contact">
                                            <Mail size={14} />
                                            {resident.email || "—"}
                                        </div>
                                    </td>

                                    <td>
                                        <div className="resident-actions">
                                            <button
                                                className="resident-action"
                                                title="Edit resident"
                                                onClick={() =>
                                                    openEditModal(resident)
                                                }
                                            >
                                                <Edit3 size={15} />
                                            </button>

                                            <button
                                                className="resident-action delete"
                                                title="Delete resident"
                                                onClick={() =>
                                                    handleDelete(resident)
                                                }
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="resident-modal-backdrop">
                    <div className="resident-modal">
                        <div className="resident-modal-header">
                            <div className="resident-modal-title">
                                <div className="resident-modal-title-icon">
                                    {editingResident ? (
                                        <Edit3 size={20} />
                                    ) : (
                                        <UserPlus size={20} />
                                    )}
                                </div>

                                <div>
                                    <h2>
                                        {editingResident
                                            ? "Edit Resident"
                                            : "Add Resident"}
                                    </h2>

                                    <p>
                                        {editingResident
                                            ? "Update resident information."
                                            : "Register a new estate resident."}
                                    </p>
                                </div>
                            </div>

                            <button
                                className="resident-close"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="resident-modal-body">

                                {error && (
                                    <div className="resident-alert error">
                                        <AlertCircle size={17} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="resident-form-grid">

                                    <div className="resident-field full">
                                        <label>Full Name</label>

                                        <input
                                            name="fullName"
                                            value={form.fullName}
                                            onChange={handleChange}
                                            placeholder="Enter resident's full name"
                                        />
                                    </div>

                                    <div className="resident-field">
                                        <label>Phone Number</label>

                                        <input
                                            name="phoneNumber"
                                            value={form.phoneNumber}
                                            onChange={handleChange}
                                            placeholder="08012345678"
                                        />
                                    </div>

                                    <div className="resident-field">
                                        <label>House Number</label>

                                        <input
                                            name="houseNumber"
                                            value={form.houseNumber}
                                            onChange={handleChange}
                                            placeholder="House A12"
                                        />
                                    </div>

                                    <div className="resident-field full">
                                        <label>Email</label>

                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="resident@example.com"
                                        />
                                    </div>

                                    {!editingResident && (
                                        <div className="resident-account-section">

                                            <div className="resident-account-title">
                                                Login Account
                                            </div>

                                            <div className="resident-account-note">
                                                These credentials will be used
                                                by the resident to log in to
                                                EstateFlow.
                                            </div>

                                            <div className="resident-form-grid">

                                                <div className="resident-field">
                                                    <label>Username</label>

                                                    <input
                                                        name="username"
                                                        value={form.username}
                                                        onChange={handleChange}
                                                        placeholder="Enter username"
                                                        autoComplete="off"
                                                    />
                                                </div>

                                                <div className="resident-field">
                                                    <label>Password</label>

                                                    <input
                                                        type="password"
                                                        name="password"
                                                        value={form.password}
                                                        onChange={handleChange}
                                                        placeholder="Enter password"
                                                        autoComplete="new-password"
                                                    />
                                                </div>

                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>

                            <div className="resident-modal-footer">
                                <button
                                    type="button"
                                    className="resident-cancel"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="resident-save"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="resident-spinner" />
                                            Saving...
                                        </>
                                    ) : editingResident ? (
                                        "Save Changes"
                                    ) : (
                                        "Add Resident"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


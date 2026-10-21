import { useEffect, useState } from "react";
import {
    Shield,
    ShieldOff,
    ShieldCheck,
    KeyRound,
    Pencil,
    UserPlus,
    RefreshCw,
    X,
} from "lucide-react";

import api from "../services/api";

import { useToast } from "../components/useToast";

import "./SuperAdminPages.css";

/*
 * ESTATE ADMIN MANAGEMENT (platform owner only)
 *
 * Lists estate administrator accounts and provides the four
 * owner actions: create, edit (rename), disable/enable and
 * password reset. Every admin is created INSIDE one estate —
 * that estate is the boundary of all their data. Residents,
 * security personnel and visits are NOT managed here —
 * that is estate-admin work.
 */
function SuperAdminAdminsPage() {

    const { showSuccess, showError } = useToast();

    const [admins, setAdmins] = useState([]);
    const [estates, setEstates] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newEstateId, setNewEstateId] = useState("");
    const [creating, setCreating] = useState(false);

    const [editingAdmin, setEditingAdmin] = useState(null);
    const [editUsername, setEditUsername] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    const [resettingAdmin, setResettingAdmin] = useState(null);
    const [resetPassword, setResetPassword] = useState("");
    const [savingReset, setSavingReset] = useState(false);

    const loadAdmins = async () => {

        setLoading(true);
        setError("");

        try {

            const response = await api.get("/super-admin/admins");

            const data = response.data;

            setAdmins(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : []
            );

        } catch (err) {

            console.error(
                "Failed to load administrators:",
                err
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load administrators."
            );

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        async function loadInitialAdmins() {
            try {
                const [
                    adminsResponse,
                    estatesResponse,
                ] = await Promise.all([
                    api.get("/super-admin/admins"),
                    api.get("/super-admin/estates"),
                ]);

                if (!active) {
                    return;
                }

                const data = adminsResponse.data;

                setAdmins(
                    Array.isArray(data)
                        ? data
                        : Array.isArray(data?.data)
                            ? data.data
                            : []
                );

                const estateData = estatesResponse.data;

                setEstates(
                    Array.isArray(estateData)
                        ? estateData
                        : Array.isArray(estateData?.data)
                            ? estateData.data
                            : []
                );
            } catch (err) {
                console.error(
                    "Failed to load administrators:",
                    err
                );

                if (active) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        "Unable to load administrators."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadInitialAdmins();

        return () => {
            active = false;
        };
    }, []);


    /* =====================================================
       CREATE
       ===================================================== */

    async function handleCreate(event) {

        event.preventDefault();
        setActionError("");

        setCreating(true);

        try {

            await api.post(
                "/super-admin/admins",
                {
                    username: newUsername.trim(),
                    password: newPassword,
                    estateId: newEstateId
                        ? Number(newEstateId)
                        : null,
                }
            );

            setShowCreateModal(false);
            setNewUsername("");
            setNewPassword("");
            setNewEstateId("");

            showSuccess(
                "Estate administrator created — they can log in immediately"
            );

            loadAdmins();

        } catch (err) {

            const message =
                err.response?.data?.message ||
                err.message ||
                "Unable to create the administrator.";

            showError(message);
            setActionError(message);

        } finally {
            setCreating(false);
        }
    }


    /* =====================================================
       EDIT (RENAME)
       ===================================================== */

    function openEditModal(admin) {

        setEditingAdmin(admin);
        setEditUsername(admin.username);
    }

    async function handleEdit(event) {

        event.preventDefault();
        setActionError("");

        setSavingEdit(true);

        try {

            await api.put(
                `/super-admin/admins/${editingAdmin.id}`,
                {
                    username: editUsername.trim(),
                }
            );

            setEditingAdmin(null);

            showSuccess("Administrator renamed successfully");

            loadAdmins();

        } catch (err) {

            const message =
                err.response?.data?.message ||
                err.message ||
                "Unable to update the administrator.";

            showError(message);
            setActionError(message);

        } finally {
            setSavingEdit(false);
        }
    }


    /* =====================================================
       DISABLE / ENABLE
       ===================================================== */

    async function handleToggleActive(admin) {

        const enabling = !admin.active;

        const confirmed = window.confirm(
            enabling
                ? `Re-enable the account '${admin.username}'? They will be able to log in again.`
                : `Disable the account '${admin.username}'? They will be locked out immediately.`
        );

        if (!confirmed) {
            return;
        }

        setActionError("");

        try {

            await api.put(
                `/super-admin/admins/${admin.id}/${enabling ? "enable" : "disable"}`
            );

            showSuccess(
                enabling
                    ? "Account re-enabled — they can log in again"
                    : "Administrator disabled — locked out immediately"
            );

            loadAdmins();

        } catch (err) {

            const message =
                err.response?.data?.message ||
                err.message ||
                "Unable to update the account.";

            showError(message);
            setActionError(message);
        }
    }


    /* =====================================================
       RESET PASSWORD
       ===================================================== */

    async function handleResetPassword(event) {

        event.preventDefault();
        setActionError("");

        setSavingReset(true);

        try {

            await api.put(
                `/super-admin/admins/${resettingAdmin.id}/reset-password`,
                {
                    password: resetPassword,
                }
            );

            setResettingAdmin(null);
            setResetPassword("");

            showSuccess(
                "Password reset — share the new password securely"
            );

        } catch (err) {

            const message =
                err.response?.data?.message ||
                err.message ||
                "Unable to reset the password.";

            showError(message);
            setActionError(message);

        } finally {
            setSavingReset(false);
        }
    }


    return (
        <div className="super-admin-page">

            <div className="super-admin-header">

                <div>
                    <div className="dashboard-eyebrow">
                        <span className="eyebrow-dot"></span>
                        PLATFORM ADMINISTRATION
                    </div>

                    <h1>
                        Estate Administrators
                    </h1>

                    <p>
                        Create, edit, disable and reset
                        estate admin accounts.
                    </p>
                </div>

                <div className="dashboard-header-actions">

                    <button
                        className="refresh-button"
                        onClick={loadAdmins}
                        disabled={loading}
                        title="Refresh administrators"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                loading
                                    ? "spin"
                                    : ""
                            }
                        />
                    </button>

                    <button
                        className="super-admin-primary-button"
                        onClick={() => {
                            setActionError("");
                            setShowCreateModal(true);
                        }}
                    >
                        <UserPlus size={17} />
                        Create Admin
                    </button>

                </div>
            </div>

            {error && (
                <div className="dashboard-error">
                    <div>
                        <strong>
                            Unable to load administrators
                        </strong>

                        <span>{error}</span>
                    </div>

                    <button
                        onClick={loadAdmins}
                    >
                        Try again
                    </button>
                </div>
            )}

            {actionError && (
                <div className="super-admin-action-error">
                    {actionError}
                </div>
            )}

            <section className="super-admin-panel">

                <div className="panel-header">

                    <div>
                        <h2>
                            Administrator Accounts
                        </h2>

                        <p>
                            {loading
                                ? "Loading..."
                                : `${admins.length} account${admins.length === 1 ? "" : "s"}`}
                        </p>
                    </div>

                    <Shield
                        size={22}
                    />

                </div>

                {loading ? (
                    <div className="super-admin-empty">
                        <div className="loading-spinner"></div>
                        <span>Loading administrators...</span>
                    </div>
                ) : admins.length === 0 ? (
                    <div className="super-admin-empty">
                        <ShieldOff size={24} />
                        <strong>No administrators yet</strong>
                        <span>Create the first estate admin to get started.</span>
                    </div>
                ) : (
                    <div className="super-admin-table-wrap">

                        <table className="super-admin-table">

                            <thead>
                                <tr>
                                    <th className="col-id">ID</th>
                                    <th>Username</th>
                                    <th>Estate</th>
                                    <th>Status</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                                {admins.map((admin) => (

                                    <tr key={admin.id}>

                                        <td className="col-id">
                                            {admin.id}
                                        </td>

                                        <td>
                                            <div className="admin-cell">
                                                <div className="visitor-avatar">
                                                    {admin.username
                                                        ?.charAt(0)
                                                        ?.toUpperCase()}
                                                </div>

                                                <strong>
                                                    {admin.username}
                                                </strong>
                                            </div>
                                        </td>

                                        <td>
                                            {admin.estate
                                                ? admin.estate.estateName
                                                : "—"}
                                        </td>

                                        <td>
                                                <span
                                                    className={`super-admin-status ${
                                                        admin.active
                                                            ? "status-on"
                                                            : "status-off"
                                                    }`}
                                                >
                                                    <span></span>
                                                    {admin.active
                                                        ? "Active"
                                                        : "Disabled"}
                                                </span>
                                        </td>

                                        <td className="col-actions">
                                            <div className="super-admin-actions">

                                                <button
                                                    className="super-admin-icon-button"
                                                    title="Edit username"
                                                    onClick={() => {
                                                        setActionError("");
                                                        openEditModal(admin);
                                                    }}
                                                >
                                                    <Pencil size={15} />
                                                    Edit
                                                </button>

                                                <button
                                                    className="super-admin-icon-button"
                                                    title="Reset password"
                                                    onClick={() => {
                                                        setActionError("");
                                                        setResettingAdmin(admin);
                                                        setResetPassword("");
                                                    }}
                                                >
                                                    <KeyRound size={15} />
                                                    Reset Password
                                                </button>

                                                {admin.active ? (
                                                    <button
                                                        className="super-admin-icon-button danger"
                                                        title="Disable account"
                                                        onClick={() =>
                                                            handleToggleActive(admin)
                                                        }
                                                    >
                                                        <ShieldOff size={15} />
                                                        Disable
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="super-admin-icon-button success"
                                                        title="Re-enable account"
                                                        onClick={() =>
                                                            handleToggleActive(admin)
                                                        }
                                                    >
                                                        <ShieldCheck size={15} />
                                                        Enable
                                                    </button>
                                                )}

                                            </div>
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>
                )}

            </section>


            {/* =====================================================
               CREATE MODAL
               ===================================================== */}

            {showCreateModal && (
                <div className="super-admin-modal-overlay">
                    <div className="super-admin-modal">

                        <div className="super-admin-modal-header">
                            <h3>Create Estate Admin</h3>

                            <button
                                className="super-admin-modal-close"
                                onClick={() =>
                                    setShowCreateModal(false)
                                }
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form
                            className="super-admin-form"
                            onSubmit={handleCreate}
                        >

                            <label>
                                Username

                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(event) =>
                                        setNewUsername(event.target.value)
                                    }
                                    placeholder="e.g. estateadmin2"
                                    autoComplete="off"
                                    required
                                    autoFocus
                                />
                            </label>

                            <label>
                                Password

                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={(event) =>
                                        setNewPassword(event.target.value)
                                    }
                                    placeholder="At least 6 characters"
                                    autoComplete="off"
                                    required
                                />
                            </label>

                            <label>
                                Estate

                                <select
                                    value={newEstateId}
                                    onChange={(event) =>
                                        setNewEstateId(event.target.value)
                                    }
                                    required
                                >
                                    <option value="">
                                        Select the admin's estate
                                    </option>

                                    {estates.map((estate) => (
                                        <option
                                            key={estate.id}
                                            value={estate.id}
                                        >
                                            {estate.estateName} (
                                            {estate.estateCode})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="super-admin-modal-actions">
                                <button
                                    type="button"
                                    className="super-admin-ghost-button"
                                    onClick={() =>
                                        setShowCreateModal(false)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="super-admin-primary-button"
                                    disabled={creating}
                                >
                                    {creating
                                        ? "Creating..."
                                        : "Create Admin"}
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}


            {/* =====================================================
               EDIT MODAL
               ===================================================== */}

            {editingAdmin && (
                <div className="super-admin-modal-overlay">
                    <div className="super-admin-modal">

                        <div className="super-admin-modal-header">
                            <h3>Edit Administrator</h3>

                            <button
                                className="super-admin-modal-close"
                                onClick={() =>
                                    setEditingAdmin(null)
                                }
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form
                            className="super-admin-form"
                            onSubmit={handleEdit}
                        >

                            <label>
                                Username

                                <input
                                    type="text"
                                    value={editUsername}
                                    onChange={(event) =>
                                        setEditUsername(event.target.value)
                                    }
                                    autoComplete="off"
                                    required
                                    autoFocus
                                />
                            </label>

                            <div className="super-admin-modal-actions">
                                <button
                                    type="button"
                                    className="super-admin-ghost-button"
                                    onClick={() =>
                                        setEditingAdmin(null)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="super-admin-primary-button"
                                    disabled={savingEdit}
                                >
                                    {savingEdit
                                        ? "Saving..."
                                        : "Save Changes"}
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}


            {/* =====================================================
               RESET PASSWORD MODAL
               ===================================================== */}

            {resettingAdmin && (
                <div className="super-admin-modal-overlay">
                    <div className="super-admin-modal">

                        <div className="super-admin-modal-header">
                            <h3>
                                Reset Password — {resettingAdmin.username}
                            </h3>

                            <button
                                className="super-admin-modal-close"
                                onClick={() =>
                                    setResettingAdmin(null)
                                }
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form
                            className="super-admin-form"
                            onSubmit={handleResetPassword}
                        >

                            <label>
                                New Password

                                <input
                                    type="text"
                                    value={resetPassword}
                                    onChange={(event) =>
                                        setResetPassword(event.target.value)
                                    }
                                    placeholder="At least 6 characters"
                                    autoComplete="off"
                                    required
                                    autoFocus
                                />
                            </label>

                            <div className="super-admin-modal-actions">
                                <button
                                    type="button"
                                    className="super-admin-ghost-button"
                                    onClick={() =>
                                        setResettingAdmin(null)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="super-admin-primary-button"
                                    disabled={savingReset}
                                >
                                    {savingReset
                                        ? "Resetting..."
                                        : "Reset Password"}
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}

        </div>
    );

}

export default SuperAdminAdminsPage;

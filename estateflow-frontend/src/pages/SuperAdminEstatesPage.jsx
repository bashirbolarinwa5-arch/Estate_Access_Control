import { useEffect, useState } from "react";
import {
    Building2,
    Building,
    RefreshCw,
    Power,
    Plus,
    X,
} from "lucide-react";

import api from "../services/api";

import "./SuperAdminPages.css";

/*
 * ESTATE MANAGEMENT (platform owner only)
 *
 * Lists every estate with a live headcount and lets the
 * platform owner create estates and activate/deactivate
 * them. Deactivated estates keep their data; their users
 * are simply refused at the service layer.
 */
function SuperAdminEstatesPage() {

    const [estates, setEstates] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newCode, setNewCode] = useState("");
    const [creating, setCreating] = useState(false);

    const loadEstates = async () => {

        setLoading(true);
        setError("");

        try {

            const response = await api.get("/super-admin/estates");

            const data = response.data;

            setEstates(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : []
            );

        } catch (err) {

            console.error(
                "Failed to load estates:",
                err
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load estates."
            );

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        async function loadInitialEstates() {
            try {
                const response = await api.get("/super-admin/estates");

                if (!active) {
                    return;
                }

                const data = response.data;

                setEstates(
                    Array.isArray(data)
                        ? data
                        : Array.isArray(data?.data)
                            ? data.data
                            : []
                );
            } catch (err) {
                console.error(
                    "Failed to load estates:",
                    err
                );

                if (active) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        "Unable to load estates."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadInitialEstates();

        return () => {
            active = false;
        };
    }, []);


    /* =====================================================
       CREATE ESTATE
       ===================================================== */

    async function handleCreate(event) {

        event.preventDefault();
        setActionError("");

        setCreating(true);

        try {

            await api.post(
                "/super-admin/estates",
                {
                    estateName: newName.trim(),
                    estateCode: newCode.trim().toUpperCase(),
                }
            );

            setShowCreateModal(false);
            setNewName("");
            setNewCode("");

            loadEstates();

        } catch (err) {

            setActionError(
                err.response?.data?.message ||
                err.message ||
                "Unable to create the estate."
            );

        } finally {
            setCreating(false);
        }
    }


    /* =====================================================
       ACTIVATE / DEACTIVATE
       ===================================================== */

    async function handleToggleActive(estate) {

        const activating = !estate.active;

        const confirmed = window.confirm(
            activating
                ? `Activate estate '${estate.estateName}'? Its users regain access.`
                : `Deactivate estate '${estate.estateName}'? Its users will be refused until re-activation.`
        );

        if (!confirmed) {
            return;
        }

        setActionError("");

        try {

            await api.put(
                `/super-admin/estates/${estate.id}/${activating ? "activate" : "deactivate"}`
            );

            loadEstates();

        } catch (err) {

            setActionError(
                err.response?.data?.message ||
                err.message ||
                "Unable to update the estate."
            );
        }
    }


    function formatDate(createdAt) {

        if (!createdAt) {
            return "—";
        }

        const date = new Date(createdAt);

        if (Number.isNaN(date.getTime())) {
            return createdAt;
        }

        return date.toLocaleDateString();
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
                        Estates
                    </h1>

                    <p>
                        Every gated community on the
                        EstateFlow platform.
                    </p>
                </div>

                <div className="dashboard-header-actions">

                    <button
                        className="refresh-button"
                        onClick={loadEstates}
                        disabled={loading}
                        title="Refresh estates"
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
                        <Plus size={17} />
                        Create Estate
                    </button>

                </div>
            </div>

            {error && (
                <div className="dashboard-error">
                    <div>
                        <strong>
                            Unable to load estates
                        </strong>

                        <span>{error}</span>
                    </div>

                    <button
                        onClick={loadEstates}
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
                            All Estates
                        </h2>

                        <p>
                            {loading
                                ? "Loading..."
                                : `${estates.length} estate${estates.length === 1 ? "" : "s"} on the platform`}
                        </p>
                    </div>

                    <Building2
                        size={22}
                    />

                </div>

                {loading ? (
                    <div className="super-admin-empty">
                        <div className="loading-spinner"></div>
                        <span>Loading estates...</span>
                    </div>
                ) : estates.length === 0 ? (
                    <div className="super-admin-empty">
                        <Building size={24} />
                        <strong>No estates yet</strong>
                        <span>Create the first estate to onboard administrators.</span>
                    </div>
                ) : (
                    <div className="super-admin-table-wrap">

                        <table className="super-admin-table">

                            <thead>
                                <tr>
                                    <th>Estate</th>
                                    <th>Code</th>
                                    <th>Admins</th>
                                    <th>Residents</th>
                                    <th>Security</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                                {estates.map((estate) => (

                                    <tr key={estate.id}>

                                        <td>
                                            <div className="admin-cell">
                                                <div className="visitor-avatar">
                                                    <Building2 size={15} />
                                                </div>

                                                <strong>
                                                    {estate.estateName}
                                                </strong>
                                            </div>
                                        </td>

                                        <td>
                                            <code>{estate.estateCode}</code>
                                        </td>

                                        <td>{estate.admins ?? 0}</td>

                                        <td>{estate.residents ?? 0}</td>

                                        <td>{estate.securityPersonnel ?? 0}</td>

                                        <td>
                                            <span
                                                className={`super-admin-status ${
                                                    estate.active
                                                        ? "status-on"
                                                        : "status-off"
                                                }`}
                                            >
                                                <span></span>
                                                {estate.active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </td>

                                        <td>
                                            {formatDate(estate.createdAt)}
                                        </td>

                                        <td className="col-actions">
                                            <div className="super-admin-actions">

                                                {estate.active ? (
                                                    <button
                                                        className="super-admin-icon-button danger"
                                                        title="Deactivate estate"
                                                        onClick={() =>
                                                            handleToggleActive(estate)
                                                        }
                                                    >
                                                        <Power size={15} />
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="super-admin-icon-button success"
                                                        title="Activate estate"
                                                        onClick={() =>
                                                            handleToggleActive(estate)
                                                        }
                                                    >
                                                        <Power size={15} />
                                                        Activate
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
               CREATE ESTATE MODAL
               ===================================================== */}

            {showCreateModal && (
                <div className="super-admin-modal-overlay">
                    <div className="super-admin-modal">

                        <div className="super-admin-modal-header">
                            <h3>Create Estate</h3>

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
                                Estate Name

                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(event) =>
                                        setNewName(event.target.value)
                                    }
                                    placeholder="e.g. Greenfield Gardens"
                                    autoComplete="off"
                                    required
                                    autoFocus
                                />
                            </label>

                            <label>
                                Estate Code

                                <input
                                    type="text"
                                    value={newCode}
                                    onChange={(event) =>
                                        setNewCode(event.target.value)
                                    }
                                    placeholder="e.g. EST002"
                                    autoComplete="off"
                                    required
                                />
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
                                        : "Create Estate"}
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}

        </div>
    );

}

export default SuperAdminEstatesPage;

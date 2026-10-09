import { useEffect, useState } from "react";
import {
    Shield,
    Plus,
    RefreshCw,
    UserRound,
    Phone,
    Mail,
    KeyRound,
    Pencil,
    Trash2,
    X,
    Check,
    Ban,
    LogIn,
    LogOut,
    Users,
    Clock3,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function SecurityPage() {
    const { user } = useAuth();

    const role = String(user?.role || "")
        .toUpperCase()
        .replace(/^ROLE_/, "");

    const isAdmin = role === "ADMIN";
    const isSecurity = role === "SECURITY";

    /*
     * ---------------------------------------------------------
     * SECURITY PERSONNEL STATE
     * ---------------------------------------------------------
     */

    const [securityPersonnel, setSecurityPersonnel] = useState([]);

    const [loadingSecurity, setLoadingSecurity] = useState(true);
    const [savingSecurity, setSavingSecurity] = useState(false);
    const [processingSecurityId, setProcessingSecurityId] =
        useState(null);

    const [showSecurityModal, setShowSecurityModal] =
        useState(false);

    const [editingSecurityId, setEditingSecurityId] =
        useState(null);

    const [securityName, setSecurityName] = useState("");
    const [securityPhone, setSecurityPhone] = useState("");
    const [securityEmail, setSecurityEmail] = useState("");
    const [securityUsername, setSecurityUsername] =
        useState("");
    const [securityPassword, setSecurityPassword] =
        useState("");

    /*
     * ---------------------------------------------------------
     * VISITOR ACCESS STATE
     * ---------------------------------------------------------
     */

    const [accessCode, setAccessCode] = useState("");

    const [processingAccess, setProcessingAccess] =
        useState(false);

    const [checkInResult, setCheckInResult] = useState(null);

    /*
     * ---------------------------------------------------------
     * COMMON STATE
     * ---------------------------------------------------------
     */

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    /*
     * ---------------------------------------------------------
     * LOAD SECURITY PERSONNEL
     * ---------------------------------------------------------
     */

    async function loadSecurityPersonnel() {
        try {
            setLoadingSecurity(true);
            setError("");

            const response = await api.get("/security");

            const data = response.data;

            setSecurityPersonnel(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : []
            );
        } catch (err) {
            console.error(
                "Failed to load security personnel:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to load security personnel."
            );
        } finally {
            setLoadingSecurity(false);
        }
    }

    useEffect(() => {
        if (isAdmin) {
            loadSecurityPersonnel();
        } else {
            setLoadingSecurity(false);
        }
    }, [isAdmin]);

    /*
     * ---------------------------------------------------------
     * MODAL
     * ---------------------------------------------------------
     */

    function resetSecurityForm() {
        setSecurityName("");
        setSecurityPhone("");
        setSecurityEmail("");
        setSecurityUsername("");
        setSecurityPassword("");
        setEditingSecurityId(null);
    }

    function openCreateSecurityModal() {
        setError("");
        setSuccess("");

        resetSecurityForm();

        setShowSecurityModal(true);
    }

    function openEditSecurityModal(person) {
        setError("");
        setSuccess("");

        setEditingSecurityId(person.id);

        setSecurityName(person.name || "");
        setSecurityPhone(person.phoneNumber || "");
        setSecurityEmail(person.email || "");

        /*
         * Username/password are authentication credentials.
         * They are not returned by the Security entity.
         *
         * Therefore, when editing an existing security person,
         * leave them empty.
         */
        setSecurityUsername("");
        setSecurityPassword("");

        setShowSecurityModal(true);
    }

    function closeSecurityModal() {
        if (savingSecurity) {
            return;
        }

        setShowSecurityModal(false);

        resetSecurityForm();
    }

    /*
     * ---------------------------------------------------------
     * CREATE / UPDATE SECURITY PERSONNEL
     * ---------------------------------------------------------
     */

    async function handleSecuritySubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!securityName.trim()) {
            setError("Please enter the security personnel name.");
            return;
        }

        if (!securityPhone.trim()) {
            setError("Please enter the phone number.");
            return;
        }

        if (!securityEmail.trim()) {
            setError("Please enter the email address.");
            return;
        }

        if (!editingSecurityId) {
            if (!securityUsername.trim()) {
                setError("Please enter a username.");
                return;
            }

            if (!securityPassword) {
                setError("Please enter a password.");
                return;
            }

            if (securityPassword.length < 6) {
                setError(
                    "Password must be at least 6 characters."
                );
                return;
            }
        }

        try {
            setSavingSecurity(true);

            if (editingSecurityId) {
                /*
                 * Existing backend update endpoint accepts the
                 * Security entity directly.
                 *
                 * Do not send username/password because those
                 * belong to the User authentication record.
                 */
                await api.put(
                    `/security/${encodeURIComponent(
                        editingSecurityId
                    )}`,
                    {
                        name: securityName.trim(),
                        phoneNumber: securityPhone.trim(),
                        email: securityEmail.trim(),
                    }
                );

                setSuccess(
                    "Security personnel updated successfully."
                );
            } else {
                /*
                 * Creation goes through SecurityController,
                 * which creates both:
                 *
                 * 1. Security record
                 * 2. ROLE_SECURITY User account
                 */
                await api.post("/security", {
                    name: securityName.trim(),
                    phoneNumber: securityPhone.trim(),
                    email: securityEmail.trim(),
                    username: securityUsername.trim(),
                    password: securityPassword,
                });

                setSuccess(
                    "Security personnel created successfully."
                );
            }

            setShowSecurityModal(false);

            resetSecurityForm();

            await loadSecurityPersonnel();
        } catch (err) {
            console.error(
                "Failed to save security personnel:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to save security personnel."
            );
        } finally {
            setSavingSecurity(false);
        }
    }

    /*
     * ---------------------------------------------------------
     * DELETE SECURITY PERSONNEL
     * ---------------------------------------------------------
     */

    async function handleDeleteSecurity(person) {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${person.name || "this security personnel"}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessingSecurityId(person.id);

            setError("");
            setSuccess("");

            await api.delete(
                `/security/${encodeURIComponent(person.id)}`
            );

            setSuccess(
                "Security personnel deleted successfully."
            );

            await loadSecurityPersonnel();
        } catch (err) {
            console.error(
                "Failed to delete security personnel:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to delete security personnel."
            );
        } finally {
            setProcessingSecurityId(null);
        }
    }

    /*
     * ---------------------------------------------------------
     * CHECK-IN
     * ---------------------------------------------------------
     */

    async function handleCheckIn() {
        const code = accessCode.trim();

        if (!code) {
            setError("Please enter an access code.");
            return;
        }

        try {
            setProcessingAccess(true);

            setError("");
            setSuccess("");
            setCheckInResult(null);

            const response = await api.post(
                `/security/check-in/${encodeURIComponent(code)}`
            );

            const visit = response.data?.data || response.data;

            setAccessCode("");

            setCheckInResult(visit);

            setSuccess(
                "Visitor checked in successfully."
            );
        } catch (err) {
            console.error(
                "Check-in failed:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to check in visitor."
            );
        } finally {
            setProcessingAccess(false);
        }
    }

    /*
     * ---------------------------------------------------------
     * CHECK-OUT
     * ---------------------------------------------------------
     */

    async function handleCheckOut() {
        const code = accessCode.trim();

        if (!code) {
            setError("Please enter an access code.");
            return;
        }

        try {
            setProcessingAccess(true);

            setError("");
            setSuccess("");

            await api.post(
                `/security/check-out/${encodeURIComponent(code)}`
            );

            setAccessCode("");

            setSuccess(
                "Visitor checked out successfully."
            );
        } catch (err) {
            console.error(
                "Check-out failed:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to check out visitor."
            );
        } finally {
            setProcessingAccess(false);
        }
    }

    /*
     * ---------------------------------------------------------
     * STATS
     * ---------------------------------------------------------
     */

    const totalSecurity = securityPersonnel.length;

    /*
     * ---------------------------------------------------------
     * SECURITY ROLE UI
     * ---------------------------------------------------------
     */

    if (isSecurity) {
        return (
            <div className="security-page">
                <style>{securityStyles}</style>

                <div className="security-header">
                    <div className="security-title-area">
                        <h1>Security</h1>

                        <p>
                            Manage visitor access and estate
                            security operations.
                        </p>
                    </div>

                    <div className="security-actions">
                        <button
                            className="security-refresh-button"
                            onClick={() => {
                                setError("");
                                setSuccess("");
                                setAccessCode("");
                                setCheckInResult(null);
                            }}
                            title="Clear access"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="security-alert error">
                        <Ban size={18} />

                        <div className="security-alert-content">
                            <strong>
                                Something went wrong
                            </strong>

                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="security-alert success">
                        <Check size={18} />

                        <div className="security-alert-content">
                            <span>{success}</span>
                        </div>
                    </div>
                )}

                {checkInResult && (
                    <section className="security-checkin-result">
                        <div className="security-checkin-result-header">
                            <div className="security-checkin-result-icon">
                                <Check size={22} />
                            </div>

                            <div>
                                <h2>
                                    Visitor checked in successfully
                                </h2>

                                <p>
                                    The visitor has been authorized
                                    and checked into the estate.
                                </p>
                            </div>
                        </div>

                        <div className="security-checkin-details">
                            <div className="security-checkin-detail">
                                <span>Visitor</span>

                                <strong>
                                    {checkInResult.visitor?.fullName ||
                                        "—"}
                                </strong>
                            </div>

                            <div className="security-checkin-detail">
                                <span>Phone</span>

                                <strong>
                                    {checkInResult.visitor
                                        ?.phoneNumber || "—"}
                                </strong>
                            </div>

                            <div className="security-checkin-detail">
                                <span>Resident</span>

                                <strong>
                                    {checkInResult.resident?.fullName ||
                                        "—"}
                                </strong>
                            </div>

                            <div className="security-checkin-detail">
                                <span>House Number</span>

                                <strong>
                                    {checkInResult.resident
                                        ?.houseNumber || "—"}
                                </strong>
                            </div>

                            <div className="security-checkin-detail">
                                <span>Purpose</span>

                                <strong>
                                    {checkInResult.purpose || "—"}
                                </strong>
                            </div>

                            <div className="security-checkin-detail">
                                <span>Access Code</span>

                                <strong className="security-checkin-code">
                                    {checkInResult.accessCode || "—"}
                                </strong>
                            </div>

                            <div className="security-checkin-detail">
                                <span>Check-In Time</span>

                                <strong>
                                    {checkInResult.checkInTime
                                        ? new Date(
                                            checkInResult.checkInTime
                                        ).toLocaleString()
                                        : "—"}
                                </strong>
                            </div>

                            <div className="security-checkin-detail">
                                <span>Status</span>

                                <strong className="security-checkin-status">
                                    {checkInResult.status ||
                                        "CHECKED_IN"}
                                </strong>
                            </div>
                        </div>
                    </section>
                )}

                <div className="security-stat-grid">
                    <SecurityStatCard
                        icon={<Shield size={21} />}
                        iconClass="blue"
                        label="Security Operations"
                        value="Active"
                        description="Access control is ready"
                    />

                    <SecurityStatCard
                        icon={<Users size={21} />}
                        iconClass="green"
                        label="Visitor Access"
                        value="Ready"
                        description="Process visitor access"
                    />

                    <SecurityStatCard
                        icon={<Clock3 size={21} />}
                        iconClass="orange"
                        label="Check-In / Out"
                        value="Available"
                        description="Manage estate entry"
                    />
                </div>

                <section className="security-panel">
                    <div className="security-panel-header">
                        <div>
                            <h2>Visitor Access</h2>

                            <p>
                                Use the visitor access code to
                                check visitors in or out.
                            </p>
                        </div>
                    </div>

                    <div className="security-access-content">
                        <div className="security-access-icon">
                            <KeyRound size={25} />
                        </div>

                        <div className="security-access-main">
                            <label>
                                Visitor Access Code
                            </label>

                            <input
                                value={accessCode}
                                onChange={(event) =>
                                    setAccessCode(
                                        event.target.value
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter"
                                    ) {
                                        handleCheckIn();
                                    }
                                }}
                                placeholder="Enter access code"
                                disabled={processingAccess}
                            />

                            <span>
                                Enter the code provided by the
                                visitor.
                            </span>
                        </div>

                        <div className="security-access-actions">
                            <button
                                className="security-action-button checkin"
                                onClick={handleCheckIn}
                                disabled={processingAccess}
                            >
                                {processingAccess ? (
                                    <RefreshCw
                                        size={15}
                                        className="security-small-spinner"
                                    />
                                ) : (
                                    <LogIn size={15} />
                                )}

                                Check In
                            </button>

                            <button
                                className="security-action-button checkout"
                                onClick={handleCheckOut}
                                disabled={processingAccess}
                            >
                                {processingAccess ? (
                                    <RefreshCw
                                        size={15}
                                        className="security-small-spinner"
                                    />
                                ) : (
                                    <LogOut size={15} />
                                )}

                                Check Out
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    /*
     * ---------------------------------------------------------
     * ADMIN UI
     * ---------------------------------------------------------
     */

    return (
        <div className="security-page">
            <style>{securityStyles}</style>

            <div className="security-header">
                <div className="security-title-area">
                    <h1>Security Personnel</h1>

                    <p>
                        Manage security personnel and their
                        access accounts.
                    </p>
                </div>

                <div className="security-actions">
                    <button
                        className="security-refresh-button"
                        onClick={loadSecurityPersonnel}
                        disabled={loadingSecurity}
                        title="Refresh security personnel"
                    >
                        <RefreshCw
                            size={18}
                            className={
                                loadingSecurity
                                    ? "security-small-spinner"
                                    : ""
                            }
                        />
                    </button>

                    <button
                        className="security-primary-button"
                        onClick={
                            openCreateSecurityModal
                        }
                    >
                        <Plus size={17} />
                        Add Security Personnel
                    </button>
                </div>
            </div>

            {error && (
                <div className="security-alert error">
                    <Ban size={18} />

                    <div className="security-alert-content">
                        <strong>
                            Something went wrong
                        </strong>

                        <span>{error}</span>
                    </div>
                </div>
            )}

            {success && (
                <div className="security-alert success">
                    <Check size={18} />

                    <div className="security-alert-content">
                        <span>{success}</span>
                    </div>
                </div>
            )}

            <div className="security-stat-grid">
                <SecurityStatCard
                    icon={<Shield size={21} />}
                    iconClass="blue"
                    label="Security Personnel"
                    value={totalSecurity}
                    description="Registered security staff"
                    loading={loadingSecurity}
                />

                <SecurityStatCard
                    icon={<Users size={21} />}
                    iconClass="green"
                    label="Access Control"
                    value="Active"
                    description="Security accounts enabled"
                />

                <SecurityStatCard
                    icon={<KeyRound size={21} />}
                    iconClass="purple"
                    label="Authentication"
                    value="Protected"
                    description="Role-based access"
                />
            </div>

            <section className="security-panel">
                <div className="security-panel-header">
                    <div>
                        <h2>All Security Personnel</h2>

                        <p>
                            Security staff registered in
                            EstateFlow.
                        </p>
                    </div>
                </div>

                {loadingSecurity ? (
                    <div className="security-loading">
                        <div className="security-spinner"></div>

                        <span>
                            Loading security personnel...
                        </span>
                    </div>
                ) : securityPersonnel.length === 0 ? (
                    <div className="security-empty">
                        <div className="security-empty-icon">
                            <Shield size={27} />
                        </div>

                        <strong>
                            No security personnel found
                        </strong>

                        <span>
                            Add your first security personnel
                            to get started.
                        </span>
                    </div>
                ) : (
                    <div className="security-table-scroll">
                        <table className="security-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Security Personnel</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                            </thead>

                            <tbody>
                            {securityPersonnel.map(
                                (person) => {
                                    const isProcessing =
                                        processingSecurityId ===
                                        person.id;

                                    return (
                                        <tr
                                            key={
                                                person.id
                                            }
                                        >
                                            <td>
                                                    <span className="security-id">
                                                        #{person.id}
                                                    </span>
                                            </td>

                                            <td>
                                                <div className="security-person">
                                                    <div className="security-person-icon">
                                                        <UserRound
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </div>

                                                    <div className="security-person-details">
                                                            <span className="security-person-name">
                                                                {person.name ||
                                                                    "Unknown"}
                                                            </span>

                                                        <span className="security-person-subtitle">
                                                                Security Personnel
                                                            </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="security-contact">
                                                    <Phone
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    <span>
                                                            {person.phoneNumber ||
                                                                "—"}
                                                        </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="security-contact">
                                                    <Mail
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    <span>
                                                            {person.email ||
                                                                "—"}
                                                        </span>
                                                </div>
                                            </td>

                                            <td>
                                                    <span className="security-role-badge">
                                                        ROLE_SECURITY
                                                    </span>
                                            </td>

                                            <td>
                                                <div className="security-actions-row">
                                                    <button
                                                        className="security-table-button edit"
                                                        onClick={() =>
                                                            openEditSecurityModal(
                                                                person
                                                            )
                                                        }
                                                        disabled={
                                                            isProcessing
                                                        }
                                                    >
                                                        <Pencil
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        Edit
                                                    </button>

                                                    <button
                                                        className="security-table-button delete"
                                                        onClick={() =>
                                                            handleDeleteSecurity(
                                                                person
                                                            )
                                                        }
                                                        disabled={
                                                            isProcessing
                                                        }
                                                    >
                                                        {isProcessing ? (
                                                            <RefreshCw
                                                                size={
                                                                    14
                                                                }
                                                                className="security-small-spinner"
                                                            />
                                                        ) : (
                                                            <Trash2
                                                                size={
                                                                    14
                                                                }
                                                            />
                                                        )}

                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {showSecurityModal && (
                <div
                    className="security-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeSecurityModal();
                        }
                    }}
                >
                    <div className="security-modal">
                        <div className="security-modal-header">
                            <div>
                                <h2>
                                    {editingSecurityId
                                        ? "Edit Security Personnel"
                                        : "Add Security Personnel"}
                                </h2>

                                <p>
                                    {editingSecurityId
                                        ? "Update security personnel details."
                                        : "Create a security personnel account."}
                                </p>
                            </div>

                            <button
                                className="security-close-button"
                                onClick={
                                    closeSecurityModal
                                }
                                disabled={savingSecurity}
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleSecuritySubmit
                            }
                            className="security-modal-form"
                        >
                            <div className="security-form-group">
                                <label>Name</label>

                                <input
                                    value={
                                        securityName
                                    }
                                    onChange={(event) =>
                                        setSecurityName(
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="Enter full name"
                                    disabled={
                                        savingSecurity
                                    }
                                />
                            </div>

                            <div className="security-form-row">
                                <div className="security-form-group">
                                    <label>
                                        Phone Number
                                    </label>

                                    <input
                                        value={
                                            securityPhone
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSecurityPhone(
                                                event.target
                                                    .value
                                            )
                                        }
                                        placeholder="Enter phone number"
                                        disabled={
                                            savingSecurity
                                        }
                                    />
                                </div>

                                <div className="security-form-group">
                                    <label>Email</label>

                                    <input
                                        type="email"
                                        value={
                                            securityEmail
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSecurityEmail(
                                                event.target
                                                    .value
                                            )
                                        }
                                        placeholder="Enter email"
                                        disabled={
                                            savingSecurity
                                        }
                                    />
                                </div>
                            </div>

                            {!editingSecurityId && (
                                <>
                                    <div className="security-form-group">
                                        <label>
                                            Username
                                        </label>

                                        <input
                                            value={
                                                securityUsername
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setSecurityUsername(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Create username"
                                            disabled={
                                                savingSecurity
                                            }
                                            autoComplete="off"
                                        />
                                    </div>

                                    <div className="security-form-group">
                                        <label>
                                            Password
                                        </label>

                                        <input
                                            type="password"
                                            value={
                                                securityPassword
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setSecurityPassword(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Create password"
                                            disabled={
                                                savingSecurity
                                            }
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="security-modal-actions">
                                <button
                                    type="button"
                                    className="security-secondary-button"
                                    onClick={
                                        closeSecurityModal
                                    }
                                    disabled={
                                        savingSecurity
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="security-primary-button"
                                    disabled={
                                        savingSecurity
                                    }
                                >
                                    {savingSecurity ? (
                                        <>
                                            <RefreshCw
                                                size={15}
                                                className="security-small-spinner"
                                            />

                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check
                                                size={15}
                                            />

                                            {editingSecurityId
                                                ? "Save Changes"
                                                : "Add Security"}
                                        </>
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

function SecurityStatCard({
                              icon,
                              iconClass,
                              label,
                              value,
                              description,
                              loading,
                          }) {
    return (
        <div className="security-stat-card">
            <div
                className={`security-stat-icon ${iconClass}`}
            >
                {icon}
            </div>

            <span className="security-stat-label">
                {label}
            </span>

            <strong className="security-stat-value">
                {loading ? "—" : value}
            </strong>

            <p className="security-stat-description">
                {description}
            </p>
        </div>
    );
}

const securityStyles = `
    .security-page {
        min-height: 100%;
        padding: 34px 40px 60px;
        color: #172033;
    }

    .security-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 28px;
    }

    .security-title-area h1 {
        margin: 0;
        font-size: 38px;
        line-height: 1.1;
        letter-spacing: -1.2px;
        color: #172033;
    }

    .security-title-area p {
        margin: 9px 0 0;
        color: #8090aa;
        font-size: 15px;
    }

    .security-actions {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .security-refresh-button {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        border: 1px solid #dce4f0;
        background: white;
        color: #52627d;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: .2s ease;
    }

    .security-refresh-button:hover:not(:disabled) {
        border-color: #c7d3e5;
        background: #f8fafc;
        transform: translateY(-1px);
    }

    .security-refresh-button:disabled {
        opacity: .6;
        cursor: not-allowed;
    }

    .security-primary-button {
        height: 48px;
        border: none;
        border-radius: 12px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        background: linear-gradient(
            135deg,
            #2563eb,
            #315fe8
        );
        color: white;
        font-weight: 700;
        cursor: pointer;
        box-shadow:
            0 10px 25px rgba(37, 99, 235, .20);
        transition: .2s ease;
    }

    .security-primary-button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow:
            0 13px 28px rgba(37, 99, 235, .28);
    }

    .security-primary-button:disabled {
        opacity: .65;
        cursor: not-allowed;
    }

    .security-alert {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        padding: 14px 17px;
        border-radius: 13px;
        margin-bottom: 20px;
        font-size: 14px;
        font-weight: 600;
    }

    .security-alert.error {
        background: #fff1f2;
        border: 1px solid #fecdd3;
        color: #be123c;
    }

    .security-alert.success {
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        color: #047857;
    }

    .security-alert-content {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    /*
     * ---------------------------------------------------------
     * CHECK-IN RESULT
     * ---------------------------------------------------------
     */

    .security-checkin-result {
        margin-bottom: 22px;
        background: white;
        border: 1px solid #bbf7d0;
        border-radius: 20px;
        overflow: hidden;
        box-shadow:
            0 8px 25px rgba(30, 50, 85, .035);
    }

    .security-checkin-result-header {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 21px 25px;
        background: #f0fdf4;
        border-bottom: 1px solid #dcfce7;
    }

    .security-checkin-result-icon {
        width: 46px;
        height: 46px;
        border-radius: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: #dcfce7;
        color: #16a34a;
    }

    .security-checkin-result-header h2 {
        margin: 0;
        color: #166534;
        font-size: 18px;
        letter-spacing: -.2px;
    }

    .security-checkin-result-header p {
        margin: 5px 0 0;
        color: #4d7c5b;
        font-size: 13px;
    }

    .security-checkin-details {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0;
    }

    .security-checkin-detail {
        min-width: 0;
        padding: 17px 22px;
        border-bottom: 1px solid #eef2f7;
    }

    .security-checkin-detail:nth-child(odd) {
        border-right: 1px solid #eef2f7;
    }

    .security-checkin-detail:nth-last-child(-n + 2) {
        border-bottom: none;
    }

    .security-checkin-detail span {
        display: block;
        margin-bottom: 5px;
        color: #8a99b0;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .5px;
    }

    .security-checkin-detail strong {
        display: block;
        color: #26334a;
        font-size: 14px;
        font-weight: 700;
        word-break: break-word;
    }

    .security-checkin-code {
        display: inline-flex !important;
        align-items: center;
        width: fit-content;
        padding: 5px 9px;
        border-radius: 7px;
        background: #edf4ff;
        color: #2563eb !important;
        letter-spacing: 1px;
    }

    .security-checkin-status {
        display: inline-flex !important;
        align-items: center;
        width: fit-content;
        padding: 5px 9px;
        border-radius: 999px;
        background: #dcfce7;
        color: #15803d !important;
        font-size: 11px !important;
        letter-spacing: .3px;
    }

    /*
     * ---------------------------------------------------------
     * STATISTICS
     * ---------------------------------------------------------
     */

    .security-stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
        margin-bottom: 22px;
    }

    .security-stat-card {
        min-width: 0;
        background: white;
        border: 1px solid #e3e9f2;
        border-radius: 18px;
        padding: 21px;
        position: relative;
        overflow: hidden;
        box-shadow:
            0 8px 25px rgba(30, 50, 85, .035);
    }

    .security-stat-card::after {
        content: "";
        position: absolute;
        width: 100px;
        height: 100px;
        right: -45px;
        bottom: -50px;
        border-radius: 50%;
        background: #f5f8fd;
    }

    .security-stat-icon {
        width: 45px;
        height: 45px;
        border-radius: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 17px;
        position: relative;
        z-index: 1;
    }

    .security-stat-icon.blue {
        background: #edf4ff;
        color: #2563eb;
    }

    .security-stat-icon.orange {
        background: #fff7e8;
        color: #d97706;
    }

    .security-stat-icon.green {
        background: #ecfdf5;
        color: #059669;
    }

    .security-stat-icon.purple {
        background: #f3efff;
        color: #7c3aed;
    }

    .security-stat-label {
        display: block;
        color: #71809a;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 5px;
        position: relative;
        z-index: 1;
    }

    .security-stat-value {
        display: block;
        font-size: 25px;
        line-height: 1;
        color: #172033;
        letter-spacing: -.7px;
        position: relative;
        z-index: 1;
    }

    .security-stat-description {
        margin: 8px 0 0;
        color: #95a2b7;
        font-size: 12px;
        position: relative;
        z-index: 1;
    }

    /*
     * ---------------------------------------------------------
     * MAIN PANEL
     * ---------------------------------------------------------
     */

    .security-panel {
        background: white;
        border: 1px solid #e3e9f2;
        border-radius: 20px;
        overflow: hidden;
        box-shadow:
            0 8px 25px rgba(30, 50, 85, .035);
    }

    .security-panel-header {
        padding: 23px 25px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #edf1f6;
    }

    .security-panel-header h2 {
        margin: 0;
        color: #172033;
        font-size: 19px;
        letter-spacing: -.2px;
    }

    .security-panel-header p {
        margin: 5px 0 0;
        color: #8a99b0;
        font-size: 13px;
    }

    /*
     * ---------------------------------------------------------
     * SECURITY TABLE
     * ---------------------------------------------------------
     */

    .security-table-scroll {
        width: 100%;
        overflow-x: auto;
        overflow-y: visible;
    }

    .security-table {
        width: 100%;
        min-width: 1000px;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
    }

    .security-table th {
        height: 54px;
        padding: 0 18px;
        background: #f8fafc;
        border-bottom: 1px solid #e7edf4;
        text-align: left;
        color: #7d8ca4;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .65px;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .security-table td {
        height: 78px;
        padding: 13px 18px;
        border-bottom: 1px solid #eef2f7;
        color: #53627b;
        font-size: 13px;
        vertical-align: middle;
    }

    .security-table tbody tr {
        transition: background .15s ease;
    }

    .security-table tbody tr:hover {
        background: #fbfdff;
    }

    .security-table tbody tr:last-child td {
        border-bottom: none;
    }

    .security-table th:nth-child(1),
    .security-table td:nth-child(1) {
        width: 65px;
    }

    .security-table th:nth-child(2),
    .security-table td:nth-child(2) {
        width: 235px;
    }

    .security-table th:nth-child(3),
    .security-table td:nth-child(3) {
        width: 170px;
    }

    .security-table th:nth-child(4),
    .security-table td:nth-child(4) {
        width: 235px;
    }

    .security-table th:nth-child(5),
    .security-table td:nth-child(5) {
        width: 150px;
    }

    .security-table th:nth-child(6),
    .security-table td:nth-child(6) {
        width: 220px;
    }

    .security-id {
        color: #8795aa;
        font-weight: 700;
        white-space: nowrap;
    }

    .security-person {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
    }

    .security-person-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: #eef4ff;
        color: #3b6fd8;
    }

    .security-person-details {
        min-width: 0;
    }

    .security-person-name {
        display: block;
        color: #26334a;
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .security-person-subtitle {
        display: block;
        margin-top: 3px;
        color: #99a5b7;
        font-size: 11px;
        white-space: nowrap;
    }

    .security-contact {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        color: #53627b;
    }

    .security-contact svg {
        flex-shrink: 0;
        color: #8b9ab0;
    }

    .security-contact span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .security-role-badge {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        background: #edf4ff;
        color: #2563eb;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
    }

    .security-actions-row {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: nowrap;
    }

    .security-table-button {
        height: 34px;
        border-radius: 9px;
        padding: 0 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
        cursor: pointer;
        transition: .18s ease;
    }

    .security-table-button:disabled {
        opacity: .55;
        cursor: not-allowed;
    }

    .security-table-button.edit {
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #2563eb;
    }

    .security-table-button.edit:hover:not(:disabled) {
        background: #dbeafe;
        border-color: #93c5fd;
        transform: translateY(-1px);
    }

    .security-table-button.delete {
        border: 1px solid #fecaca;
        background: #fff7f7;
        color: #dc2626;
    }

    .security-table-button.delete:hover:not(:disabled) {
        background: #fff1f2;
        border-color: #fca5a5;
        transform: translateY(-1px);
    }

    /*
     * ---------------------------------------------------------
     * LOADING / EMPTY
     * ---------------------------------------------------------
     */

    .security-loading {
        min-height: 310px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 13px;
        color: #8796ad;
        font-size: 13px;
    }

    .security-spinner {
        width: 28px;
        height: 28px;
        border: 3px solid #e5ebf3;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: securitySpin .75s linear infinite;
    }

    .security-small-spinner {
        animation: securitySpin .75s linear infinite;
    }

    @keyframes securitySpin {
        to {
            transform: rotate(360deg);
        }
    }

    .security-empty {
        min-height: 310px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40px 20px;
        color: #8796ad;
    }

    .security-empty-icon {
        width: 64px;
        height: 64px;
        border-radius: 19px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        background: #f0f5ff;
        color: #6c8fdc;
    }

    .security-empty strong {
        color: #253149;
        font-size: 16px;
        margin-bottom: 6px;
    }

    .security-empty span {
        font-size: 13px;
    }

    /*
     * ---------------------------------------------------------
     * ACCESS CONTROL
     * ---------------------------------------------------------
     */

    .security-access-content {
        padding: 26px;
        display: flex;
        align-items: center;
        gap: 18px;
    }

    .security-access-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: #edf4ff;
        color: #2563eb;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .security-access-main {
        flex: 1;
        min-width: 0;
    }

    .security-access-main label {
        display: block;
        margin-bottom: 7px;
        color: #344159;
        font-size: 12px;
        font-weight: 700;
    }

    .security-access-main input {
        width: 100%;
        height: 46px;
        box-sizing: border-box;
        border: 1px solid #dce4ef;
        border-radius: 10px;
        outline: none;
        padding: 0 13px;
        color: #253149;
        font-size: 14px;
        background: white;
        transition: .2s ease;
    }

    .security-access-main input:focus {
        border-color: #5b8def;
        box-shadow:
            0 0 0 4px rgba(37, 99, 235, .08);
    }

    .security-access-main input:disabled {
        background: #f8fafc;
        cursor: not-allowed;
    }

    .security-access-main > span {
        display: block;
        margin-top: 7px;
        color: #95a2b7;
        font-size: 12px;
    }

    .security-access-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        padding-top: 20px;
    }

    .security-action-button {
        height: 40px;
        border-radius: 9px;
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
        cursor: pointer;
        transition: .18s ease;
    }

    .security-action-button:disabled {
        opacity: .55;
        cursor: not-allowed;
    }

    .security-action-button.checkin {
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #2563eb;
    }

    .security-action-button.checkin:hover:not(:disabled) {
        background: #dbeafe;
        border-color: #93c5fd;
        transform: translateY(-1px);
    }

    .security-action-button.checkout {
        border: 1px solid #ddd6fe;
        background: #f5f3ff;
        color: #7c3aed;
    }

    .security-action-button.checkout:hover:not(:disabled) {
        background: #ede9fe;
        border-color: #c4b5fd;
        transform: translateY(-1px);
    }

    /*
     * ---------------------------------------------------------
     * MODAL
     * ---------------------------------------------------------
     */

    .security-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(15, 23, 42, .48);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .security-modal {
        width: 100%;
        max-width: 540px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        background: white;
        border-radius: 22px;
        overflow-x: hidden;
        box-shadow:
            0 30px 80px rgba(15, 23, 42, .25);
    }

    .security-modal-header {
        padding: 23px 25px;
        border-bottom: 1px solid #edf1f6;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .security-modal-header h2 {
        margin: 0;
        font-size: 21px;
        color: #172033;
    }

    .security-modal-header p {
        margin: 5px 0 0;
        font-size: 12px;
        color: #8a99b0;
    }

    .security-close-button {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 9px;
        background: #f4f6f9;
        color: #687790;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .security-close-button:hover:not(:disabled) {
        background: #e9edf3;
    }

    .security-close-button:disabled {
        opacity: .5;
        cursor: not-allowed;
    }

    .security-modal-form {
        padding: 24px 25px 25px;
    }

    .security-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
    }

    .security-form-group {
        margin-bottom: 17px;
    }

    .security-form-group label {
        display: block;
        margin-bottom: 7px;
        font-size: 12px;
        font-weight: 700;
        color: #344159;
    }

    .security-form-group input {
        width: 100%;
        height: 46px;
        box-sizing: border-box;
        border: 1px solid #dce4ef;
        border-radius: 10px;
        outline: none;
        padding: 0 13px;
        font-size: 14px;
        color: #253149;
        background: white;
        transition: .2s ease;
    }

    .security-form-group input:focus {
        border-color: #5b8def;
        box-shadow:
            0 0 0 4px rgba(37, 99, 235, .08);
    }

    .security-form-group input:disabled {
        background: #f8fafc;
        cursor: not-allowed;
    }

    .security-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 23px;
        padding-top: 18px;
        border-top: 1px solid #edf1f6;
    }

    .security-secondary-button {
        height: 44px;
        padding: 0 17px;
        border-radius: 10px;
        border: 1px solid #dce4ef;
        background: white;
        color: #52627d;
        font-weight: 700;
        cursor: pointer;
    }

    .security-secondary-button:hover:not(:disabled) {
        background: #f8fafc;
    }

    .security-secondary-button:disabled {
        opacity: .55;
        cursor: not-allowed;
    }

    /*
     * ---------------------------------------------------------
     * RESPONSIVE
     * ---------------------------------------------------------
     */

    @media (max-width: 1100px) {
        .security-page {
            padding-left: 25px;
            padding-right: 25px;
        }

        .security-stat-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .security-access-content {
            flex-wrap: wrap;
        }

        .security-access-main {
            min-width: calc(100% - 70px);
        }

        .security-access-actions {
            width: 100%;
            padding-top: 0;
            padding-left: 70px;
        }
    }

    @media (max-width: 700px) {
        .security-page {
            padding: 24px 18px 45px;
        }

        .security-header {
            flex-direction: column;
            align-items: stretch;
        }

        .security-actions {
            width: 100%;
        }

        .security-primary-button {
            flex: 1;
        }

        .security-stat-grid {
            grid-template-columns: 1fr;
        }

        .security-panel-header {
            padding: 20px;
        }

        .security-access-content {
            padding: 20px;
        }

        .security-access-icon {
            display: none;
        }

        .security-access-main {
            min-width: 100%;
        }

        .security-access-actions {
            padding-left: 0;
        }

        .security-action-button {
            flex: 1;
        }

        .security-form-row {
            grid-template-columns: 1fr;
            gap: 0;
        }

        .security-modal-header {
            padding: 20px;
        }

        .security-modal-form {
            padding: 20px;
        }

        .security-checkin-result-header {
            padding: 19px;
        }

        .security-checkin-result-header h2 {
            font-size: 16px;
        }

        .security-checkin-details {
            grid-template-columns: 1fr;
        }

        .security-checkin-detail {
            padding: 15px 19px;
            border-right: none !important;
        }

        .security-checkin-detail:nth-last-child(-n + 2) {
            border-bottom: 1px solid #eef2f7;
        }

        .security-checkin-detail:last-child {
            border-bottom: none;
        }
    }
`;

export default SecurityPage;
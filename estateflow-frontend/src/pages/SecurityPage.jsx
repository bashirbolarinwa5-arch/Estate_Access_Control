
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
    ClipboardCheck,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";

import { useToast } from "../components/useToast";
import BulkImportModal from "../components/BulkImportModal";
import TempPasswordModal from "../components/TempPasswordModal";
import PassVerificationPanel from "../components/PassVerificationPanel";

function getResponseData(response) {
    return response?.data?.data ?? response?.data;
}

function SecurityPage() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const role = String(user?.role || "")
        .toUpperCase()
        .replace(/^ROLE_/, "");

    const isAdmin = role === "ADMIN";
    const isSecurity = role === "SECURITY";

    // Admin security personnel
    const [securityPersonnel, setSecurityPersonnel] = useState([]);
    const [loadingSecurity, setLoadingSecurity] = useState(isAdmin);
    const [savingSecurity, setSavingSecurity] = useState(false);
    const [processingSecurityId, setProcessingSecurityId] = useState(null);

    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [showBulkSecurityModal, setShowBulkSecurityModal] = useState(false);
    const [editingSecurityId, setEditingSecurityId] = useState(null);

    const [resettingSecurityId, setResettingSecurityId] = useState(null);
    const [resetSecurityResult, setResetSecurityResult] = useState(null);

    const [securityName, setSecurityName] = useState("");
    const [securityPhone, setSecurityPhone] = useState("");
    const [securityEmail, setSecurityEmail] = useState("");
    const [securityUsername, setSecurityUsername] = useState("");
    const [securityPassword, setSecurityPassword] = useState("");

    // Resident data for walk-in visits
    const [residents, setResidents] = useState([]);
    const [loadingResidents, setLoadingResidents] = useState(false);

    // Visitors currently inside the estate
    const [insideVisits, setInsideVisits] = useState([]);
    const [loadingInside, setLoadingInside] = useState(isSecurity);
    const [processingInsideId, setProcessingInsideId] = useState(null);

    // Walk-ins waiting for resident approval
    const [pendingVisits, setPendingVisits] = useState([]);

    // Walk-in form
    const [showWalkInForm, setShowWalkInForm] = useState(false);
    const [visitorName, setVisitorName] = useState("");
    const [visitorPhone, setVisitorPhone] = useState("");
    const [selectedResidentId, setSelectedResidentId] = useState("");
    const [visitPurpose, setVisitPurpose] = useState("");
    const [creatingWalkIn, setCreatingWalkIn] = useState(false);
    const [activeResidentCall, setActiveResidentCall] = useState(null);
    const [savingCallOutcome, setSavingCallOutcome] = useState(false);

    // Access control
    const [accessCode, setAccessCode] = useState("");
    const [processingAccess, setProcessingAccess] = useState(false);
    const [checkInResult, setCheckInResult] = useState(null);

    // Common feedback
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ---------------------------------------------------------
    // LOAD RESIDENTS + VISITORS CURRENTLY INSIDE
    // ---------------------------------------------------------

    async function loadResidents() {
        try {
            setLoadingResidents(true);
            setLoadingInside(true);

            const [residentResponse, insideResponse, pendingResponse] =
                await Promise.all([
                    api.get("/resident/directory"),
                    api.get("/api/reports/currently-inside"),
                    api.get("/visit/pending"),
                ]);

            const residentData = getResponseData(residentResponse);
            const insideData = getResponseData(insideResponse);
            const pendingData = getResponseData(pendingResponse);

            setResidents(
                Array.isArray(residentData) ? residentData : []
            );
            setInsideVisits(
                Array.isArray(insideData) ? insideData : []
            );
            setPendingVisits(
                Array.isArray(pendingData) ? pendingData : []
            );
        } catch (err) {
            console.error("Failed to load residents:", err);
            setError(
                err.response?.data?.message ||
                "Could not load residents. Please refresh and try again."
            );
        } finally {
            setLoadingResidents(false);
            setLoadingInside(false);
        }
    }

    async function callResident(visit) {
        try {
            const response = await api.post(`/visit/${visit.id}/resident-call`);
            const phone = response.data?.data;
            setActiveResidentCall({ visitId: visit.id, resident: visit.resident?.fullName, phone });
            if (phone) window.location.assign(`tel:${phone}`);
        } catch (err) {
            const message = err.response?.data?.message || "Could not start the resident call.";
            setError(message);
            showError(message);
        }
    }

    async function recordCallOutcome(outcome) {
        if (!activeResidentCall) return;
        try {
            setSavingCallOutcome(true);
            await api.post(`/visit/${activeResidentCall.visitId}/resident-call-outcome`, null, { params: { outcome } });
            showSuccess("Call outcome recorded.");
            setActiveResidentCall(null);
        } catch (err) {
            const message = err.response?.data?.message || "Could not record the call outcome.";
            showError(message);
        } finally {
            setSavingCallOutcome(false);
        }
    }

    // ---------------------------------------------------------
    // ADMIN: LOAD SECURITY PERSONNEL
    // ---------------------------------------------------------

    async function loadSecurityPersonnel() {
        try {
            setLoadingSecurity(true);
            setError("");

            const response = await api.get("/security");
            const data = getResponseData(response);

            setSecurityPersonnel(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load security personnel:", err);
            setError(
                err.response?.data?.message ||
                "Failed to load security personnel."
            );
        } finally {
            setLoadingSecurity(false);
        }
    }

    useEffect(() => {
        let active = true;

        async function loadInitialData() {
            if (isAdmin) {
                try {
                    const response = await api.get("/security");
                    const data = getResponseData(response);

                    if (active) {
                        setSecurityPersonnel(Array.isArray(data) ? data : []);
                        setError("");
                    }
                } catch (err) {
                    console.error("Failed to load security personnel:", err);

                    if (active) {
                        setError(
                            err.response?.data?.message ||
                            "Failed to load security personnel."
                        );
                    }
                } finally {
                    if (active) {
                        setLoadingSecurity(false);
                    }
                }
            }

            if (isSecurity) {
                try {
                    const [residentResponse, insideResponse, pendingResponse] =
                        await Promise.all([
                            api.get("/resident/directory"),
                            api.get("/api/reports/currently-inside"),
                            api.get("/visit/pending"),
                        ]);

                    const residentData = getResponseData(residentResponse);
                    const insideData = getResponseData(insideResponse);
                    const pendingData = getResponseData(pendingResponse);

                    if (active) {
                        setResidents(
                            Array.isArray(residentData) ? residentData : []
                        );
                        setInsideVisits(
                            Array.isArray(insideData) ? insideData : []
                        );
                        setPendingVisits(
                            Array.isArray(pendingData) ? pendingData : []
                        );
                    }
                } catch (err) {
                    console.error("Failed to load residents:", err);

                    if (active) {
                        setError(
                            err.response?.data?.message ||
                            "Could not load residents. Please refresh and try again."
                        );
                    }
                } finally {
                    if (active) {
                        setLoadingInside(false);
                    }
                }
            }
        }

        loadInitialData();

        return () => {
            active = false;
        };
    }, [isAdmin, isSecurity]);

    // ---------------------------------------------------------
    // ADMIN: SECURITY PERSONNEL MODAL
    // ---------------------------------------------------------

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
        setSecurityUsername("");
        setSecurityPassword("");

        setShowSecurityModal(true);
    }

    function closeSecurityModal() {
        if (savingSecurity) return;

        setShowSecurityModal(false);
        resetSecurityForm();
    }

    async function handleSecuritySubmit(event) {
        event.preventDefault();

        if (securityPhone.trim() && !/^\d{11}$/.test(securityPhone.trim())) {
            showError("Phone number must contain exactly 11 digits.");
            setError("Phone number must contain exactly 11 digits.");
            return;
        }

        setError("");
        setSuccess("");

        if (
            !securityName.trim() ||
            !securityPhone.trim() ||
            !securityEmail.trim()
        ) {
            showError("Please complete all security personnel details.");
            setError("Please complete all security personnel details.");
            return;
        }

        if (!editingSecurityId) {
            if (!securityUsername.trim() || !securityPassword) {
                showError("Please enter a username and password.");
                setError("Please enter a username and password.");
                return;
            }

            if (securityPassword.length < 6) {
                showError("Password must be at least 6 characters.");
                setError("Password must be at least 6 characters.");
                return;
            }
        }

        try {
            setSavingSecurity(true);

            if (editingSecurityId) {
                await api.put(`/security/${editingSecurityId}`, {
                    name: securityName.trim(),
                    phoneNumber: securityPhone.trim(),
                    email: securityEmail.trim(),
                });

                setSuccess("Security personnel updated successfully.");
                showSuccess("Security personnel updated successfully.");
            } else {
                await api.post("/security", {
                    name: securityName.trim(),
                    phoneNumber: securityPhone.trim(),
                    email: securityEmail.trim(),
                    username: securityUsername.trim(),
                    password: securityPassword,
                });

                setSuccess("Security personnel created successfully.");
                showSuccess("Security personnel created successfully.");
            }

            setShowSecurityModal(false);
            resetSecurityForm();
            await loadSecurityPersonnel();
        } catch (err) {
            console.error("Failed to save security personnel:", err);

            const message =
                err.response?.data?.message ||
                "Failed to save security personnel.";

            showError(message);
            setError(message);
        } finally {
            setSavingSecurity(false);
        }
    }

    async function handleDeleteSecurity(person) {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${person.name || "this security personnel"}?`
        );

        if (!confirmed) return;

        try {
            setProcessingSecurityId(person.id);
            setError("");
            setSuccess("");

            await api.delete(`/security/${person.id}`);

            setSuccess("Security personnel deleted successfully.");
            showSuccess("Security personnel deleted successfully.");
            await loadSecurityPersonnel();
        } catch (err) {
            console.error("Failed to delete security personnel:", err);

            const message =
                err.response?.data?.message ||
                "Failed to delete security personnel.";

            showError(message);
            setError(message);
        } finally {
            setProcessingSecurityId(null);
        }
    }

    async function handleResetSecurityPassword(person) {
        const confirmed = window.confirm(
            `Reset the password for ${person.name || "this security officer"}? Their current password stops working immediately.`
        );

        if (!confirmed) return;

        try {
            setResettingSecurityId(person.id);

            const response = await api.post(
                `/security/${person.id}/reset-password`
            );

            const data = getResponseData(response);

            setResetSecurityResult({
                name: person.name || "Security officer",
                username: data?.username || "",
                password: data?.temporaryPassword || "",
            });

            showSuccess("Password reset. Hand over the new temporary password.");
        } catch (err) {
            console.error("Failed to reset security password:", err);

            showError(
                err.response?.data?.message ||
                "Failed to reset the password."
            );
        } finally {
            setResettingSecurityId(null);
        }
    }

    // ---------------------------------------------------------
    // SECURITY: WALK-IN VISIT
    // ---------------------------------------------------------

    function resetWalkInForm() {
        setVisitorName("");
        setVisitorPhone("");
        setSelectedResidentId("");
        setVisitPurpose("");
    }

    function openWalkInForm() {
        setError("");
        setSuccess("");
        resetWalkInForm();
        setShowWalkInForm(true);

        if (residents.length === 0 && !loadingResidents) {
            loadResidents();
        }
    }

    function closeWalkInForm() {
        if (creatingWalkIn) return;

        setShowWalkInForm(false);
        resetWalkInForm();
    }

    async function handleCreateWalkIn(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const name = visitorName.trim();
        const phone = visitorPhone.trim();
        const purpose = visitPurpose.trim();
        const residentId = selectedResidentId;

        if (!name || !phone || !residentId || !purpose) {
            showError(
                "Please enter the visitor's name, phone, resident and purpose."
            );
            setError(
                "Please enter the visitor's name, phone, resident and purpose."
            );
            return;
        }

        if (!/^\d{11}$/.test(phone)) {
            showError("Visitor phone number must contain exactly 11 digits.");
            setError("Visitor phone number must contain exactly 11 digits.");
            return;
        }

        try {
            setCreatingWalkIn(true);

            // The backend creates (or reuses) the visitor for this
            // resident and then creates the visit, so a single call
            // is enough. Registering the visitor separately would
            // create a duplicate visitor record.
            const response = await api.post(
                "/visit",
                {
                    fullName: name,
                    phoneNumber: phone,
                    purpose,
                },
                {
                    params: {
                        residentId: Number(residentId),
                        purpose,
                    },
                }
            );

            const visit = getResponseData(response);

            setShowWalkInForm(false);
            resetWalkInForm();

            await loadResidents();

            const code = visit?.accessCode;

            const successMessage =
                `Walk-In Visit created for ${visit?.resident?.fullName || "the resident"}. ` +
                "The visitor cannot enter until the resident approves the visit " +
                "in their dashboard." +
                (code ? ` Access code: ${code}.` : "");

            setSuccess(successMessage);
            showSuccess(successMessage);
        } catch (err) {
            console.error("Failed to create walk-in visit:", err);

            const message =
                err.response?.data?.message ||
                "Failed to create the Walk-In Visit. Please try again.";

            showError(message);
            setError(message);
        } finally {
            setCreatingWalkIn(false);
        }
    }

    // ---------------------------------------------------------
    // SECURITY: CHECK-IN
    // ---------------------------------------------------------

    async function handleCheckIn() {
        const code = accessCode.trim();

        if (!code) {
            showError("Please enter an access code.");
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

            const visit = getResponseData(response);

            setAccessCode("");
            setCheckInResult(visit);
            setSuccess("Visitor checked in successfully.");
            showSuccess("Visitor checked in successfully.");

            await loadResidents();
        } catch (err) {
            console.error("Check-in failed:", err);

            const message =
                err.response?.data?.message ||
                "Failed to check in visitor.";

            showError(message);
            setError(message);
        } finally {
            setProcessingAccess(false);
        }
    }

// ---------------------------------------------------------
// SECURITY: CHECK-OUT
// ---------------------------------------------------------

async function handleCheckOut(codeOverride) {
    const code = (codeOverride || accessCode).trim();

    if (!code) {
        showError("Please enter an access code.");
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
        setCheckInResult(null);
        setSuccess("Visitor checked out successfully.");
        showSuccess("Visitor checked out successfully.");

        await loadResidents();
    } catch (err) {
        console.error("Check-out failed:", err);

        const message =
            err.response?.data?.message ||
            "Failed to check out visitor.";

        showError(message);
        setError(message);
    } finally {
        setProcessingAccess(false);
        setProcessingInsideId(null);
    }
}

// ---------------------------------------------------------
// SECURITY UI
// ---------------------------------------------------------

if (isSecurity) {
    return (
        <div className="security-page">
            <style>{securityStyles}</style>

            <div className="security-header">
                <div className="security-title-area">
                    <h1>Security</h1>
                    <p>
                        Register walk-in visitors and manage estate access.
                    </p>
                </div>

                <div className="security-actions">
                    <button
                        type="button"
                        className="security-refresh-button"
                        onClick={() => {
                            setError("");
                            setSuccess("");
                            setAccessCode("");
                            setCheckInResult(null);
                            loadResidents();
                        }}
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>

                    <button
                        type="button"
                        className="security-primary-button"
                        onClick={openWalkInForm}
                    >
                        <Plus size={17} />
                        Create Walk-In Visit
                    </button>

                    {isAdmin && (
                        <button
                            type="button"
                            className="security-primary-button"
                            onClick={() => setShowBulkSecurityModal(true)}
                        >
                            <Plus size={17} />
                            Bulk Create Security
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="security-alert error">
                    <Ban size={18} />
                    <div className="security-alert-content">
                        <strong>Something went wrong</strong>
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
                            <h2>Visitor checked in successfully</h2>
                            <p>
                                The visitor has been checked into the estate.
                            </p>
                        </div>
                    </div>

                    <div className="security-checkin-details">
                        <Detail label="Visitor" value={checkInResult.visitor?.fullName} />
                        <Detail label="Phone" value={checkInResult.visitor?.phoneNumber} />
                        <Detail label="Resident" value={checkInResult.resident?.fullName} />
                        <Detail label="House Number" value={checkInResult.resident?.houseNumber} />
                        <Detail label="Purpose" value={checkInResult.purpose} />
                        <Detail label="Access Code" value={checkInResult.accessCode} />
                        <Detail
                            label="Check-In Time"
                            value={
                                checkInResult.checkInTime
                                    ? new Date(checkInResult.checkInTime).toLocaleString()
                                    : "—"
                            }
                        />
                        <Detail label="Status" value={checkInResult.status || "CHECKED_IN"} />
                    </div>
                </section>
            )}

            <div className="security-stat-grid">
                <SecurityStatCard
                    icon={<Shield size={21} />}
                    iconClass="blue"
                    label="Visitors Inside"
                    value={insideVisits.length}
                    description="Currently on the estate"
                    loading={loadingInside}
                />
                <SecurityStatCard
                    icon={<Users size={21} />}
                    iconClass="green"
                    label="Pending Approvals"
                    value={pendingVisits.length}
                    description="Walk-ins waiting for residents"
                />
                <SecurityStatCard
                    icon={<Clock3 size={21} />}
                    iconClass="orange"
                    label="Check-In / Out"
                    value="Available"
                    description="Manage estate entry and exit"
                />
            </div>

            <section className="security-panel">
                <div className="security-panel-header">
                    <div>
                        <h2>Visitor Access</h2>
                        <p>
                            Verify an approved visit using its access code.
                        </p>
                    </div>
                </div>

                <div className="security-access-content">
                    <div className="security-access-icon">
                        <KeyRound size={25} />
                    </div>

                    <div className="security-access-main">
                        <label>Visitor Access Code</label>
                        <input
                            value={accessCode}
                            onChange={(event) => setAccessCode(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") handleCheckIn();
                            }}
                            placeholder="Enter access code"
                            disabled={processingAccess}
                        />
                        <span>
                                The visitor must have an approved visit before check-in.
                            </span>
                    </div>

                    <div className="security-access-actions">
                        <button
                            type="button"
                            className="security-action-button checkin"
                            onClick={handleCheckIn}
                            disabled={processingAccess}
                        >
                            {processingAccess
                                ? <RefreshCw size={15} className="security-small-spinner" />
                                : <LogIn size={15} />}
                            Check In
                        </button>

                        <button
                            type="button"
                            className="security-action-button checkout"
                            onClick={() => handleCheckOut()}
                            disabled={processingAccess}
                        >
                            {processingAccess
                                ? <RefreshCw size={15} className="security-small-spinner" />
                                : <LogOut size={15} />}
                            Check Out
                        </button>
                    </div>
                </div>
            </section>

            <PassVerificationPanel />

            <section className="security-panel security-pending-panel">
                <div className="security-panel-header">
                    <div>
                        <h2>Pending Walk-in Approval</h2>
                        <p>
                            Walk-ins waiting for the resident's approval.
                            Only the resident (or an administrator) can
                            approve or reject a visit — check the visitor
                            in once it is approved.
                        </p>
                    </div>
                </div>

                {loadingInside ? (
                    <div className="security-loading">
                        <div className="security-spinner" />
                        <span>Loading pending walk-ins...</span>
                    </div>
                ) : pendingVisits.length === 0 ? (
                    <div className="security-empty">
                        <div className="security-empty-icon">
                            <UserRound size={27} />
                        </div>
                        <strong>No pending walk-ins</strong>
                        <span>
                            New walk-ins appear here until the resident
                            approves them or you deny them.
                        </span>
                    </div>
                ) : (
                    <div className="security-pending-grid">
                            {pendingVisits.map((visit) => {
                                return (
                                    <article key={visit.id} className="security-pending-card">
                                        <div className="security-pending-fields">
                                            <div className="security-pending-visitor">
                                                <span className="security-pending-label">VISITOR</span>
                                                <div className="security-person">
                                                    <div className="security-person-icon">
                                                    <UserRound size={17} />
                                                </div>
                                                <div className="security-person-details">
                                                    <span className="security-person-name" title={visit.visitor?.fullName || "Unknown"}>
                                                        {visit.visitor?.fullName || "Unknown"}
                                                    </span>
                                                    <span className="security-person-subtitle" title={visit.visitor?.phoneNumber || "—"}>
                                                        {visit.visitor?.phoneNumber || "—"}
                                                    </span>
                                                </div>
                                            </div>
                                            </div>
                                            <div className="security-pending-field">
                                                <span className="security-pending-label">RESIDENT</span>
                                                <span className="security-pending-value" title={visit.resident?.fullName || "—"}>
                                                    {visit.resident?.fullName || "—"}
                                                </span>
                                            </div>
                                            <div className="security-pending-field">
                                                <span className="security-pending-label">HOUSE</span>
                                                <span className="security-pending-value" title={visit.resident?.houseNumber || "—"}>
                                                    {visit.resident?.houseNumber || "—"}
                                                </span>
                                            </div>
                                            <div className="security-pending-field security-pending-wide">
                                                <span className="security-pending-label">PURPOSE</span>
                                                <span className="security-pending-value" title={visit.purpose || "—"}>
                                                    {visit.purpose || "—"}
                                                </span>
                                            </div>
                                            <div className="security-pending-field">
                                                <span className="security-pending-label">ACCESS CODE</span>
                                                <span className="security-role-badge">
                                                {visit.accessCode || "—"}
                                                </span>
                                            </div>
                                            <div className="security-pending-field">
                                                <span className="security-pending-label">STATUS</span>
                                                <span className="security-role-badge">Awaiting resident</span>
                                            </div>
                                            <div className="security-pending-action security-pending-wide">
                                                <button type="button" className="security-table-button edit" onClick={() => callResident(visit)}>
                                                    <Phone size={14} /> Call resident
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                    </div>
                )}
            </section>

            <section className="security-panel security-inside-panel">
                <div className="security-panel-header">
                    <div>
                        <h2>Visitors Currently Inside</h2>
                        <p>
                            Check a visitor out with the access code shown below.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="security-refresh-button"
                        onClick={loadResidents}
                        disabled={loadingInside}
                        title="Refresh visitors inside"
                    >
                        <RefreshCw
                            size={17}
                            className={loadingInside ? "security-small-spinner" : ""}
                        />
                    </button>
                </div>

                {loadingInside ? (
                    <div className="security-loading">
                        <div className="security-spinner" />
                        <span>Loading visitors inside...</span>
                    </div>
                ) : insideVisits.length === 0 ? (
                    <div className="security-empty">
                        <div className="security-empty-icon">
                            <Shield size={27} />
                        </div>
                        <strong>No visitors inside</strong>
                        <span>
                            Everyone who checked in has been checked out.
                        </span>
                    </div>
                ) : (
                    <div className="security-inside-grid">
                        {insideVisits.map((visit) => {
                            const isProcessing =
                                processingInsideId === visit.id;

                            return (
                                <article key={visit.id} className="security-inside-card">
                                    <div className="security-inside-fields">
                                        <div className="security-inside-visitor">
                                            <span className="security-inside-label">VISITOR</span>
                                            <div className="security-person">
                                                <div className="security-person-icon">
                                                    <UserRound size={17} />
                                                </div>
                                                <div className="security-person-details">
                                                    <span
                                                        className="security-person-name"
                                                        title={visit.visitor?.fullName || "Unknown"}
                                                    >
                                                        {visit.visitor?.fullName || "Unknown"}
                                                    </span>
                                                    <span
                                                        className="security-person-subtitle"
                                                        title={visit.visitor?.phoneNumber || "—"}
                                                    >
                                                        {visit.visitor?.phoneNumber || "—"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="security-inside-field">
                                            <span className="security-inside-label">RESIDENT</span>
                                            <span
                                                className="security-inside-value"
                                                title={visit.resident?.fullName || "—"}
                                            >
                                                {visit.resident?.fullName || "—"}
                                            </span>
                                        </div>

                                        <div className="security-inside-field">
                                            <span className="security-inside-label">HOUSE</span>
                                            <span
                                                className="security-inside-value"
                                                title={visit.resident?.houseNumber || "—"}
                                            >
                                                {visit.resident?.houseNumber || "—"}
                                            </span>
                                        </div>

                                        <div className="security-inside-field">
                                            <span className="security-inside-label">ACCESS CODE</span>
                                            <span
                                                className="security-inside-value security-inside-access-code"
                                                title={visit.accessCode || "—"}
                                            >
                                                {visit.accessCode || "—"}
                                            </span>
                                        </div>

                                        <div className="security-inside-field">
                                            <span className="security-inside-label">CHECK-IN TIME</span>
                                            <span className="security-inside-value">
                                                {visit.checkInTime
                                                    ? new Date(visit.checkInTime).toLocaleTimeString()
                                                    : "—"}
                                            </span>
                                        </div>

                                        <div className="security-inside-action">
                                            <button
                                                type="button"
                                                className="security-table-button delete"
                                                disabled={isProcessing}
                                                onClick={() => {
                                                    setProcessingInsideId(visit.id);
                                                    handleCheckOut(visit.accessCode);
                                                }}
                                            >
                                                {isProcessing
                                                    ? <RefreshCw size={14} className="security-small-spinner" />
                                                    : <LogOut size={14} />}
                                                Check Out
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {isAdmin && (
                <BulkImportModal
                    key={showBulkSecurityModal ? "bulk-open" : "bulk-closed"}
                    open={showBulkSecurityModal}
                    onClose={() => setShowBulkSecurityModal(false)}
                    onCreated={() => loadSecurityPersonnel()}
                    kind="security"
                    title="Import Security Personnel"
                    subtitle="Upload your CSV or Excel sheet. Columns are mapped next, temporary passwords are generated, and each account must be changed at first login."
                    endpoint="/security/bulk"
                />
            )}

            <TempPasswordModal
                open={Boolean(resetSecurityResult)}
                title="Security password reset"
                personName={resetSecurityResult?.name}
                username={resetSecurityResult?.username}
                password={resetSecurityResult?.password}
                onClose={() => setResetSecurityResult(null)}
            />

            {showWalkInForm && (
                <div
                    className="security-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeWalkInForm();
                        }
                    }}
                >
                    <section className="security-modal">
                        <div className="security-modal-header">
                            <div>
                                <h2>Create Walk-In Visit</h2>
                                <p>
                                    Register the visitor and request resident approval.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="security-close-button"
                                onClick={closeWalkInForm}
                                disabled={creatingWalkIn}
                                aria-label="Close"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleCreateWalkIn}
                            className="security-modal-form"
                        >
                            <div className="security-form-group">
                                <label>Visitor Full Name</label>
                                <input
                                    value={visitorName}
                                    onChange={(event) => setVisitorName(event.target.value)}
                                    placeholder="Enter visitor's full name"
                                    disabled={creatingWalkIn}
                                    required
                                />
                            </div>

                            <div className="security-form-group">
                                <label>Visitor Phone Number</label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={11}
                                    value={visitorPhone}
                                    onChange={(event) => setVisitorPhone(event.target.value)}
                                    placeholder="Enter visitor's phone number"
                                    disabled={creatingWalkIn}
                                    required
                                />
                            </div>

                            <div className="security-form-group">
                                <label>Resident to Visit</label>
                                <select
                                    value={selectedResidentId}
                                    onChange={(event) => setSelectedResidentId(event.target.value)}
                                    disabled={creatingWalkIn || loadingResidents}
                                    required
                                >
                                    <option value="">
                                        {loadingResidents
                                            ? "Loading residents..."
                                            : "Select a resident"}
                                    </option>

                                    {residents.map((resident) => (
                                        <option key={resident.id} value={resident.id}>
                                            {resident.fullName}
                                            {resident.houseNumber
                                                ? ` — House ${resident.houseNumber}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>

                                {!loadingResidents && residents.length === 0 && (
                                    <span className="security-form-hint">
                                            No residents were found. Refresh the page or check resident access.
                                        </span>
                                )}
                            </div>

                            <div className="security-form-group">
                                <label>Purpose of Visit</label>
                                <input
                                    value={visitPurpose}
                                    onChange={(event) => setVisitPurpose(event.target.value)}
                                    placeholder="e.g. Delivery, meeting, family visit"
                                    disabled={creatingWalkIn}
                                    required
                                />
                            </div>

                            <div className="security-walkin-note">
                                <Clock3 size={17} />
                                <span>
                                        The walk-in visit will be created as PENDING.
                                        The resident must approve it before Security can check the visitor in.
                                    </span>
                            </div>

                            <div className="security-modal-actions">
                                <button
                                    type="button"
                                    className="security-secondary-button"
                                    onClick={closeWalkInForm}
                                    disabled={creatingWalkIn}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="security-primary-button"
                                    disabled={creatingWalkIn || loadingResidents || residents.length === 0}
                                >
                                    {creatingWalkIn
                                        ? <>
                                            <RefreshCw size={15} className="security-small-spinner" />
                                            Creating...
                                        </>
                                        : <>
                                            <ClipboardCheck size={15} />
                                            Create Walk-In Visit
                                        </>}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
            {activeResidentCall && (
                <div className="security-modal-overlay" role="presentation">
                    <section className="security-modal" role="dialog" aria-modal="true" aria-labelledby="call-outcome-title">
                        <div className="security-modal-header">
                            <div>
                                <h2 id="call-outcome-title">Log call outcome</h2>
                                <p>Call to {activeResidentCall.resident || "resident"} started{activeResidentCall.phone ? ` (${activeResidentCall.phone})` : ""}.</p>
                            </div>
                            <button type="button" aria-label="Close" onClick={() => setActiveResidentCall(null)}><X size={18} /></button>
                        </div>
                        <div className="security-modal-actions">
                            <button type="button" className="security-secondary-button" disabled={savingCallOutcome} onClick={() => recordCallOutcome("ANSWERED")}>Answered</button>
                            <button type="button" className="security-secondary-button" disabled={savingCallOutcome} onClick={() => recordCallOutcome("NO_ANSWER")}>No answer</button>
                            <button type="button" className="security-secondary-button" disabled={savingCallOutcome} onClick={() => recordCallOutcome("UNABLE_TO_CALL")}>Unable to call</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------
// ADMIN UI — PRESERVED
// ---------------------------------------------------------

return (
    <div className="security-page">
        <style>{securityStyles}</style>

        <div className="security-header">
            <div className="security-title-area">
                <h1>Security Personnel</h1>
                <p>Manage security personnel and their access accounts.</p>
            </div>

            <div className="security-actions">
                <button
                    type="button"
                    className="security-refresh-button"
                    onClick={loadSecurityPersonnel}
                    disabled={loadingSecurity}
                    title="Refresh security personnel"
                >
                    <RefreshCw
                        size={18}
                        className={loadingSecurity ? "security-small-spinner" : ""}
                    />
                </button>

                <button
                    type="button"
                    className="security-primary-button"
                    onClick={openCreateSecurityModal}
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
                    <strong>Something went wrong</strong>
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
                value={securityPersonnel.length}
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

        <section className="security-panel security-personnel-panel">
            <div className="security-panel-header">
                <div>
                    <h2>All Security Personnel</h2>
                    <p>Security staff registered in EstateFlow.</p>
                </div>
            </div>

            {loadingSecurity ? (
                <div className="security-loading">
                    <div className="security-spinner" />
                    <span>Loading security personnel...</span>
                </div>
            ) : securityPersonnel.length === 0 ? (
                <div className="security-empty">
                    <div className="security-empty-icon">
                        <Shield size={27} />
                    </div>
                    <strong>No security personnel found</strong>
                    <span>Add your first security personnel to get started.</span>
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
                        {securityPersonnel.map((person) => {
                            const isProcessing = processingSecurityId === person.id;

                            return (
                                <tr key={person.id}>
                                    <td>
                                        <span className="security-id">#{person.id}</span>
                                    </td>
                                    <td>
                                        <div className="security-person">
                                            <div className="security-person-icon">
                                                <UserRound size={17} />
                                            </div>
                                            <div className="security-person-details">
                                                        <span className="security-person-name">
                                                            {person.name || "Unknown"}
                                                        </span>
                                                <span className="security-person-subtitle">
                                                            Security Personnel
                                                        </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="security-contact">
                                            <Phone size={14} />
                                            <span>{person.phoneNumber || "—"}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="security-contact">
                                            <Mail size={14} />
                                            <span>{person.email || "—"}</span>
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
                                                type="button"
                                                className="security-table-button edit"
                                                onClick={() => handleResetSecurityPassword(person)}
                                                disabled={isProcessing || resettingSecurityId === person.id}
                                            >
                                                {resettingSecurityId === person.id
                                                    ? <RefreshCw size={14} className="security-small-spinner" />
                                                    : <KeyRound size={14} />}
                                                Reset
                                            </button>
                                            <button
                                                type="button"
                                                className="security-table-button edit"
                                                onClick={() => openEditSecurityModal(person)}
                                                disabled={isProcessing}
                                            >
                                                <Pencil size={14} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="security-table-button delete"
                                                onClick={() => handleDeleteSecurity(person)}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing
                                                    ? <RefreshCw size={14} className="security-small-spinner" />
                                                    : <Trash2 size={14} />}
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>

        {showSecurityModal && (
            <div
                className="security-modal-overlay"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
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
                            type="button"
                            className="security-close-button"
                            onClick={closeSecurityModal}
                            disabled={savingSecurity}
                        >
                            <X size={19} />
                        </button>
                    </div>

                    <form onSubmit={handleSecuritySubmit} className="security-modal-form">
                        <div className="security-form-group">
                            <label>Name</label>
                            <input
                                value={securityName}
                                onChange={(event) => setSecurityName(event.target.value)}
                                placeholder="Enter full name"
                                disabled={savingSecurity}
                                required
                            />
                        </div>

                        <div className="security-form-row">
                            <div className="security-form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={11}
                                    value={securityPhone}
                                    onChange={(event) => setSecurityPhone(event.target.value)}
                                    placeholder="Enter phone number"
                                    disabled={savingSecurity}
                                    required
                                />
                            </div>
                            <div className="security-form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={securityEmail}
                                    onChange={(event) => setSecurityEmail(event.target.value)}
                                    placeholder="Enter email"
                                    disabled={savingSecurity}
                                    required
                                />
                            </div>
                        </div>

                        {!editingSecurityId && (
                            <>
                                <div className="security-form-group">
                                    <label>Username</label>
                                    <input
                                        value={securityUsername}
                                        onChange={(event) => setSecurityUsername(event.target.value)}
                                        placeholder="Create username"
                                        disabled={savingSecurity}
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                                <div className="security-form-group">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        value={securityPassword}
                                        onChange={(event) => setSecurityPassword(event.target.value)}
                                        placeholder="Create password"
                                        disabled={savingSecurity}
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="security-modal-actions">
                            <button
                                type="button"
                                className="security-secondary-button"
                                onClick={closeSecurityModal}
                                disabled={savingSecurity}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="security-primary-button"
                                disabled={savingSecurity}
                            >
                                {savingSecurity
                                    ? <>
                                        <RefreshCw size={15} className="security-small-spinner" />
                                        Saving...
                                    </>
                                    : <>
                                        <Check size={15} />
                                        {editingSecurityId ? "Save Changes" : "Add Security"}
                                    </>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
);
}

function Detail({ label, value }) {
    return (
        <div className="security-checkin-detail">
            <span>{label}</span>
            <strong>{value || "—"}</strong>
        </div>
    );
}

function SecurityStatCard({ icon, iconClass, label, value, description, loading }) {
    return (
        <div className="security-stat-card">
            <div className={`security-stat-icon ${iconClass}`}>{icon}</div>
            <span className="security-stat-label">{label}</span>
            <strong className="security-stat-value">
                {loading ? "—" : value}
            </strong>
            <p className="security-stat-description">{description}</p>
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
}
.security-refresh-button:hover:not(:disabled) { background: #f8fafc; }
.security-primary-button {
    min-height: 44px;
    border: none;
    border-radius: 12px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    background: linear-gradient(135deg, #2563eb, #315fe8);
    color: white;
    font-weight: 700;
    cursor: pointer;
}
.security-primary-button:disabled { opacity: .65; cursor: not-allowed; }
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
.security-alert.error { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }
.security-alert.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
.security-alert-content { display: flex; flex-direction: column; gap: 3px; }
/* Offline pass verification */
.security-pass-panel .security-panel-header { flex-wrap: wrap; gap: 12px; }
.security-pass-key-button {
    min-height: 38px; padding: 0 13px; border-radius: 10px; border: 1px solid #dce4f0;
    background: #fff; color: #52627d; display: inline-flex; align-items: center; gap: 7px;
    font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer;
}
.security-pass-key-button:hover:not(:disabled) { background: #f8fafc; }
.security-pass-key-button:disabled { opacity: .65; cursor: not-allowed; }
.security-pass-form { display: grid; gap: 14px; padding: 20px 25px 24px; }
.security-pass-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.security-pass-scan { min-width: 190px; }
.security-pass-hint { flex: 1; min-width: 180px; color: #8a99b0; font-size: 12px; line-height: 1.5; }
.security-pass-video { width: 100%; max-height: 260px; object-fit: cover; border-radius: 12px; background: #0f172a; }
.security-pass-manual { border: 1px solid #e6ecf4; border-radius: 12px; background: #f8fafc; overflow: hidden; }
.security-pass-manual summary {
    padding: 12px 15px; color: #52627d; font-size: 12px; font-weight: 700;
    cursor: pointer; list-style: none;
}
.security-pass-manual summary::-webkit-details-marker { display: none; }
.security-pass-manual summary::after { content: " ▾"; color: #95a2b7; }
.security-pass-manual[open] summary { border-bottom: 1px solid #e6ecf4; }
.security-pass-label {
    display: block; padding: 12px 15px 0; color: #64748b;
    font-size: 11px; font-weight: 700; letter-spacing: .06em;
}
.security-pass-textarea {
    width: 100%; box-sizing: border-box; min-height: 116px; resize: vertical;
    padding: 9px 15px 14px; border: none; outline: none; background: transparent;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px; line-height: 1.55; color: #253149;
}
.security-pass-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.security-pass-status { flex: 1; min-width: 180px; color: #8a99b0; font-size: 12px; font-weight: 600; }
.security-pass-result {
    display: flex; flex-direction: column; gap: 3px;
    padding: 13px 16px; border-radius: 12px; font-size: 13px; font-weight: 600;
}
.security-pass-result.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
.security-pass-result.error { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }
.security-pass-result span { font-weight: 500; }
.security-checkin-result {
    margin-bottom: 22px;
    background: white;
    border: 1px solid #bbf7d0;
    border-radius: 20px;
    overflow: hidden;
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
.security-checkin-result-header h2 { margin: 0; color: #166534; font-size: 18px; }
.security-checkin-result-header p { margin: 5px 0 0; color: #4d7c5b; font-size: 13px; }
.security-checkin-details { display: grid; grid-template-columns: repeat(2, 1fr); }
.security-checkin-detail { min-width: 0; padding: 17px 22px; border-bottom: 1px solid #eef2f7; }
.security-checkin-detail:nth-child(odd) { border-right: 1px solid #eef2f7; }
.security-checkin-detail span {
    display: block; margin-bottom: 5px; color: #8a99b0; font-size: 11px;
    font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
}
.security-checkin-detail strong { display: block; color: #26334a; font-size: 14px; overflow-wrap: anywhere; }
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
    box-shadow: 0 8px 25px rgba(30, 50, 85, .035);
}
.security-stat-icon {
    width: 45px; height: 45px; border-radius: 13px;
    display: flex; align-items: center; justify-content: center; margin-bottom: 17px;
}
.security-stat-icon.blue { background: #edf4ff; color: #2563eb; }
.security-stat-icon.orange { background: #fff7e8; color: #d97706; }
.security-stat-icon.green { background: #ecfdf5; color: #059669; }
.security-stat-icon.purple { background: #f3efff; color: #7c3aed; }
.security-stat-label { display: block; color: #71809a; font-size: 13px; font-weight: 600; margin-bottom: 5px; }
.security-stat-value { display: block; font-size: 25px; color: #172033; }
.security-stat-description { margin: 8px 0 0; color: #95a2b7; font-size: 12px; }
.security-panel {
    background: white; border: 1px solid #e3e9f2; border-radius: 20px;
    overflow: hidden; box-shadow: 0 8px 25px rgba(30, 50, 85, .035);
}
.security-panel-header {
    padding: 23px 25px; display: flex; align-items: center;
    justify-content: space-between; border-bottom: 1px solid #edf1f6;
}
.security-panel-header h2 { margin: 0; color: #172033; font-size: 19px; }
.security-panel-header p { margin: 5px 0 0; color: #8a99b0; font-size: 13px; }
.security-inside-panel { margin-top: 22px; }
.security-inside-panel .security-panel-header { gap: 16px; }
.security-inside-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
    gap: 12px; min-width: 0; padding: 18px 22px 22px;
}
.security-inside-card {
    min-width: 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px;
    background: #fff; box-shadow: 0 1px 3px rgba(15, 23, 42, .06);
}
.security-inside-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.security-inside-visitor, .security-inside-action { grid-column: 1 / -1; min-width: 0; }
.security-inside-field { min-width: 0; }
.security-inside-label {
    display: block; margin-bottom: 5px; color: #64748b; font-size: 11px;
    font-weight: 700; letter-spacing: .06em;
}
.security-inside-value {
    display: block; min-width: 0; overflow: hidden; color: #0f172a;
    font-weight: 600; text-overflow: ellipsis; white-space: nowrap;
}
.security-inside-access-code { font-weight: 700; font-variant-numeric: tabular-nums; }
.security-inside-action { padding-top: 2px; }
.security-inside-action .security-table-button,
.security-pending-action .security-table-button { width: 100%; height: 40px; }
.security-access-content { padding: 26px; display: flex; align-items: center; gap: 18px; }
.security-access-icon {
    width: 52px; height: 52px; border-radius: 14px; background: #edf4ff; color: #2563eb;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.security-access-main { flex: 1; min-width: 0; }
.security-access-main label { display: block; margin-bottom: 7px; color: #344159; font-size: 12px; font-weight: 700; }
.security-access-main input, .security-form-group input, .security-form-group select {
    width: 100%; height: 46px; box-sizing: border-box; border: 1px solid #dce4ef;
    border-radius: 10px; outline: none; padding: 0 13px; color: #253149; font-size: 14px; background: white;
}
.security-access-main input:focus, .security-form-group input:focus, .security-form-group select:focus {
    border-color: #5b8def; box-shadow: 0 0 0 4px rgba(37, 99, 235, .08);
}
.security-access-main > span, .security-form-hint { display: block; margin-top: 7px; color: #95a2b7; font-size: 12px; }
.security-access-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; padding-top: 20px; }
.security-action-button {
    height: 40px; border-radius: 9px; padding: 0 12px; display: inline-flex;
    align-items: center; justify-content: center; gap: 6px; font-size: 11px; font-weight: 800;
    white-space: nowrap; cursor: pointer;
}
.security-action-button:disabled { opacity: .55; cursor: not-allowed; }
.security-action-button.checkin { border: 1px solid #bfdbfe; background: #eff6ff; color: #2563eb; }
.security-action-button.checkout { border: 1px solid #ddd6fe; background: #f5f3ff; color: #7c3aed; }
.security-modal-overlay {
    position: fixed; inset: 0; z-index: 1000; background: rgba(15, 23, 42, .48);
    backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px;
}
.security-modal {
    width: 100%; max-width: 540px; max-height: calc(100vh - 40px); overflow-y: auto;
    background: white; border-radius: 22px; box-shadow: 0 30px 80px rgba(15, 23, 42, .25);
}
.security-modal-header {
    padding: 23px 25px; border-bottom: 1px solid #edf1f6;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.security-modal-header h2 { margin: 0; font-size: 21px; color: #172033; }
.security-modal-header p { margin: 5px 0 0; font-size: 12px; color: #8a99b0; }
.security-close-button {
    width: 36px; height: 36px; border: none; border-radius: 9px; background: #f4f6f9;
    color: #687790; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.security-modal-form { padding: 24px 25px 25px; }
.security-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.security-form-group { margin-bottom: 17px; }
.security-form-group label { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 700; color: #344159; }
.security-form-group input:disabled, .security-form-group select:disabled { background: #f8fafc; cursor: not-allowed; }
.security-walkin-note {
    display: flex; align-items: flex-start; gap: 10px; padding: 13px;
    border: 1px solid #fde68a; border-radius: 10px; background: #fffbeb;
    color: #92400e; font-size: 12px; line-height: 1.55;
}
.security-walkin-note svg { flex-shrink: 0; }
.security-modal-actions {
    display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px;
    margin-top: 23px; padding-top: 18px; border-top: 1px solid #edf1f6;
}
.security-secondary-button {
    min-height: 44px; padding: 0 17px; border-radius: 10px;
    border: 1px solid #dce4ef; background: white; color: #52627d; font-weight: 700; cursor: pointer;
}
.security-table-scroll { width: 100%; overflow-x: auto; }
.security-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
.security-table th {
    height: 54px; padding: 0 18px; background: #f8fafc; border-bottom: 1px solid #e7edf4;
    text-align: left; color: #7d8ca4; font-size: 11px; font-weight: 800; letter-spacing: .65px; text-transform: uppercase;
}
.security-table td { height: 78px; padding: 13px 18px; border-bottom: 1px solid #eef2f7; color: #53627b; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/*
 * Column widths are per table, in percentages, so every
 * panel fits its container without horizontal scrolling.
 * The admin table keeps pixel widths inside its own scope.
 */
.security-personnel-panel .security-table { min-width: 1000px; }
.security-personnel-panel .security-table th:nth-child(1),
.security-personnel-panel .security-table td:nth-child(1) { width: 65px; }
.security-personnel-panel .security-table th:nth-child(2),
.security-personnel-panel .security-table td:nth-child(2) { width: 235px; }
.security-personnel-panel .security-table th:nth-child(3),
.security-personnel-panel .security-table td:nth-child(3) { width: 170px; }
.security-personnel-panel .security-table th:nth-child(4),
.security-personnel-panel .security-table td:nth-child(4) { width: 235px; }
.security-personnel-panel .security-table th:nth-child(5),
.security-personnel-panel .security-table td:nth-child(5) { width: 150px; }
.security-personnel-panel .security-table th:nth-child(6),
.security-personnel-panel .security-table td:nth-child(6) { width: 220px; }
.security-pending-panel { margin-top: 22px; }
.security-pending-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
    gap: 12px; min-width: 0; padding: 18px 22px 22px;
}
.security-pending-card {
    min-width: 0; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px;
    background: #fff; box-shadow: 0 1px 3px rgba(15, 23, 42, .06);
}
.security-pending-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.security-pending-visitor, .security-pending-wide { grid-column: 1 / -1; min-width: 0; }
.security-pending-field { min-width: 0; }
.security-pending-label {
    display: block; margin-bottom: 5px; color: #64748b; font-size: 11px;
    font-weight: 700; letter-spacing: .06em;
}
.security-pending-value {
    display: block; min-width: 0; overflow: hidden; color: #0f172a;
    font-weight: 600; text-overflow: ellipsis; white-space: nowrap;
}
.security-pending-field .security-role-badge { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.security-pending-action { padding-top: 2px; }
.security-id { color: #8795aa; font-weight: 700; }
.security-person { display: flex; align-items: center; gap: 10px; min-width: 0; }
.security-person-icon {
    width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; background: #eef4ff; color: #3b6fd8;
}
.security-person-details { flex: 1; min-width: 0; }
.security-person-name {
    display: block; color: #26334a; font-size: 13px; font-weight: 700;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.security-person-subtitle {
    display: block; margin-top: 3px; color: #99a5b7; font-size: 11px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.security-contact { display: flex; align-items: center; gap: 7px; min-width: 0; color: #53627b; }
.security-role-badge {
    display: inline-flex; align-items: center; min-height: 30px; padding: 0 10px;
    border-radius: 999px; background: #edf4ff; color: #2563eb; font-size: 11px; font-weight: 800;
}
.security-actions-row { display: flex; align-items: center; gap: 7px; }
.security-table-button {
    height: 34px; border-radius: 9px; padding: 0 10px; display: inline-flex; align-items: center;
    justify-content: center; gap: 6px; font-size: 11px; font-weight: 800; cursor: pointer;
}
.security-table-button:disabled { opacity: .55; cursor: not-allowed; }
.security-table-button.edit { border: 1px solid #bfdbfe; background: #eff6ff; color: #2563eb; }
.security-table-button.delete { border: 1px solid #fecaca; background: #fff7f7; color: #dc2626; }
.security-loading, .security-empty {
    min-height: 260px; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 13px; color: #8796ad; font-size: 13px; text-align: center;
}
.security-empty { padding: 40px 20px; }
.security-empty strong { color: #253149; font-size: 16px; }
.security-empty-icon {
    width: 64px; height: 64px; border-radius: 19px; display: flex; align-items: center;
    justify-content: center; background: #f0f5ff; color: #6c8fdc;
}
.security-spinner {
    width: 28px; height: 28px; border: 3px solid #e5ebf3;
    border-top-color: #2563eb; border-radius: 50%; animation: securitySpin .75s linear infinite;
}
.security-small-spinner { animation: securitySpin .75s linear infinite; }
@keyframes securitySpin { to { transform: rotate(360deg); } }
@media (max-width: 1100px) {
    .security-page { padding-left: 25px; padding-right: 25px; }
    .security-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .security-access-content { flex-wrap: wrap; }
    .security-access-main { min-width: calc(100% - 70px); }
    .security-access-actions { width: 100%; padding-top: 0; padding-left: 70px; }
}
@media (max-width: 700px) {
    .security-page { padding: 24px 18px 45px; }
    .security-header { flex-direction: column; align-items: stretch; }
    .security-actions { width: 100%; }
    .security-primary-button { flex: 1; }
    .security-stat-grid { grid-template-columns: 1fr; }
    .security-pending-grid { grid-template-columns: minmax(0, 1fr); padding: 14px; }
    .security-inside-grid { grid-template-columns: minmax(0, 1fr); padding: 14px; }
    .security-pending-card, .security-inside-card { padding: 16px; }
    .security-pending-fields, .security-inside-fields { gap: 10px; }
    .security-panel-header { padding: 20px; }
    .security-access-content { padding: 20px; }
    .security-access-icon { display: none; }
    .security-access-main { min-width: 100%; }
    .security-access-actions { padding-left: 0; }
    .security-action-button { flex: 1; }
    .security-form-row { grid-template-columns: 1fr; gap: 0; }
    .security-modal-header, .security-modal-form { padding: 20px; }
    .security-pass-form { padding: 18px 20px 20px; }
    .security-pass-scan, .security-pass-footer .security-primary-button { width: 100%; }
    .security-checkin-result-header { padding: 19px; }
    .security-checkin-result-header h2 { font-size: 16px; }
    .security-checkin-details { grid-template-columns: 1fr; }
    .security-checkin-detail { padding: 15px 19px; border-right: none !important; }
}
`;

export default SecurityPage;


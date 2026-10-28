import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    UserRound,
    Phone,
    ShieldCheck,
    XCircle,
    RefreshCw,
    KeyRound,
    Plus,
    Copy,
    Share2,
    BellRing,
} from "lucide-react";

import API from "../services/api";
import { db, newPublicId } from "../db/estateflowDb";
import { currentOwnerKey, getLocalRecords, saveLocalMutation } from "../db/offlineStore";
import { createResidentPassSigningKey, signPassOffline } from "../db/passCrypto";

import { useToast } from "../components/useToast";

import "./ResidentVisitsPage.css";

/*
 * Gate code generated on the device so an offline visit can be shared
 * immediately. Same alphabet and length as the server generator
 * (6 chars, A-Z/0-9); the server keeps it when it is still free.
 */
function generateOfflineAccessCode() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function mergeOfflineVisits(serverVisits) {
    const ownerKey = currentOwnerKey();
    if (!ownerKey) return serverVisits;
    try {
        const localVisits = await getLocalRecords("visits", ownerKey);
        const known = new Set(serverVisits.map((visit) => visit.publicId).filter(Boolean));
        const pending = localVisits
            .filter((visit) => visit.publicId && !known.has(visit.publicId))
            .map((visit) => ({
                ...visit,
                id: visit.publicId,
                visitor: visit.visitor || {
                    fullName: visit.visitorName || "Visitor",
                    phoneNumber: visit.visitorPhone || "",
                },
                status: visit.status || "OFFLINE_PENDING",
            }));
        return [...serverVisits, ...pending];
    } catch {
        return serverVisits;
    }
}

const ResidentVisitsPage = () => {
    const { showSuccess, showError } = useToast();

    const [visits, setVisits] = useState([]);
    const [visitors, setVisitors] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingVisitors, setLoadingVisitors] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [processingId, setProcessingId] = useState(null);

    const [showCreateModal, setShowCreateModal] = useState(false);

    const [createForm, setCreateForm] = useState({
        visitorId: "",
        purpose: "",
        visitDate: "",
    });

    const [creatingVisit, setCreatingVisit] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushBusy, setPushBusy] = useState(false);
    const [pushHelp, setPushHelp] = useState("");
    const [passSigningContext, setPassSigningContext] = useState(null);
    const [offlineSignedPass, setOfflineSignedPass] = useState("");

    useEffect(() => {
        let active = true;
        async function preparePassSigningKey() {
            try {
                const profileResponse = await API.get("/resident/me");
                const resident = profileResponse.data?.data;
                const residentPublicId = resident?.publicId;
                const estatePublicId = resident?.user?.estate?.publicId;
                if (!residentPublicId || !estatePublicId) return;

                let key = await db.signingKeys
                    .where("publicId").equals(residentPublicId)
                    .filter((candidate) => candidate.estatePublicId === estatePublicId
                        && !candidate.revokedAt
                        && (!candidate.expiresAt || candidate.expiresAt > Date.now()))
                    .first();
                if (!key && !navigator.onLine) return;
                if (!key) {
                    const generated = await createResidentPassSigningKey({ residentPublicId, estatePublicId });
                    key = await db.signingKeys.get(generated.keyId);
                }
                if (navigator.onLine) {
                    const enrollment = await API.post("/api/pass-keys/me", {
                        keyId: key.keyId,
                        algorithm: key.algorithm,
                        publicJwk: key.publicJwk,
                    });
                    const expiresAt = Date.parse(enrollment.data?.data?.expiresAt);
                    if (Number.isFinite(expiresAt)) {
                        key.expiresAt = expiresAt;
                        await db.signingKeys.put(key);
                    }
                }
                if (active) setPassSigningContext({ residentPublicId, estatePublicId, keyId: key.keyId });
            } catch (error) {
                if (active && navigator.onLine) {
                    console.warn("Offline pass signing key is not enrolled yet:", error.message);
                }
            }
        }
        void preparePassSigningKey();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        navigator.serviceWorker.ready
            .then((registration) => registration.pushManager.getSubscription())
            .then((subscription) => setPushEnabled(Boolean(subscription)))
            .catch(() => {});
    }, []);

    const togglePushAlerts = async () => {
        setPushHelp("");
        setPushBusy(true);
        try {
            if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
                throw new Error("This browser does not support visitor push alerts. SMS alerts will still work when enabled.");
            }
            const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
            const isInstalled = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
            if (isIos && !isInstalled) {
                throw new Error("On iPhone or iPad, first use Share → Add to Home Screen, open EstateFlow from its icon, then enable alerts here.");
            }
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (pushEnabled) {
                // Disabling must never fall through into the enable flow.
                if (subscription) {
                    await API.delete("/api/push/subscriptions", { data: { endpoint: subscription.endpoint } });
                    await subscription.unsubscribe();
                }
                setPushEnabled(false);
                showSuccess("Visitor alerts disabled on this device.");
                return;
            }
            const permission = await Notification.requestPermission();
            if (permission !== "granted") throw new Error("Notification permission was not granted. You can enable it in browser settings.");
            const response = await API.get("/api/push/public-key");
            const key = response.data?.data?.publicKey;
            if (!key) throw new Error("Push alerts are not configured on the server yet.");
            const padding = "=".repeat((4 - key.length % 4) % 4);
            const binary = atob(key.replace(/-/g, "+").replace(/_/g, "/") + padding);
            const applicationServerKey = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            subscription = subscription || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
            const encodeKey = (name) => {
                const bytes = new Uint8Array(subscription.getKey(name));
                return btoa(String.fromCharCode(...bytes));
            };
            try {
                await API.post("/api/push/subscriptions", {
                    endpoint: subscription.endpoint,
                    p256dh: encodeKey("p256dh"),
                    auth: encodeKey("auth"),
                });
            } catch (subscribeError) {
                // The server rejected this subscription; free the browser registration too.
                await subscription.unsubscribe().catch(() => {});
                throw subscribeError;
            }
            setPushEnabled(true);
            showSuccess("Visitor alerts are enabled on this device.");
        } catch (error) {
            const message = error.response?.data?.message || error.message || "Could not update visitor alerts.";
            setPushHelp(message);
            showError(message);
        } finally {
            setPushBusy(false);
        }
    };

    const getTodayDate = () => {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const loadVisits = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await API.get("/visit/me");

            const result = response.data?.data;

            setVisits(await mergeOfflineVisits(Array.isArray(result) ? result : []));
        } catch (err) {
            console.error("Failed to load resident visits:", err);

            setError(
                err.response?.data?.message ||
                "Failed to load your visits."
            );
        } finally {
            setLoading(false);
        }
    };

    const loadVisitors = async () => {
        try {
            setLoadingVisitors(true);
            setError("");

            const response = await API.get("/visitor/me");

            const result = response.data?.data;

            setVisitors(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error("Failed to load resident visitors:", err);

            setError(
                err.response?.data?.message ||
                "Failed to load your visitors."
            );
        } finally {
            setLoadingVisitors(false);
        }
    };

    useEffect(() => {
        let active = true;

        async function loadInitialVisits() {
            try {
                const response = await API.get("/visit/me");

                const result = response.data?.data;

                    if (active) {
                        setVisits(await mergeOfflineVisits(Array.isArray(result) ? result : []));
                }
            } catch (err) {
                console.error("Failed to load your visits:", err);

                if (active) {
                    setError(
                        err.response?.data?.message ||
                        "Failed to load your visits."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadInitialVisits();

        return () => {
            active = false;
        };
    }, []);

    const openCreateModal = async () => {
        setError("");
        setSuccess("");

        setCreateForm({
            visitorId: "",
            purpose: "",
            visitDate: getTodayDate(),
        });

        setShowCreateModal(true);

        await loadVisitors();
    };

    const closeCreateModal = () => {
        if (creatingVisit) {
            return;
        }

        setShowCreateModal(false);

        setCreateForm({
            visitorId: "",
            purpose: "",
            visitDate: "",
        });
    };

    const handleCreateFormChange = (event) => {
        const { name, value } = event.target;

        setCreateForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const createPlannedVisit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!createForm.visitorId) {
            showError("Please select a visitor.");
            setError("Please select a visitor.");
            return;
        }

        if (!createForm.purpose.trim()) {
            showError("Please enter the purpose of the visit.");
            setError("Please enter the purpose of the visit.");
            return;
        }

        if (!createForm.visitDate) {
            showError("Please select a visit date.");
            setError("Please select a visit date.");
            return;
        }

        if (createForm.visitDate < getTodayDate()) {
            showError("Visit date cannot be in the past.");
            setError("Visit date cannot be in the past.");
            return;
        }

        try {
            setCreatingVisit(true);

            if (!navigator.onLine) {
                if (!passSigningContext) throw new Error("Connect once to set up offline pass signing on this device.");
                const visitor = visitors.find((item) => String(item.id) === String(createForm.visitorId));
                if (!visitor?.publicId) throw new Error("This visitor is not cached with a public ID. Connect and refresh your visitor list first.");
                const validFrom = new Date(`${createForm.visitDate}T00:00:00`);
                const expiresAt = new Date(validFrom);
                expiresAt.setDate(expiresAt.getDate() + 1);
                const visitPublicId = newPublicId();
                const accessCode = generateOfflineAccessCode();
                const pass = {
                    publicId: visitPublicId,
                    residentPublicId: passSigningContext.residentPublicId,
                    visitorPublicId: visitor.publicId,
                    estatePublicId: passSigningContext.estatePublicId,
                    visitorName: visitor.fullName,
                    visitorPhone: visitor.phoneNumber || "",
                    purpose: createForm.purpose.trim(),
                    visitDate: createForm.visitDate,
                    accessCode,
                    validFrom: validFrom.toISOString(),
                    expiresAt: expiresAt.toISOString(),
                };
                const signedPass = await signPassOffline({
                    keyId: passSigningContext.keyId,
                    residentPublicId: passSigningContext.residentPublicId,
                    estatePublicId: passSigningContext.estatePublicId,
                    pass,
                });
                const ownerKey = currentOwnerKey();
                await saveLocalMutation({
                    tableName: "visits",
                    ownerKey,
                    actorPublicId: passSigningContext.residentPublicId,
                    estatePublicId: passSigningContext.estatePublicId,
                    entityType: "VISIT",
                    operation: "CREATE_PLANNED",
                    record: { ...pass, signedPass, status: "OFFLINE_PENDING" },
                    payload: {
                        visitorPublicId: visitor.publicId,
                        purpose: createForm.purpose.trim(),
                        visitDate: createForm.visitDate,
                        accessCode,
                    },
                });
                setOfflineSignedPass(JSON.stringify(signedPass));
                setVisits((current) => [...current, {
                    ...pass,
                    publicId: visitPublicId,
                    visitor,
                    status: "OFFLINE_PENDING",
                }]);
                setShowCreateModal(false);
                setSuccess(`Offline visit pass created. Access code: ${accessCode}. Share the signed payload with the gate; it syncs automatically when you reconnect.`);
                showSuccess(`Offline visit created — code ${accessCode}.`);
                return;
            }

            const response = await API.post(
                "/visit/planned",
                null,
                {
                    params: {
                        visitorId: Number(createForm.visitorId),
                        purpose: createForm.purpose.trim(),
                        visitDate: createForm.visitDate,
                    },
                }
            );

            const createdVisit = response.data?.data;

            if (passSigningContext && createdVisit?.publicId && createdVisit?.visitor?.publicId) {
                try {
                    const validFrom = new Date(`${createForm.visitDate}T00:00:00`);
                    const expiresAt = new Date(validFrom);
                    expiresAt.setDate(expiresAt.getDate() + 1);
                    const signedPass = await signPassOffline({
                        keyId: passSigningContext.keyId,
                        residentPublicId: passSigningContext.residentPublicId,
                        estatePublicId: passSigningContext.estatePublicId,
                        pass: {
                            publicId: createdVisit.publicId,
                            residentPublicId: passSigningContext.residentPublicId,
                            visitorPublicId: createdVisit.visitor.publicId,
                            estatePublicId: passSigningContext.estatePublicId,
                            visitorName: createdVisit.visitor.fullName,
                            visitorPhone: createdVisit.visitor.phoneNumber || "",
                            purpose: createdVisit.purpose,
                            visitDate: createForm.visitDate,
                            validFrom: validFrom.toISOString(),
                            expiresAt: expiresAt.toISOString(),
                        },
                    });
                    setOfflineSignedPass(JSON.stringify(signedPass));
                } catch (signingError) {
                    console.warn("Visit created but an offline signature could not be prepared:", signingError.message);
                }
            }

            setShowCreateModal(false);

            setCreateForm({
                visitorId: "",
                purpose: "",
                visitDate: "",
            });

            if (createdVisit?.accessCode) {
                const message = `Planned visit created successfully. Access code: ${createdVisit.accessCode}`;

                setSuccess(message);
                showSuccess(message);
            } else {
                setSuccess("Planned visit created successfully.");
                showSuccess("Planned visit created successfully.");
            }

            await loadVisits();
        } catch (err) {
            console.error("Failed to create planned visit:", err);

            const message =
                err.response?.data?.message ||
                "Failed to create planned visit.";

            showError(message);
            setError(message);
        } finally {
            setCreatingVisit(false);
        }
    };

    const approveVisit = async (id) => {
        try {
            setProcessingId(id);
            setError("");
            setSuccess("");

            const storedAuth = JSON.parse(localStorage.getItem("estateflow_auth") || "null");
            const visit = visits.find((item) => String(item.id) === String(id));

            await saveLocalMutation({
                ownerKey: currentOwnerKey(),
                actorPublicId: storedAuth?.publicId ?? null,
                estatePublicId: storedAuth?.estatePublicId ?? null,
                entityType: "VISIT",
                operation: "APPROVE",
                entityPublicId: visit?.publicId ?? null,
                payload: {},
            });

            setSuccess("Visit approved successfully.");
            showSuccess("Visit approved successfully.");

            await loadVisits();
        } catch (err) {
            console.error("Failed to approve visit:", err);

            const message =
                err.response?.data?.message ||
                "Failed to approve visit.";

            showError(message);
            setError(message);
        } finally {
            setProcessingId(null);
        }
    };

    const rejectVisit = async (id) => {
        try {
            setProcessingId(id);
            setError("");
            setSuccess("");

            const storedAuth = JSON.parse(localStorage.getItem("estateflow_auth") || "null");
            const visit = visits.find((item) => String(item.id) === String(id));

            await saveLocalMutation({
                ownerKey: currentOwnerKey(),
                actorPublicId: storedAuth?.publicId ?? null,
                estatePublicId: storedAuth?.estatePublicId ?? null,
                entityType: "VISIT",
                operation: "REJECT",
                entityPublicId: visit?.publicId ?? null,
                payload: {},
            });

            setSuccess("Visit rejected successfully.");
            showSuccess("Visit rejected successfully.");

            await loadVisits();
        } catch (err) {
            console.error("Failed to reject visit:", err);

            const message =
                err.response?.data?.message ||
                "Failed to reject visit.";

            showError(message);
            setError(message);
        } finally {
            setProcessingId(null);
        }
    };

    // ========== ACCESS CODE HELPERS ==========
    const copyAccessCode = async (code) => {
        if (!code) return;

        try {
            await navigator.clipboard.writeText(code);
            setSuccess(`Access code ${code} copied to clipboard.`);
            showSuccess(`Access code ${code} copied to clipboard.`);
            setError("");
        } catch (err) {
            console.error("Failed to copy access code:", err);
            showError("Failed to copy access code.");
            setError("Failed to copy access code.");
        }
    };

    const shareAccessCode = (visit) => {
        if (!visit?.accessCode) return;

        const formatDate = (date) => {
            if (!date) return "—";
            try {
                return new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });
            } catch {
                return date;
            }
        };

        const message = `--------------------------------
ESTATE VISIT PASS
Visitor: ${visit.visitor?.fullName || "Unknown"}
Visit Date: ${formatDate(visit.visitDate)}
Purpose: ${visit.purpose || "—"}
Access Code: ${visit.accessCode}
Please present this access code at the estate gate for verification.
Generated by EstateFlow.
--------------------------------`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    };

    const copySignedPass = async () => {
        if (!offlineSignedPass) return;
        try {
            await navigator.clipboard.writeText(offlineSignedPass);
            showSuccess("Signed pass copied. Share it with the gate for offline verification.");
        } catch {
            showError("Could not copy the signed pass. Select and copy the text manually.");
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case "PENDING":
                return "pending";

            case "APPROVED":
                return "approved";

            case "CHECKED_IN":
                return "checked-in";

            case "CHECKED_OUT":
                return "checked-out";

            case "REJECTED":
                return "rejected";

            case "EXPIRED":
                return "expired";

            case "CANCELLED":
                return "cancelled";

            default:
                return "checked-out";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "PENDING":
                return <Clock3 size={14} />;

            case "APPROVED":
                return <CheckCircle2 size={14} />;

            case "CHECKED_IN":
                return <ShieldCheck size={14} />;

            case "REJECTED":
                return <XCircle size={14} />;

            default:
                return <CalendarDays size={14} />;
        }
    };

    const formatDate = (date) => {
        if (!date) {
            return "—";
        }

        try {
            return new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return date;
        }
    };

    const formatTime = (time) => {
        if (!time) {
            return "—";
        }

        try {
            return new Date(time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return time;
        }
    };

    const pendingCount = visits.filter(
        (visit) => visit.status === "PENDING"
    ).length;

    const approvedCount = visits.filter(
        (visit) => visit.status === "APPROVED"
    ).length;

    const completedCount = visits.filter(
        (visit) =>
            visit.status === "CHECKED_IN" ||
            visit.status === "CHECKED_OUT"
    ).length;

    return (
        <div className="resident-visits-page">

            {/* PAGE HEADER */}
            <div className="visits-page-header">

                <div className="visits-title-section">

                    <div className="visits-title-icon">
                        <CalendarDays size={23} />
                    </div>

                    <div>
                        <h1 className="visits-title">
                            My Visits
                        </h1>

                        <p className="visits-subtitle">
                            Manage visitor requests and track access to your residence.
                        </p>
                    </div>

                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                    }}
                >
                    <button type="button" onClick={togglePushAlerts} disabled={pushBusy} className="visits-refresh-button">
                        <BellRing size={16} /> {pushBusy ? "Saving..." : pushEnabled ? "Disable visitor alerts" : "Enable visitor alerts"}
                    </button>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="visits-create-button"
                    >
                        <Plus size={20} />
                        Create Planned Visit
                    </button>

                    <button
                        onClick={loadVisits}
                        disabled={loading}
                        className="visits-refresh-button"
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? "visits-refresh-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>

                {pushHelp && <p role="status" style={{ flexBasis: "100%", margin: 0, color: "#b45309", fontSize: 13 }}>{pushHelp}</p>}

            </div>

            {/* SUMMARY CARDS */}
            <div className="visits-summary-grid">

                <div className="visits-summary-card">
                    <div className="visits-summary-content">

                        <div>
                            <p className="visits-summary-label">
                                Total Visits
                            </p>

                            <p className="visits-summary-number">
                                {visits.length}
                            </p>
                        </div>

                        <div className="visits-summary-icon blue">
                            <CalendarDays size={20} />
                        </div>

                    </div>
                </div>

                <div className="visits-summary-card">
                    <div className="visits-summary-content">

                        <div>
                            <p className="visits-summary-label">
                                Pending
                            </p>

                            <p className="visits-summary-number">
                                {pendingCount}
                            </p>
                        </div>

                        <div className="visits-summary-icon yellow">
                            <Clock3 size={20} />
                        </div>

                    </div>
                </div>

                <div className="visits-summary-card">
                    <div className="visits-summary-content">

                        <div>
                            <p className="visits-summary-label">
                                Approved
                            </p>

                            <p className="visits-summary-number">
                                {approvedCount}
                            </p>
                        </div>

                        <div className="visits-summary-icon green">
                            <CheckCircle2 size={20} />
                        </div>

                    </div>
                </div>

                <div className="visits-summary-card">
                    <div className="visits-summary-content">

                        <div>
                            <p className="visits-summary-label">
                                Completed
                            </p>

                            <p className="visits-summary-number">
                                {completedCount}
                            </p>
                        </div>

                        <div className="visits-summary-icon gray">
                            <ShieldCheck size={20} />
                        </div>

                    </div>
                </div>

            </div>

            {/* SUCCESS */}
            {success && (
                <div className="visits-alert visits-success">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                </div>
            )}

            {offlineSignedPass && (
                <section className="visits-main-card" aria-label="Signed offline pass">
                    <div className="visits-card-header">
                        <div>
                            <h2 className="visits-card-title">Signed pass for the gate</h2>
                            <p className="visits-card-description">Keep this payload available to the guard. It can be verified offline on a device with the estate keys cached.</p>
                        </div>
                        <button type="button" className="visits-create-button" onClick={copySignedPass}>
                            <Copy size={16} /> Copy pass
                        </button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                        <QRCodeSVG value={offlineSignedPass} size={240} level="M" includeMargin />
                    </div>
                    <textarea
                        value={offlineSignedPass}
                        readOnly
                        rows={4}
                        aria-label="Signed pass JSON"
                        style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "monospace" }}
                    />
                </section>
            )}

            {/* ERROR */}
            {error && (
                <div className="visits-alert visits-error">
                    <XCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* MAIN CARD */}
            <div className="visits-main-card">

                <div className="visits-card-header">

                    <div>
                        <h2 className="visits-card-title">
                            Visitor Requests
                        </h2>

                        <p className="visits-card-description">
                            Review and respond to visitors requesting access.
                        </p>
                    </div>

                    <div className="visits-count">
                        <UserRound size={16} />
                        {visits.length}{" "}
                        {visits.length === 1 ? "visit" : "visits"}
                    </div>

                </div>

                {/* LOADING */}
                {loading && (
                    <div className="visits-loading">

                        <div className="visits-spinner" />

                        <p className="visits-loading-text">
                            Loading your visits...
                        </p>

                    </div>
                )}

                {/* EMPTY */}
                {!loading && visits.length === 0 && !error && (
                    <div className="visits-empty">

                        <div className="visits-empty-icon">
                            <CalendarDays size={30} />
                        </div>

                        <h3 className="visits-empty-title">
                            No visits yet
                        </h3>

                        <p className="visits-empty-text">
                            You don't have any visitor requests at the moment.
                            When someone requests access to your residence,
                            their visit will appear here.
                        </p>

                    </div>
                )}

                {/* ERROR EMPTY STATE */}
                {!loading && visits.length === 0 && error && (
                    <div className="visits-error-state">

                        <div className="visits-error-icon">
                            <XCircle size={27} />
                        </div>

                        <h3 className="visits-error-title">
                            Unable to load visits
                        </h3>

                        <p className="visits-error-text">
                            We couldn't retrieve your visit information.
                        </p>

                        <button
                            onClick={loadVisits}
                            className="visits-retry-button"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>

                    </div>
                )}

                {/* DESKTOP TABLE */}
                {!loading && visits.length > 0 && (
                    <div className="visits-table-container">

                        <table className="visits-table">

                            <thead>
                            <tr>

                                <th>Visitor</th>

                                <th>Purpose</th>

                                <th>Access Code</th>

                                <th>Visit Date</th>

                                <th>Status</th>

                                <th>Action</th>

                            </tr>
                            </thead>

                            <tbody>

                            {visits.map((visit) => (
                                <tr key={visit.id}>

                                    <td>

                                        <div className="visitor-cell">

                                            <div className="visitor-avatar">
                                                <UserRound size={18} />
                                            </div>

                                            <div>
                                                <p className="visitor-name">
                                                    {visit.visitor?.fullName ||
                                                        "Unknown visitor"}
                                                </p>

                                                <div className="visitor-phone">
                                                    <Phone size={13} />

                                                    {visit.visitor?.phoneNumber ||
                                                        "No phone number"}
                                                </div>
                                            </div>

                                        </div>

                                    </td>

                                    <td>
                                        <p className="visitor-purpose">
                                            {visit.purpose || "—"}
                                        </p>
                                    </td>

                                    <td>
                                        {visit.accessCode ? (
                                            <div className="access-code-with-actions">
                                                <div className="visitor-access-code-desktop">
                                                    <KeyRound size={15} />
                                                    <span>{visit.accessCode}</span>
                                                </div>

                                                <div className="access-code-actions">
                                                    <button
                                                        type="button"
                                                        className="access-code-action-btn"
                                                        title="Copy access code"
                                                        onClick={() => copyAccessCode(visit.accessCode)}
                                                    >
                                                        <Copy size={14} />
                                                        <span>Copy</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="access-code-action-btn"
                                                        title="Share access code"
                                                        onClick={() => shareAccessCode(visit)}
                                                    >
                                                        <Share2 size={14} />
                                                        <span>Share</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="visitor-access-code-desktop">
                                                <KeyRound size={15} />
                                                <span>—</span>
                                            </div>
                                        )}
                                    </td>
                                    <td>

                                            <span
                                                className={`visit-status ${getStatusClass(
                                                    visit.status
                                                )}`}
                                            >
                                                {getStatusIcon(
                                                    visit.status
                                                )}

                                                {visit.status ||
                                                    "UNKNOWN"}
                                            </span>

                                    </td>

                                    <td>

                                        {visit.status === "PENDING" ? (
                                            <div className="visit-actions">

                                                <button
                                                    onClick={() =>
                                                        approveVisit(
                                                            visit.id
                                                        )
                                                    }
                                                    disabled={
                                                        processingId ===
                                                        visit.id
                                                    }
                                                    className="visit-approve-button"
                                                >
                                                    <CheckCircle2
                                                        size={14}
                                                    />

                                                    {processingId ===
                                                    visit.id
                                                        ? "Processing..."
                                                        : "Approve"}
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        rejectVisit(
                                                            visit.id
                                                        )
                                                    }
                                                    disabled={
                                                        processingId ===
                                                        visit.id
                                                    }
                                                    className="visit-reject-button"
                                                >
                                                    <XCircle size={14} />
                                                    Reject
                                                </button>

                                            </div>
                                        ) : (
                                            <span className="no-action">
                                                    No action required
                                                </span>
                                        )}

                                    </td>

                                </tr>
                            ))}

                            </tbody>

                        </table>

                    </div>
                )}

                {/* MOBILE */}
                {!loading && visits.length > 0 && (
                    <div className="visits-mobile-list">

                        {visits.map((visit) => (
                            <div
                                key={visit.id}
                                className="visit-mobile-card"
                            >

                                <div className="visit-mobile-top">

                                    <div className="visit-mobile-visitor">

                                        <div className="visitor-avatar">
                                            <UserRound size={18} />
                                        </div>

                                        <div className="visit-mobile-visitor-info">

                                            <h3 className="visit-mobile-name">
                                                {visit.visitor?.fullName ||
                                                    "Unknown visitor"}
                                            </h3>

                                            <p className="visit-mobile-phone">
                                                <Phone size={12} />

                                                {visit.visitor?.phoneNumber ||
                                                    "No phone number"}
                                            </p>

                                        </div>

                                    </div>

                                    <span
                                        className={`visit-status ${getStatusClass(
                                            visit.status
                                        )}`}
                                    >
                                        {getStatusIcon(
                                            visit.status
                                        )}

                                        {visit.status ||
                                            "UNKNOWN"}
                                    </span>

                                </div>

                                <div className="visit-mobile-details">

                                    <div className="visit-mobile-detail">
                                        <p className="visit-detail-label">
                                            Purpose
                                        </p>

                                        <p className="visit-detail-value">
                                            {visit.purpose || "—"}
                                        </p>
                                    </div>

                                    <div className="visit-mobile-detail">
                                        <p className="visit-detail-label">
                                            Visit Date
                                        </p>

                                        <p className="visit-detail-value">
                                            {formatDate(
                                                visit.visitDate
                                            )}
                                        </p>
                                    </div>

                                    <div className="visit-mobile-detail full">

                                        <div className="visit-access-code">

                                            <KeyRound
                                                size={16}
                                                color="#94a3b8"
                                            />

                                            <div style={{ flex: 1 }}>
                                                <p className="visit-detail-label">
                                                    Access Code
                                                </p>

                                                <p className="visit-access-code-text">
                                                    {visit.accessCode || "—"}
                                                </p>
                                            </div>

                                        </div>

                                        {visit.accessCode && (
                                            <div className="access-code-actions mobile">
                                                <button
                                                    type="button"
                                                    className="access-code-action-btn"
                                                    onClick={() =>
                                                        copyAccessCode(visit.accessCode)
                                                    }
                                                >
                                                    <Copy size={14} />
                                                    <span>Copy</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="access-code-action-btn"
                                                    onClick={() =>
                                                        shareAccessCode(
                                                            visit.accessCode,
                                                            visit.visitor?.fullName
                                                        )
                                                    }
                                                >
                                                    <Share2 size={14} />
                                                    <span>Share</span>
                                                </button>
                                            </div>
                                        )}

                                    </div>

                                </div>

                                {(visit.checkInTime ||
                                    visit.checkOutTime) && (
                                    <div className="visit-mobile-times">

                                        {visit.checkInTime && (
                                            <div>
                                                <p className="visit-detail-label">
                                                    Check-in
                                                </p>

                                                <p className="visit-detail-value">
                                                    {formatTime(
                                                        visit.checkInTime
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {visit.checkOutTime && (
                                            <div>
                                                <p className="visit-detail-label">
                                                    Check-out
                                                </p>

                                                <p className="visit-detail-value">
                                                    {formatTime(
                                                        visit.checkOutTime
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                    </div>
                                )}

                                {visit.status === "PENDING" && (
                                    <div className="visit-mobile-actions">

                                        <button
                                            onClick={() =>
                                                approveVisit(
                                                    visit.id
                                                )
                                            }
                                            disabled={
                                                processingId ===
                                                visit.id
                                            }
                                            className="visit-approve-button"
                                        >
                                            <CheckCircle2 size={16} />

                                            {processingId ===
                                            visit.id
                                                ? "Processing..."
                                                : "Approve"}
                                        </button>

                                        <button
                                            onClick={() =>
                                                rejectVisit(
                                                    visit.id
                                                )
                                            }
                                            disabled={
                                                processingId ===
                                                visit.id
                                            }
                                            className="visit-reject-button"
                                        >
                                            <XCircle size={16} />
                                            Reject
                                        </button>

                                    </div>
                                )}

                            </div>
                        ))}

                    </div>
                )}

            </div>

            {/* CREATE PLANNED VISIT MODAL */}
            {showCreateModal && (
                <div
                    onClick={closeCreateModal}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                        zIndex: 1000,
                    }}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: "520px",
                            background: "#ffffff",
                            borderRadius: "16px",
                            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.18)",
                            overflow: "hidden",
                        }}
                    >

                        {/* MODAL HEADER */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "20px 22px",
                                borderBottom: "1px solid #e2e8f0",
                            }}
                        >
                            <div>
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: "#0f172a",
                                    }}
                                >
                                    Create Planned Visit
                                </h2>

                                <p
                                    style={{
                                        margin: "6px 0 0",
                                        fontSize: "14px",
                                        color: "#64748b",
                                    }}
                                >
                                    Create an authorized visit for one of your visitors.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeCreateModal}
                                disabled={creatingVisit}
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    border: "none",
                                    borderRadius: "8px",
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: creatingVisit
                                        ? "not-allowed"
                                        : "pointer",
                                }}
                            >
                                <XCircle size={19} />
                            </button>
                        </div>

                        {/* MODAL BODY */}
                        <form onSubmit={createPlannedVisit}>
                            <div
                                style={{
                                    padding: "22px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "18px",
                                }}
                            >

                                {/* VISITOR */}
                                <div>
                                    <label
                                        htmlFor="planned-visit-visitor"
                                        style={{
                                            display: "block",
                                            marginBottom: "7px",
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: "#334155",
                                        }}
                                    >
                                        Visitor
                                    </label>

                                    <select
                                        id="planned-visit-visitor"
                                        name="visitorId"
                                        value={createForm.visitorId}
                                        onChange={handleCreateFormChange}
                                        disabled={
                                            loadingVisitors ||
                                            creatingVisit
                                        }
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            padding: "11px 12px",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "9px",
                                            background: "#ffffff",
                                            color: "#0f172a",
                                            fontSize: "14px",
                                            outline: "none",
                                        }}
                                    >
                                        <option value="">
                                            {loadingVisitors
                                                ? "Loading visitors..."
                                                : visitors.length === 0
                                                    ? "No registered visitors"
                                                    : "Select a visitor"}
                                        </option>

                                        {visitors.map((visitor) => (
                                            <option
                                                key={visitor.id}
                                                value={visitor.id}
                                            >
                                                {visitor.fullName}
                                                {visitor.phoneNumber
                                                    ? ` — ${visitor.phoneNumber}`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>

                                    {!loadingVisitors &&
                                        visitors.length === 0 && (
                                            <p
                                                style={{
                                                    margin: "7px 0 0",
                                                    fontSize: "13px",
                                                    color: "#64748b",
                                                }}
                                            >
                                                Register a visitor in My Visitors first.
                                            </p>
                                        )}
                                </div>

                                {/* PURPOSE */}
                                <div>
                                    <label
                                        htmlFor="planned-visit-purpose"
                                        style={{
                                            display: "block",
                                            marginBottom: "7px",
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: "#334155",
                                        }}
                                    >
                                        Purpose
                                    </label>

                                    <input
                                        id="planned-visit-purpose"
                                        type="text"
                                        name="purpose"
                                        value={createForm.purpose}
                                        onChange={handleCreateFormChange}
                                        placeholder="e.g. Family visit"
                                        disabled={creatingVisit}
                                        maxLength={255}
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            padding: "11px 12px",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "9px",
                                            background: "#ffffff",
                                            color: "#0f172a",
                                            fontSize: "14px",
                                            outline: "none",
                                        }}
                                    />
                                </div>

                                {/* DATE */}
                                <div>
                                    <label
                                        htmlFor="planned-visit-date"
                                        style={{
                                            display: "block",
                                            marginBottom: "7px",
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: "#334155",
                                        }}
                                    >
                                        Visit Date
                                    </label>

                                    <input
                                        id="planned-visit-date"
                                        type="date"
                                        name="visitDate"
                                        value={createForm.visitDate}
                                        onChange={handleCreateFormChange}
                                        min={getTodayDate()}
                                        disabled={creatingVisit}
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            padding: "11px 12px",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "9px",
                                            background: "#ffffff",
                                            color: "#0f172a",
                                            fontSize: "14px",
                                            outline: "none",
                                        }}
                                    />
                                </div>

                                {/* INFORMATION */}
                                <div
                                    style={{
                                        padding: "13px 14px",
                                        borderRadius: "9px",
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "13px",
                                        lineHeight: 1.5,
                                        color: "#475569",
                                    }}
                                >
                                    An access code will be generated automatically
                                    when this planned visit is created.
                                </div>

                            </div>

                            {/* MODAL FOOTER */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "10px",
                                    padding: "16px 22px",
                                    borderTop: "1px solid #e2e8f0",
                                    background: "#f8fafc",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
                                    disabled={creatingVisit}
                                    style={{
                                        padding: "10px 16px",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "9px",
                                        background: "#ffffff",
                                        color: "#334155",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        cursor: creatingVisit
                                            ? "not-allowed"
                                            : "pointer",
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        creatingVisit ||
                                        loadingVisitors ||
                                        visitors.length === 0
                                    }
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "7px",
                                        padding: "10px 16px",
                                        border: "none",
                                        borderRadius: "9px",
                                        background:
                                            creatingVisit ||
                                            loadingVisitors ||
                                            visitors.length === 0
                                                ? "#94a3b8"
                                                : "#2563eb",
                                        color: "#ffffff",
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        cursor:
                                            creatingVisit ||
                                            loadingVisitors ||
                                            visitors.length === 0
                                                ? "not-allowed"
                                                : "pointer",
                                    }}
                                >
                                    <Plus size={16} />

                                    {creatingVisit
                                        ? "Creating..."
                                        : "Create Visit"}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

        </div>
    );
};

export default ResidentVisitsPage;

import { useEffect, useState } from "react";
import {
    CalendarDays,
    Clock3,
    LogIn,
    LogOut,
    Plus,
    RefreshCw,
    UserRound,
    Users,
    X,
    Check,
    Ban,
} from "lucide-react";

import api from "../services/api";

function VisitsPage() {
    const [visits, setVisits] = useState([]);
    const [residents, setResidents] = useState([]);
    const [visitors, setVisitors] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingResidents, setLoadingResidents] = useState(false);
    const [loadingVisitors, setLoadingVisitors] = useState(false);
    const [creating, setCreating] = useState(false);

    const [processingVisitId, setProcessingVisitId] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);

    const [residentId, setResidentId] = useState("");
    const [visitorId, setVisitorId] = useState("");
    const [purpose, setPurpose] = useState("");

    async function loadVisits() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/visit");

            const data = response.data;

            setVisits(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : []
            );
        } catch (err) {
            console.error("Failed to load visits:", err);

            setError(
                err.response?.data?.message ||
                "Failed to load visits."
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadResidents() {
        try {
            setLoadingResidents(true);

            const response = await api.get("/resident");

            const data = response.data;

            setResidents(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : []
            );
        } catch (err) {
            console.error("Failed to load residents:", err);

            setError(
                err.response?.data?.message ||
                "Failed to load residents."
            );
        } finally {
            setLoadingResidents(false);
        }
    }

    async function loadVisitors() {
        try {
            setLoadingVisitors(true);

            const response = await api.get("/visitor");

            const data = response.data;

            setVisitors(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : []
            );
        } catch (err) {
            console.error("Failed to load visitors:", err);

            setError(
                err.response?.data?.message ||
                "Failed to load visitors."
            );
        } finally {
            setLoadingVisitors(false);
        }
    }

    useEffect(() => {
        loadVisits();
    }, []);

    function openCreateModal() {
        setError("");
        setSuccess("");

        setResidentId("");
        setVisitorId("");
        setPurpose("");

        loadResidents();
        loadVisitors();

        setShowCreateModal(true);
    }

    function closeCreateModal() {
        if (creating) {
            return;
        }

        setShowCreateModal(false);

        setResidentId("");
        setVisitorId("");
        setPurpose("");
    }

    async function handleCreateVisit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!residentId) {
            setError("Please select a resident.");
            return;
        }

        if (!visitorId) {
            setError("Please select a visitor.");
            return;
        }

        if (!purpose.trim()) {
            setError("Please enter the visit purpose.");
            return;
        }

        const selectedVisitor = visitors.find(
            (visitor) =>
                String(visitor.id) === String(visitorId)
        );

        if (!selectedVisitor) {
            setError("Selected visitor could not be found.");
            return;
        }

        try {
            setCreating(true);

            const visitorRequest = {
                fullName: selectedVisitor.fullName,
                phoneNumber: selectedVisitor.phoneNumber,
                purpose: purpose.trim(),
            };

            const response = await api.post(
                `/visit?residentId=${encodeURIComponent(
                    residentId
                )}&purpose=${encodeURIComponent(
                    purpose.trim()
                )}`,
                visitorRequest
            );

            const createdVisit = response.data;

            setShowCreateModal(false);

            setResidentId("");
            setVisitorId("");
            setPurpose("");

            await loadVisits();

            const createdData =
                createdVisit?.data || createdVisit;

            setSuccess(
                createdData?.accessCode
                    ? `Visit created successfully. Access code: ${createdData.accessCode}`
                    : "Visit created successfully. Awaiting resident approval."
            );
        } catch (err) {
            console.error(
                "Failed to create visit:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to create visit."
            );
        } finally {
            setCreating(false);
        }
    }

    async function handleApprove(visitId) {
        try {
            setProcessingVisitId(visitId);
            setError("");
            setSuccess("");

            await api.put(
                `/visit/approve/${encodeURIComponent(visitId)}`
            );

            setSuccess(
                "Visitor approved successfully."
            );

            await loadVisits();
        } catch (err) {
            console.error("Approval failed:", err);

            setError(
                err.response?.data?.message ||
                "Failed to approve visitor."
            );
        } finally {
            setProcessingVisitId(null);
        }
    }

    async function handleReject(visitId) {
        const confirmed = window.confirm(
            "Are you sure you want to reject this visit?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessingVisitId(visitId);
            setError("");
            setSuccess("");

            await api.put(
                `/visit/reject/${encodeURIComponent(visitId)}`
            );

            setSuccess(
                "Visitor rejected successfully."
            );

            await loadVisits();
        } catch (err) {
            console.error("Rejection failed:", err);

            setError(
                err.response?.data?.message ||
                "Failed to reject visitor."
            );
        } finally {
            setProcessingVisitId(null);
        }
    }

    async function handleCheckIn(accessCode, visitId) {
        try {
            setProcessingVisitId(visitId);
            setError("");
            setSuccess("");

            await api.post(
                `/visit/check-In/${encodeURIComponent(accessCode)}`
            );

            setSuccess(
                "Visitor checked in successfully."
            );

            await loadVisits();
        } catch (err) {
            console.error("Check-in failed:", err);

            setError(
                err.response?.data?.message ||
                "Failed to check in visitor."
            );
        } finally {
            setProcessingVisitId(null);
        }
    }

    async function handleCheckOut(accessCode, visitId) {
        try {
            setProcessingVisitId(visitId);
            setError("");
            setSuccess("");

            await api.post(
                `/visit/check-Out/${encodeURIComponent(accessCode)}`
            );

            setSuccess(
                "Visitor checked out successfully."
            );

            await loadVisits();
        } catch (err) {
            console.error("Check-out failed:", err);

            setError(
                err.response?.data?.message ||
                "Failed to check out visitor."
            );
        } finally {
            setProcessingVisitId(null);
        }
    }

    function formatStatus(status) {
        switch (status) {
            case "PENDING":
                return "Pending";

            case "APPROVED":
                return "Approved";

            case "CHECKED_IN":
                return "Checked In";

            case "CHECKED_OUT":
                return "Checked Out";

            case "REJECTED":
                return "Rejected";

            case "EXPIRED":
                return "Expired";

            default:
                return status || "Unknown";
        }
    }

    function getStatusClass(status) {
        switch (status) {
            case "PENDING":
                return "visit-status pending";

            case "APPROVED":
                return "visit-status approved";

            case "CHECKED_IN":
                return "visit-status checked-in";

            case "CHECKED_OUT":
                return "visit-status checked-out";

            case "REJECTED":
                return "visit-status rejected";

            case "EXPIRED":
                return "visit-status expired";

            default:
                return "visit-status";
        }
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    const pendingCount = visits.filter(
        (visit) => visit.status === "PENDING"
    ).length;

    const approvedCount = visits.filter(
        (visit) => visit.status === "APPROVED"
    ).length;

    const checkedInCount = visits.filter(
        (visit) => visit.status === "CHECKED_IN"
    ).length;

    const checkedOutCount = visits.filter(
        (visit) => visit.status === "CHECKED_OUT"
    ).length;

    return (
        <div className="visits-page">

            <style>{`

                .visits-page {
                    min-height: 100%;
                    padding: 34px 40px 60px;
                    color: #172033;
                }

                .visits-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 24px;
                    margin-bottom: 28px;
                }

                .visits-title-area h1 {
                    margin: 0;
                    font-size: 38px;
                    line-height: 1.1;
                    letter-spacing: -1.2px;
                    color: #172033;
                }

                .visits-title-area p {
                    margin: 9px 0 0;
                    color: #8090aa;
                    font-size: 15px;
                }

                .visits-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .visit-refresh-button {
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

                .visit-refresh-button:hover:not(:disabled) {
                    border-color: #c7d3e5;
                    background: #f8fafc;
                    transform: translateY(-1px);
                }

                .visit-refresh-button:disabled {
                    opacity: .6;
                    cursor: not-allowed;
                }

                .visit-primary-button {
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

                .visit-primary-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow:
                        0 13px 28px rgba(37, 99, 235, .28);
                }

                .visit-primary-button:disabled {
                    opacity: .65;
                    cursor: not-allowed;
                }

                .visit-alert {
                    display: flex;
                    align-items: flex-start;
                    gap: 11px;
                    padding: 14px 17px;
                    border-radius: 13px;
                    margin-bottom: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .visit-alert.error {
                    background: #fff1f2;
                    border: 1px solid #fecdd3;
                    color: #be123c;
                }

                .visit-alert.success {
                    background: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    color: #047857;
                }

                .visit-alert-content {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .visit-stat-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 18px;
                    margin-bottom: 22px;
                }

                .visit-stat-card {
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

                .visit-stat-card::after {
                    content: "";
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    right: -45px;
                    bottom: -50px;
                    border-radius: 50%;
                    background: #f5f8fd;
                }

                .visit-stat-icon {
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

                .visit-stat-icon.blue {
                    background: #edf4ff;
                    color: #2563eb;
                }

                .visit-stat-icon.orange {
                    background: #fff7e8;
                    color: #d97706;
                }

                .visit-stat-icon.green {
                    background: #ecfdf5;
                    color: #059669;
                }

                .visit-stat-icon.purple {
                    background: #f3efff;
                    color: #7c3aed;
                }

                .visit-stat-label {
                    display: block;
                    color: #71809a;
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 5px;
                    position: relative;
                    z-index: 1;
                }

                .visit-stat-value {
                    display: block;
                    font-size: 29px;
                    line-height: 1;
                    color: #172033;
                    letter-spacing: -.7px;
                    position: relative;
                    z-index: 1;
                }

                .visit-stat-description {
                    margin: 8px 0 0;
                    color: #95a2b7;
                    font-size: 12px;
                    position: relative;
                    z-index: 1;
                }

                .visit-panel {
                    background: white;
                    border: 1px solid #e3e9f2;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow:
                        0 8px 25px rgba(30, 50, 85, .035);
                }

                .visit-panel-header {
                    padding: 23px 25px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid #edf1f6;
                }

                .visit-panel-header h2 {
                    margin: 0;
                    color: #172033;
                    font-size: 19px;
                    letter-spacing: -.2px;
                }

                .visit-panel-header p {
                    margin: 5px 0 0;
                    color: #8a99b0;
                    font-size: 13px;
                }

                .visit-table-scroll {
                    width: 100%;
                    overflow-x: auto;
                    overflow-y: visible;
                }

                .visit-table {
                    width: 100%;
                    min-width: 1120px;
                    border-collapse: separate;
                    border-spacing: 0;
                    table-layout: fixed;
                }

                .visit-table th {
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

                .visit-table td {
                    height: 78px;
                    padding: 13px 18px;
                    border-bottom: 1px solid #eef2f7;
                    color: #53627b;
                    font-size: 13px;
                    vertical-align: middle;
                }

                .visit-table tbody tr {
                    transition: background .15s ease;
                }

                .visit-table tbody tr:hover {
                    background: #fbfdff;
                }

                .visit-table tbody tr:last-child td {
                    border-bottom: none;
                }

                .visit-table th:nth-child(1),
                .visit-table td:nth-child(1) {
                    width: 58px;
                }

                .visit-table th:nth-child(2),
                .visit-table td:nth-child(2) {
                    width: 190px;
                }

                .visit-table th:nth-child(3),
                .visit-table td:nth-child(3) {
                    width: 205px;
                }

                .visit-table th:nth-child(4),
                .visit-table td:nth-child(4) {
                    width: 145px;
                }

                .visit-table th:nth-child(5),
                .visit-table td:nth-child(5) {
                    width: 125px;
                }

                .visit-table th:nth-child(6),
                .visit-table td:nth-child(6) {
                    width: 125px;
                }

                .visit-table th:nth-child(7),
                .visit-table td:nth-child(7) {
                    width: 120px;
                }

                .visit-table th:nth-child(8),
                .visit-table td:nth-child(8) {
                    width: 230px;
                }

                .visit-id {
                    color: #8795aa;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .visit-person {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }

                .visit-person-icon {
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

                .visit-person-details {
                    min-width: 0;
                }

                .visit-person-name {
                    display: block;
                    color: #26334a;
                    font-size: 13px;
                    font-weight: 700;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .visit-person-subtitle {
                    display: block;
                    margin-top: 3px;
                    color: #99a5b7;
                    font-size: 11px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .visit-purpose {
                    display: inline-block;
                    max-width: 120px;
                    padding: 7px 10px;
                    border-radius: 8px;
                    background: #f3f6fa;
                    color: #5f6e85;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    vertical-align: middle;
                }

                .visit-access-code {
                    display: inline-flex;
                    align-items: center;
                    min-height: 32px;
                    padding: 0 10px;
                    border-radius: 8px;
                    background: #f1f5fb;
                    color: #27364f;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: .6px;
                    white-space: nowrap;
                }

                .visit-date {
                    color: #53627b;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .visit-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    min-height: 30px;
                    padding: 0 10px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 800;
                    white-space: nowrap;
                }

                .visit-status > span {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                }

                .visit-status.pending {
                    color: #c87500;
                    background: #fff7e8;
                }

                .visit-status.approved {
                    color: #047857;
                    background: #ecfdf5;
                }

                .visit-status.checked-in {
                    color: #2563eb;
                    background: #edf4ff;
                }

                .visit-status.checked-out {
                    color: #7c3aed;
                    background: #f3efff;
                }

                .visit-status.rejected {
                    color: #dc2626;
                    background: #fff1f2;
                }

                .visit-status.expired {
                    color: #64748b;
                    background: #f1f5f9;
                }

                .visit-actions {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    flex-wrap: nowrap;
                }

                .visit-action-button {
                    height: 34px;
                    border-radius: 9px;
                    padding: 0 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    border: 1px solid #dbe3ed;
                    background: white;
                    color: #45556f;
                    font-size: 11px;
                    font-weight: 800;
                    white-space: nowrap;
                    cursor: pointer;
                    transition: .18s ease;
                }

                .visit-action-button:hover:not(:disabled) {
                    background: #f8fafc;
                    border-color: #c7d3e2;
                    transform: translateY(-1px);
                }

                .visit-action-button:disabled {
                    opacity: .55;
                    cursor: not-allowed;
                }

                .visit-action-button.approve {
                    border-color: #bbf7d0;
                    background: #f0fdf4;
                    color: #15803d;
                }

                .visit-action-button.approve:hover:not(:disabled) {
                    background: #dcfce7;
                    border-color: #86efac;
                }

                .visit-action-button.reject {
                    border-color: #fecaca;
                    background: #fff7f7;
                    color: #dc2626;
                }

                .visit-action-button.reject:hover:not(:disabled) {
                    background: #fff1f2;
                    border-color: #fca5a5;
                }

                .visit-action-button.checkin {
                    border-color: #bfdbfe;
                    background: #eff6ff;
                    color: #2563eb;
                }

                .visit-action-button.checkin:hover:not(:disabled) {
                    background: #dbeafe;
                    border-color: #93c5fd;
                }

                .visit-action-button.checkout {
                    border-color: #ddd6fe;
                    background: #f5f3ff;
                    color: #7c3aed;
                }

                .visit-action-button.checkout:hover:not(:disabled) {
                    background: #ede9fe;
                    border-color: #c4b5fd;
                }

                .visit-completed {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: #64748b;
                    font-size: 12px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .visit-rejected {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: #dc2626;
                    font-size: 12px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .visit-empty {
                    min-height: 310px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 40px 20px;
                    color: #8796ad;
                }

                .visit-empty-icon {
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

                .visit-empty strong {
                    color: #253149;
                    font-size: 16px;
                    margin-bottom: 6px;
                }

                .visit-empty span {
                    font-size: 13px;
                }

                .visit-loading {
                    min-height: 310px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 13px;
                    color: #8796ad;
                    font-size: 13px;
                }

                .visit-spinner {
                    width: 28px;
                    height: 28px;
                    border: 3px solid #e5ebf3;
                    border-top-color: #2563eb;
                    border-radius: 50%;
                    animation: visitSpin .75s linear infinite;
                }

                .visit-small-spinner {
                    animation: visitSpin .75s linear infinite;
                }

                @keyframes visitSpin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                .visit-modal-overlay {
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

                .visit-modal {
                    width: 100%;
                    max-width: 500px;
                    background: white;
                    border-radius: 22px;
                    overflow: hidden;
                    box-shadow:
                        0 30px 80px rgba(15, 23, 42, .25);
                }

                .visit-modal-header {
                    padding: 23px 25px;
                    border-bottom: 1px solid #edf1f6;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .visit-modal-header h2 {
                    margin: 0;
                    font-size: 21px;
                    color: #172033;
                }

                .visit-modal-header p {
                    margin: 5px 0 0;
                    font-size: 12px;
                    color: #8a99b0;
                }

                .visit-close-button {
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

                .visit-close-button:hover:not(:disabled) {
                    background: #e9edf3;
                }

                .visit-close-button:disabled {
                    opacity: .5;
                    cursor: not-allowed;
                }

                .visit-modal-form {
                    padding: 24px 25px 25px;
                }

                .visit-form-group {
                    margin-bottom: 17px;
                }

                .visit-form-group label {
                    display: block;
                    margin-bottom: 7px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #344159;
                }

                .visit-form-group select,
                .visit-form-group textarea {
                    width: 100%;
                    box-sizing: border-box;
                    border: 1px solid #dce4ef;
                    border-radius: 10px;
                    outline: none;
                    font-size: 14px;
                    color: #253149;
                    background: white;
                    transition: .2s ease;
                }

                .visit-form-group select {
                    height: 46px;
                    padding: 0 13px;
                }

                .visit-form-group textarea {
                    min-height: 100px;
                    padding: 12px 13px;
                    resize: vertical;
                    font-family: inherit;
                }

                .visit-form-group select:focus,
                .visit-form-group textarea:focus {
                    border-color: #5b8def;
                    box-shadow:
                        0 0 0 4px rgba(37, 99, 235, .08);
                }

                .visit-form-group select:disabled,
                .visit-form-group textarea:disabled {
                    background: #f8fafc;
                    cursor: not-allowed;
                }

                .visit-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 23px;
                    padding-top: 18px;
                    border-top: 1px solid #edf1f6;
                }

                .visit-secondary-button {
                    height: 44px;
                    padding: 0 17px;
                    border-radius: 10px;
                    border: 1px solid #dce4ef;
                    background: white;
                    color: #52627d;
                    font-weight: 700;
                    cursor: pointer;
                }

                .visit-secondary-button:hover:not(:disabled) {
                    background: #f8fafc;
                }

                .visit-secondary-button:disabled {
                    opacity: .55;
                    cursor: not-allowed;
                }

                @media (max-width: 1200px) {
                    .visits-page {
                        padding-left: 25px;
                        padding-right: 25px;
                    }

                    .visit-stat-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 700px) {
                    .visits-page {
                        padding: 24px 18px 45px;
                    }

                    .visits-header {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .visits-actions {
                        width: 100%;
                    }

                    .visit-primary-button {
                        flex: 1;
                    }

                    .visit-stat-grid {
                        grid-template-columns: 1fr;
                    }

                    .visit-panel-header {
                        padding: 20px;
                    }

                    .visit-table th,
                    .visit-table td {
                        padding-left: 14px;
                        padding-right: 14px;
                    }
                }

            `}</style>

            {/* HEADER */}

            <div className="visits-header">

                <div className="visits-title-area">

                    <h1>
                        Visits
                    </h1>

                    <p>
                        Monitor visitor access and visit
                        activity across the estate.
                    </p>

                </div>

                <div className="visits-actions">

                    <button
                        className="visit-refresh-button"
                        onClick={loadVisits}
                        disabled={loading}
                        title="Refresh visits"
                    >
                        <RefreshCw
                            size={18}
                            className={
                                loading
                                    ? "visit-small-spinner"
                                    : ""
                            }
                        />
                    </button>

                    <button
                        className="visit-primary-button"
                        onClick={openCreateModal}
                    >
                        <Plus size={17} />
                        Create Visit
                    </button>

                </div>

            </div>

            {/* ERROR */}

            {error && (
                <div className="visit-alert error">

                    <Ban size={18} />

                    <div className="visit-alert-content">
                        <strong>
                            Something went wrong
                        </strong>

                        <span>
                            {error}
                        </span>
                    </div>

                </div>
            )}

            {/* SUCCESS */}

            {success && (
                <div className="visit-alert success">

                    <Check size={18} />

                    <div className="visit-alert-content">
                        <span>
                            {success}
                        </span>
                    </div>

                </div>
            )}

            {/* STATISTICS */}

            <div className="visit-stat-grid">

                <StatCard
                    icon={<CalendarDays size={21} />}
                    label="Total Visits"
                    value={visits.length}
                    description="All recorded visits"
                    loading={loading}
                    iconClass="blue"
                />

                <StatCard
                    icon={<Clock3 size={21} />}
                    label="Pending"
                    value={pendingCount}
                    description="Awaiting approval"
                    loading={loading}
                    iconClass="orange"
                />

                <StatCard
                    icon={<Check size={21} />}
                    label="Approved"
                    value={approvedCount}
                    description="Ready for check-in"
                    loading={loading}
                    iconClass="green"
                />

                <StatCard
                    icon={<LogIn size={21} />}
                    label="Checked In"
                    value={checkedInCount}
                    description="Currently inside"
                    loading={loading}
                    iconClass="purple"
                />

            </div>

            {/* ALL VISITS */}

            <section className="visit-panel">

                <div className="visit-panel-header">

                    <div>
                        <h2>
                            All Visits
                        </h2>

                        <p>
                            Visitor access records
                        </p>
                    </div>

                </div>

                {loading ? (

                    <div className="visit-loading">

                        <div className="visit-spinner"></div>

                        <span>
                            Loading visits...
                        </span>

                    </div>

                ) : visits.length === 0 ? (

                    <div className="visit-empty">

                        <div className="visit-empty-icon">
                            <CalendarDays size={27} />
                        </div>

                        <strong>
                            No visits found
                        </strong>

                        <span>
                            Create your first visit to
                            get started.
                        </span>

                    </div>

                ) : (

                    <div className="visit-table-scroll">

                        <table className="visit-table">

                            <thead>

                            <tr>

                                <th>
                                    ID
                                </th>

                                <th>
                                    Visitor
                                </th>

                                <th>
                                    Resident
                                </th>

                                <th>
                                    Purpose
                                </th>

                                <th>
                                    Access Code
                                </th>

                                <th>
                                    Visit Date
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Action
                                </th>

                            </tr>

                            </thead>

                            <tbody>

                            {visits.map((visit) => {

                                const visitor =
                                    visit.visitor || {};

                                const resident =
                                    visit.resident || {};

                                const visitorName =
                                    visitor.fullName ||
                                    "Unknown visitor";

                                const visitorPhone =
                                    visitor.phoneNumber ||
                                    "";

                                const residentName =
                                    resident.fullName ||
                                    "Unknown resident";

                                const residentHouse =
                                    resident.houseNumber ||
                                    "";

                                const isProcessing =
                                    processingVisitId ===
                                    visit.id;

                                return (

                                    <tr key={visit.id}>

                                        {/* ID */}

                                        <td>

                                            <span className="visit-id">
                                                #{visit.id}
                                            </span>

                                        </td>

                                        {/* VISITOR */}

                                        <td>

                                            <div className="visit-person">

                                                <div className="visit-person-icon">
                                                    <UserRound
                                                        size={17}
                                                    />
                                                </div>

                                                <div className="visit-person-details">

                                                    <span className="visit-person-name">
                                                        {visitorName}
                                                    </span>

                                                    {visitorPhone && (
                                                        <span className="visit-person-subtitle">
                                                            {visitorPhone}
                                                        </span>
                                                    )}

                                                </div>

                                            </div>

                                        </td>

                                        {/* RESIDENT */}

                                        <td>

                                            <div className="visit-person">

                                                <div className="visit-person-icon">
                                                    <Users
                                                        size={17}
                                                    />
                                                </div>

                                                <div className="visit-person-details">

                                                    <span className="visit-person-name">
                                                        {residentName}
                                                    </span>

                                                    {residentHouse && (
                                                        <span className="visit-person-subtitle">
                                                            House{" "}
                                                            {residentHouse}
                                                        </span>
                                                    )}

                                                </div>

                                            </div>

                                        </td>

                                        {/* PURPOSE */}

                                        <td>

                                            <span
                                                className="visit-purpose"
                                                title={
                                                    visit.purpose ||
                                                    "General visit"
                                                }
                                            >
                                                {visit.purpose ||
                                                    "General visit"}
                                            </span>

                                        </td>

                                        {/* ACCESS CODE */}

                                        <td>

                                            <span className="visit-access-code">
                                                {visit.accessCode ||
                                                    "—"}
                                            </span>

                                        </td>

                                        {/* DATE */}

                                        <td>

                                            <span className="visit-date">
                                                {formatDate(
                                                    visit.visitDate
                                                )}
                                            </span>

                                        </td>

                                        {/* STATUS */}

                                        <td>

                                            <span
                                                className={getStatusClass(
                                                    visit.status
                                                )}
                                            >
                                                <span></span>

                                                {formatStatus(
                                                    visit.status
                                                )}
                                            </span>

                                        </td>

                                        {/* ACTION */}

                                        <td>

                                            {visit.status ===
                                                "PENDING" && (

                                                    <div className="visit-actions">

                                                        <button
                                                            className="visit-action-button approve"
                                                            onClick={() =>
                                                                handleApprove(
                                                                    visit.id
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >

                                                            {isProcessing ? (
                                                                <RefreshCw
                                                                    size={14}
                                                                    className="visit-small-spinner"
                                                                />
                                                            ) : (
                                                                <Check
                                                                    size={14}
                                                                />
                                                            )}

                                                            {isProcessing
                                                                ? "Processing"
                                                                : "Approve"}

                                                        </button>

                                                        <button
                                                            className="visit-action-button reject"
                                                            onClick={() =>
                                                                handleReject(
                                                                    visit.id
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >

                                                            <Ban
                                                                size={14}
                                                            />

                                                            Reject

                                                        </button>

                                                    </div>

                                                )}

                                            {visit.status ===
                                                "APPROVED" && (

                                                    <button
                                                        className="visit-action-button checkin"
                                                        onClick={() =>
                                                            handleCheckIn(
                                                                visit.accessCode,
                                                                visit.id
                                                            )
                                                        }
                                                        disabled={
                                                            isProcessing
                                                        }
                                                    >

                                                        {isProcessing ? (
                                                            <RefreshCw
                                                                size={14}
                                                                className="visit-small-spinner"
                                                            />
                                                        ) : (
                                                            <LogIn
                                                                size={14}
                                                            />
                                                        )}

                                                        {isProcessing
                                                            ? "Checking In"
                                                            : "Check In"}

                                                    </button>

                                                )}

                                            {visit.status ===
                                                "CHECKED_IN" && (

                                                    <button
                                                        className="visit-action-button checkout"
                                                        onClick={() =>
                                                            handleCheckOut(
                                                                visit.accessCode,
                                                                visit.id
                                                            )
                                                        }
                                                        disabled={
                                                            isProcessing
                                                        }
                                                    >

                                                        {isProcessing ? (
                                                            <RefreshCw
                                                                size={14}
                                                                className="visit-small-spinner"
                                                            />
                                                        ) : (
                                                            <LogOut
                                                                size={14}
                                                            />
                                                        )}

                                                        {isProcessing
                                                            ? "Checking Out"
                                                            : "Check Out"}

                                                    </button>

                                                )}

                                            {visit.status ===
                                                "CHECKED_OUT" && (

                                                    <span className="visit-completed">

                                                        <Check
                                                            size={14}
                                                        />

                                                        Completed

                                                    </span>

                                                )}

                                            {visit.status ===
                                                "REJECTED" && (

                                                    <span className="visit-rejected">

                                                        <Ban
                                                            size={14}
                                                        />

                                                        Rejected

                                                    </span>

                                                )}

                                            {visit.status ===
                                                "EXPIRED" && (

                                                    <span className="visit-completed">

                                                        Expired

                                                    </span>

                                                )}

                                        </td>

                                    </tr>

                                );
                            })}

                            </tbody>

                        </table>

                    </div>

                )}

            </section>

            {/* CREATE VISIT MODAL */}

            {showCreateModal && (

                <div
                    className="visit-modal-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeCreateModal();
                        }

                    }}
                >

                    <div className="visit-modal">

                        <div className="visit-modal-header">

                            <div>

                                <h2>
                                    Create Visit
                                </h2>

                                <p>
                                    Create a new visitor
                                    access record.
                                </p>

                            </div>

                            <button
                                className="visit-close-button"
                                onClick={closeCreateModal}
                                disabled={creating}
                            >
                                <X size={19} />
                            </button>

                        </div>

                        <form
                            onSubmit={handleCreateVisit}
                            className="visit-modal-form"
                        >

                            <div className="visit-form-group">

                                <label>
                                    Resident
                                </label>

                                <select
                                    value={residentId}
                                    onChange={(event) =>
                                        setResidentId(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        creating ||
                                        loadingResidents
                                    }
                                >

                                    <option value="">
                                        {loadingResidents
                                            ? "Loading residents..."
                                            : "Select resident"}
                                    </option>

                                    {residents.map(
                                        (resident) => (

                                            <option
                                                key={
                                                    resident.id
                                                }
                                                value={
                                                    resident.id
                                                }
                                            >
                                                {resident.fullName}

                                                {resident.houseNumber
                                                    ? ` — House ${resident.houseNumber}`
                                                    : ""}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            <div className="visit-form-group">

                                <label>
                                    Visitor
                                </label>

                                <select
                                    value={visitorId}
                                    onChange={(event) =>
                                        setVisitorId(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        creating ||
                                        loadingVisitors
                                    }
                                >

                                    <option value="">
                                        {loadingVisitors
                                            ? "Loading visitors..."
                                            : "Select visitor"}
                                    </option>

                                    {visitors.map(
                                        (visitor) => (

                                            <option
                                                key={
                                                    visitor.id
                                                }
                                                value={
                                                    visitor.id
                                                }
                                            >
                                                {visitor.fullName}
                                                {" — "}
                                                {
                                                    visitor.phoneNumber
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>

                            <div className="visit-form-group">

                                <label>
                                    Purpose
                                </label>

                                <textarea
                                    value={purpose}
                                    onChange={(event) =>
                                        setPurpose(
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. Visiting resident"
                                    rows={4}
                                    disabled={creating}
                                />

                            </div>

                            <div className="visit-modal-actions">

                                <button
                                    type="button"
                                    className="visit-secondary-button"
                                    onClick={
                                        closeCreateModal
                                    }
                                    disabled={creating}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="visit-primary-button"
                                    disabled={creating}
                                >
                                    {creating
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
}

function StatCard({
                      icon,
                      label,
                      value,
                      description,
                      loading,
                      iconClass,
                  }) {
    return (
        <div className="visit-stat-card">

            <div
                className={`visit-stat-icon ${iconClass}`}
            >
                {icon}
            </div>

            <span className="visit-stat-label">
                {label}
            </span>

            <strong className="visit-stat-value">
                {loading ? "—" : value}
            </strong>

            <p className="visit-stat-description">
                {description}
            </p>

        </div>
    );
}

export default VisitsPage;
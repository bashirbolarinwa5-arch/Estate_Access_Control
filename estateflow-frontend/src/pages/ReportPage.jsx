import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Eye,
    LogIn,
    LogOut,
    RefreshCw,
    Search,
    Users,
    X,
} from "lucide-react";

import api from "../services/api";

function ReportsPage() {
    const [todayVisits, setTodayVisits] = useState([]);
    const [currentlyInside, setCurrentlyInside] = useState([]);
    const [allVisits, setAllVisits] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [activeTab, setActiveTab] = useState("today");
    const [search, setSearch] = useState("");

    const [selectedVisit, setSelectedVisit] = useState(null);

    async function loadReports() {
        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const [
                todayResponse,
                insideResponse,
                visitsResponse,
            ] = await Promise.all([
                api.get("/api/reports/today"),
                api.get("/api/reports/currently-inside"),
                api.get("/api/reports/visits"),
            ]);

            const extractData = (response) => {
                const data = response.data;

                if (Array.isArray(data)) {
                    return data;
                }

                if (Array.isArray(data?.data)) {
                    return data.data;
                }

                return [];
            };

            setTodayVisits(extractData(todayResponse));
            setCurrentlyInside(extractData(insideResponse));
            setAllVisits(extractData(visitsResponse));
        } catch (err) {
            console.error("Failed to load reports:", err);

            setError(
                err.response?.data?.message ||
                "Failed to load reports."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadReports();
    }, []);

    function getActiveData() {
        switch (activeTab) {
            case "today":
                return todayVisits;

            case "inside":
                return currentlyInside;

            case "all":
                return allVisits;

            default:
                return todayVisits;
        }
    }

    const activeData = getActiveData();

    const filteredVisits = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return activeData;
        }

        return activeData.filter((visit) => {
            const visitorName =
                visit.visitor?.fullName || "";

            const residentName =
                visit.resident?.fullName || "";

            const purpose =
                visit.purpose || "";

            const accessCode =
                visit.accessCode || "";

            const status =
                visit.status || "";

            const visitDate =
                visit.visitDate || "";

            return [
                visitorName,
                residentName,
                purpose,
                accessCode,
                status,
                visitDate,
            ]
                .filter(Boolean)
                .some((field) =>
                    String(field)
                        .toLowerCase()
                        .includes(value)
                );
        });
    }, [activeData, search]);

    const totalVisits = allVisits.length;

    const totalToday = todayVisits.length;

    const insideCount = currentlyInside.length;

    const completedCount = allVisits.filter(
        (visit) => visit.status === "CHECKED_OUT"
    ).length;

    function formatStatus(status) {
        if (!status) {
            return "Unknown";
        }

        switch (status) {
            case "PENDING":
                return "Pending";

            case "CHECKED_IN":
                return "Checked In";

            case "CHECKED_OUT":
                return "Checked Out";

            case "EXPIRED":
                return "Expired";

            default:
                return status
                    .replaceAll("_", " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (letter) =>
                        letter.toUpperCase()
                    );
        }
    }

    function getStatusClass(status) {
        switch (status) {
            case "PENDING":
                return "report-status pending";

            case "CHECKED_IN":
                return "report-status checked-in";

            case "CHECKED_OUT":
                return "report-status checked-out";

            case "EXPIRED":
                return "report-status expired";

            default:
                return "report-status";
        }
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    function formatTime(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getInitials(name) {
        if (!name) {
            return "V";
        }

        const parts = String(name)
            .trim()
            .split(/\s+/);

        if (parts.length === 1) {
            return parts[0]
                .charAt(0)
                .toUpperCase();
        }

        return (
            parts[0].charAt(0) +
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }

    function openDetails(visit) {
        setSelectedVisit(visit);
    }

    function closeDetails() {
        setSelectedVisit(null);
    }

    function changeTab(tab) {
        setActiveTab(tab);
        setSearch("");
        setError("");
        setSuccess("");
    }

    return (
        <div className="reports-page">

            <style>{`
                .reports-page {
                    min-height: 100%;
                    padding: 34px 40px 60px;
                    color: #172033;
                }

                .reports-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 24px;
                    margin-bottom: 28px;
                }

                .reports-eyebrow {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 9px;
                    color: #64748b;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.2px;
                }

                .reports-eyebrow-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #2563eb;
                    box-shadow:
                        0 0 0 4px rgba(37, 99, 235, .10);
                }

                .reports-header h1 {
                    margin: 0;
                    font-size: 38px;
                    line-height: 1.1;
                    letter-spacing: -1.2px;
                }

                .reports-header p {
                    margin: 9px 0 0;
                    color: #8190a7;
                    font-size: 15px;
                }

                .reports-refresh-button {
                    width: 48px;
                    height: 48px;
                    border: 1px solid #dce4ef;
                    border-radius: 12px;
                    background: white;
                    color: #52627d;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: .2s ease;
                }

                .reports-refresh-button:hover:not(:disabled) {
                    border-color: #c8d4e5;
                    color: #2563eb;
                    transform: translateY(-1px);
                    box-shadow:
                        0 7px 20px rgba(27, 45, 78, .07);
                }

                .reports-refresh-button:disabled {
                    opacity: .6;
                    cursor: not-allowed;
                }

                .reports-spin {
                    animation: reportsSpin .8s linear infinite;
                }

                @keyframes reportsSpin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                .reports-alert {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 17px;
                    border-radius: 13px;
                    margin-bottom: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .reports-alert.error {
                    background: #fff1f2;
                    border: 1px solid #fecdd3;
                    color: #be123c;
                }

                .reports-alert.success {
                    background: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    color: #047857;
                }

                .reports-stat-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 18px;
                    margin-bottom: 22px;
                }

                .reports-stat-card {
                    background: white;
                    border: 1px solid #e3e9f2;
                    border-radius: 18px;
                    padding: 21px;
                    box-shadow:
                        0 8px 25px rgba(30, 50, 85, .035);
                    transition: .2s ease;
                }

                .reports-stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow:
                        0 12px 30px rgba(30, 50, 85, .06);
                }

                .reports-stat-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }

                .reports-stat-icon {
                    width: 47px;
                    height: 47px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .reports-stat-icon.blue {
                    background: #edf4ff;
                    color: #2563eb;
                }

                .reports-stat-icon.orange {
                    background: #fff7ed;
                    color: #ea580c;
                }

                .reports-stat-icon.green {
                    background: #ecfdf5;
                    color: #059669;
                }

                .reports-stat-icon.purple {
                    background: #f5f3ff;
                    color: #7c3aed;
                }

                .reports-stat-label {
                    color: #8492a8;
                    font-size: 12px;
                    font-weight: 700;
                }

                .reports-stat-value {
                    display: block;
                    margin-top: 14px;
                    font-size: 29px;
                    line-height: 1;
                    letter-spacing: -.8px;
                    color: #172033;
                }

                .reports-stat-description {
                    margin: 8px 0 0;
                    color: #94a0b3;
                    font-size: 12px;
                }

                .reports-panel {
                    background: white;
                    border: 1px solid #e3e9f2;
                    border-radius: 19px;
                    overflow: hidden;
                    box-shadow:
                        0 8px 25px rgba(30, 50, 85, .035);
                }

                .reports-panel-header {
                    padding: 22px 24px 18px;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 20px;
                    border-bottom: 1px solid #edf1f6;
                }

                .reports-panel-title h2 {
                    margin: 0;
                    font-size: 19px;
                    letter-spacing: -.3px;
                }

                .reports-panel-title p {
                    margin: 5px 0 0;
                    color: #8997ab;
                    font-size: 13px;
                }

                .reports-tabs {
                    display: flex;
                    gap: 5px;
                    padding: 4px;
                    background: #f4f7fb;
                    border: 1px solid #e7ecf3;
                    border-radius: 11px;
                }

                .reports-tab {
                    border: none;
                    background: transparent;
                    color: #7c8aa0;
                    padding: 9px 13px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: .2s ease;
                    white-space: nowrap;
                }

                .reports-tab:hover {
                    color: #3c4d68;
                }

                .reports-tab.active {
                    background: white;
                    color: #2563eb;
                    box-shadow:
                        0 2px 8px rgba(30, 50, 85, .08);
                }

                .reports-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 16px 24px;
                    border-bottom: 1px solid #edf1f6;
                }

                .reports-search {
                    position: relative;
                    flex: 1;
                }

                .reports-search svg {
                    position: absolute;
                    left: 15px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9aa7ba;
                }

                .reports-search input {
                    width: 100%;
                    height: 45px;
                    box-sizing: border-box;
                    border: 1px solid #dce4ef;
                    border-radius: 11px;
                    outline: none;
                    padding: 0 15px 0 44px;
                    color: #26334b;
                    font-size: 13px;
                    transition: .2s ease;
                }

                .reports-search input:focus {
                    border-color: #5d8eea;
                    box-shadow:
                        0 0 0 4px rgba(37, 99, 235, .08);
                }

                .reports-result-count {
                    color: #8a98ad;
                    font-size: 12px;
                    white-space: nowrap;
                }

                .reports-table-wrapper {
                    width: 100%;
                    overflow-x: auto;
                }

                .reports-table {
                    width: 100%;
                    min-width: 980px;
                    border-collapse: collapse;
                }

                .reports-table th {
                    padding: 14px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e7edf4;
                    text-align: left;
                    color: #8491a6;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .75px;
                    text-transform: uppercase;
                    white-space: nowrap;
                }

                .reports-table td {
                    padding: 16px 20px;
                    border-bottom: 1px solid #eef2f7;
                    color: #52617a;
                    font-size: 13px;
                    vertical-align: middle;
                    white-space: nowrap;
                }

                .reports-table tbody tr {
                    transition: background .15s ease;
                }

                .reports-table tbody tr:hover {
                    background: #fbfdff;
                }

                .reports-table tbody tr:last-child td {
                    border-bottom: none;
                }

                .report-visitor {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    min-width: 165px;
                }

                .report-avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 11px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: #edf4ff;
                    color: #2563eb;
                    font-size: 12px;
                    font-weight: 800;
                }

                .report-visitor-name {
                    color: #26334a;
                    font-weight: 700;
                }

                .report-visitor-label {
                    margin-top: 3px;
                    color: #9aa6b8;
                    font-size: 11px;
                }

                .report-resident {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #465570;
                    font-weight: 600;
                }

                .report-purpose {
                    display: inline-flex;
                    max-width: 180px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    padding: 6px 9px;
                    border-radius: 8px;
                    background: #f4f6fa;
                    color: #62718a;
                    font-size: 11px;
                    font-weight: 700;
                }

                .report-access-code {
                    display: inline-flex;
                    align-items: center;
                    padding: 7px 10px;
                    border: 1px solid #e1e8f1;
                    border-radius: 8px;
                    background: #f8fafc;
                    color: #34445f;
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: .6px;
                }

                .report-date {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    color: #56657d;
                }

                .report-time {
                    color: #63718a;
                    font-size: 12px;
                    font-weight: 600;
                }

                .report-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    padding: 7px 10px;
                    border-radius: 20px;
                    background: #f3f4f6;
                    color: #6b7280;
                    font-size: 11px;
                    font-weight: 800;
                    white-space: nowrap;
                }

                .report-status > span {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                }

                .report-status.pending {
                    background: #fff7ed;
                    color: #c2410c;
                }

                .report-status.checked-in {
                    background: #ecfdf5;
                    color: #047857;
                }

                .report-status.checked-out {
                    background: #f5f3ff;
                    color: #6d28d9;
                }

                .report-status.expired {
                    background: #fef2f2;
                    color: #dc2626;
                }

                .report-action-button {
                    height: 35px;
                    padding: 0 11px;
                    border: 1px solid #dce4ef;
                    border-radius: 9px;
                    background: white;
                    color: #52627d;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: .2s ease;
                }

                .report-action-button:hover {
                    border-color: #bfcce0;
                    color: #2563eb;
                    background: #f9fbff;
                }

                .reports-empty {
                    padding: 70px 25px;
                    text-align: center;
                    color: #8795aa;
                }

                .reports-empty-icon {
                    width: 65px;
                    height: 65px;
                    margin: 0 auto 16px;
                    border-radius: 20px;
                    background: #f0f5ff;
                    color: #6d8fd8;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .reports-empty h3 {
                    margin: 0 0 7px;
                    color: #29364d;
                    font-size: 17px;
                }

                .reports-empty p {
                    margin: 0;
                    font-size: 13px;
                }

                .reports-loading {
                    padding: 70px 25px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    color: #8795aa;
                    font-size: 13px;
                }

                .reports-modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    background: rgba(15, 23, 42, .48);
                    backdrop-filter: blur(4px);
                }

                .reports-modal {
                    width: 100%;
                    max-width: 510px;
                    background: white;
                    border-radius: 21px;
                    overflow: hidden;
                    box-shadow:
                        0 30px 80px rgba(15, 23, 42, .25);
                }

                .reports-modal-header {
                    padding: 22px 24px;
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 15px;
                    border-bottom: 1px solid #edf1f6;
                }

                .reports-modal-header h2 {
                    margin: 0;
                    color: #1e293b;
                    font-size: 20px;
                }

                .reports-modal-header p {
                    margin: 5px 0 0;
                    color: #8997aa;
                    font-size: 12px;
                }

                .reports-modal-close {
                    width: 35px;
                    height: 35px;
                    border: none;
                    border-radius: 9px;
                    background: #f4f6f9;
                    color: #65748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .reports-modal-close:hover {
                    background: #edf1f6;
                    color: #26334a;
                }

                .reports-modal-body {
                    padding: 22px 24px 25px;
                }

                .reports-detail-person {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    padding: 15px;
                    border-radius: 13px;
                    background: #f7f9fc;
                    margin-bottom: 18px;
                }

                .reports-detail-avatar {
                    width: 45px;
                    height: 45px;
                    border-radius: 13px;
                    background: #eaf2ff;
                    color: #2563eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                }

                .reports-detail-person strong {
                    display: block;
                    color: #26334a;
                    font-size: 14px;
                }

                .reports-detail-person span {
                    display: block;
                    margin-top: 3px;
                    color: #8997aa;
                    font-size: 11px;
                }

                .reports-details-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .reports-detail-item {
                    padding: 13px;
                    border: 1px solid #e7ecf3;
                    border-radius: 11px;
                }

                .reports-detail-item.full {
                    grid-column: 1 / -1;
                }

                .reports-detail-label {
                    margin-bottom: 5px;
                    color: #94a0b2;
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: .6px;
                }

                .reports-detail-value {
                    color: #3c4b64;
                    font-size: 13px;
                    font-weight: 700;
                }

                @media (max-width: 1100px) {
                    .reports-stat-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .reports-panel-header {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .reports-tabs {
                        width: fit-content;
                    }
                }

                @media (max-width: 800px) {
                    .reports-page {
                        padding: 25px 22px 45px;
                    }

                    .reports-header {
                        align-items: stretch;
                        flex-direction: column;
                    }

                    .reports-stat-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                @media (max-width: 600px) {
                    .reports-page {
                        padding: 22px 15px 40px;
                    }

                    .reports-header h1 {
                        font-size: 31px;
                    }

                    .reports-stat-grid {
                        grid-template-columns: 1fr;
                    }

                    .reports-tabs {
                        width: 100%;
                        overflow-x: auto;
                    }

                    .reports-tab {
                        flex: 1;
                    }

                    .reports-toolbar {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .reports-result-count {
                        padding-left: 2px;
                    }

                    .reports-details-grid {
                        grid-template-columns: 1fr;
                    }

                    .reports-detail-item.full {
                        grid-column: auto;
                    }
                }
            `}</style>

            <div className="reports-header">
                <div>
                    <div className="reports-eyebrow">
                        <span className="reports-eyebrow-dot"></span>
                        ESTATE REPORTING
                    </div>

                    <h1>Reports</h1>

                    <p>
                        Monitor visitor activity and access
                        records across the estate.
                    </p>
                </div>

                <button
                    className="reports-refresh-button"
                    onClick={loadReports}
                    disabled={loading}
                    title="Refresh reports"
                >
                    <RefreshCw
                        size={18}
                        className={
                            loading
                                ? "reports-spin"
                                : ""
                        }
                    />
                </button>
            </div>

            {error && (
                <div className="reports-alert error">
                    <Activity size={18} />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="reports-alert success">
                    <CheckCircle2 size={18} />
                    <span>{success}</span>
                </div>
            )}

            <div className="reports-stat-grid">

                <ReportStatCard
                    icon={<CalendarDays size={21} />}
                    label="Total Visits"
                    value={totalVisits}
                    description="All recorded visits"
                    iconClass="blue"
                    loading={loading}
                />

                <ReportStatCard
                    icon={<Clock3 size={21} />}
                    label="Today's Visits"
                    value={totalToday}
                    description="Visits recorded today"
                    iconClass="orange"
                    loading={loading}
                />

                <ReportStatCard
                    icon={<LogIn size={21} />}
                    label="Currently Inside"
                    value={insideCount}
                    description="Visitors currently inside"
                    iconClass="green"
                    loading={loading}
                />

                <ReportStatCard
                    icon={<LogOut size={21} />}
                    label="Completed"
                    value={completedCount}
                    description="Checked-out visits"
                    iconClass="purple"
                    loading={loading}
                />

            </div>

            <section className="reports-panel">

                <div className="reports-panel-header">

                    <div className="reports-panel-title">
                        <h2>Visit Reports</h2>

                        <p>
                            Detailed visitor access activity
                        </p>
                    </div>

                    <div className="reports-tabs">

                        <button
                            className={`reports-tab ${
                                activeTab === "today"
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                changeTab("today")
                            }
                        >
                            Today's Visits
                        </button>

                        <button
                            className={`reports-tab ${
                                activeTab === "inside"
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                changeTab("inside")
                            }
                        >
                            Currently Inside
                        </button>

                        <button
                            className={`reports-tab ${
                                activeTab === "all"
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                changeTab("all")
                            }
                        >
                            All Visits
                        </button>

                    </div>

                </div>

                <div className="reports-toolbar">

                    <div className="reports-search">

                        <Search size={18} />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search visitor, resident, purpose or access code..."
                        />

                    </div>

                    <div className="reports-result-count">
                        Showing {filteredVisits.length} of{" "}
                        {activeData.length}
                    </div>

                </div>

                {loading ? (
                    <div className="reports-loading">

                        <RefreshCw
                            size={27}
                            className="reports-spin"
                        />

                        <span>
                            Loading reports...
                        </span>

                    </div>
                ) : filteredVisits.length === 0 ? (
                    <div className="reports-empty">

                        <div className="reports-empty-icon">
                            <Activity size={27} />
                        </div>

                        <h3>
                            {search
                                ? "No matching records"
                                : "No report records"}
                        </h3>

                        <p>
                            {search
                                ? "Try a different search term."
                                : "There are no visit records available for this report."}
                        </p>

                    </div>
                ) : (
                    <div className="reports-table-wrapper">

                        <table className="reports-table">

                            <thead>
                            <tr>
                                <th>Visitor</th>
                                <th>Resident</th>
                                <th>Purpose</th>
                                <th>Access Code</th>
                                <th>Visit Date</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                            </thead>

                            <tbody>

                            {filteredVisits.map((visit) => {

                                const visitorName =
                                    visit.visitor?.fullName ||
                                    "Unknown visitor";

                                const residentName =
                                    visit.resident?.fullName ||
                                    "Unknown resident";

                                return (
                                    <tr key={visit.id}>

                                        <td>
                                            <div className="report-visitor">

                                                <div className="report-avatar">
                                                    {getInitials(
                                                        visitorName
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="report-visitor-name">
                                                        {visitorName}
                                                    </div>

                                                    <div className="report-visitor-label">
                                                        Visitor #{visit.id}
                                                    </div>
                                                </div>

                                            </div>
                                        </td>

                                        <td>
                                            <div className="report-resident">
                                                <Users size={14} />
                                                {residentName}
                                            </div>
                                        </td>

                                        <td>
                                            <span
                                                className="report-purpose"
                                                title={
                                                    visit.purpose ||
                                                    "General visit"
                                                }
                                            >
                                                {visit.purpose ||
                                                    "General visit"}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="report-access-code">
                                                {visit.accessCode ||
                                                    "—"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="report-date">
                                                <CalendarDays
                                                    size={14}
                                                />

                                                {formatDate(
                                                    visit.visitDate
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            <span className="report-time">
                                                {formatTime(
                                                    visit.checkInTime
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="report-time">
                                                {formatTime(
                                                    visit.checkOutTime
                                                )}
                                            </span>
                                        </td>

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

                                        <td>
                                            <button
                                                className="report-action-button"
                                                onClick={() =>
                                                    openDetails(
                                                        visit
                                                    )
                                                }
                                            >
                                                <Eye size={14} />
                                                View
                                            </button>
                                        </td>

                                    </tr>
                                );
                            })}

                            </tbody>

                        </table>

                    </div>
                )}

            </section>

            {selectedVisit && (
                <div
                    className="reports-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeDetails();
                        }
                    }}
                >

                    <div className="reports-modal">

                        <div className="reports-modal-header">

                            <div>
                                <h2>Visit Details</h2>

                                <p>
                                    Complete information for
                                    this visit record.
                                </p>
                            </div>

                            <button
                                className="reports-modal-close"
                                onClick={closeDetails}
                            >
                                <X size={18} />
                            </button>

                        </div>

                        <div className="reports-modal-body">

                            <div className="reports-detail-person">

                                <div className="reports-detail-avatar">
                                    {getInitials(
                                        selectedVisit
                                            .visitor
                                            ?.fullName
                                    )}
                                </div>

                                <div>
                                    <strong>
                                        {selectedVisit
                                                .visitor
                                                ?.fullName ||
                                            "Unknown visitor"}
                                    </strong>

                                    <span>
                                        Visit #
                                        {selectedVisit.id}
                                    </span>
                                </div>

                            </div>

                            <div className="reports-details-grid">

                                <DetailItem
                                    label="Resident"
                                    value={
                                        selectedVisit
                                            .resident
                                            ?.fullName ||
                                        "—"
                                    }
                                />

                                <DetailItem
                                    label="Access Code"
                                    value={
                                        selectedVisit.accessCode ||
                                        "—"
                                    }
                                />

                                <DetailItem
                                    label="Visit Date"
                                    value={formatDate(
                                        selectedVisit.visitDate
                                    )}
                                />

                                <DetailItem
                                    label="Status"
                                    value={
                                        formatStatus(
                                            selectedVisit.status
                                        )
                                    }
                                />

                                <DetailItem
                                    label="Check In"
                                    value={formatTime(
                                        selectedVisit.checkInTime
                                    )}
                                />

                                <DetailItem
                                    label="Check Out"
                                    value={formatTime(
                                        selectedVisit.checkOutTime
                                    )}
                                />

                                <DetailItem
                                    label="Purpose"
                                    value={
                                        selectedVisit.purpose ||
                                        "General visit"
                                    }
                                    full
                                />

                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

function ReportStatCard({
                            icon,
                            label,
                            value,
                            description,
                            iconClass,
                            loading,
                        }) {
    return (
        <div className="reports-stat-card">

            <div className="reports-stat-top">

                <div
                    className={`reports-stat-icon ${iconClass}`}
                >
                    {icon}
                </div>

                <span className="reports-stat-label">
                    {label}
                </span>

            </div>

            <strong className="reports-stat-value">
                {loading ? "—" : value}
            </strong>

            <p className="reports-stat-description">
                {description}
            </p>

        </div>
    );
}

function DetailItem({
                        label,
                        value,
                        full = false,
                    }) {
    return (
        <div
            className={`reports-detail-item ${
                full ? "full" : ""
            }`}
        >
            <div className="reports-detail-label">
                {label}
            </div>

            <div className="reports-detail-value">
                {value}
            </div>
        </div>
    );
}

export default ReportsPage;
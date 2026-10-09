
import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    CalendarDays,
    Clock3,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";

import api from "../services/api";

function ActivityLogs() {
    const [logs, setLogs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [selectedLog, setSelectedLog] = useState(null);

    async function loadLogs() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/api/activity-logs");

            const data = response.data;

            const logList = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            setLogs(logList);
        } catch (err) {
            console.error("Failed to load activity logs:", err);

            setError(
                err.response?.data?.message ||
                "Failed to load activity logs."
            );

            setLogs([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return logs;
        }

        return logs.filter((log) => {
            return [
                log.actor,
                log.action,
                log.description,
                log.timestamp,
            ]
                .filter(Boolean)
                .some((field) =>
                    String(field)
                        .toLowerCase()
                        .includes(value)
                );
        });
    }, [logs, search]);

    const todayLogs = useMemo(() => {
        const today = new Date().toDateString();

        return logs.filter((log) => {
            if (!log.timestamp) {
                return false;
            }

            const date = new Date(log.timestamp);

            return (
                !Number.isNaN(date.getTime()) &&
                date.toDateString() === today
            );
        }).length;
    }, [logs]);

    const uniqueActors = useMemo(() => {
        return new Set(
            logs
                .map((log) => log.actor)
                .filter(Boolean)
        ).size;
    }, [logs]);

    function formatDateTime(timestamp) {
        if (!timestamp) {
            return "—";
        }

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return timestamp;
        }

        return date.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function formatDate(timestamp) {
        if (!timestamp) {
            return "—";
        }

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return timestamp;
        }

        return date.toLocaleDateString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function formatTime(timestamp) {
        if (!timestamp) {
            return "—";
        }

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return timestamp;
        }

        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getInitials(actor) {
        if (!actor) {
            return "SY";
        }

        const value = String(actor).trim();

        if (!value) {
            return "SY";
        }

        const parts = value.split(/\s+/);

        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }

        return (
            parts[0].charAt(0) +
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }

    function getActionClass(action) {
        if (!action) {
            return "neutral";
        }

        const value = String(action).toLowerCase();

        if (
            value.includes("create") ||
            value.includes("add") ||
            value.includes("register")
        ) {
            return "create";
        }

        if (
            value.includes("update") ||
            value.includes("edit") ||
            value.includes("modify")
        ) {
            return "update";
        }

        if (
            value.includes("delete") ||
            value.includes("remove")
        ) {
            return "delete";
        }

        if (
            value.includes("login") ||
            value.includes("check") ||
            value.includes("access")
        ) {
            return "access";
        }

        return "neutral";
    }

    function getActionLabel(action) {
        if (!action) {
            return "Activity";
        }

        return String(action)
            .replaceAll("_", " ")
            .replaceAll("-", " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    }

    function clearSearch() {
        setSearch("");
    }

    return (
        <div className="activity-page">

            <style>{`
    .activity-page {
    min-height: 100%;
    padding: 34px 40px 60px;
    color: #172033;
}

.activity-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
}

.activity-title-area h1 {
    margin: 0;
    font-size: 38px;
    line-height: 1.1;
    letter-spacing: -1.2px;
}

.activity-title-area p {
    margin: 9px 0 0;
    color: #8090aa;
    font-size: 15px;
}

.activity-actions {
    display: flex;
    gap: 12px;
}

.activity-refresh-button {
    height: 48px;
    padding: 0 18px;
    border: 1px solid #dce4f0;
    border-radius: 12px;
    background: white;
    color: #52627d;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-weight: 700;
    cursor: pointer;
    transition: .2s ease;
}

.activity-refresh-button:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: #c7d3e5;
    box-shadow:
    0 7px 20px rgba(27, 45, 78, .07);
}

.activity-refresh-button:disabled {
    opacity: .65;
    cursor: not-allowed;
}

.activity-alert {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 14px 17px;
    border-radius: 13px;
    margin-bottom: 20px;
    font-size: 14px;
    font-weight: 600;
}

.activity-alert.error {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #be123c;
}

.activity-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    margin-bottom: 20px;
}

.activity-summary-card {
    background: white;
    border: 1px solid #e3e9f2;
    border-radius: 18px;
    padding: 22px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow:
    0 8px 25px rgba(30, 50, 85, .035);
}

.activity-summary-icon {
    width: 52px;
    height: 52px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #edf4ff;
    color: #2563eb;
    flex-shrink: 0;
}

.activity-summary-icon.green {
    background: #ecfdf5;
    color: #059669;
}

.activity-summary-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
}

.activity-summary-card strong {
    display: block;
    font-size: 26px;
    letter-spacing: -.5px;
}

.activity-summary-card span {
    color: #8a99b0;
    font-size: 13px;
    margin-top: 3px;
    display: block;
}

.activity-toolbar {
    background: white;
    border: 1px solid #e3e9f2;
    border-radius: 18px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
}

.activity-search {
    flex: 1;
    position: relative;
}

.activity-search > svg {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: #93a2b8;
}

.activity-search input {
    width: 100%;
    height: 48px;
    box-sizing: border-box;
    border: 1px solid #dce4ef;
    border-radius: 12px;
    outline: none;
    padding: 0 44px 0 46px;
    font-size: 14px;
    color: #172033;
    transition: .2s ease;
}

.activity-search input:focus {
    border-color: #6090ed;
    box-shadow:
    0 0 0 4px rgba(37, 99, 235, .08);
}

.activity-search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 31px;
    height: 31px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #8a99b0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.activity-search-clear:hover {
    background: #f1f5f9;
    color: #52627d;
}

.activity-count {
    white-space: nowrap;
    color: #8796ad;
    font-size: 13px;
    padding-right: 10px;
}

.activity-table-card {
    background: white;
    border: 1px solid #e3e9f2;
    border-radius: 18px;
    overflow: hidden;
    box-shadow:
    0 8px 25px rgba(30, 50, 85, .035);
}

.activity-table-wrapper {
    width: 100%;
    overflow-x: auto;
}

.activity-table {
    width: 100%;
    min-width: 850px;
    border-collapse: collapse;
}

.activity-table th {
    background: #f8fafc;
    padding: 16px 20px;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .7px;
    color: #8a98ad;
    border-bottom: 1px solid #e8edf4;
    white-space: nowrap;
}

.activity-table td {
    padding: 17px 20px;
    border-bottom: 1px solid #eef2f7;
    font-size: 14px;
    color: #465570;
    vertical-align: middle;
}

.activity-table tbody tr {
    transition: .15s ease;
}

.activity-table tbody tr:hover {
    background: #fbfdff;
}

.activity-table tbody tr:last-child td {
    border-bottom: none;
}

.actor-cell {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 150px;
}

.actor-avatar {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: #eaf2ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
}

.actor-name {
    color: #1d2940;
    font-weight: 700;
}

.action-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
}

.action-badge.create {
    background: #ecfdf5;
    color: #047857;
}

.action-badge.update {
    background: #eff6ff;
    color: #1d4ed8;
}

.action-badge.delete {
    background: #fff1f2;
    color: #be123c;
}

.action-badge.access {
    background: #f5f3ff;
    color: #6d28d9;
}

.action-badge.neutral {
    background: #f3f6fb;
    color: #62718a;
}

.description-cell {
    max-width: 430px;
    color: #52627d;
    line-height: 1.5;
}

.date-cell {
    white-space: nowrap;
}

.date-main {
    color: #334159;
    font-weight: 600;
    font-size: 13px;
}

.date-time {
    margin-top: 3px;
    color: #94a1b5;
    font-size: 12px;
}

.details-button {
    height: 34px;
    padding: 0 11px;
    border: 1px solid #dce4ef;
    border-radius: 9px;
    background: white;
    color: #52627d;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: .2s ease;
}

.details-button:hover {
    border-color: #bfd0e7;
    color: #2563eb;
    background: #f8fbff;
}

.loading-state {
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 13px;
    color: #8493aa;
    font-size: 14px;
}

.loading-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e3eaf4;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: activitySpin .8s linear infinite;
}

.empty-state {
    padding: 70px 25px;
    text-align: center;
    color: #8796ad;
}

.empty-icon {
    width: 65px;
    height: 65px;
    margin: 0 auto 17px;
    border-radius: 20px;
    background: #f0f5ff;
    color: #6c8fdc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-state h3 {
    margin: 0 0 7px;
    color: #253149;
    font-size: 17px;
}

.empty-state p {
    margin: 0;
    font-size: 13px;
}

.activity-modal-overlay {
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

.activity-modal {
    width: 100%;
    max-width: 540px;
    background: white;
    border-radius: 22px;
    box-shadow:
    0 30px 80px rgba(15, 23, 42, .25);
    overflow: hidden;
}

.activity-modal-header {
    padding: 23px 25px;
    border-bottom: 1px solid #edf1f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.activity-modal-header h2 {
    margin: 0;
    font-size: 21px;
    color: #1d2940;
}

.activity-modal-header p {
    margin: 5px 0 0;
    font-size: 12px;
    color: #8a99b0;
}

.activity-close-button {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 9px;
    background: #f4f6f9;
    color: #687790;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.activity-close-button:hover {
    background: #eaf0f7;
    color: #334159;
}

.activity-modal-body {
    padding: 25px;
}

.detail-row {
    padding: 15px 0;
    border-bottom: 1px solid #edf1f6;
}

.detail-row:first-child {
    padding-top: 0;
}

.detail-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.detail-label {
    display: block;
    margin-bottom: 7px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .65px;
    font-weight: 800;
    color: #8a98ad;
}

.detail-value {
    color: #334159;
    font-size: 14px;
    line-height: 1.55;
}

.spin {
    animation: activitySpin .8s linear infinite;
}

@keyframes activitySpin {
    to {
        transform: rotate(360deg);
    }
}

@media (max-width: 900px) {
.activity-page {
        padding: 25px 22px 45px;
    }

.activity-summary {
        grid-template-columns: 1fr;
    }

.activity-table-card {
        overflow-x: auto;
    }
}

@media (max-width: 650px) {
.activity-header {
        align-items: stretch;
        flex-direction: column;
    }

.activity-actions {
        width: 100%;
    }

.activity-refresh-button {
        flex: 1;
    }

.activity-toolbar {
        flex-direction: column;
        align-items: stretch;
    }

.activity-count {
        padding: 0 4px 3px;
    }

.activity-title-area h1 {
        font-size: 31px;
    }
}
`}</style>

            <div className="activity-header">
                <div className="activity-title-area">
                    <h1>Activity Logs</h1>

                    <p>
                        Monitor important actions performed
                        across the estate.
                    </p>
                </div>

                <div className="activity-actions">
                    <button
                        className="activity-refresh-button"
                        onClick={loadLogs}
                        disabled={loading}
                    >
                        <RefreshCw
                            size={17}
                            className={
                                loading ? "spin" : ""
                            }
                        />

                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="activity-alert error">
                    <ShieldCheck size={18} />
                    <span>{error}</span>
                </div>
            )}

            <div className="activity-summary">

                <div className="activity-summary-card">
                    <div className="activity-summary-icon">
                        <Activity size={23} />
                    </div>

                    <div>
                        <strong>
                            {logs.length}
                        </strong>

                        <span>
                            Total activities
                        </span>
                    </div>
                </div>

                <div className="activity-summary-card">
                    <div className="activity-summary-icon green">
                        <CalendarDays size={23} />
                    </div>

                    <div>
                        <strong>
                            {todayLogs}
                        </strong>

                        <span>
                            Activities today
                        </span>
                    </div>
                </div>

                <div className="activity-summary-card">
                    <div className="activity-summary-icon purple">
                        <UserRound size={23} />
                    </div>

                    <div>
                        <strong>
                            {uniqueActors}
                        </strong>

                        <span>
                            Unique actors
                        </span>
                    </div>
                </div>

            </div>

            <div className="activity-toolbar">

                <div className="activity-search">
                    <Search size={19} />

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search by actor, action or description..."
                    />

                    {search && (
                        <button
                            className="activity-search-clear"
                            onClick={clearSearch}
                            title="Clear search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="activity-count">
                    Showing {filteredLogs.length} of{" "}
                    {logs.length}
                </div>

            </div>

            <div className="activity-table-card">

                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>

                        <span>
                            Loading activity logs...
                        </span>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="empty-state">

                        <div className="empty-icon">
                            <Activity size={29} />
                        </div>

                        <h3>
                            {search
                                ? "No matching activity"
                                : "No activity logs yet"}
                        </h3>

                        <p>
                            {search
                                ? "Try a different search term."
                                : "Activity will appear here when actions are recorded."}
                        </p>

                    </div>
                ) : (
                    <div className="activity-table-wrapper">

                        <table className="activity-table">

                            <thead>
                            <tr>
                                <th>Actor</th>
                                <th>Action</th>
                                <th>Description</th>
                                <th>Date & Time</th>
                                <th></th>
                            </tr>
                            </thead>

                            <tbody>

                            {filteredLogs.map((log) => {

                                const actionClass =
                                    getActionClass(
                                        log.action
                                    );

                                return (
                                    <tr key={log.id}>

                                        <td>
                                            <div className="actor-cell">

                                                <div className="actor-avatar">
                                                    {getInitials(
                                                        log.actor
                                                    )}
                                                </div>

                                                <span className="actor-name">
                                                    {log.actor ||
                                                        "System"}
                                                </span>

                                            </div>
                                        </td>

                                        <td>
                                            <span
                                                className={`action-badge ${actionClass}`}
                                            >
                                                {getActionLabel(
                                                    log.action
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="description-cell">
                                                {log.description ||
                                                    "—"}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="date-cell">

                                                <div className="date-main">
                                                    {formatDate(
                                                        log.timestamp
                                                    )}
                                                </div>

                                                <div className="date-time">
                                                    <Clock3
                                                        size={12}
                                                        style={{
                                                            verticalAlign:
                                                                "middle",
                                                            marginRight:
                                                                4,
                                                        }}
                                                    />

                                                    {formatTime(
                                                        log.timestamp
                                                    )}
                                                </div>

                                            </div>
                                        </td>

                                        <td>
                                            <button
                                                className="details-button"
                                                onClick={() =>
                                                    setSelectedLog(
                                                        log
                                                    )
                                                }
                                            >
                                                Details
                                            </button>
                                        </td>

                                    </tr>
                                );
                            })}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>

            {selectedLog && (
                <div
                    className="activity-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setSelectedLog(null);
                        }
                    }}
                >

                    <div className="activity-modal">

                        <div className="activity-modal-header">

                            <div>
                                <h2>
                                    Activity Details
                                </h2>

                                <p>
                                    Full information about
                                    this recorded action.
                                </p>
                            </div>

                            <button
                                className="activity-close-button"
                                onClick={() =>
                                    setSelectedLog(null)
                                }
                            >
                                <X size={18} />
                            </button>

                        </div>

                        <div className="activity-modal-body">

                            <div className="detail-row">
                                <span className="detail-label">
                                    Actor
                                </span>

                                <div className="detail-value">
                                    {selectedLog.actor ||
                                        "System"}
                                </div>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">
                                    Action
                                </span>

                                <div className="detail-value">
                                    {getActionLabel(
                                        selectedLog.action
                                    )}
                                </div>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">
                                    Description
                                </span>

                                <div className="detail-value">
                                    {selectedLog.description ||
                                        "No description available."}
                                </div>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">
                                    Timestamp
                                </span>

                                <div className="detail-value">
                                    {formatDateTime(
                                        selectedLog.timestamp
                                    )}
                                </div>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">
                                    Log ID
                                </span>

                                <div className="detail-value">
                                    #{selectedLog.id}
                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default ActivityLogs;


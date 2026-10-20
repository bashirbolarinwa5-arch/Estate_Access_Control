import { useEffect, useState } from "react";
import {
    LogIn,
    CalendarDays,
    Activity,
    RefreshCw,
} from "lucide-react";

import api from "../services/api";

import "./SuperAdminPages.css";

/*
 * SYSTEM ACTIVITY (platform owner only)
 *
 * Three feeds:
 *   - Recent logins   → /api/activity-logs filtered to USER_LOGIN
 *   - Recent visits   → /super-admin/recent-visits
 *   - Recent activity → /api/activity-logs (latest overall)
 */
function SuperAdminActivityPage() {

    const [logs, setLogs] = useState([]);
    const [recentVisits, setRecentVisits] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadActivity = async () => {

        setLoading(true);
        setError("");

        try {

            const [logsResponse, visitsResponse] =
                await Promise.all([
                    api.get("/api/activity-logs"),
                    api.get("/super-admin/recent-visits"),
                ]);

            const unwrapArray = (response) => {

                const data = response.data;

                if (Array.isArray(data)) {
                    return data;
                }

                if (Array.isArray(data?.data)) {
                    return data.data;
                }

                return [];
            };

            setLogs(unwrapArray(logsResponse));
            setRecentVisits(unwrapArray(visitsResponse));

        } catch (err) {

            console.error(
                "Failed to load system activity:",
                err
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load system activity."
            );

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        async function loadInitialActivity() {
            try {
                const [logsResponse, visitsResponse] =
                    await Promise.all([
                        api.get("/api/activity-logs"),
                        api.get("/super-admin/recent-visits"),
                    ]);

                if (!active) {
                    return;
                }

                const unwrapArray = (response) => {

                    const data = response.data;

                    if (Array.isArray(data)) {
                        return data;
                    }

                    if (Array.isArray(data?.data)) {
                        return data.data;
                    }

                    return [];
                };

                setLogs(unwrapArray(logsResponse));
                setRecentVisits(unwrapArray(visitsResponse));
            } catch (err) {
                console.error(
                    "Failed to load system activity:",
                    err
                );

                if (active) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        "Unable to load system activity."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadInitialActivity();

        return () => {
            active = false;
        };
    }, []);

    const recentLogins = logs
        .filter(
            (log) =>
                log.action === "USER_LOGIN"
        )
        .slice(0, 8);

    const recentActivity = logs.slice(0, 8);

    const formatTimestamp = (timestamp) => {

        if (!timestamp) {
            return "—";
        }

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return timestamp;
        }

        return date.toLocaleString();
    };

    const humanizeAction = (action) => {

        if (!action) {
            return "Activity";
        }

        return action
            .toLowerCase()
            .split("_")
            .map(
                (word) =>
                    word.charAt(0).toUpperCase() +
                    word.slice(1)
            )
            .join(" ");
    };

    return (
        <div className="super-admin-page">

            <div className="super-admin-header">

                <div>
                    <div className="dashboard-eyebrow">
                        <span className="eyebrow-dot"></span>
                        PLATFORM ADMINISTRATION
                    </div>

                    <h1>
                        System Activity
                    </h1>

                    <p>
                        Recent logins, visits and
                        platform-wide activity.
                    </p>
                </div>

                <div className="dashboard-header-actions">

                    <button
                        className="refresh-button"
                        onClick={loadActivity}
                        disabled={loading}
                        title="Refresh system activity"
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

                </div>
            </div>

            {error && (
                <div className="dashboard-error">
                    <div>
                        <strong>
                            Unable to load system activity
                        </strong>

                        <span>{error}</span>
                    </div>

                    <button
                        onClick={loadActivity}
                    >
                        Try again
                    </button>
                </div>
            )}

            <div className="super-admin-activity-grid">

                {/* ============
                    RECENT LOGINS
                    ============ */}

                <section className="super-admin-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Recent Logins
                            </h2>

                            <p>
                                Latest sign-ins across the platform
                            </p>
                        </div>

                        <LogIn
                            size={22}
                        />

                    </div>

                    {loading ? (
                        <div className="super-admin-empty">
                            <div className="loading-spinner"></div>
                            <span>Loading logins...</span>
                        </div>
                    ) : recentLogins.length === 0 ? (
                        <div className="super-admin-empty">
                            <LogIn size={24} />
                            <strong>No logins recorded yet</strong>
                            <span>Sign-ins will appear here.</span>
                        </div>
                    ) : (
                        <div className="super-admin-activity-list">

                            {recentLogins.map((log) => (

                                <div
                                    className="super-admin-activity-item"
                                    key={log.id}
                                >

                                    <div className="activity-icon green">
                                        <LogIn size={16} />
                                    </div>

                                    <div className="activity-body">
                                        <strong>
                                            {log.actor || "Unknown"}
                                        </strong>

                                        <span>
                                            {log.description ||
                                                "Signed in"}
                                        </span>
                                    </div>

                                    <div className="activity-time">
                                        {formatTimestamp(log.timestamp)}
                                    </div>

                                </div>

                            ))}

                        </div>
                    )}

                </section>

                {/* ============
                    RECENT VISITS
                    ============ */}

                <section className="super-admin-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Recent Visits
                            </h2>

                            <p>
                                Latest visitor activity in all estates
                            </p>
                        </div>

                        <CalendarDays
                            size={22}
                        />

                    </div>

                    {loading ? (
                        <div className="super-admin-empty">
                            <div className="loading-spinner"></div>
                            <span>Loading visits...</span>
                        </div>
                    ) : recentVisits.length === 0 ? (
                        <div className="super-admin-empty">
                            <CalendarDays size={24} />
                            <strong>No visits recorded yet</strong>
                            <span>Visitor activity will appear here.</span>
                        </div>
                    ) : (
                        <div className="super-admin-activity-list">

                            {recentVisits.map((visit) => (

                                <div
                                    className="super-admin-activity-item"
                                    key={visit.id}
                                >

                                    <div className="activity-icon purple">
                                        <CalendarDays size={16} />
                                    </div>

                                    <div className="activity-body">
                                        <strong>
                                            {visit.visitor?.fullName ||
                                                "Unknown visitor"}
                                        </strong>

                                        <span>
                                            {visit.purpose ||
                                                "General visit"}
                                            {" — "}
                                            {humanizeAction(visit.status)}
                                        </span>
                                    </div>

                                    <div className="activity-time">
                                        {visit.visitDate || "—"}
                                    </div>

                                </div>

                            ))}

                        </div>
                    )}

                </section>

                {/* ============
                    RECENT ACTIVITY
                    ============ */}

                <section className="super-admin-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Recent Activity
                            </h2>

                            <p>
                                Everything happening on the platform
                            </p>
                        </div>

                        <Activity
                            size={22}
                        />

                    </div>

                    {loading ? (
                        <div className="super-admin-empty">
                            <div className="loading-spinner"></div>
                            <span>Loading activity...</span>
                        </div>
                    ) : recentActivity.length === 0 ? (
                        <div className="super-admin-empty">
                            <Activity size={24} />
                            <strong>No activity recorded yet</strong>
                            <span>Platform events will appear here.</span>
                        </div>
                    ) : (
                        <div className="super-admin-activity-list">

                            {recentActivity.map((log) => (

                                <div
                                    className="super-admin-activity-item"
                                    key={log.id}
                                >

                                    <div className="activity-icon">
                                        <Activity size={16} />
                                    </div>

                                    <div className="activity-body">
                                        <strong>
                                            {humanizeAction(log.action)}
                                        </strong>

                                        <span>
                                            {log.description ||
                                                log.actor ||
                                                "—"}
                                        </span>
                                    </div>

                                    <div className="activity-time">
                                        {formatTimestamp(log.timestamp)}
                                    </div>

                                </div>

                            ))}

                        </div>
                    )}

                </section>

            </div>

        </div>
    );

}

export default SuperAdminActivityPage;

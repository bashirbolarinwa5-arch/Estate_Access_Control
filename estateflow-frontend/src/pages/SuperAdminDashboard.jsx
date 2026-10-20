import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    UserRound,
    Shield,
    ShieldCheck,
    CalendarDays,
    ArrowRight,
    Activity,
    RefreshCw,
} from "lucide-react";

import "./Dashboard.css";
import api from "../services/api";
import { useAuth } from "../context/useAuth";

/*
 * PLATFORM OWNER DASHBOARD
 *
 * Reads only /super-admin/* endpoints — a SUPER_ADMIN has no
 * access to estate operations, so this page never touches
 * /resident, /visitor or /visit directly.
 */
function SuperAdminDashboard() {

    const { user } = useAuth();

    const navigate = useNavigate();

    const [stats, setStats] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const username =
        user?.username || "Platform Owner";

    const loadStats = async () => {

        setLoading(true);
        setError("");

        try {

            const response = await api.get("/super-admin/stats");

            setStats(response.data?.data || null);

        } catch (err) {

            console.error(
                "Failed to load platform statistics:",
                err
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load platform statistics."
            );

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;

        /* state starts as loading=true, so the initial load
           only applies results — it never sets state before
           its first await. */
        async function loadInitialStats() {
            try {
                const response = await api.get("/super-admin/stats");

                if (!active) {
                    return;
                }

                setStats(response.data?.data || null);
            } catch (err) {
                console.error(
                    "Failed to load platform statistics:",
                    err
                );

                if (active) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        "Unable to load platform statistics."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadInitialStats();

        return () => {
            active = false;
        };
    }, []);

    const count = (key) =>
        loading ? "—" : (stats?.[key] ?? 0);

    return (
        <div className="dashboard-page">

            <div className="dashboard-header">
                <div>
                    <div className="dashboard-eyebrow">
                        <span className="eyebrow-dot"></span>
                        PLATFORM OVERVIEW
                    </div>

                    <h1>
                        Welcome back,{" "}
                        <span>{username}</span>
                    </h1>

                    <p>
                        EstateFlow platform health at a
                        glance, across every estate.
                    </p>
                </div>

                <div className="dashboard-header-actions">

                    <div className="role-badge">
                        <ShieldCheck size={17} />
                        SUPER ADMIN
                    </div>

                    <button
                        className="refresh-button"
                        onClick={loadStats}
                        disabled={loading}
                        title="Refresh platform statistics"
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
                            Unable to load platform statistics
                        </strong>

                        <span>{error}</span>
                    </div>

                    <button
                        onClick={loadStats}
                    >
                        Try again
                    </button>
                </div>
            )}

            <div className="dashboard-stat-grid">

                <div className="stat-card">
                    <div className="stat-icon blue">
                        <Shield size={21} />
                    </div>

                    <div className="stat-card-top">
                        <span>Total Admins</span>
                        <ArrowRight
                            size={17}
                            className="stat-arrow"
                        />
                    </div>

                    <strong className="stat-value">
                        {count("admins")}
                    </strong>

                    <p>Estate administrator accounts</p>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <Users size={21} />
                    </div>

                    <div className="stat-card-top">
                        <span>Total Residents</span>
                        <ArrowRight
                            size={17}
                            className="stat-arrow"
                        />
                    </div>

                    <strong className="stat-value">
                        {count("residents")}
                    </strong>

                    <p>Registered residents</p>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orange">
                        <ShieldCheck size={21} />
                    </div>

                    <div className="stat-card-top">
                        <span>Security Personnel</span>
                        <ArrowRight
                            size={17}
                            className="stat-arrow"
                        />
                    </div>

                    <strong className="stat-value">
                        {count("securityPersonnel")}
                    </strong>

                    <p>Active security accounts</p>
                </div>

            </div>

            <div className="secondary-stat-grid">

                <div className="mini-stat-card">
                    <div className="mini-stat-icon purple">
                        <UserRound size={19} />
                    </div>

                    <div>
                        <span>Total Visitors</span>
                        <strong>{count("visitors")}</strong>
                    </div>
                </div>

                <div className="mini-stat-card">
                    <div className="mini-stat-icon blue">
                        <CalendarDays size={19} />
                    </div>

                    <div>
                        <span>Total Visits</span>
                        <strong>{count("visits")}</strong>
                    </div>
                </div>

                <div className="mini-stat-card">
                    <div className="mini-stat-icon green">
                        <Activity size={19} />
                    </div>

                    <div>
                        <span>Platform Status</span>
                        <strong>Live</strong>
                    </div>
                </div>

            </div>

            <div className="dashboard-content-grid">

                <section className="dashboard-panel quick-actions-panel">

                    <div className="panel-header">
                        <div>
                            <h2>
                                Platform Management
                            </h2>

                            <p>
                                Owner-level operations
                            </p>
                        </div>
                    </div>

                    <div className="quick-actions">

                        <button
                            className="quick-action"
                            onClick={() =>
                                navigate("/super-admin/admins")
                            }
                        >
                            <div className="quick-action-icon">
                                <Shield size={19} />
                            </div>

                            <div className="quick-action-content">
                                <strong>
                                    Estate Admins
                                </strong>

                                <span>
                                    Create, disable and reset admin accounts
                                </span>
                            </div>

                            <ArrowRight
                                size={17}
                                className="quick-action-arrow"
                            />
                        </button>

                        <button
                            className="quick-action"
                            onClick={() =>
                                navigate("/super-admin/activity")
                            }
                        >
                            <div className="quick-action-icon">
                                <Activity size={19} />
                            </div>

                            <div className="quick-action-content">
                                <strong>
                                    System Activity
                                </strong>

                                <span>
                                    Recent logins, visits and activity
                                </span>
                            </div>

                            <ArrowRight
                                size={17}
                                className="quick-action-arrow"
                            />
                        </button>

                    </div>

                </section>

                <section className="dashboard-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Role Hierarchy
                            </h2>

                            <p>
                                Who manages whom on the platform
                            </p>
                        </div>

                        <ShieldCheck
                            size={22}
                        />

                    </div>

                    <div className="recent-visits-list">

                        <div className="recent-visit">
                            <div className="visitor-avatar">S</div>

                            <div className="visitor-information">
                                <strong>Super Admin</strong>
                                <span>Platform owner — manages estates and estate admins</span>
                            </div>
                        </div>

                        <div className="recent-visit">
                            <div className="visitor-avatar">A</div>

                            <div className="visitor-information">
                                <strong>Admin</strong>
                                <span>Estate administrator — manages residents, security and visits</span>
                            </div>
                        </div>

                        <div className="recent-visit">
                            <div className="visitor-avatar">R</div>

                            <div className="visitor-information">
                                <strong>Security &amp; Residents</strong>
                                <span>Estate-level roles — day-to-day visitor access</span>
                            </div>
                        </div>

                    </div>

                </section>

            </div>

        </div>
    );

}

export default SuperAdminDashboard;


import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ResidentDashboard from "./ResidentDashboard";

import {
    Users,
    UserRound,
    CalendarDays,
    Clock3,
    LogIn,
    LogOut,
    ArrowRight,
    Activity,
    RefreshCw,
    ShieldCheck,
    Shield,
    AlertCircle,
    CheckCircle2,
    Timer,
} from "lucide-react";

import "./Dashboard.css";
import api from "../services/api";


function Dashboard() {
    const { user } = useAuth();

    const role =
        user?.role || "ROLE_USER";

    if (role === "ROLE_SECURITY") {
        return <SecurityDashboard />;
    }

    if (role === "ROLE_RESIDENT") {
        return <ResidentDashboard />;
    }

    return <AdminDashboard />;
}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

function AdminDashboard() {
    const [residents, setResidents] = useState([]);
    const [visitors, setVisitors] = useState([]);
    const [visits, setVisits] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { user } = useAuth();
    const navigate = useNavigate();

    const username =
        user?.username || "Admin";

    const role =
        user?.role || "ROLE_ADMIN";

    const loadDashboard = async () => {
        setLoading(true);
        setError("");

        try {
            const [
                residentResponse,
                visitorResponse,
                visitResponse,
            ] = await Promise.all([
                api.get("/resident"),
                api.get("/visitor"),
                api.get("/visit"),
            ]);

            const getData = (response) => {
                const data = response.data;

                if (Array.isArray(data)) {
                    return data;
                }

                if (Array.isArray(data?.data)) {
                    return data.data;
                }

                return [];
            };

            setResidents(getData(residentResponse));
            setVisitors(getData(visitorResponse));
            setVisits(getData(visitResponse));

        } catch (err) {
            console.error(
                "Failed to load dashboard:",
                err
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Something went wrong while loading the dashboard."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    const todaysVisit = useMemo(() => {
        return visits.filter(
            (currentVisit) =>
                currentVisit.visitDate === today
        );
    }, [visits, today]);

    const pendingVisits = useMemo(() => {
        return visits.filter(
            (currentVisit) =>
                currentVisit.status === "PENDING"
        );
    }, [visits]);

    const checkedInVisit = useMemo(() => {
        return visits.filter(
            (currentVisit) =>
                currentVisit.status === "CHECKED_IN"
        );
    }, [visits]);

    const checkedOutVisit = useMemo(() => {
        return visits.filter(
            (currentVisit) =>
                currentVisit.status === "CHECKED_OUT"
        );
    }, [visits]);

    const recentVisits = useMemo(() => {
        return [...visits]
            .sort((a, b) => {
                const first = new Date(
                    `${a.visitDate || "1970-01-01"}T00:00:00`
                );

                const second = new Date(
                    `${b.visitDate || "1970-01-01"}T00:00:00`
                );

                return second - first;
            })
            .slice(0, 5);
    }, [visits]);

    const formatStatus = (status) => {
        if (!status) {
            return "Unknown";
        }

        return status
            .replace("CHECKED_IN", "Checked In")
            .replace("CHECKED_OUT", "Checked Out")
            .replace("PENDING", "Pending")
            .replace("EXPIRED", "Expired");
    };

    const getStatusClass = (status) => {
        switch (status) {
            case "PENDING":
                return "status-pending";

            case "CHECKED_IN":
                return "status-active";

            case "CHECKED_OUT":
                return "status-completed";

            case "EXPIRED":
                return "status-expired";

            default:
                return "";
        }
    };

    const getVisitorName = (currentVisit) => {
        return (
            currentVisit?.visitor?.fullName ||
            "Unknown visitor"
        );
    };

    return (
        <div className="dashboard-page">

            <div className="dashboard-header">
                <div>
                    <div className="dashboard-eyebrow">
                        <span className="eyebrow-dot"></span>
                        ESTATE OVERVIEW
                    </div>

                    <h1>
                        Welcome back,{" "}
                        <span>{username}</span>
                    </h1>

                    <p>
                        Here's what's happening across
                        your estate today.
                    </p>
                </div>

                <div className="dashboard-header-actions">

                    <div className="role-badge">
                        <ShieldCheck size={17} />

                        {role.replace(
                            "ROLE_",
                            ""
                        )}
                    </div>

                    <button
                        className="refresh-button"
                        onClick={loadDashboard}
                        disabled={loading}
                        title="Refresh dashboard"
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
                            Unable to load dashboard
                        </strong>

                        <span>{error}</span>
                    </div>

                    <button
                        onClick={loadDashboard}
                    >
                        Try again
                    </button>
                </div>
            )}

            <div className="dashboard-stat-grid">

                <StatCard
                    icon={<Users size={21} />}
                    label="Residents"
                    value={residents.length}
                    description="Total registered residents"
                    loading={loading}
                    iconClass="blue"
                />

                <StatCard
                    icon={<UserRound size={21} />}
                    label="Visitors"
                    value={visitors.length}
                    description="Registered visitors"
                    loading={loading}
                    iconClass="purple"
                />

                <StatCard
                    icon={
                        <CalendarDays size={21} />
                    }
                    label="Today's Visits"
                    value={todaysVisit.length}
                    description="Visits scheduled today"
                    loading={loading}
                    iconClass="green"
                />

                <StatCard
                    icon={<Clock3 size={21} />}
                    label="Pending"
                    value={pendingVisits.length}
                    description="Visits awaiting approval"
                    loading={loading}
                    iconClass="orange"
                />

            </div>

            <div className="secondary-stat-grid">

                <MiniStat
                    icon={<LogIn size={19} />}
                    label="Checked In"
                    value={
                        loading
                            ? "—"
                            : checkedInVisit.length
                    }
                    iconClass="green"
                />

                <MiniStat
                    icon={<LogOut size={19} />}
                    label="Checked Out"
                    value={
                        loading
                            ? "—"
                            : checkedOutVisit.length
                    }
                    iconClass="blue"
                />

                <MiniStat
                    icon={<Activity size={19} />}
                    label="Total Visits"
                    value={
                        loading
                            ? "—"
                            : visits.length
                    }
                    iconClass="purple"
                />

            </div>

            <div className="dashboard-content-grid">

                <VisitPanel
                    loading={loading}
                    visits={recentVisits}
                    getVisitorName={getVisitorName}
                    formatStatus={formatStatus}
                    getStatusClass={getStatusClass}
                    title="Recent Visits"
                    description="Latest visitor activity in the estate"
                />

                <section className="dashboard-panel quick-actions-panel">

                    <div className="panel-header">
                        <div>
                            <h2>
                                Quick Actions
                            </h2>

                            <p>
                                Frequently used estate
                                operations
                            </p>
                        </div>
                    </div>

                    <div className="quick-actions">

                        <QuickAction
                            icon={<Users size={19} />}
                            title="Manage Residents"
                            description="View and manage residents"
                            onClick={() =>
                                navigate("/residents")
                            }
                        />

                        <QuickAction
                            icon={
                                <UserRound size={19} />
                            }
                            title="Manage Visitors"
                            description="View registered visitors"
                            onClick={() =>
                                navigate("/visitors")
                            }
                        />

                        <QuickAction
                            icon={
                                <CalendarDays size={19} />
                            }
                            title="Manage Visits"
                            description="Review scheduled visits"
                            onClick={() =>
                                navigate("/visits")
                            }
                        />

                        <QuickAction
                            icon={
                                <ShieldCheck size={19} />
                            }
                            title="Security"
                            description="Access security operations"
                            onClick={() =>
                                navigate("/security")
                            }
                        />

                    </div>

                </section>

            </div>

        </div>
    );
}


/* =========================================================
   SECURITY DASHBOARD
   ========================================================= */

function SecurityDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [visitors, setVisitors] = useState([]);
    const [visits, setVisits] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const username =
        user?.username || "Security";

    const loadSecurityDashboard = async () => {
        setLoading(true);
        setError("");

        try {
            const [
                visitorResponse,
                visitResponse,
            ] = await Promise.all([
                api.get("/visitor"),
                api.get("/visit"),
            ]);

            const getData = (response) => {
                const data = response.data;

                if (Array.isArray(data)) {
                    return data;
                }

                if (Array.isArray(data?.data)) {
                    return data.data;
                }

                return [];
            };

            setVisitors(getData(visitorResponse));
            setVisits(getData(visitResponse));

        } catch (err) {
            console.error(
                "Failed to load security dashboard:",
                err
            );

            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to load security dashboard."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSecurityDashboard();
    }, []);

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    const todaysVisits = useMemo(() => {
        return visits.filter(
            (visit) =>
                visit.visitDate === today
        );
    }, [visits, today]);

    const pendingVisits = useMemo(() => {
        return visits.filter(
            (visit) =>
                visit.status === "PENDING"
        );
    }, [visits]);

    const checkedInVisits = useMemo(() => {
        return visits.filter(
            (visit) =>
                visit.status === "CHECKED_IN"
        );
    }, [visits]);

    const recentVisits = useMemo(() => {
        return [...visits]
            .sort((a, b) => {
                const first = new Date(
                    `${a.visitDate || "1970-01-01"}T00:00:00`
                );

                const second = new Date(
                    `${b.visitDate || "1970-01-01"}T00:00:00`
                );

                return second - first;
            })
            .slice(0, 6);
    }, [visits]);

    const getVisitorName = (visit) => {
        return (
            visit?.visitor?.fullName ||
            "Unknown visitor"
        );
    };

    const formatStatus = (status) => {
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
                return "Unknown";
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case "PENDING":
                return "status-pending";

            case "CHECKED_IN":
                return "status-active";

            case "CHECKED_OUT":
                return "status-completed";

            case "EXPIRED":
                return "status-expired";

            default:
                return "";
        }
    };

    return (
        <div className="dashboard-page security-dashboard">

            {/* HEADER */}

            <div className="dashboard-header">

                <div>
                    <div className="dashboard-eyebrow">
                        <span className="eyebrow-dot"></span>
                        SECURITY OPERATIONS
                    </div>

                    <h1>
                        Welcome back,{" "}
                        <span>{username}</span>
                    </h1>

                    <p>
                        Monitor visitor access and
                        estate activity from here.
                    </p>
                </div>

                <div className="dashboard-header-actions">

                    <div className="role-badge">
                        <ShieldCheck size={17} />
                        SECURITY
                    </div>

                    <button
                        className="refresh-button"
                        onClick={
                            loadSecurityDashboard
                        }
                        disabled={loading}
                        title="Refresh security dashboard"
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

            {/* ERROR */}

            {error && (
                <div className="dashboard-error">
                    <div>
                        <strong>
                            Unable to load security dashboard
                        </strong>

                        <span>{error}</span>
                    </div>

                    <button
                        onClick={
                            loadSecurityDashboard
                        }
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* SECURITY STATS */}

            <div className="dashboard-stat-grid">

                <StatCard
                    icon={
                        <CalendarDays size={21} />
                    }
                    label="Today's Visits"
                    value={
                        todaysVisits.length
                    }
                    description="Visits scheduled for today"
                    loading={loading}
                    iconClass="blue"
                />

                <StatCard
                    icon={
                        <Clock3 size={21} />
                    }
                    label="Pending"
                    value={
                        pendingVisits.length
                    }
                    description="Visits awaiting access"
                    loading={loading}
                    iconClass="orange"
                />

                <StatCard
                    icon={
                        <LogIn size={21} />
                    }
                    label="Currently Inside"
                    value={
                        checkedInVisits.length
                    }
                    description="Visitors currently checked in"
                    loading={loading}
                    iconClass="green"
                />

                <StatCard
                    icon={
                        <UserRound size={21} />
                    }
                    label="Visitors"
                    value={
                        visitors.length
                    }
                    description="Registered visitors"
                    loading={loading}
                    iconClass="purple"
                />

            </div>

            {/* SECURITY ACTIONS */}

            <section className="dashboard-panel security-actions-panel">

                <div className="panel-header">

                    <div>
                        <h2>
                            Security Actions
                        </h2>

                        <p>
                            Quickly access the tools
                            you use most.
                        </p>
                    </div>

                    <Shield
                        size={22}
                    />

                </div>

                <div className="security-action-grid">

                    <button
                        className="security-action-card"
                        onClick={() =>
                            navigate("/security")
                        }
                    >
                        <div className="security-action-icon">
                            <ShieldCheck
                                size={21}
                            />
                        </div>

                        <div>
                            <strong>
                                Visitor Access
                            </strong>

                            <span>
                                Check visitors in or out
                            </span>
                        </div>

                        <ArrowRight size={18} />
                    </button>

                    <button
                        className="security-action-card"
                        onClick={() =>
                            navigate("/visits")
                        }
                    >
                        <div className="security-action-icon">
                            <CalendarDays
                                size={21}
                            />
                        </div>

                        <div>
                            <strong>
                                View Visits
                            </strong>

                            <span>
                                Review scheduled visits
                            </span>
                        </div>

                        <ArrowRight size={18} />
                    </button>

                    <button
                        className="security-action-card"
                        onClick={() =>
                            navigate("/visitors")
                        }
                    >
                        <div className="security-action-icon">
                            <UserRound
                                size={21}
                            />
                        </div>

                        <div>
                            <strong>
                                Visitors
                            </strong>

                            <span>
                                View visitor records
                            </span>
                        </div>

                        <ArrowRight size={18} />
                    </button>

                    <button
                        className="security-action-card"
                        onClick={() =>
                            navigate("/activity-logs")
                        }
                    >
                        <div className="security-action-icon">
                            <Activity
                                size={21}
                            />
                        </div>

                        <div>
                            <strong>
                                Activity Logs
                            </strong>

                            <span>
                                Review recent activity
                            </span>
                        </div>

                        <ArrowRight size={18} />
                    </button>

                </div>

            </section>

            {/* RECENT ACTIVITY */}

            <section className="dashboard-panel">

                <div className="panel-header">

                    <div>
                        <h2>
                            Recent Visits
                        </h2>

                        <p>
                            Latest visitor activity
                        </p>
                    </div>

                    <button
                        className="panel-action"
                        onClick={() =>
                            navigate("/visits")
                        }
                    >
                        View all
                        <ArrowRight size={16} />
                    </button>

                </div>

                {loading ? (
                    <div className="empty-state">
                        <div className="loading-spinner"></div>

                        <span>
                            Loading recent visits...
                        </span>
                    </div>
                ) : recentVisits.length === 0 ? (
                    <div className="empty-state">

                        <div className="empty-icon">
                            <CalendarDays
                                size={24}
                            />
                        </div>

                        <strong>
                            No recent visits
                        </strong>

                        <span>
                            Visitor activity will
                            appear here.
                        </span>

                    </div>
                ) : (
                    <div className="recent-visits-list">

                        {recentVisits.map(
                            (visit) => (
                                <div
                                    className="recent-visit"
                                    key={visit.id}
                                >

                                    <div className="visitor-avatar">
                                        {getVisitorName(
                                            visit
                                        )
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div className="visitor-information">

                                        <strong>
                                            {getVisitorName(
                                                visit
                                            )}
                                        </strong>

                                        <span>
                                            {visit.purpose ||
                                                "General visit"}
                                        </span>

                                    </div>

                                    <div className="visit-date">
                                        {visit.visitDate ||
                                            "—"}
                                    </div>

                                    <div
                                        className={`visit-status ${getStatusClass(
    visit.status
)}`}
                                    >
                                        <span></span>

                                        {formatStatus(
                                            visit.status
                                        )}
                                    </div>

                                </div>
                            )
                        )}

                    </div>
                )}

            </section>

        </div>
    );
}


/* =========================================================
   REUSABLE COMPONENTS
   ========================================================= */

function StatCard({
                      icon,
                      label,
                      value,
                      description,
                      loading,
                      iconClass,
                  }) {
    return (
        <div className="stat-card">

            <div
                className={`stat-icon ${iconClass}`}
            >
                {icon}
            </div>

            <div className="stat-card-top">
                <span>{label}</span>

                <ArrowRight
                    size={17}
                    className="stat-arrow"
                />
            </div>

            <strong className="stat-value">
                {loading
                    ? "—"
                    : value}
            </strong>

            <p>
                {description}
            </p>

        </div>
    );
}


function MiniStat({
                      icon,
                      label,
                      value,
                      iconClass,
                  }) {
    return (
        <div className="mini-stat-card">

            <div
                className={`mini-stat-icon ${iconClass}`}
            >
                {icon}
            </div>

            <div>
                <span>{label}</span>

                <strong>
                    {value}
                </strong>
            </div>

        </div>
    );
}


function VisitPanel({
                        loading,
                        visits,
                        getVisitorName,
                        formatStatus,
                        getStatusClass,
                        title,
                        description,
                    }) {
    const navigate = useNavigate();

    return (
        <section className="dashboard-panel">

            <div className="panel-header">

                <div>
                    <h2>{title}</h2>

                    <p>
                        {description}
                    </p>
                </div>

                <button
                    className="panel-action"
                    onClick={() =>
                        navigate("/visits")
                    }
                >
                    View all
                    <ArrowRight size={16} />
                </button>

            </div>

            {loading ? (
                <div className="empty-state">

                    <div className="loading-spinner"></div>

                    <span>
                        Loading recent visits...
                    </span>

                </div>
            ) : visits.length === 0 ? (
                <div className="empty-state">

                    <div className="empty-icon">
                        <CalendarDays
                            size={24}
                        />
                    </div>

                    <strong>
                        No visits yet
                    </strong>

                    <span>
                        Visitor activity will
                        appear here.
                    </span>

                </div>
            ) : (
                <div className="recent-visits-list">

                    {visits.map(
                        (currentVisit) => (
                            <div
                                className="recent-visit"
                                key={
                                    currentVisit.id
                                }
                            >

                                <div className="visitor-avatar">
                                    {getVisitorName(
                                        currentVisit
                                    )
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <div className="visitor-information">

                                    <strong>
                                        {getVisitorName(
                                            currentVisit
                                        )}
                                    </strong>

                                    <span>
                                        {currentVisit.purpose ||
                                            "General visit"}
                                    </span>

                                </div>

                                <div className="visit-date">
                                    {currentVisit.visitDate ||
                                        "—"}
                                </div>

                                <div
                                    className={`visit-status ${getStatusClass(
    currentVisit.status
)}`}
                                >
                                    <span></span>

                                    {formatStatus(
                                        currentVisit.status
                                    )}
                                </div>

                            </div>
                        )
                    )}

                </div>
            )}

        </section>
    );
}


function QuickAction({
                         icon,
                         title,
                         description,
                         onClick,
                     }) {
    return (
        <button
            className="quick-action"
            onClick={onClick}
        >
            <div className="quick-action-icon">
                {icon}
            </div>

            <div className="quick-action-content">
                <strong>
                    {title}
                </strong>

                <span>
                    {description}
                </span>
            </div>

            <ArrowRight
                size={17}
                className="quick-action-arrow"
            />
        </button>
    );
}


export default Dashboard;


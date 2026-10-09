import { useAuth } from "../context/AuthContext";
import {
    UserRound,
    Users,
    CalendarDays,
    ShieldCheck,
    ArrowRight,
} from "lucide-react";

import "./Dashboard.css";

function ResidentDashboard() {
    const { user } = useAuth();

    const username = user?.username || "Resident";

    return (
        <div className="dashboard-page">

            <div className="dashboard-header">

                <div>
                    <div className="dashboard-eyebrow">
                        <span className="eyebrow-dot"></span>
                        RESIDENT PORTAL
                    </div>

                    <h1>
                        Welcome back,{" "}
                        <span>{username}</span>
                    </h1>

                    <p>
                        Manage your profile, visitors,
                        and visits from here.
                    </p>
                </div>

                <div className="dashboard-header-actions">

                    <div className="role-badge">
                        <UserRound size={17} />
                        RESIDENT
                    </div>

                </div>

            </div>

            <div className="dashboard-content-grid">

                <section className="dashboard-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                My Estate
                            </h2>

                            <p>
                                Access your resident
                                information and activity.
                            </p>
                        </div>

                    </div>

                    <div className="quick-actions">

                        <ResidentAction
                            icon={<UserRound size={19} />}
                            title="My Profile"
                            description="View your resident profile"
                            path="/resident/profile"
                        />

                        <ResidentAction
                            icon={<Users size={19} />}
                            title="My Visitors"
                            description="View your registered visitors"
                            path="/resident/visitors"
                        />

                        <ResidentAction
                            icon={<CalendarDays size={19} />}
                            title="My Visits"
                            description="View your scheduled visits"
                            path="/resident/visits"
                        />

                    </div>

                </section>

                <section className="dashboard-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Resident Access
                            </h2>

                            <p>
                                Your account is protected by
                                EstateFlow authentication.
                            </p>
                        </div>

                        <ShieldCheck size={22} />

                    </div>

                    <div className="empty-state">

                        <div className="empty-icon">
                            <ShieldCheck size={24} />
                        </div>

                        <strong>
                            Resident account active
                        </strong>

                        <span>
                            You are securely signed in
                            as a resident.
                        </span>

                    </div>

                </section>

            </div>

        </div>
    );
}


function ResidentAction({
                            icon,
                            title,
                            description,
                            path,
                        }) {
    const handleClick = () => {
        window.location.href = path;
    };

    return (
        <button
            className="quick-action"
            onClick={handleClick}
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


export default ResidentDashboard;
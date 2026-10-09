import {
    UserRound,
    ShieldCheck,
    User,
    RefreshCw,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import "./ResidentProfilePage.css";

function ResidentProfilePage() {

    const { user } = useAuth();

    const username =
        user?.username || "Resident";

    const role =
        user?.role || "ROLE_RESIDENT";

    const displayRole =
        role.replace("ROLE_", "");

    const firstLetter =
        username.charAt(0).toUpperCase();


    return (
        <div className="resident-profile-page">

            {/* ================================
                PAGE HEADER
               ================================= */}

            <div className="resident-profile-header">

                <div>

                    <div className="resident-profile-eyebrow">

                        <span></span>

                        RESIDENT PORTAL

                    </div>

                    <h1>
                        My Profile
                    </h1>

                    <p>
                        View your EstateFlow account information.
                    </p>

                </div>

                <button
                    type="button"
                    className="resident-profile-refresh"
                    onClick={() => window.location.reload()}
                >
                    <RefreshCw size={17} />

                    Refresh
                </button>

            </div>


            {/* ================================
                PROFILE CONTENT
               ================================= */}

            <div className="resident-profile-content">


                {/* ================================
                    PROFILE CARD
                   ================================= */}

                <section className="resident-profile-card">

                    <div className="resident-profile-card-header">

                        <div className="resident-profile-avatar">
                            {firstLetter}
                        </div>

                        <div>

                            <h2>
                                {username}
                            </h2>

                            <span>
                                Resident Account
                            </span>

                        </div>

                    </div>


                    {/* ================================
                        ACCOUNT INFORMATION
                       ================================= */}

                    <div className="resident-profile-section">

                        <div className="resident-profile-section-title">

                            <UserRound size={19} />

                            <div>

                                <h3>
                                    Personal Information
                                </h3>

                                <p>
                                    Your EstateFlow account details.
                                </p>

                            </div>

                        </div>


                        <div className="resident-profile-fields">

                            <div className="resident-profile-field">

                                <label>
                                    Username
                                </label>

                                <div className="resident-profile-field-value">

                                    <User size={18} />

                                    <span>
                                        {username}
                                    </span>

                                </div>

                            </div>


                            <div className="resident-profile-field">

                                <label>
                                    Account Role
                                </label>

                                <div className="resident-profile-field-value">

                                    <ShieldCheck size={18} />

                                    <span>
                                        {displayRole}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ================================
                    SECURITY CARD
                   ================================= */}

                <section className="resident-profile-security-card">

                    <div className="resident-security-icon">

                        <ShieldCheck size={28} />

                    </div>


                    <div>

                        <span className="resident-security-label">
                            ACCOUNT SECURITY
                        </span>

                        <h2>
                            Your account is protected
                        </h2>

                        <p>
                            You are securely signed in to
                            EstateFlow as a resident.
                        </p>

                    </div>

                </section>

            </div>

        </div>
    );
}

export default ResidentProfilePage;
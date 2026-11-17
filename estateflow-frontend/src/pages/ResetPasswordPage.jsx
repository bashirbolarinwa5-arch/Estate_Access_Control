
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    LockKeyhole,
    ShieldCheck,
    Eye,
    EyeOff,
    CheckCircle2,
} from "lucide-react";

import { resetPassword } from "../services/auth";

import "./Login.css";

/*
 * Password reset landing page.
 *
 * The reset token arrives ONLY in the emailed link
 * (/reset-password?token=...). It is never displayed or
 * echoed back by the app. The token is single-use, expires
 * after 30 minutes, and is bound to one account/estate.
 */
function ResetPasswordPage() {

    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");
        setMessage("");

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await resetPassword({
                token,
                newPassword,
            });

            setMessage(
                response?.message || "Password reset successfully."
            );

            setNewPassword("");
            setConfirmPassword("");

        } catch (err) {
            setError(
                err.message ||
                "This reset link is invalid or has expired."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page" role="main">

            <div className="login-background-shape login-shape-one"></div>
            <div className="login-background-shape login-shape-two"></div>

            <div className="login-container">

                <div className="login-card">

                    {/* ================================
                        LEFT BRAND PANEL
                    ================================= */}

                    <section className="login-card-brand">

                        <div className="login-brand-content">

                            <div className="login-brand-mark">
                                EF
                            </div>

                            <h1>
                                EstateFlow
                            </h1>

                            <p>
                                Estate management platform
                            </p>

                        </div>

                    </section>


                    {/* ================================
                        RIGHT RESET PANEL
                    ================================= */}

                    <section className="login-card-form">

                        <div className="login-form-content">

                            <div className="login-card-header">

                                <div className="login-icon">
                                    <ShieldCheck size={28} />
                                </div>

                                <h2>
                                    Choose a new password
                                </h2>

                                <p>
                                    Enter a new password for your EstateFlow account.
                                </p>

                            </div>

                            {!token ? (

                                <div className="login-error">
                                    This reset link is invalid or has expired.
                                    Please request a new one from the login page.
                                </div>

                            ) : message ? (

                                <>

                                    <div className="login-message">
                                        <CheckCircle2 size={16} /> {message}
                                    </div>

                                    <button
                                        className="login-button"
                                        type="button"
                                        onClick={() => navigate("/login")}
                                    >
                                        Go to sign in
                                    </button>

                                </>

                            ) : (

                                <form
                                    className="login-form"
                                    onSubmit={handleSubmit}
                                >

                                    <div className="login-field">

                                        <label htmlFor="new-password">
                                            New password
                                        </label>

                                        <div className="login-input-wrapper">

                                            <LockKeyhole
                                                size={19}
                                                className="login-input-icon"
                                            />

                                            <input
                                                id="new-password"
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(event) =>
                                                    setNewPassword(event.target.value)
                                                }
                                                placeholder="At least 8 characters"
                                                autoComplete="new-password"
                                                minLength={8}
                                                maxLength={72}
                                                disabled={loading}
                                                required
                                                style={showNewPassword ? { paddingRight: "44px" } : undefined}
                                            />

                                            <button
                                                type="button"
                                                className="login-password-toggle"
                                                onClick={() => setShowNewPassword((value) => !value)}
                                                aria-label={showNewPassword ? "Hide password" : "Show password"}
                                            >
                                                {showNewPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                            </button>

                                        </div>

                                    </div>

                                    <div className="login-field">

                                        <label htmlFor="confirm-password">
                                            Confirm new password
                                        </label>

                                        <div className="login-input-wrapper">

                                            <LockKeyhole
                                                size={19}
                                                className="login-input-icon"
                                            />

                                            <input
                                                id="confirm-password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(event) =>
                                                    setConfirmPassword(event.target.value)
                                                }
                                                placeholder="Repeat the new password"
                                                autoComplete="new-password"
                                                minLength={8}
                                                maxLength={72}
                                                disabled={loading}
                                                required
                                                style={showConfirmPassword ? { paddingRight: "44px" } : undefined}
                                            />

                                            <button
                                                type="button"
                                                className="login-password-toggle"
                                                onClick={() => setShowConfirmPassword((value) => !value)}
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                            >
                                                {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                            </button>

                                        </div>

                                    </div>

                                    {error && (
                                        <div className="login-error">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        className="login-button"
                                        type="submit"
                                        disabled={loading}
                                    >

                                        {loading ? (
                                            <>
                                                <span className="login-spinner"></span>
                                                Resetting...
                                            </>
                                        ) : (
                                            "Reset password"
                                        )}

                                    </button>

                                </form>
                            )}


                            <div className="login-forgot-row">

                                <button
                                    type="button"
                                    className="login-forgot-link"
                                    onClick={() => navigate("/login")}
                                >
                                    Back to sign in
                                </button>

                            </div>


                            {/* SECURITY NOTE */}

                            <div className="login-security-note">

                                <ShieldCheck size={16} />

                                <span>
                                    Reset links expire after 30 minutes and work once
                                </span>

                            </div>

                        </div>

                    </section>

                </div>


                {/* FOOTER */}

                <p className="login-footer">
                    EstateFlow Estate Management
                </p>

            </div>

        </div>
    );
}

export default ResetPasswordPage;

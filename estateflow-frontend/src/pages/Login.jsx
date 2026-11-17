
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    LockKeyhole,
    UserRound,
    ShieldCheck,
    Eye,
    EyeOff,
    Mail,
} from "lucide-react";

import { login, forgotPassword, resetPassword } from "../services/auth";
import { useAuth } from "../context/useAuth";

import "./Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [forgotEmail, setForgotEmail] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [message, setMessage] = useState("");
    const [mode, setMode] = useState("login"); // login | forgot | reset

    const navigate = useNavigate();
    const { user, loginUser } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            if (mode === "forgot") {
                const response = await forgotPassword({
                    email: forgotEmail,
                    estateId: user?.estateId ?? null,
                });

                setMessage(response?.message || "If this email exists, a reset link has been sent.");
                setResetToken(response?.token || "");
                setMode("reset");
                return;
            }

            if (mode === "reset") {
                if (newPassword !== confirmNewPassword) {
                    setError("New passwords do not match.");
                    return;
                }

                const response = await resetPassword({
                    token: resetToken,
                    newPassword: newPassword,
                });

                setMessage(response?.message || "Password reset successfully.");
                setMode("login");
                setResetToken("");
                setNewPassword("");
                setConfirmNewPassword("");
                return;
            }

            const authData = await login(username, password);

            /*
             * The backend is the authority for the user's real role —
             * the user never needs to announce it.
             */
            const actualRole = authData.role;

            loginUser(authData);

            /*
             * Send each role to the appropriate area.
             * The platform owner works from the super admin
             * dashboard; estate roles land on the shared
             * dashboard, which renders per role.
             *
             * Accounts created through the bulk import (or
             * reset by an admin) arrive with mustChangePassword
             * and are sent to the change-password screen first.
             */
            if (authData?.mustChangePassword) {
                navigate("/account/password");
                return;
            }

            navigate(
                actualRole === "ROLE_SUPER_ADMIN"
                    ? "/super-admin/admins"
                    : "/"
            );
        } catch (error) {
            console.error("Login failed:", error);

            setError(
                error.response?.data?.message ||
                error.message ||
                "Unable to log in. Please check your credentials."
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
                        RIGHT LOGIN PANEL
                    ================================= */}

                    <section className="login-card-form">

                        <div className="login-form-content">

                            <div className="login-card-header">

                                <div className="login-icon">
                                    <ShieldCheck size={28} />
                                </div>

                                <h2>
                                    Welcome back
                                </h2>

                                <p>
                                    Sign in to your EstateFlow account
                                </p>

                            </div>


                            <form
                                className="login-form"
                                onSubmit={handleSubmit}
                            >

                                {mode === "login" && (

                                <div className="login-field">

                                    <label htmlFor="username">
                                        Username
                                    </label>

                                    <div className="login-input-wrapper">

                                        <UserRound
                                            size={19}
                                            className="login-input-icon"
                                        />

                                        <input
                                            id="username"
                                            type="text"
                                            value={username}
                                            onChange={(event) =>
                                                setUsername(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter your username"
                                            autoComplete="username"
                                            disabled={loading}
                                            required
                                        />

                                    </div>

                                </div>
                                )}


                                {mode === "login" && (

                                <div className="login-field">

                                    <label htmlFor="password">
                                        Password
                                    </label>

                                    <div className="login-input-wrapper">

                                        <LockKeyhole
                                            size={19}
                                            className="login-input-icon"
                                        />

                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            disabled={loading}
                                            required
                                            style={showPassword ? { paddingRight: "44px" } : undefined}
                                        />

                                        <button
                                            type="button"
                                            className="login-password-toggle"
                                            onClick={() => setShowPassword((value) => !value)}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                        </button>

                                    </div>

                                </div>
                                )}


                                {mode === "forgot" && (

                                <div className="login-field">

                                    <label htmlFor="forgot-email">
                                        Email
                                    </label>

                                    <div className="login-input-wrapper">

                                        <Mail size={19} className="login-input-icon" />

                                        <input
                                            id="forgot-email"
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(event) => setForgotEmail(event.target.value)}
                                            placeholder="Enter your email"
                                            autoComplete="email"
                                            disabled={loading}
                                            required
                                        />

                                    </div>

                                </div>
                                )}

                                {mode === "reset" && (

                                <>
                                    <div className="login-field">

                                        <label htmlFor="reset-token">
                                            Reset link
                                        </label>

                                        <div className="login-input-wrapper">

                                            <LockKeyhole size={19} className="login-input-icon" />

                                            <input
                                                id="reset-token"
                                                type="text"
                                                value={resetToken}
                                                onChange={(event) => setResetToken(event.target.value)}
                                                placeholder="Paste the reset link"
                                                disabled={loading}
                                            />

                                        </div>

                                    </div>

                                    <div className="login-field">

                                        <label htmlFor="reset-password">
                                            New password
                                        </label>

                                        <div className="login-input-wrapper">

                                            <LockKeyhole size={19} className="login-input-icon" />

                                            <input
                                                id="reset-password"
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(event) => setNewPassword(event.target.value)}
                                                placeholder="Enter new password"
                                                autoComplete="new-password"
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

                                        <label htmlFor="reset-confirm">
                                            Confirm new password
                                        </label>

                                        <div className="login-input-wrapper">

                                            <LockKeyhole size={19} className="login-input-icon" />

                                            <input
                                                id="reset-confirm"
                                                type={showConfirmNewPassword ? "text" : "password"}
                                                value={confirmNewPassword}
                                                onChange={(event) => setConfirmNewPassword(event.target.value)}
                                                placeholder="Confirm new password"
                                                autoComplete="new-password"
                                                disabled={loading}
                                                required
                                                style={showConfirmNewPassword ? { paddingRight: "44px" } : undefined}
                                            />

                                            <button
                                                type="button"
                                                className="login-password-toggle"
                                                onClick={() => setShowConfirmNewPassword((value) => !value)}
                                                aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                                            >
                                                {showConfirmNewPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                                            </button>

                                        </div>

                                    </div>
                                </>
                                )}


                                {/* ERROR */}

                                {error && (
                                    <div className="login-error">
                                        {error}
                                    </div>
                                )}


                                {message && (
                                    <div className="login-message">
                                        {message}
                                    </div>
                                )}


                                {/* BUTTON */}

                                <button
                                    className="login-button"
                                    type="submit"
                                    disabled={loading}
                                >

                                    {mode === "forgot" ? (
                                        loading ? (
                                            <>
                                                <span className="login-spinner"></span>
                                                Sending reset...
                                            </>
                                        ) : (
                                            "Send reset link"
                                        )
                                    ) : mode === "reset" ? (
                                        loading ? (
                                            <>
                                                <span className="login-spinner"></span>
                                                Resetting...
                                            </>
                                        ) : (
                                            "Reset password"
                                        )
                                    ) : loading ? (
                                        <>
                                            <span className="login-spinner"></span>
                                            Signing in...
                                        </>
                                    ) : (
                                        "Sign in"
                                    )}

                                </button>

                            </form>


                            {mode === "login" && (

                                <div className="login-forgot-row">

                                    <button
                                        type="button"
                                        className="login-forgot-link"
                                        onClick={() => {
                                            setMode("forgot");
                                            setError("");
                                            setMessage("");
                                        }}
                                    >
                                        Forgot Password?
                                    </button>

                                </div>
                            )}


                            {/* SECURITY NOTE */}

                            <div className="login-security-note">

                                <ShieldCheck size={16} />

                                <span>
                                    Secure authentication powered by EstateFlow
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

export default Login;



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

import { login, forgotPassword } from "../services/auth";
import { useAuth } from "../context/useAuth";

import "./Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotEstateCode, setForgotEstateCode] = useState("");
    const [message, setMessage] = useState("");
    const [mode, setMode] = useState("login"); // login | forgot

    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            if (mode === "forgot") {
                const response = await forgotPassword({
                    email: forgotEmail,
                    estateCode: forgotEstateCode.trim().toUpperCase(),
                });

                /*
                 * The server never returns the token — it only goes out by
                 * email. The UI shows the same generic message for every
                 * address so the form cannot be used to enumerate accounts.
                 */
                setMessage(
                    response?.message ||
                    "If this email exists for the estate, a password reset link has been sent."
                );
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
                                    {mode === "forgot" ? "Forgot password" : "Welcome back"}
                                </h2>

                                <p>
                                    {mode === "forgot"
                                        ? "We'll email you a secure reset link"
                                        : "Sign in to your EstateFlow account"}
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

                                <>

                                <div className="login-field">

                                    <label htmlFor="forgot-estate-code">
                                        Estate code
                                    </label>

                                    <div className="login-input-wrapper">

                                        <ShieldCheck size={19} className="login-input-icon" />

                                        <input
                                            id="forgot-estate-code"
                                            type="text"
                                            value={forgotEstateCode}
                                            onChange={(event) => setForgotEstateCode(event.target.value)}
                                            placeholder="e.g. EST001"
                                            autoComplete="off"
                                            disabled={loading}
                                            required
                                        />

                                    </div>

                                </div>

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

                            {mode === "forgot" && (

                                <div className="login-forgot-row">

                                    <button
                                        type="button"
                                        className="login-forgot-link"
                                        onClick={() => {
                                            setMode("login");
                                            setError("");
                                            setMessage("");
                                        }}
                                    >
                                        Back to sign in
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



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

    /*
     * One shared form serves three modes:
     *
     *   login     username + password
     *   activate  estate code + email/phone  -> "Set your EstateFlow password"
     *   forgot    estate code + email/phone  -> "Reset your EstateFlow password"
     *
     * Activation and reset both use the same single-use emailed link;
     * only the wording of the email differs.
     */
    const [mode, setMode] = useState("login"); // login | activate | forgot
    const [accountIdentifier, setAccountIdentifier] = useState("");
    const [estateCode, setEstateCode] = useState("");
    const [message, setMessage] = useState("");

    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const isAccountMode = mode === "activate" || mode === "forgot";

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");

        if (isAccountMode) {
            setLoading(true);

            try {
                const response = await forgotPassword({
                    identifier: accountIdentifier.trim(),
                    estateCode: estateCode.trim().toUpperCase(),
                    purpose: mode === "activate" ? "ACTIVATION" : "RESET",
                });

                /*
                 * The server never returns the token — it only goes out by
                 * email. The same generic sentence is returned for every
                 * address, so this form cannot be used to discover accounts.
                 */
                setMessage(
                    response?.message ||
                    (mode === "activate"
                        ? "If an account exists, an activation link has been sent."
                        : "If this email exists for the estate, a password reset link has been sent.")
                );
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    err.message ||
                    "Could not process the request. Please try again."
                );
            } finally {
                setLoading(false);
            }

            return;
        }

        setLoading(true);

        try {
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

    function openMode(nextMode) {
        setMode(nextMode);
        setError("");
        setMessage("");
    }

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
                                    {mode === "login" && "Welcome back"}
                                    {mode === "activate" && "Create your password"}
                                    {mode === "forgot" && "Forgot password"}
                                </h2>

                                <p>
                                    {mode === "login" &&
                                        "Sign in to your EstateFlow account"}
                                    {mode === "activate" &&
                                        "We'll email you a secure link to set your password"}
                                    {mode === "forgot" &&
                                        "We'll email you a secure reset link"}
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


                                {isAccountMode && (

                                <>

                                <div className="login-field">

                                    <label htmlFor="estate-code">
                                        Estate code
                                    </label>

                                    <div className="login-input-wrapper">

                                        <ShieldCheck size={19} className="login-input-icon" />

                                        <input
                                            id="estate-code"
                                            type="text"
                                            value={estateCode}
                                            onChange={(event) => setEstateCode(event.target.value)}
                                            placeholder="e.g. DEMO01"
                                            autoComplete="off"
                                            disabled={loading}
                                            required
                                        />

                                    </div>

                                </div>

                                <div className="login-field">

                                    <label htmlFor="account-identifier">
                                        Email or phone
                                    </label>

                                    <div className="login-input-wrapper">

                                        <Mail size={19} className="login-input-icon" />

                                        <input
                                            id="account-identifier"
                                            type="text"
                                            value={accountIdentifier}
                                            onChange={(event) => setAccountIdentifier(event.target.value)}
                                            placeholder="you@email.com or 08012345678"
                                            autoComplete="off"
                                            spellCheck={false}
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

                                    {mode === "activate" ? (
                                        loading ? (
                                            <>
                                                <span className="login-spinner"></span>
                                                Sending activation...
                                            </>
                                        ) : (
                                            "Send activation link"
                                        )
                                    ) : mode === "forgot" ? (
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
                                        onClick={() => openMode("activate")}
                                    >
                                        First time here? Create password
                                    </button>

                                </div>
                            )}

                            {mode === "login" && (

                                <div className="login-forgot-row">

                                    <button
                                        type="button"
                                        className="login-forgot-link secondary"
                                        onClick={() => openMode("forgot")}
                                    >
                                        Forgot Password?
                                    </button>

                                </div>
                            )}

                            {isAccountMode && (

                                <div className="login-forgot-row">

                                    <button
                                        type="button"
                                        className="login-forgot-link"
                                        onClick={() => openMode("login")}
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

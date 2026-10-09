
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    LockKeyhole,
    UserRound,
    ShieldCheck,
    ChevronDown,
} from "lucide-react";

import { login } from "../services/auth";
import { useAuth } from "../context/AuthContext";

import "./Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("ROLE_ADMIN");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { loginUser } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const authData = await login(username, password);

            /*
             * The backend is the authority for the user's real role.
             * The dropdown does not give the user a role.
             */
            const actualRole = authData.role;

            if (actualRole !== role) {
                throw new Error(
                    `This account is registered as ${
    actualRole?.replace("ROLE_", "") || "another role"
}. Please select the correct role.`
                );
            }

            loginUser(authData);

            /*
             * Send each role to the appropriate area.
             * For now, the existing dashboard remains the destination
             * until dedicated role dashboards are completed.
             */
            navigate("/");
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
        <div className="login-page">

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

                                {/* ROLE */}

                                <div className="login-field">

                                    <label htmlFor="role">
                                        Sign in as
                                    </label>

                                    <div className="login-input-wrapper">

                                        <ShieldCheck
                                            size={19}
                                            className="login-input-icon"
                                        />

                                        <select
                                            id="role"
                                            value={role}
                                            onChange={(event) =>
                                                setRole(event.target.value)
                                            }
                                            disabled={loading}
                                        >
                                            <option value="ROLE_ADMIN">
                                                Administrator
                                            </option>

                                            <option value="ROLE_SECURITY">
                                                Security
                                            </option>

                                            <option value="ROLE_RESIDENT">
                                                Resident
                                            </option>
                                        </select>

                                        <ChevronDown
                                            size={17}
                                            className="login-select-icon"
                                        />

                                    </div>

                                </div>


                                {/* USERNAME */}

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


                                {/* PASSWORD */}

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
                                            type="password"
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
                                        />

                                    </div>

                                </div>


                                {/* ERROR */}

                                {error && (
                                    <div className="login-error">
                                        {error}
                                    </div>
                                )}


                                {/* BUTTON */}

                                <button
                                    className="login-button"
                                    type="submit"
                                    disabled={loading}
                                >

                                    {loading ? (
                                        <>
                                            <span className="login-spinner"></span>
                                            Signing in...
                                        </>
                                    ) : (
                                        "Sign in"
                                    )}

                                </button>

                            </form>


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


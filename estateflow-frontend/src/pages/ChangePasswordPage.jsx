import { useState } from "react";

import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { useToast } from "../components/useToast";

import { LockKeyhole, KeyRound } from "lucide-react";

/*
 * Self-service password change, available to every role.
 *
 * The form is intentionally simple: verify the current
 * password, set a new one, confirm the new one. All real
 * validation lives on the backend — this page mirrors the
 * friendly client checks so obvious mistakes fail locally.
 */
function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [fieldError, setFieldError] = useState("");
    const [saving, setSaving] = useState(false);

    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const handleSubmit = async (event) => {
        event.preventDefault();

        setFieldError("");

        if (!currentPassword.trim()) {
            setFieldError("Enter your current password.");
            return;
        }

        if (newPassword.trim().length < 6) {
            setFieldError(
                "New password must be at least 6 characters."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            setFieldError("New passwords do not match.");
            return;
        }

        if (newPassword === currentPassword) {
            setFieldError(
                "New password must be different from the current password."
            );
            return;
        }

        setSaving(true);

        try {
            await api.post("/api/me/change-password", {
                currentPassword,
                newPassword,
            });

            showSuccess("Password changed successfully.");

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.message ||
                "Unable to change the password.";

            showError(message);
            setFieldError(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="change-password-page">
            <style>{`
                .change-password-page {
                    max-width: 560px;
                    margin: 0 auto;
                }

                .change-password-hero {
                    margin-bottom: 24px;
                }

                .change-password-hero h1 {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 22px;
                    font-weight: 700;
                    color: #172033;
                    margin: 0 0 6px 0;
                }

                .change-password-hero p {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.5;
                }

                .change-password-hero code {
                    background: #eef2f7;
                    padding: 1px 6px;
                    border-radius: 6px;
                    font-size: 13px;
                    color: #172033;
                }

                .change-password-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 14px;
                    padding: 26px 24px;
                    box-shadow: 0 1px 2px rgba(23, 32, 51, 0.04);
                }

                .change-password-field {
                    margin-bottom: 18px;
                }

                .change-password-field label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 7px;
                }

                .change-password-input-wrap {
                    position: relative;
                }

                .change-password-input-wrap svg {
                    position: absolute;
                    left: 13px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #8a98ad;
                    pointer-events: none;
                }

                .change-password-field input {
                    width: 100%;
                    box-sizing: border-box;
                    height: 42px;
                    border: 1px solid #d8e0ea;
                    border-radius: 10px;
                    padding: 0 12px 0 40px;
                    font-size: 14px;
                    color: #172033;
                    background: #ffffff;
                    outline: none;
                }

                .change-password-field input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                }

                .change-password-error {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #b91c1c;
                    font-size: 13px;
                    border-radius: 10px;
                    padding: 10px 12px;
                    margin: 0 0 16px 0;
                }

                .change-password-submit {
                    width: 100%;
                    height: 44px;
                    border: none;
                    border-radius: 10px;
                    background: #172033;
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .change-password-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .change-password-note {
                    margin-top: 18px;
                    font-size: 13px;
                    color: #64748b;
                    line-height: 1.55;
                }

                .change-password-note strong {
                    color: #334155;
                }
            `}</style>

            <div className="change-password-hero">
                <h1>
                    <KeyRound size={20} />
                    Change Password
                </h1>

                <p>
                    Signed in as{" "}
                    <code>{user?.username || "—"}</code>. Use this
                    to update your own login password.
                </p>
            </div>

            <form
                className="change-password-card"
                onSubmit={handleSubmit}
            >
                {fieldError && (
                    <div className="change-password-error">
                        {fieldError}
                    </div>
                )}

                <div className="change-password-field">
                    <label htmlFor="currentPassword">
                        Current password
                    </label>

                    <div className="change-password-input-wrap">
                        <LockKeyhole size={16} />
                        <input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(event) =>
                                setCurrentPassword(
                                    event.target.value
                                )
                            }
                            autoComplete="current-password"
                            maxLength={72}
                            disabled={saving}
                        />
                    </div>
                </div>

                <div className="change-password-field">
                    <label htmlFor="newPassword">
                        New password (at least 6 characters)
                    </label>

                    <div className="change-password-input-wrap">
                        <KeyRound size={16} />
                        <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(event) =>
                                setNewPassword(event.target.value)
                            }
                            autoComplete="new-password"
                            maxLength={72}
                            disabled={saving}
                        />
                    </div>
                </div>

                <div className="change-password-field">
                    <label htmlFor="confirmPassword">
                        Confirm new password
                    </label>

                    <div className="change-password-input-wrap">
                        <KeyRound size={16} />
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) =>
                                setConfirmPassword(
                                    event.target.value
                                )
                            }
                            autoComplete="new-password"
                            maxLength={72}
                            disabled={saving}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="change-password-submit"
                    disabled={saving}
                >
                    {saving
                        ? "Updating…"
                        : "Update password"}
                </button>

                <p className="change-password-note">
                    <strong>Tip:</strong> pick a password you have
                    not used anywhere else. Longer is stronger — a
                    phrase like <code>BlueEagle$Ridge29</code> beats
                    a scrambled short one.
                </p>
            </form>
        </div>
    );
}

export default ChangePasswordPage;

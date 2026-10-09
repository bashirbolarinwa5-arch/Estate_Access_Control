import { useEffect, useState } from "react";
import {
    UserRound,
    Phone,
    CalendarDays,
    Search,
    RefreshCw,
    Users,
    Plus,
    X,
    FileText,
    Loader2,
    CheckCircle2,
} from "lucide-react";

import API from "../services/api";
import "./ResidentVisitorsPage.css";

function ResidentVisitorsPage() {
    const [visitors, setVisitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [showModal, setShowModal] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        phoneNumber: "",
        purpose: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const loadVisitors = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const response = await API.get("/visitor/me");

            const data = response.data;

            if (Array.isArray(data)) {
                setVisitors(data);
            } else if (Array.isArray(data?.data)) {
                setVisitors(data.data);
            } else {
                setVisitors([]);
            }

        } catch (err) {
            console.error(
                "Failed to load resident visitors:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Failed to load your visitors."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadVisitors();
    }, []);

    const filteredVisitors = visitors.filter((visitor) => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return true;
        }

        return (
            visitor.fullName
                ?.toLowerCase()
                .includes(searchValue) ||
            visitor.phoneNumber
                ?.toLowerCase()
                .includes(searchValue) ||
            visitor.purpose
                ?.toLowerCase()
                .includes(searchValue)
        );
    });

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setFormError("");
        setSuccessMessage("");
    };

    const closeModal = () => {
        if (submitting) {
            return;
        }

        setShowModal(false);

        setForm({
            fullName: "",
            phoneNumber: "",
            purpose: "",
        });

        setFormError("");
        setSuccessMessage("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setFormError("");
        setSuccessMessage("");

        const fullName = form.fullName.trim();
        const phoneNumber = form.phoneNumber.trim();
        const purpose = form.purpose.trim();

        if (!fullName) {
            setFormError("Visitor full name is required.");
            return;
        }

        if (!phoneNumber) {
            setFormError("Visitor phone number is required.");
            return;
        }

        if (!purpose) {
            setFormError("Please enter the purpose of the visit.");
            return;
        }

        try {
            setSubmitting(true);

            /*
             * The backend will identify the resident from
             * the authenticated JWT.
             */
            await API.post("/visitor/me", {
                fullName,
                phoneNumber,
                purpose,
            });

            setSuccessMessage(
                "Visitor registered successfully."
            );

            setForm({
                fullName: "",
                phoneNumber: "",
                purpose: "",
            });

            await loadVisitors(true);

            setTimeout(() => {
                setShowModal(false);
                setSuccessMessage("");
            }, 1200);

        } catch (err) {
            console.error(
                "Failed to register visitor:",
                err
            );

            setFormError(
                err.response?.data?.message ||
                "Failed to register visitor. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="resident-visitors-page">

            {/* HEADER */}

            <div className="resident-visitors-header">

                <div>
                    <div className="resident-page-eyebrow">
                        <span></span>
                        RESIDENT PORTAL
                    </div>

                    <h1>
                        My Visitors
                    </h1>

                    <p>
                        View and manage visitors registered
                        under your residence.
                    </p>
                </div>

                <div className="resident-visitors-actions">

                    <button
                        className="resident-refresh-button"
                        onClick={() =>
                            loadVisitors(true)
                        }
                        disabled={loading || refreshing}
                        title="Refresh visitors"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? "resident-spin"
                                    : ""
                            }
                        />

                        <span>
                            Refresh
                        </span>
                    </button>

                    <button
                        className="resident-add-button"
                        onClick={() => {
                            setFormError("");
                            setSuccessMessage("");
                            setShowModal(true);
                        }}
                    >
                        <Plus size={18} />

                        <span>
                            Register Visitor
                        </span>
                    </button>

                </div>

            </div>

            {/* ERROR */}

            {error && (
                <div className="resident-visitors-error">
                    <div>
                        <strong>
                            Unable to load visitors
                        </strong>

                        <span>
                            {error}
                        </span>
                    </div>

                    <button
                        onClick={() =>
                            loadVisitors()
                        }
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* SEARCH + COUNT */}

            <div className="resident-visitors-toolbar">

                <div className="resident-visitors-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search visitors..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                    />

                    {search && (
                        <button
                            onClick={() =>
                                setSearch("")
                            }
                        >
                            <X size={16} />
                        </button>
                    )}

                </div>

                <div className="resident-visitor-count">
                    <Users size={17} />

                    <span>
                        {filteredVisitors.length}{" "}
                        {filteredVisitors.length === 1
                            ? "visitor"
                            : "visitors"}
                    </span>
                </div>

            </div>

            {/* CONTENT */}

            {loading ? (
                <div className="resident-visitors-loading">

                    <div className="resident-loading-spinner"></div>

                    <strong>
                        Loading your visitors...
                    </strong>

                    <span>
                        Please wait a moment.
                    </span>

                </div>
            ) : filteredVisitors.length === 0 ? (

                <div className="resident-visitors-empty">

                    <div className="resident-empty-icon">
                        <Users size={28} />
                    </div>

                    <h2>
                        {search
                            ? "No visitors found"
                            : "No visitors registered"}
                    </h2>

                    <p>
                        {search
                            ? "Try searching with a different name, phone number, or purpose."
                            : "Visitors you register will appear here."}
                    </p>

                    {!search && (
                        <button
                            className="resident-empty-button"
                            onClick={() => {
                                setFormError("");
                                setSuccessMessage("");
                                setShowModal(true);
                            }}
                        >
                            <Plus size={17} />
                            Register Visitor
                        </button>
                    )}

                </div>

            ) : (

                <div className="resident-visitors-grid">

                    {filteredVisitors.map((visitor) => (

                        <div
                            className="resident-visitor-card"
                            key={visitor.id}
                        >

                            <div className="resident-visitor-card-top">

                                <div className="resident-visitor-avatar">
                                    {visitor.fullName
                                        ?.charAt(0)
                                        ?.toUpperCase() || "V"}
                                </div>

                                <div className="resident-visitor-title">

                                    <h2>
                                        {visitor.fullName ||
                                            "Unnamed visitor"}
                                    </h2>

                                    <span>
                                        Registered Visitor
                                    </span>

                                </div>

                            </div>

                            <div className="resident-visitor-details">

                                <VisitorDetail
                                    icon={<Phone size={17} />}
                                    label="Phone Number"
                                    value={
                                        visitor.phoneNumber ||
                                        "Not provided"
                                    }
                                />

                                <VisitorDetail
                                    icon={
                                        <CalendarDays
                                            size={17}
                                        />
                                    }
                                    label="Purpose"
                                    value={
                                        visitor.purpose ||
                                        "General visit"
                                    }
                                />

                            </div>

                        </div>

                    ))}

                </div>

            )}

            {/* REGISTER VISITOR MODAL */}

            {showModal && (
                <div
                    className="resident-modal-overlay"
                    onClick={closeModal}
                >

                    <div
                        className="resident-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="resident-modal-header">

                            <div>
                                <h2>
                                    Register Visitor
                                </h2>

                                <p>
                                    Add a visitor to your
                                    residence.
                                </p>
                            </div>

                            <button
                                className="resident-modal-close"
                                onClick={closeModal}
                                disabled={submitting}
                            >
                                <X size={20} />
                            </button>

                        </div>

                        {/* MODAL BODY */}

                        <form
                            className="resident-modal-body resident-visitor-form"
                            onSubmit={handleSubmit}
                        >

                            {formError && (
                                <div className="resident-form-error">
                                    <strong>
                                        Registration failed
                                    </strong>

                                    <span>
                                        {formError}
                                    </span>
                                </div>
                            )}

                            {successMessage && (
                                <div className="resident-form-success">
                                    <CheckCircle2 size={19} />

                                    <span>
                                        {successMessage}
                                    </span>
                                </div>
                            )}

                            {/* FULL NAME */}

                            <div className="resident-form-group">

                                <label htmlFor="visitor-fullName">
                                    Full Name
                                </label>

                                <div className="resident-input-wrapper">

                                    <UserRound size={18} />

                                    <input
                                        id="visitor-fullName"
                                        name="fullName"
                                        type="text"
                                        placeholder="Enter visitor's full name"
                                        value={form.fullName}
                                        onChange={handleFormChange}
                                        disabled={submitting}
                                        autoComplete="off"
                                    />

                                </div>

                            </div>

                            {/* PHONE NUMBER */}

                            <div className="resident-form-group">

                                <label htmlFor="visitor-phoneNumber">
                                    Phone Number
                                </label>

                                <div className="resident-input-wrapper">

                                    <Phone size={18} />

                                    <input
                                        id="visitor-phoneNumber"
                                        name="phoneNumber"
                                        type="tel"
                                        placeholder="Enter visitor's phone number"
                                        value={form.phoneNumber}
                                        onChange={handleFormChange}
                                        disabled={submitting}
                                        autoComplete="tel"
                                    />

                                </div>

                            </div>

                            {/* PURPOSE */}

                            <div className="resident-form-group">

                                <label htmlFor="visitor-purpose">
                                    Purpose of Visit
                                </label>

                                <div className="resident-input-wrapper resident-textarea-wrapper">

                                    <FileText size={18} />

                                    <textarea
                                        id="visitor-purpose"
                                        name="purpose"
                                        placeholder="Why is the visitor coming?"
                                        value={form.purpose}
                                        onChange={handleFormChange}
                                        disabled={submitting}
                                        rows={4}
                                    />

                                </div>

                            </div>

                            {/* ACTIONS */}

                            <div className="resident-modal-actions">

                                <button
                                    type="button"
                                    className="resident-modal-cancel"
                                    onClick={closeModal}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="resident-modal-submit"
                                    disabled={submitting}
                                >

                                    {submitting ? (
                                        <>
                                            <Loader2
                                                size={17}
                                                className="resident-spin"
                                            />

                                            Registering...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={17} />

                                            Register Visitor
                                        </>
                                    )}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

        </div>
    );
}

function VisitorDetail({
                           icon,
                           label,
                           value,
                       }) {
    return (
        <div className="resident-visitor-detail">

            <div className="resident-detail-icon">
                {icon}
            </div>

            <div>
                <span>
                    {label}
                </span>

                <strong>
                    {value}
                </strong>
            </div>

        </div>
    );
}

export default ResidentVisitorsPage;
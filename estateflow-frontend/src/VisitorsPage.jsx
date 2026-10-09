import React, { useEffect, useMemo, useState } from "react";
import {
    Search,
    Plus,
    RefreshCw,
    Users,
    Phone,
    Home,
    MoreVertical,
    Pencil,
    Trash2,
    X,
    UserPlus,
    AlertCircle,
    CheckCircle2,
    Loader2,
    User,
} from "lucide-react";

import api from "./services/api";

export default function VisitorsPage() {
    const [visitors, setVisitors] = useState([]);
    const [residents, setResidents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingResidents, setLoadingResidents] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingVisitor, setEditingVisitor] = useState(null);
    const [menuId, setMenuId] = useState(null);

    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        purpose: "",
        residentId: "",
    });

    useEffect(() => {
        loadVisitors();
        loadResidents();
    }, []);

    async function loadVisitors() {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/visitor");

            const data = response.data;

            const visitorList = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            setVisitors(visitorList);
        } catch (err) {
            console.error("Failed to load visitors:", err);

            console.error("Status:", err.response?.status);
            console.error("Response:", err.response?.data);

            setError(
                err.response?.data?.message ||
                `Unable to load visitors. Status: ${
                    err.response?.status || "unknown"
                }`
            );
        } finally {
            setLoading(false);
        }
    }

    async function loadResidents() {
        try {
            setLoadingResidents(true);

            const response = await api.get("/resident");

            const data = response.data;

            const residentList = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : [];

            setResidents(residentList);
        } catch (err) {
            console.error("Failed to load residents:", err);

            console.error("Status:", err.response?.status);
            console.error("Response:", err.response?.data);

            setResidents([]);

            setError(
                err.response?.data?.message ||
                "Unable to load residents."
            );
        } finally {
            setLoadingResidents(false);
        }
    }

    function openCreateModal() {
        setEditingVisitor(null);

        setForm({
            fullName: "",
            phone: "",
            purpose: "",
            residentId: "",
        });

        setError("");
        setSuccess("");
        setMenuId(null);
        setShowModal(true);
    }

    function openEditModal(visitor) {
        setEditingVisitor(visitor);

        setForm({
            fullName: visitor.fullName || "",
            phone: visitor.phoneNumber || "",
            purpose: visitor.purpose || "",
            residentId:
                visitor.resident?.id?.toString() || "",
        });

        setError("");
        setSuccess("");
        setMenuId(null);
        setShowModal(true);
    }

    function closeModal() {
        if (saving) {
            return;
        }

        setShowModal(false);
        setEditingVisitor(null);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!form.fullName.trim()) {
            setError("Visitor name is required.");
            return;
        }

        if (!form.phone.trim()) {
            setError("Phone number is required.");
            return;
        }

        if (!form.purpose.trim()) {
            setError("Purpose is required.");
            return;
        }

        if (!editingVisitor && !form.residentId) {
            setError(
                "Please select the resident being visited."
            );
            return;
        }

        setSaving(true);

        try {
            if (editingVisitor) {
                await api.put(
                    `/visitor/${editingVisitor.id}`,
                    {
                        fullName: form.fullName.trim(),
                        phoneNumber: form.phone.trim(),
                        purpose: form.purpose.trim(),
                    }
                );

                setSuccess(
                    "Visitor updated successfully."
                );
            } else {
                await api.post(
                    `/visitor/resident/${form.residentId}`,
                    {
                        fullName: form.fullName.trim(),
                        phoneNumber: form.phone.trim(),
                        purpose: form.purpose.trim(),
                    }
                );

                setSuccess(
                    "Visitor added successfully."
                );
            }

            setShowModal(false);
            setEditingVisitor(null);

            await loadVisitors();

            setTimeout(() => {
                setSuccess("");
            }, 3000);
        } catch (err) {
            console.error("Failed to save visitor:", err);

            setError(
                err.response?.data?.message ||
                "Unable to save visitor."
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(visitor) {
        setMenuId(null);

        const confirmed = window.confirm(
            `Delete visitor "${visitor.fullName}"?`
        );

        if (!confirmed) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            await api.delete(`/visitor/${visitor.id}`);

            setSuccess(
                "Visitor deleted successfully."
            );

            await loadVisitors();

            setTimeout(() => {
                setSuccess("");
            }, 3000);
        } catch (err) {
            console.error(
                "Failed to delete visitor:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to delete visitor."
            );
        }
    }

    const filteredVisitors = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return visitors;
        }

        return visitors.filter((visitor) => {
            const resident = visitor.resident || {};

            const residentName =
                resident.fullName ||
                resident.name ||
                "";

            return [
                visitor.fullName,
                visitor.phoneNumber,
                visitor.purpose,
                residentName,
                resident.houseNumber,
            ]
                .filter(Boolean)
                .some((field) =>
                    String(field)
                        .toLowerCase()
                        .includes(value)
                );
        });
    }, [visitors, search]);

    return (
        <div className="visitors-page">

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .visitors-page {
                    min-height: 100%;
                    padding: 34px 40px 60px;
                    color: #172033;
                }

                /* =========================
                   HEADER
                ========================= */

                .visitors-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 24px;
                    margin-bottom: 28px;
                }

                .visitors-title-area h1 {
                    margin: 0;
                    font-size: 38px;
                    line-height: 1.1;
                    letter-spacing: -1.2px;
                    color: #172033;
                }

                .visitors-title-area p {
                    margin: 9px 0 0;
                    color: #8090aa;
                    font-size: 15px;
                }

                .visitors-actions {
                    display: flex;
                    gap: 12px;
                }

                .vf-button {
                    height: 46px;
                    border-radius: 12px;
                    padding: 0 17px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    border: 1px solid #dce4f0;
                    background: white;
                    color: #52627d;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    transition:
                        transform .2s ease,
                        box-shadow .2s ease,
                        border-color .2s ease;
                }

                .vf-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                    border-color: #c7d3e5;
                    box-shadow:
                        0 7px 20px rgba(27, 45, 78, .07);
                }

                .vf-button.primary {
                    border: none;
                    color: white;
                    background:
                        linear-gradient(
                            135deg,
                            #2563eb,
                            #315fe8
                        );
                    box-shadow:
                        0 10px 25px rgba(37, 99, 235, .20);
                }

                .vf-button.primary:hover:not(:disabled) {
                    box-shadow:
                        0 13px 28px rgba(37, 99, 235, .28);
                }

                .vf-button:disabled {
                    opacity: .65;
                    cursor: not-allowed;
                }

                /* =========================
                   ALERTS
                ========================= */

                .visitor-alert {
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding: 14px 17px;
                    border-radius: 13px;
                    margin-bottom: 20px;
                    font-size: 14px;
                    font-weight: 600;
                }

                .visitor-alert.error {
                    background: #fff1f2;
                    border: 1px solid #fecdd3;
                    color: #be123c;
                }

                .visitor-alert.success {
                    background: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    color: #047857;
                }

                /* =========================
                   SUMMARY
                ========================= */

                .visitor-summary {
                    display: grid;
                    grid-template-columns:
                        repeat(3, minmax(0, 1fr));
                    gap: 18px;
                    margin-bottom: 20px;
                }

                .summary-card {
                    background: white;
                    border: 1px solid #e3e9f2;
                    border-radius: 18px;
                    padding: 21px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    box-shadow:
                        0 8px 25px rgba(30, 50, 85, .035);
                }

                .summary-icon {
                    width: 51px;
                    height: 51px;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #edf4ff;
                    color: #2563eb;
                    flex-shrink: 0;
                }

                .summary-card strong {
                    display: block;
                    font-size: 26px;
                    line-height: 1;
                    letter-spacing: -.5px;
                    color: #172033;
                }

                .summary-card span {
                    color: #8a99b0;
                    font-size: 13px;
                    margin-top: 6px;
                    display: block;
                }

                /* =========================
                   TOOLBAR
                ========================= */

                .visitor-toolbar {
                    background: white;
                    border: 1px solid #e3e9f2;
                    border-radius: 18px;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 20px;
                    box-shadow:
                        0 8px 25px rgba(30, 50, 85, .025);
                }

                .visitor-search {
                    flex: 1;
                    position: relative;
                }

                .visitor-search svg {
                    position: absolute;
                    left: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #93a2b8;
                    pointer-events: none;
                }

                .visitor-search input {
                    width: 100%;
                    height: 47px;
                    border: 1px solid #dce4ef;
                    border-radius: 12px;
                    outline: none;
                    padding: 0 16px 0 46px;
                    font-size: 14px;
                    color: #172033;
                    background: #fff;
                    transition: .2s ease;
                }

                .visitor-search input::placeholder {
                    color: #a1aec0;
                }

                .visitor-search input:focus {
                    border-color: #6090ed;
                    box-shadow:
                        0 0 0 4px rgba(37, 99, 235, .08);
                }

                .visitor-count {
                    white-space: nowrap;
                    color: #8796ad;
                    font-size: 13px;
                    padding-right: 10px;
                }

                /* =========================
                   TABLE CONTAINER
                ========================= */

                .visitor-table-card {
                    background: white;
                    border: 1px solid #e1e7f0;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow:
                        0 10px 30px rgba(30, 50, 85, .045);
                }

                .visitor-table-scroll {
                    width: 100%;
                    overflow-x: auto;
                }

                .visitor-table-scroll::-webkit-scrollbar {
                    height: 7px;
                }

                .visitor-table-scroll::-webkit-scrollbar-track {
                    background: #f8fafc;
                }

                .visitor-table-scroll::-webkit-scrollbar-thumb {
                    background: #d5deeb;
                    border-radius: 10px;
                }

                .visitor-table {
                    width: 100%;
                    min-width: 920px;
                    border-collapse: separate;
                    border-spacing: 0;
                }

                /* =========================
                   TABLE HEADER
                ========================= */

                .visitor-table thead th {
                    background: #f8fafc;
                    padding: 15px 21px;
                    text-align: left;
                    font-size: 10.5px;
                    text-transform: uppercase;
                    letter-spacing: .75px;
                    font-weight: 800;
                    color: #8997ab;
                    border-bottom: 1px solid #e7edf5;
                    white-space: nowrap;
                }

                .visitor-table thead th:first-child {
                    padding-left: 24px;
                }

                .visitor-table thead th:last-child {
                    width: 62px;
                    padding-right: 19px;
                }

                /* =========================
                   TABLE ROWS
                ========================= */

                .visitor-table tbody tr {
                    transition:
                        background .16s ease,
                        box-shadow .16s ease;
                }

                .visitor-table tbody tr:hover {
                    background: #fbfdff;
                }

                .visitor-table tbody tr:last-child td {
                    border-bottom: none;
                }

                .visitor-table td {
                    padding: 16px 21px;
                    border-bottom: 1px solid #edf1f6;
                    font-size: 13.5px;
                    color: #56657d;
                    vertical-align: middle;
                    white-space: nowrap;
                }

                .visitor-table td:first-child {
                    padding-left: 24px;
                }

                .visitor-table td:last-child {
                    padding-right: 19px;
                }

                /* =========================
                   VISITOR IDENTITY
                ========================= */

                .visitor-name {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 190px;
                }

                .visitor-avatar {
                    width: 42px;
                    height: 42px;
                    border-radius: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background:
                        linear-gradient(
                            145deg,
                            #eaf2ff,
                            #dceaff
                        );
                    color: #2563eb;
                    font-size: 14px;
                    font-weight: 800;
                    flex-shrink: 0;
                    border: 1px solid #dce8fb;
                }

                .visitor-name-details {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    min-width: 0;
                }

                .visitor-name-text {
                    color: #1d2940;
                    font-weight: 750;
                    font-size: 13.5px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 190px;
                }

                .visitor-id-text {
                    color: #9aa7b9;
                    font-size: 10.5px;
                    font-weight: 600;
                }

                /* =========================
                   PHONE
                ========================= */

                .visitor-phone {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: #52627a;
                }

                .visitor-phone-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 9px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: #f5f7fa;
                    color: #8291a7;
                }

                /* =========================
                   PURPOSE
                ========================= */

                .purpose-badge {
                    display: inline-flex;
                    align-items: center;
                    max-width: 185px;
                    padding: 7px 10px;
                    border-radius: 9px;
                    background: #f3f6fb;
                    color: #5d6c84;
                    font-size: 11.5px;
                    font-weight: 700;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    border: 1px solid #e8edf4;
                }

                /* =========================
                   RESIDENT
                ========================= */

                .resident-cell {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }

                .resident-cell-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 9px;
                    background: #f3f7ff;
                    color: #6689ca;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .resident-cell-name {
                    color: #52617a;
                    font-weight: 600;
                }

                /* =========================
                   HOUSE
                ========================= */

                .house-cell {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .house-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 9px;
                    background: #f7f5ff;
                    color: #8573c5;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                .house-number {
                    color: #596880;
                    font-weight: 650;
                }

                /* =========================
                   ACTION MENU
                ========================= */

                .action-cell {
                    width: 62px;
                    position: relative;
                    text-align: right;
                }

                .more-button {
                    width: 36px;
                    height: 36px;
                    border: 1px solid transparent;
                    background: transparent;
                    border-radius: 10px;
                    color: #8290a5;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: .18s ease;
                }

                .more-button:hover {
                    background: #f1f5f9;
                    border-color: #e4eaf1;
                    color: #2563eb;
                }

                .action-menu {
                    position: absolute;
                    right: 13px;
                    top: 54px;
                    z-index: 30;
                    width: 150px;
                    padding: 6px;
                    border: 1px solid #e1e7ef;
                    border-radius: 13px;
                    background: white;
                    box-shadow:
                        0 16px 40px rgba(20, 35, 60, .16);
                }

                .menu-item {
                    width: 100%;
                    border: none;
                    background: transparent;
                    padding: 10px 11px;
                    border-radius: 9px;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    font-size: 13px;
                    color: #44536d;
                    cursor: pointer;
                    text-align: left;
                    transition: .15s ease;
                }

                .menu-item:hover {
                    background: #f5f8fc;
                }

                .menu-item.delete {
                    color: #dc2626;
                }

                .menu-item.delete:hover {
                    background: #fff1f2;
                }

                /* =========================
                   EMPTY STATE
                ========================= */

                .empty-state {
                    padding: 75px 25px;
                    text-align: center;
                    color: #8796ad;
                }

                .empty-icon {
                    width: 68px;
                    height: 68px;
                    margin: 0 auto 17px;
                    border-radius: 20px;
                    background: #f0f5ff;
                    color: #6c8fdc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .empty-state h3 {
                    margin: 0 0 7px;
                    color: #253149;
                    font-size: 17px;
                }

                .empty-state p {
                    margin: 0;
                    font-size: 13px;
                }

                /* =========================
                   LOADING
                ========================= */

                .loading-state {
                    min-height: 300px;
                    padding: 65px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 13px;
                    color: #8493aa;
                    font-size: 14px;
                }

                .spin {
                    animation:
                        visitorSpin .8s linear infinite;
                }

                @keyframes visitorSpin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                /* =========================
                   MODAL
                ========================= */

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 100;
                    background: rgba(15, 23, 42, .48);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }

                .visitor-modal {
                    width: 100%;
                    max-width: 500px;
                    background: white;
                    border-radius: 22px;
                    box-shadow:
                        0 30px 80px rgba(15, 23, 42, .25);
                    overflow: hidden;
                }

                .modal-header {
                    padding: 23px 25px;
                    border-bottom: 1px solid #edf1f6;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 21px;
                    color: #172033;
                }

                .modal-header p {
                    margin: 5px 0 0;
                    font-size: 12px;
                    color: #8a99b0;
                }

                .close-button {
                    width: 36px;
                    height: 36px;
                    border: none;
                    border-radius: 9px;
                    background: #f4f6f9;
                    color: #687790;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: .18s ease;
                    flex-shrink: 0;
                }

                .close-button:hover:not(:disabled) {
                    background: #edf1f6;
                    color: #253149;
                }

                .modal-form {
                    padding: 24px 25px 25px;
                }

                .form-field {
                    margin-bottom: 17px;
                }

                .form-field label {
                    display: block;
                    margin-bottom: 7px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #344159;
                }

                .form-field input,
                .form-field select {
                    width: 100%;
                    height: 46px;
                    border: 1px solid #dce4ef;
                    border-radius: 10px;
                    padding: 0 13px;
                    outline: none;
                    font-size: 14px;
                    color: #253149;
                    background: white;
                    transition: .2s ease;
                }

                .form-field input::placeholder {
                    color: #a1aec0;
                }

                .form-field input:focus,
                .form-field select:focus {
                    border-color: #5b8def;
                    box-shadow:
                        0 0 0 4px rgba(37, 99, 235, .08);
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 23px;
                    padding-top: 18px;
                    border-top: 1px solid #edf1f6;
                }

                /* =========================
                   RESPONSIVE
                ========================= */

                @media (max-width: 1100px) {
                    .visitors-page {
                        padding-left: 28px;
                        padding-right: 28px;
                    }

                    .visitor-table {
                        min-width: 900px;
                    }
                }

                @media (max-width: 900px) {
                    .visitors-page {
                        padding: 25px 22px 45px;
                    }

                    .visitor-summary {
                        grid-template-columns: 1fr;
                    }

                    .visitor-table-card {
                        border-radius: 16px;
                    }
                }

                @media (max-width: 650px) {
                    .visitors-page {
                        padding:
                            22px 16px 40px;
                    }

                    .visitors-header {
                        align-items: stretch;
                        flex-direction: column;
                    }

                    .visitors-actions {
                        width: 100%;
                    }

                    .visitors-actions button {
                        flex: 1;
                    }

                    .visitor-toolbar {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .visitor-count {
                        padding:
                            0 4px 3px;
                    }

                    .visitors-title-area h1 {
                        font-size: 31px;
                    }

                    .visitor-table thead th,
                    .visitor-table td {
                        padding-left: 16px;
                        padding-right: 16px;
                    }

                    .visitor-table thead th:first-child,
                    .visitor-table td:first-child {
                        padding-left: 18px;
                    }

                    .visitor-table thead th:last-child,
                    .visitor-table td:last-child {
                        padding-right: 16px;
                    }

                    .visitor-modal {
                        max-height: 90vh;
                        overflow-y: auto;
                    }

                    .modal-header,
                    .modal-form {
                        padding-left: 20px;
                        padding-right: 20px;
                    }

                    .modal-actions {
                        flex-direction: column-reverse;
                    }

                    .modal-actions button {
                        width: 100%;
                    }
                }

            `}</style>

            {/* =========================
                HEADER
            ========================= */}

            <div className="visitors-header">

                <div className="visitors-title-area">

                    <h1>
                        Visitors
                    </h1>

                    <p>
                        Manage visitors registered within
                        the estate.
                    </p>

                </div>

                <div className="visitors-actions">

                    <button
                        className="vf-button"
                        onClick={loadVisitors}
                        disabled={loading}
                    >
                        <RefreshCw
                            size={17}
                            className={
                                loading
                                    ? "spin"
                                    : ""
                            }
                        />

                        Refresh
                    </button>

                    <button
                        className="vf-button primary"
                        onClick={openCreateModal}
                    >
                        <Plus size={18} />

                        Add Visitor
                    </button>

                </div>

            </div>

            {/* =========================
                ALERTS
            ========================= */}

            {error && (
                <div className="visitor-alert error">
                    <AlertCircle size={18} />

                    <span>
                        {error}
                    </span>
                </div>
            )}

            {success && (
                <div className="visitor-alert success">
                    <CheckCircle2 size={18} />

                    <span>
                        {success}
                    </span>
                </div>
            )}

            {/* =========================
                SUMMARY
            ========================= */}

            <div className="visitor-summary">

                <div className="summary-card">

                    <div className="summary-icon">
                        <Users size={23} />
                    </div>

                    <div>
                        <strong>
                            {visitors.length}
                        </strong>

                        <span>
                            Total visitors
                        </span>
                    </div>

                </div>

                <div className="summary-card">

                    <div className="summary-icon">
                        <Search size={23} />
                    </div>

                    <div>
                        <strong>
                            {filteredVisitors.length}
                        </strong>

                        <span>
                            Matching visitors
                        </span>
                    </div>

                </div>

                <div className="summary-card">

                    <div className="summary-icon">
                        <UserPlus size={23} />
                    </div>

                    <div>
                        <strong>
                            {residents.length}
                        </strong>

                        <span>
                            Registered residents
                        </span>
                    </div>

                </div>

            </div>

            {/* =========================
                SEARCH TOOLBAR
            ========================= */}

            <div className="visitor-toolbar">

                <div className="visitor-search">

                    <Search size={19} />

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search by name, phone, purpose or resident..."
                    />

                </div>

                <div className="visitor-count">
                    Showing{" "}
                    <strong>
                        {filteredVisitors.length}
                    </strong>{" "}
                    of{" "}
                    <strong>
                        {visitors.length}
                    </strong>
                </div>

            </div>

            {/* =========================
                VISITORS TABLE
            ========================= */}

            <div className="visitor-table-card">

                {loading ? (
                    <div className="loading-state">

                        <Loader2
                            size={28}
                            className="spin"
                        />

                        <span>
                            Loading visitors...
                        </span>

                    </div>
                ) : filteredVisitors.length === 0 ? (
                    <div className="empty-state">

                        <div className="empty-icon">
                            <Users size={29} />
                        </div>

                        <h3>
                            {search
                                ? "No visitors found"
                                : "No visitors registered yet"}
                        </h3>

                        <p>
                            {search
                                ? "Try a different search term."
                                : "Add your first visitor to get started."}
                        </p>

                    </div>
                ) : (

                    <div className="visitor-table-scroll">

                        <table className="visitor-table">

                            <thead>

                            <tr>
                                <th>
                                    Visitor
                                </th>

                                <th>
                                    Phone
                                </th>

                                <th>
                                    Purpose
                                </th>

                                <th>
                                    Resident
                                </th>

                                <th>
                                    House
                                </th>

                                <th>
                                </th>
                            </tr>

                            </thead>

                            <tbody>

                            {filteredVisitors.map(
                                (visitor) => {

                                    const resident =
                                        visitor.resident ||
                                        {};

                                    const residentName =
                                        resident.fullName ||
                                        resident.name ||
                                        "—";

                                    const houseNumber =
                                        resident.houseNumber ||
                                        "—";

                                    const firstLetter =
                                        visitor.fullName
                                            ?.charAt(0)
                                            ?.toUpperCase() ||
                                        "V";

                                    return (
                                        <tr
                                            key={
                                                visitor.id
                                            }
                                        >

                                            {/* VISITOR */}

                                            <td>

                                                <div className="visitor-name">

                                                    <div className="visitor-avatar">
                                                        {
                                                            firstLetter
                                                        }
                                                    </div>

                                                    <div className="visitor-name-details">

                                                        <div className="visitor-name-text">
                                                            {
                                                                visitor.fullName ||
                                                                "Unknown visitor"
                                                            }
                                                        </div>

                                                        <div className="visitor-id-text">
                                                            Visitor #
                                                            {
                                                                visitor.id
                                                            }
                                                        </div>

                                                    </div>

                                                </div>

                                            </td>

                                            {/* PHONE */}

                                            <td>

                                                <div className="visitor-phone">

                                                    <div className="visitor-phone-icon">
                                                        <Phone
                                                            size={14}
                                                        />
                                                    </div>

                                                    <span>
                                                        {
                                                            visitor.phoneNumber ||
                                                            "—"
                                                        }
                                                    </span>

                                                </div>

                                            </td>

                                            {/* PURPOSE */}

                                            <td>

                                                <span className="purpose-badge">
                                                    {
                                                        visitor.purpose ||
                                                        "General visit"
                                                    }
                                                </span>

                                            </td>

                                            {/* RESIDENT */}

                                            <td>

                                                <div className="resident-cell">

                                                    <div className="resident-cell-icon">
                                                        <User
                                                            size={14}
                                                        />
                                                    </div>

                                                    <span className="resident-cell-name">
                                                        {
                                                            residentName
                                                        }
                                                    </span>

                                                </div>

                                            </td>

                                            {/* HOUSE */}

                                            <td>

                                                <div className="house-cell">

                                                    <div className="house-icon">
                                                        <Home
                                                            size={14}
                                                        />
                                                    </div>

                                                    <span className="house-number">
                                                        {
                                                            houseNumber
                                                        }
                                                    </span>

                                                </div>

                                            </td>

                                            {/* ACTION */}

                                            <td className="action-cell">

                                                <button
                                                    className="more-button"
                                                    onClick={() =>
                                                        setMenuId(
                                                            menuId ===
                                                            visitor.id
                                                                ? null
                                                                : visitor.id
                                                        )
                                                    }
                                                    title="Visitor actions"
                                                >
                                                    <MoreVertical
                                                        size={18}
                                                    />
                                                </button>

                                                {menuId ===
                                                    visitor.id && (
                                                        <div className="action-menu">

                                                            <button
                                                                className="menu-item"
                                                                onClick={() =>
                                                                    openEditModal(
                                                                        visitor
                                                                    )
                                                                }
                                                            >
                                                                <Pencil
                                                                    size={15}
                                                                />

                                                                Edit
                                                            </button>

                                                            <button
                                                                className="menu-item delete"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        visitor
                                                                    )
                                                                }
                                                            >
                                                                <Trash2
                                                                    size={15}
                                                                />

                                                                Delete
                                                            </button>

                                                        </div>
                                                    )}

                                            </td>

                                        </tr>
                                    );
                                }
                            )}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>

            {/* =========================
                ADD / EDIT MODAL
            ========================= */}

            {showModal && (

                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeModal();
                        }

                    }}
                >

                    <div className="visitor-modal">

                        <div className="modal-header">

                            <div>

                                <h2>
                                    {editingVisitor
                                        ? "Edit Visitor"
                                        : "Add Visitor"}
                                </h2>

                                <p>
                                    {editingVisitor
                                        ? "Update visitor information."
                                        : "Register a visitor for a resident."}
                                </p>

                            </div>

                            <button
                                className="close-button"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                <X size={18} />
                            </button>

                        </div>

                        <form
                            className="modal-form"
                            onSubmit={handleSubmit}
                        >

                            <div className="form-field">

                                <label>
                                    Visitor name
                                </label>

                                <input
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="Enter visitor name"
                                    disabled={saving}
                                />

                            </div>

                            <div className="form-field">

                                <label>
                                    Phone number
                                </label>

                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone number"
                                    disabled={saving}
                                />

                            </div>

                            <div className="form-field">

                                <label>
                                    Purpose of visit
                                </label>

                                <input
                                    name="purpose"
                                    value={form.purpose}
                                    onChange={handleChange}
                                    placeholder="e.g. Family visit, delivery, maintenance"
                                    disabled={saving}
                                />

                            </div>

                            {!editingVisitor && (

                                <div className="form-field">

                                    <label>
                                        Resident being visited
                                    </label>

                                    <select
                                        name="residentId"
                                        value={
                                            form.residentId
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            loadingResidents ||
                                            saving
                                        }
                                    >

                                        <option value="">
                                            {loadingResidents
                                                ? "Loading residents..."
                                                : residents.length ===
                                                0
                                                    ? "No residents available"
                                                    : "Select resident"}
                                        </option>

                                        {residents.map(
                                            (resident) => (

                                                <option
                                                    key={
                                                        resident.id
                                                    }
                                                    value={
                                                        resident.id
                                                    }
                                                >
                                                    {
                                                        resident.fullName
                                                    }

                                                    {resident.houseNumber
                                                        ? ` — House ${resident.houseNumber}`
                                                        : ""}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                            )}

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="vf-button"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="vf-button primary"
                                    disabled={saving}
                                >

                                    {saving ? (
                                        <>
                                            <Loader2
                                                size={17}
                                                className="spin"
                                            />

                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2
                                                size={17}
                                            />

                                            {editingVisitor
                                                ? "Save changes"
                                                : "Add visitor"}
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
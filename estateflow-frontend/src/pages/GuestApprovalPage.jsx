import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock3 } from "lucide-react";
import API from "../services/api";

export default function GuestApprovalPage() {
    const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    const [visit, setVisit] = useState(null);
    const [error, setError] = useState("");
    const [result, setResult] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        window.history.replaceState(null, "", window.location.pathname);
        if (!token) return;
        API.post("/visit/public-approval/preview", { token })
            .then((response) => setVisit(response.data?.data || null))
            .catch((err) => setError(err.response?.data?.message || "This approval link is invalid or expired."));
    }, [token]);

    const decide = async (approve) => {
        try {
            setBusy(true);
            const response = await API.post("/visit/public-approval/decision", { token, approve });
            setResult(response.data?.data || (approve ? "Visit approved" : "Visit declined"));
            setVisit((previous) => previous ? { ...previous, status: approve ? "APPROVED" : "REJECTED" } : previous);
        } catch (err) {
            setError(err.response?.data?.message || "We could not record your decision.");
        } finally {
            setBusy(false);
        }
    };

    return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, background: "#f1f5f9" }}>
        <section style={{ width: "min(100%, 520px)", padding: 28, borderRadius: 20, background: "white", boxShadow: "0 18px 50px #0f172a1c" }}>
            <h1 style={{ margin: "0 0 8px", color: "#0f172a" }}>Visitor approval</h1>
            <p style={{ margin: "0 0 24px", color: "#64748b" }}>EstateFlow secure one-time approval link</p>
            {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
            {!token && !error && <p role="alert" style={{ color: "#b91c1c" }}>This approval link is missing or invalid.</p>}
            {visit && <>
                <div style={{ padding: 16, borderRadius: 12, background: "#f8fafc", lineHeight: 1.8 }}>
                    <div><strong>Visitor:</strong> {visit.visitorName}</div>
                    <div><strong>House:</strong> {visit.houseNumber || "—"}</div>
                    <div><strong>Purpose:</strong> {visit.purpose || "—"}</div>
                    <div><strong>Date:</strong> {visit.visitDate || "—"}</div>
                    <div><strong>Status:</strong> {visit.status}</div>
                </div>
                {result && <p role="status" style={{ color: "#15803d" }}>{result}</p>}
                {!result && visit.status === "PENDING" && <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                    <button type="button" disabled={busy} onClick={() => decide(false)} style={{ flex: 1, padding: 13, borderRadius: 10, border: "1px solid #cbd5e1", background: "white", cursor: "pointer" }}><XCircle size={16} /> Decline</button>
                    <button type="button" disabled={busy} onClick={() => decide(true)} style={{ flex: 1, padding: 13, borderRadius: 10, border: 0, background: "#2563eb", color: "white", cursor: "pointer" }}><CheckCircle2 size={16} /> Approve</button>
                </div>}
                {visit.status !== "PENDING" && <p><Clock3 size={15} /> This visit already has a decision.</p>}
            </>}
        </section>
    </main>;
}

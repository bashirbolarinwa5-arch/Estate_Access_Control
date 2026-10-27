import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { cacheTrustedPassKey, verifyPassOffline } from "../db/passCrypto";
import { currentOwnerKey, saveLocalMutation } from "../db/offlineStore";
import { newPublicId } from "../db/estateflowDb";

export default function PassVerificationPanel() {
    const [passText, setPassText] = useState("");
    const [message, setMessage] = useState("Loading trusted pass keys…");
    const [result, setResult] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const scanFrameRef = useRef(null);

    async function refreshTrustedKeys() {
        if (!navigator.onLine) {
            setMessage("Offline: using trusted keys already cached on this device.");
            return;
        }
        setRefreshing(true);
        try {
            const response = await api.get("/api/pass-keys/estate");
            const keys = response.data?.data || [];
            for (const key of keys) await cacheTrustedPassKey(key);
            setMessage(`Trusted key cache refreshed (${keys.length} active key${keys.length === 1 ? "" : "s"}).`);
        } catch (error) {
            setMessage(error.response?.data?.message || "Could not refresh keys; previously cached keys remain available.");
        } finally {
            setRefreshing(false);
        }
    }

    useEffect(() => {
        const initialRefresh = window.setTimeout(() => void refreshTrustedKeys(), 0);
        const onOnline = () => void refreshTrustedKeys();
        window.addEventListener("online", onOnline);
        return () => {
            window.clearTimeout(initialRefresh);
            window.removeEventListener("online", onOnline);
        };
    }, []);

    useEffect(() => () => {
        if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
        streamRef.current?.getTracks().forEach((track) => track.stop());
    }, []);

    async function startCameraScan() {
        setCameraError("");
        const BarcodeDetectorApi = window.BarcodeDetector;
        if (!BarcodeDetectorApi || !navigator.mediaDevices?.getUserMedia) {
            setCameraError("QR scanning is not supported by this browser. Paste the signed pass text instead.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            setCameraActive(true);
            await new Promise((resolve) => requestAnimationFrame(resolve));
            if (!videoRef.current) throw new Error("Camera preview could not be opened.");
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            const detector = new BarcodeDetectorApi({ formats: ["qr_code"] });
            const scan = async () => {
                if (!videoRef.current || !streamRef.current) return;
                try {
                    const codes = await detector.detect(videoRef.current);
                    if (codes[0]?.rawValue) {
                        setPassText(codes[0].rawValue);
                        setCameraActive(false);
                        streamRef.current.getTracks().forEach((track) => track.stop());
                        streamRef.current = null;
                        setMessage("QR payload captured. Verify it to check the offline signature.");
                        return;
                    }
                } catch {
                    setCameraError("Could not read a QR code from the camera. Try pasting the pass text.");
                }
                scanFrameRef.current = requestAnimationFrame(() => void scan());
            };
            void scan();
        } catch (error) {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setCameraActive(false);
            setCameraError(error.message || "Camera access was denied. Paste the signed pass text instead.");
        }
    }

    function stopCameraScan() {
        if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
        scanFrameRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraActive(false);
    }

    async function verify(event) {
        event.preventDefault();
        setResult(null);
        try {
            const signedPass = JSON.parse(passText);
            const verification = await verifyPassOffline(signedPass, {
                expectedEstatePublicId: signedPass.estatePublicId,
            });
            setResult(verification);
            if (verification.valid) {
                const description = `Verified signed offline pass ${verification.pass.publicId} for resident ${verification.pass.residentPublicId}.`;
                try {
                    await saveLocalMutation({
                        tableName: "securityLogs",
                        ownerKey: currentOwnerKey(),
                        estatePublicId: verification.pass.estatePublicId,
                        entityType: "SECURITY_LOG",
                        operation: "APPEND",
                        record: {
                            publicId: newPublicId(),
                            action: "OFFLINE_PASS_VERIFIED",
                            description,
                            createdAt: Date.now(),
                        },
                        payload: { action: "OFFLINE_PASS_VERIFIED", description },
                    });
                    setMessage("Signature verified. A local gate log was saved for synchronization.");
                } catch {
                    setMessage("Signature verified, but the local gate log could not be saved on this device.");
                }
            }
        } catch (error) {
            setResult({ valid: false, reason: error.message || "Paste a valid signed-pass JSON payload." });
        }
    }

    return (
        <section className="security-panel" aria-labelledby="offline-pass-verification-title">
            <div className="security-panel-header">
                <div>
                    <h2 id="offline-pass-verification-title">Offline Pass Verification</h2>
                    <p>Verify a resident-signed pass locally. No network request is made during verification.</p>
                </div>
                <button type="button" className="security-refresh-button" onClick={refreshTrustedKeys} disabled={refreshing}>
                    {refreshing ? "Refreshing…" : "Refresh keys"}
                </button>
            </div>
            <form onSubmit={verify} style={{ display: "grid", gap: 12 }}>
                <label htmlFor="signed-pass-payload">Signed pass payload</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!cameraActive ? (
                        <button type="button" className="security-action-button" onClick={startCameraScan}>Scan QR code</button>
                    ) : (
                        <button type="button" className="security-action-button" onClick={stopCameraScan}>Stop camera</button>
                    )}
                    <span>Scanning is on-device; verification remains offline.</span>
                </div>
                {cameraActive && <video ref={videoRef} muted playsInline style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 10 }} />}
                {cameraError && <span role="status">{cameraError}</span>}
                <textarea
                    id="signed-pass-payload"
                    value={passText}
                    onChange={(event) => setPassText(event.target.value)}
                    placeholder="Paste the signed pass JSON here"
                    rows={5}
                    autoComplete="off"
                    spellCheck="false"
                    style={{ width: "100%", resize: "vertical", fontFamily: "monospace" }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <button type="submit" className="security-action-button checkin" disabled={!passText.trim()}>
                        Verify pass offline
                    </button>
                    <span role="status">{message}</span>
                </div>
                {result && (
                    <div role="status" aria-live="polite" className={`security-alert ${result.valid ? "success" : "error"}`}>
                        <strong>{result.valid ? "Signature valid" : "Pass not verified"}</strong>
                        <span>{result.valid ? `${result.pass.visitorName || "Visitor"} — ${result.pass.purpose || "Visit"}` : result.reason}</span>
                    </div>
                )}
            </form>
        </section>
    );
}

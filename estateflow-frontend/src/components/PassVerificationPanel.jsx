import { useEffect, useRef, useState } from "react";
import { QrCode, RefreshCw, ShieldCheck, X } from "lucide-react";
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
            setMessage(keys.length === 0
                ? "No resident offline passes are enrolled yet. They appear here after a resident creates one while online."
                : `Trusted key cache refreshed (${keys.length} active key${keys.length === 1 ? "" : "s"}).`);
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
        <section className="security-panel security-pass-panel" aria-labelledby="offline-pass-verification-title">
            <div className="security-panel-header">
                <div>
                    <h2 id="offline-pass-verification-title">Verify Visitor Pass</h2>
                    <p>Check a resident-signed pass on this device. Works without internet.</p>
                </div>
                <button
                    type="button"
                    className="security-pass-key-button"
                    onClick={refreshTrustedKeys}
                    disabled={refreshing}
                    title="Refresh trusted resident pass keys"
                >
                    <RefreshCw size={14} className={refreshing ? "security-small-spinner" : ""} />
                    {refreshing ? "Refreshing…" : "Refresh keys"}
                </button>
            </div>

            <form className="security-pass-form" onSubmit={verify}>
                <div className="security-pass-actions">
                    {!cameraActive ? (
                        <button type="button" className="security-primary-button security-pass-scan" onClick={startCameraScan}>
                            <QrCode size={16} /> Scan QR code
                        </button>
                    ) : (
                        <button type="button" className="security-secondary-button security-pass-scan" onClick={stopCameraScan}>
                            <X size={16} /> Stop camera
                        </button>
                    )}
                    <span className="security-pass-hint">
                        Scanning happens on this device; the signature is verified offline.
                    </span>
                </div>

                {cameraActive && (
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        className="security-pass-video"
                    />
                )}

                {cameraError && (
                    <div className="security-pass-result error" role="status">
                        <span>{cameraError}</span>
                    </div>
                )}

                <details className="security-pass-manual">
                    <summary>Paste pass manually</summary>
                    <label htmlFor="signed-pass-payload" className="security-pass-label">
                        Signed pass payload
                    </label>
                    <textarea
                        id="signed-pass-payload"
                        value={passText}
                        onChange={(event) => setPassText(event.target.value)}
                        placeholder='Paste the signed pass JSON, e.g. {"pass": …}'
                        rows={5}
                        autoComplete="off"
                        spellCheck="false"
                        className="security-pass-textarea"
                    />
                </details>

                <div className="security-pass-footer">
                    <button type="submit" className="security-primary-button" disabled={!passText.trim()}>
                        <ShieldCheck size={16} />
                        Verify pass offline
                    </button>
                    <span className="security-pass-status" role="status">{message}</span>
                </div>

                {result && (
                    <div role="status" aria-live="polite" className={`security-pass-result ${result.valid ? "success" : "error"}`}>
                        <strong>{result.valid ? "Pass verified" : "Pass not verified"}</strong>
                        <span>
                            {result.valid
                                ? `${result.pass.visitorName || "Visitor"} — ${result.pass.purpose || "Visit"}`
                                : result.reason}
                        </span>
                    </div>
                )}
            </form>
        </section>
    );
}

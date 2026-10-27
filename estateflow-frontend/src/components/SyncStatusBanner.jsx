import { useEffect, useState } from "react";

import { currentOwnerKey } from "../db/offlineStore";
import { db } from "../db/estateflowDb";

export default function SyncStatusBanner() {
    const [online, setOnline] = useState(() => navigator.onLine);
    const [pending, setPending] = useState(0);
    const [needsReview, setNeedsReview] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [showingCachedData, setShowingCachedData] = useState(false);

    useEffect(() => {
        let active = true;

        const refreshQueue = async () => {
            const ownerKey = currentOwnerKey();
            if (!ownerKey) {
                if (active) {
                    setPending(0);
                    setNeedsReview(0);
                }
                return;
            }

            try {
                const records = await db.outbox.where("ownerKey").equals(ownerKey).toArray();
                if (!active) return;
                setPending(records.filter((record) => ["QUEUED", "SENDING"].includes(record.status)).length);
                setNeedsReview(records.filter((record) => ["CONFLICT", "REJECTED"].includes(record.status)).length);
            } catch {
                // Local storage can be unavailable in private or restricted browser modes.
            }
        };

        const onOnline = () => {
            setOnline(true);
            setShowingCachedData(false);
        };
        const onOffline = () => setOnline(false);
        const onSyncState = (event) => {
            setSyncing(event.detail?.state === "syncing");
            void refreshQueue();
        };
        const onCachedResponse = () => setShowingCachedData(true);
        const onQueueChanged = () => void refreshQueue();

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        window.addEventListener("estateflow:sync-state", onSyncState);
        window.addEventListener("estateflow:offline-cache-served", onCachedResponse);
        window.addEventListener("estateflow:outbox-changed", onQueueChanged);
        void refreshQueue();

        return () => {
            active = false;
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
            window.removeEventListener("estateflow:sync-state", onSyncState);
            window.removeEventListener("estateflow:offline-cache-served", onCachedResponse);
            window.removeEventListener("estateflow:outbox-changed", onQueueChanged);
        };
    }, []);

    if (online && pending === 0 && needsReview === 0 && !showingCachedData) return null;

    const message = !online
        ? "Offline — showing saved data where available; it may be out of date."
        : needsReview
            ? `${needsReview} offline action${needsReview === 1 ? " needs" : "s need"} review.`
            : syncing
                ? `Syncing ${pending} saved action${pending === 1 ? "" : "s"}…`
                : pending
                    ? `${pending} saved action${pending === 1 ? " is" : "s are"} waiting to sync.`
                    : "Showing saved data from the last connection.";

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                margin: "12px 0",
                padding: "11px 14px",
                borderRadius: 10,
                background: needsReview ? "#fef3e2" : "#eef4ff",
                border: "1px solid " + (needsReview ? "#f5d9bd" : "#dce8fb"),
                color: needsReview ? "#8a4b12" : "#1d3f8f",
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.5,
            }}
        >
            {message}
        </div>
    );
}

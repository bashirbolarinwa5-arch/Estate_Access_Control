import api from "../services/api";
import {
    acknowledgeMutation,
    countUnresolvedMutations,
    getQueuedMutations,
    recoverInFlightMutations,
    updateMutation,
} from "./offlineStore";

const SYNC_TAG = "estateflow-outbox";
const BATCH_SIZE = 50;
let runningSync = null;
let retryTimer = null;

function currentAccount() {
    try {
        const auth = JSON.parse(localStorage.getItem("estateflow_auth") || "null");
        if (!auth?.username || !auth?.role) return null;
        return {
            ownerKey: `${auth.role}:${auth.username}`,
            username: auth.username,
            role: auth.role,
            publicId: auth.publicId || null,
        };
    } catch {
        return null;
    }
}

function emitSyncState(detail) {
    window.dispatchEvent(new CustomEvent("estateflow:sync-state", { detail }));
}

function retryDelay(attempts) {
    const exponential = Math.min(5 * 60_000, 2_000 * (2 ** Math.min(attempts, 7)));
    return exponential + Math.floor(Math.random() * 1_500);
}

async function postBatch(records) {
    const mutations = records.map((record) => ({
        mutationId: record.mutationId,
        entityType: record.entityType,
        entityPublicId: record.entityPublicId,
        operation: record.operation,
        payload: record.payload,
        baseVersion: record.baseVersion,
        createdAt: record.createdAt,
    }));

    const response = await api.post("/api/sync/batch", { mutations });
    const results = response.data?.data?.results;
    if (!Array.isArray(results)) {
        throw new Error("The sync server returned no per-mutation results.");
    }

    const byId = new Map(results.map((result) => [result.mutationId, result]));
    for (const record of records) {
        const result = byId.get(record.mutationId);
        if (!result) {
            await updateMutation(record.mutationId, {
                status: "QUEUED",
                nextAttemptAt: Date.now() + retryDelay(record.attempts),
                lastError: "No result was returned for this mutation.",
            });
            continue;
        }

        if (result.status === "ACKNOWLEDGED") {
            await acknowledgeMutation(record.mutationId, result.receipt ?? null);
            continue;
        }

        if (result.status === "CONFLICT" || result.status === "REJECTED") {
            await updateMutation(record.mutationId, {
                status: result.status,
                serverReceipt: result.receipt ?? null,
                lastError: result.message || "The server needs this action reviewed.",
            });
            continue;
        }

        await updateMutation(record.mutationId, {
            status: "QUEUED",
            nextAttemptAt: Date.now() + retryDelay(record.attempts),
            lastError: "The server did not acknowledge this mutation.",
        });
    }
}

async function flushUnlocked() {
    const account = currentAccount();
    if (!account || !navigator.onLine) return { sent: 0, state: "offline" };

    await recoverInFlightMutations(account.ownerKey);
    const records = await getQueuedMutations(account.ownerKey, BATCH_SIZE);
    if (!records.length) {
        const counts = await countUnresolvedMutations(account.ownerKey);
        const state = counts.needsReview ? "needs-review" : "idle";
        emitSyncState({ state, ...counts });
        return { sent: 0, state };
    }

    const marked = [];
    for (const record of records) {
        await updateMutation(record.mutationId, {
            status: "SENDING",
            attempts: record.attempts + 1,
            lastAttemptAt: Date.now(),
        });
        marked.push({ ...record, attempts: record.attempts + 1 });
    }

    emitSyncState({ state: "syncing", pending: marked.length });
    try {
        await postBatch(marked);
        const counts = await countUnresolvedMutations(account.ownerKey);
        emitSyncState({ state: counts.needsReview ? "needs-review" : "idle", ...counts });
        if (counts.pending) void flushOutbox();
        return { sent: marked.length, state: counts.needsReview ? "needs-review" : "idle" };
    } catch (error) {
        const delay = retryDelay(marked.reduce((max, item) => Math.max(max, item.attempts), 1));
        await Promise.all(marked.map((record) => updateMutation(record.mutationId, {
            status: "QUEUED",
            nextAttemptAt: Date.now() + delay,
            lastError: error.response?.data?.message || error.message || "Sync failed.",
        })));
        emitSyncState({ state: "retrying", pending: marked.length, retryAt: Date.now() + delay });
        if (retryTimer) window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => {
            retryTimer = null;
            void flushOutbox();
        }, delay);
        return { sent: 0, state: "retrying" };
    }
}

export async function flushOutbox() {
    if (runningSync) return runningSync;
    const run = async () => {
        if (navigator.locks?.request) {
            return navigator.locks.request("estateflow-outbox-sync", flushUnlocked);
        }
        return flushUnlocked();
    };
    runningSync = run().catch((error) => {
        emitSyncState({ state: "unavailable", message: error.message || "Offline sync is unavailable." });
        return { sent: 0, state: "unavailable" };
    }).finally(() => { runningSync = null; });
    return runningSync;
}

async function requestBackgroundSync() {
    if (!("serviceWorker" in navigator)) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        if (!registration.sync?.register) return false;
        await registration.sync.register(SYNC_TAG);
        return true;
    } catch {
        return false;
    }
}

export function startSyncEngine() {
    if (typeof window === "undefined") return () => {};

    const resume = () => {
        void requestBackgroundSync();
        void flushOutbox();
    };
    const onVisibilityChange = () => {
        if (document.visibilityState === "visible") resume();
    };
    const onQueueChanged = () => resume();
    const onServiceWorkerMessage = (event) => {
        if (event.data?.type === "ESTATEFLOW_SYNC_REQUEST") void flushOutbox();
    };

    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("estateflow:outbox-changed", onQueueChanged);
    document.addEventListener("visibilitychange", onVisibilityChange);
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    resume();

    return () => {
        window.removeEventListener("online", resume);
        window.removeEventListener("focus", resume);
        window.removeEventListener("estateflow:outbox-changed", onQueueChanged);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        navigator.serviceWorker?.removeEventListener("message", onServiceWorkerMessage);
        if (retryTimer) window.clearTimeout(retryTimer);
    };
}

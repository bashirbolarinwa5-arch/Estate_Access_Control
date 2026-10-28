import { db, newPublicId } from "./estateflowDb";

const VAULT_PREFIX = "offline-vault:";
const ENTITY_TABLES = new Set([
    "users",
    "residents",
    "visitors",
    "visits",
    "security",
    "securityLogs",
    "passes",
]);

function now() {
    return Date.now();
}

function requireOwnerKey(ownerKey) {
    if (!ownerKey || typeof ownerKey !== "string") {
        throw new Error("An authenticated offline account is required.");
    }
}

export function currentOwnerKey() {
    if (typeof localStorage === "undefined") return null;
    try {
        const auth = JSON.parse(localStorage.getItem("estateflow_auth") || "null");
        if (!auth?.username || !auth?.role) return null;
        return `${auth.role}:${auth.username}`;
    } catch {
        return null;
    }
}

async function getVaultKey(ownerKey, create = false) {
    requireOwnerKey(ownerKey);

    if (!globalThis.crypto?.subtle || !globalThis.indexedDB) {
        throw new Error("Encrypted offline storage is not available in this browser.");
    }

    const key = `${VAULT_PREFIX}${ownerKey}`;
    const saved = await db.deviceState.get(key);
    if (saved?.cryptoKey) return saved.cryptoKey;
    if (!create) {
        throw new Error("This device has no offline encryption key for the account.");
    }

    const cryptoKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );

    await db.deviceState.put({ key, cryptoKey, createdAt: now() });
    return cryptoKey;
}

async function seal(ownerKey, value) {
    const cryptoKey = await getVaultKey(ownerKey, true);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        plaintext,
    );

    return { iv, ciphertext };
}

async function unseal(ownerKey, sealed) {
    const cryptoKey = await getVaultKey(ownerKey);
    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: sealed.iv },
        cryptoKey,
        sealed.ciphertext,
    );

    return JSON.parse(new TextDecoder().decode(plaintext));
}

function snapshotKey(ownerKey, requestKey) {
    return `${ownerKey}:${requestKey}`;
}

export async function saveSnapshot({
    ownerKey,
    requestKey,
    value,
    actorPublicId = null,
    estatePublicId = null,
    maxAgeMs = 7 * 24 * 60 * 60 * 1000,
}) {
    const key = snapshotKey(ownerKey, requestKey);
    const encryptedValue = await seal(ownerKey, value);

    await db.apiSnapshots.put({
        key,
        ownerKey,
        actorPublicId,
        estatePublicId,
        encryptedValue,
        updatedAt: now(),
        expiresAt: now() + maxAgeMs,
    });
}

export async function loadSnapshot({ ownerKey, requestKey }) {
    requireOwnerKey(ownerKey);
    const record = await db.apiSnapshots.get(snapshotKey(ownerKey, requestKey));
    if (!record) return null;

    return {
        value: await unseal(ownerKey, record.encryptedValue),
        updatedAt: record.updatedAt,
        stale: record.expiresAt <= now(),
    };
}

export async function enqueueMutation({
    ownerKey,
    actorPublicId = null,
    estatePublicId = null,
    entityType,
    entityPublicId,
    operation,
    payload,
    baseVersion = null,
}) {
    requireOwnerKey(ownerKey);
    if (!entityType || !operation || !payload) {
        throw new Error("The offline mutation is incomplete.");
    }

    const mutationId = newPublicId();
    const encryptedPayload = await seal(ownerKey, payload);
    const queuedAt = now();

    await db.outbox.add({
        mutationId,
        ownerKey,
        actorPublicId,
        estatePublicId,
        entityType,
        entityPublicId: entityPublicId || newPublicId(),
        operation,
        encryptedPayload,
        baseVersion,
        status: "QUEUED",
        attempts: 0,
        createdAt: queuedAt,
        nextAttemptAt: queuedAt,
    });

    return mutationId;
}

export async function saveLocalMutation({
    tableName,
    ownerKey,
    actorPublicId = null,
    estatePublicId = null,
    entityType,
    operation,
    record,
    payload = record,
    baseVersion = null,
}) {
    requireOwnerKey(ownerKey);
    if (!ENTITY_TABLES.has(tableName)) {
        throw new Error("This record type cannot be changed offline.");
    }
    if (!record || typeof record !== "object" || !entityType || !operation) {
        throw new Error("The offline record change is incomplete.");
    }

    const publicId = record.publicId || newPublicId();
    const serverId = record.serverId ?? record.id ?? null;
    const updatedAt = now();
    const localRecord = {
        ownerKey,
        publicId,
        serverId,
        estatePublicId: estatePublicId || record.estatePublicId || null,
        actorPublicId,
        status: record.status || null,
        visitDate: record.visitDate || null,
        createdAt: record.createdAt || updatedAt,
        updatedAt,
        syncStatus: "PENDING",
        encryptedValue: await seal(ownerKey, record),
    };
    const encryptedPayload = await seal(ownerKey, payload);
    const mutationId = newPublicId();
    const outboxRecord = {
        mutationId,
        ownerKey,
        actorPublicId,
        estatePublicId: localRecord.estatePublicId,
        entityType,
        entityPublicId: publicId,
        operation,
        encryptedPayload,
        baseVersion,
        status: "QUEUED",
        attempts: 0,
        createdAt: updatedAt,
        nextAttemptAt: updatedAt,
    };
    const table = db.table(tableName);

    await db.transaction("rw", table, db.outbox, async () => {
        const existing = await table.where("publicId").equals(publicId).first();
        if (existing?.ownerKey && existing.ownerKey !== ownerKey) {
            throw new Error("This record belongs to another offline account.");
        }
        await table.put({ ...existing, ...localRecord, localId: existing?.localId });
        await db.outbox.add(outboxRecord);
    });

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("estateflow:outbox-changed"));
    }

    return { mutationId, publicId, serverId };
}

export async function getLocalRecords(tableName, ownerKey) {
    requireOwnerKey(ownerKey);
    if (!ENTITY_TABLES.has(tableName)) throw new Error("Unknown offline record collection.");

    const records = await db.table(tableName).where("ownerKey").equals(ownerKey).toArray();
    return Promise.all(records.map(async (record) => ({
        ...await unseal(ownerKey, record.encryptedValue),
        publicId: record.publicId,
        serverId: record.serverId,
        syncStatus: record.syncStatus,
    })));
}

/*
 * Local-first visitor registration.
 *
 * Writes the visitor to the encrypted IndexedDB store and to the outbox in
 * one step, so the caller never has to touch the network. It is used both
 * when the browser reports being offline and when an online registration
 * fails without a server response.
 */
export async function saveVisitor({
    ownerKey,
    fullName,
    phoneNumber,
    actorPublicId = null,
    estatePublicId = null,
}) {
    requireOwnerKey(ownerKey);

    const record = {
        publicId: newPublicId(),
        fullName,
        phoneNumber,
        status: "OFFLINE_PENDING",
    };

    await saveLocalMutation({
        tableName: "visitors",
        ownerKey,
        actorPublicId,
        estatePublicId,
        entityType: "VISITOR",
        operation: "CREATE",
        record,
        payload: { fullName, phoneNumber },
    });

    return record;
}

export async function getQueuedMutations(ownerKey, limit = 50) {
    requireOwnerKey(ownerKey);
    const records = await db.outbox
        .where("[ownerKey+status]")
        .equals([ownerKey, "QUEUED"])
        .sortBy("createdAt");

    return Promise.all(
        records.filter((record) => record.nextAttemptAt <= now()).slice(0, limit).map(async (record) => ({
            ...record,
            payload: await unseal(ownerKey, record.encryptedPayload),
        })),
    );
}

export async function recoverInFlightMutations(ownerKey, staleAfterMs = 2 * 60 * 1000) {
    requireOwnerKey(ownerKey);
    const staleBefore = now() - staleAfterMs;
    const inFlight = await db.outbox
        .where("[ownerKey+status]")
        .equals([ownerKey, "SENDING"])
        .toArray();

    await Promise.all(inFlight
        .filter((record) => (record.lastAttemptAt || 0) <= staleBefore)
        .map((record) => db.outbox.update(record.mutationId, {
            status: "QUEUED",
            nextAttemptAt: now(),
            lastError: "Sync was interrupted; retrying safely.",
        })));
}

export async function countUnresolvedMutations(ownerKey) {
    requireOwnerKey(ownerKey);
    const records = await db.outbox.where("ownerKey").equals(ownerKey).toArray();
    return {
        pending: records.filter((record) => ["QUEUED", "SENDING"].includes(record.status)).length,
        needsReview: records.filter((record) => ["CONFLICT", "REJECTED"].includes(record.status)).length,
    };
}

export async function updateMutation(mutationId, changes) {
    await db.outbox.update(mutationId, changes);
}

export async function acknowledgeMutation(mutationId, receipt) {
    const mutation = await db.outbox.get(mutationId);
    if (!mutation) return receipt;

    const tableName = {
        USER: "users",
        RESIDENT: "residents",
        VISITOR: "visitors",
        VISIT: "visits",
        SECURITY: "security",
        SECURITY_LOG: "securityLogs",
        PASS: "passes",
    }[mutation.entityType];

    if (tableName && ENTITY_TABLES.has(tableName)) {
        const table = db.table(tableName);
        await db.transaction("rw", table, db.outbox, async () => {
            const localRecord = await table.where("publicId").equals(mutation.entityPublicId).first();
            if (localRecord?.ownerKey === mutation.ownerKey) {
                await table.update(localRecord.localId, {
                    syncStatus: "SYNCED",
                    serverId: receipt?.serverId ?? localRecord.serverId,
                    updatedAt: now(),
                });
            }
            await db.outbox.delete(mutationId);
        });
    } else {
        await db.outbox.delete(mutationId);
    }
    return receipt;
}

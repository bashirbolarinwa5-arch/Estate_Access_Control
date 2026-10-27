import Dexie from "dexie";

export const db = new Dexie("EstateFlow");

db.version(1).stores({
    users: "++localId,&publicId,serverId,username,role,estatePublicId",
    residents: "++localId,&publicId,serverId,estatePublicId,fullName",
    visits: "++localId,&publicId,serverId,estatePublicId,residentPublicId,status,updatedAt",
    securityLogs: "++localId,&publicId,serverId,estatePublicId,actorPublicId,visitPublicId,createdAt,syncStatus",
});

db.version(2)
    .stores({
        users: "++localId,&publicId,serverId,ownerKey,role,estatePublicId,updatedAt",
        residents: "++localId,&publicId,serverId,ownerKey,estatePublicId,updatedAt",
        visitors: "++localId,&publicId,serverId,ownerKey,estatePublicId,residentPublicId,updatedAt",
        visits: "++localId,&publicId,serverId,ownerKey,estatePublicId,residentPublicId,visitorPublicId,status,visitDate,updatedAt",
        security: "++localId,&publicId,serverId,ownerKey,estatePublicId,updatedAt",
        securityLogs: "++localId,&publicId,serverId,ownerKey,estatePublicId,actorPublicId,visitPublicId,createdAt,syncStatus",
        passes: "++localId,&publicId,ownerKey,estatePublicId,residentPublicId,status,validFrom,expiresAt,usedAt,syncStatus",
        outbox: "&mutationId,ownerKey,entityPublicId,entityType,operation,status,createdAt,nextAttemptAt,[ownerKey+status]",
        syncState: "&key,updatedAt",
        signingKeys: "&keyId,publicId,createdAt,revokedAt",
        trustedKeys: "&keyId,estatePublicId,expiresAt",
        deviceState: "&key",
        apiSnapshots: "&key,ownerKey,actorPublicId,estatePublicId,updatedAt,expiresAt",
    })
    .upgrade(async (transaction) => {
        for (const tableName of ["users", "residents", "visits", "securityLogs"]) {
            await transaction.table(tableName).toCollection().modify((record) => {
                if (!record.publicId) record.publicId = newPublicId();
            });
        }
    });

export function newPublicId() {
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

    return [
        hex.slice(0, 4).join(""),
        hex.slice(4, 6).join(""),
        hex.slice(6, 8).join(""),
        hex.slice(8, 10).join(""),
        hex.slice(10, 16).join(""),
    ].join("-");
}

export function withPublicId(record) {
    return {
        ...record,
        publicId: record.publicId ?? newPublicId(),
    };
}

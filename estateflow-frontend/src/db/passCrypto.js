import { db, newPublicId } from "./estateflowDb";

const PASS_VERSION = 1;
const SIGNATURE_ALGORITHM = "ECDSA-P256-SHA256";
const KEY_ALGORITHM = { name: "ECDSA", namedCurve: "P-256" };
const SIGN_ALGORITHM = { name: "ECDSA", hash: "SHA-256" };

function requireSecureCrypto() {
    if (!globalThis.crypto?.subtle || !globalThis.indexedDB) {
        throw new Error("Offline pass signing requires a secure browser with IndexedDB and WebCrypto.");
    }
}

function requireUuid(value, label) {
    if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error(`${label} must be a UUID.`);
    }
    return value.toLowerCase();
}

function canonicalize(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("Pass data contains a non-finite number.");
        return value;
    }
    if (Array.isArray(value)) return value.map(canonicalize);
    if (typeof value === "object") {
        const result = {};
        for (const key of Object.keys(value).sort()) {
            if (value[key] === undefined) throw new Error("Pass data cannot contain undefined values.");
            result[key] = canonicalize(value[key]);
        }
        return result;
    }
    throw new Error("Pass data contains an unsupported value.");
}

function canonicalBytes(value) {
    return new TextEncoder().encode(JSON.stringify(canonicalize(value)));
}

function toBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new Error("The pass signature is malformed.");
    }
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function validatePass(pass, estatePublicId) {
    if (!pass || typeof pass !== "object" || Array.isArray(pass)) {
        throw new Error("Pass data must be an object.");
    }
    requireUuid(pass.publicId, "Pass publicId");
    requireUuid(pass.residentPublicId, "Resident publicId");
    requireUuid(pass.visitorPublicId, "Visitor publicId");
    if (requireUuid(pass.estatePublicId, "Pass estatePublicId") !== estatePublicId) {
        throw new Error("The pass belongs to a different estate.");
    }
    const from = Date.parse(pass.validFrom);
    const until = Date.parse(pass.expiresAt);
    if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from) {
        throw new Error("Pass validity must include a valid start and expiry time.");
    }
    return { ...pass };
}

function signedEnvelope({ keyId, signerPublicId, estatePublicId, pass }) {
    return {
        version: PASS_VERSION,
        algorithm: SIGNATURE_ALGORITHM,
        keyId,
        signerPublicId,
        estatePublicId,
        pass,
    };
}

/** Generate a resident signing key once; the private CryptoKey is non-exportable. */
export async function createResidentPassSigningKey({ residentPublicId, estatePublicId }) {
    requireSecureCrypto();
    const residentId = requireUuid(residentPublicId, "Resident publicId");
    const estateId = requireUuid(estatePublicId, "Estate publicId");
    const keyPair = await crypto.subtle.generateKey(KEY_ALGORITHM, false, ["sign", "verify"]);
    const keyId = newPublicId();
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

    await db.signingKeys.put({
        keyId,
        publicId: residentId,
        estatePublicId: estateId,
        algorithm: SIGNATURE_ALGORITHM,
        privateKey: keyPair.privateKey,
        publicJwk,
        createdAt: Date.now(),
        revokedAt: null,
    });

    return { keyId, residentPublicId: residentId, estatePublicId: estateId, algorithm: SIGNATURE_ALGORITHM, publicJwk };
}

/** Sign an offline pass. The caller must enroll the returned key's publicJwk with the server when online. */
export async function signPassOffline({ keyId, residentPublicId, estatePublicId, pass }) {
    requireSecureCrypto();
    const residentId = requireUuid(residentPublicId, "Resident publicId");
    const estateId = requireUuid(estatePublicId, "Estate publicId");
    const key = await db.signingKeys.get(keyId);
    if (!key || key.revokedAt || (key.expiresAt && key.expiresAt <= Date.now())
        || key.publicId !== residentId || key.estatePublicId !== estateId) {
        throw new Error("No active signing key is available for this resident and estate on this device.");
    }

    const safePass = validatePass(pass, estateId);
    if (safePass.residentPublicId !== residentId) throw new Error("The pass does not belong to the signing resident.");
    const envelope = signedEnvelope({ keyId, signerPublicId: residentId, estatePublicId: estateId, pass: safePass });
    const signature = await crypto.subtle.sign(SIGN_ALGORITHM, key.privateKey, canonicalBytes(envelope));
    return { ...envelope, signature: toBase64Url(new Uint8Array(signature)) };
}

/** Cache a public key only after the caller has received it over the authenticated server API. */
export async function cacheTrustedPassKey({ keyId, residentPublicId, estatePublicId, publicJwk, expiresAt, revokedAt = null }) {
    requireSecureCrypto();
    const residentId = requireUuid(residentPublicId, "Resident publicId");
    const estateId = requireUuid(estatePublicId, "Estate publicId");
    const expiry = typeof expiresAt === "number" ? expiresAt : Date.parse(expiresAt);
    if (!keyId || !Number.isFinite(expiry)) throw new Error("A key ID and expiry are required.");
    if (!publicJwk || publicJwk.kty !== "EC" || publicJwk.crv !== "P-256" || publicJwk.d) {
        throw new Error("The trusted key must be a public P-256 JWK.");
    }

    const publicKey = await crypto.subtle.importKey("jwk", publicJwk, KEY_ALGORITHM, false, ["verify"]);
    await db.trustedKeys.put({
        keyId,
        residentPublicId: residentId,
        estatePublicId: estateId,
        algorithm: SIGNATURE_ALGORITHM,
        publicKey,
        publicJwk,
        expiresAt: expiry,
        revokedAt: revokedAt ? Date.parse(revokedAt) || Date.now() : null,
        cachedAt: Date.now(),
    });
    return keyId;
}

/** Verify offline against the gate device's cached, authenticated public-key directory. */
export async function verifyPassOffline(signedPass, { expectedEstatePublicId, now = Date.now() } = {}) {
    requireSecureCrypto();
    if (!signedPass || signedPass.version !== PASS_VERSION || signedPass.algorithm !== SIGNATURE_ALGORITHM) {
        return { valid: false, reason: "Unsupported pass format." };
    }
    try {
        const estateId = requireUuid(expectedEstatePublicId, "Expected estate publicId");
        const residentId = requireUuid(signedPass.signerPublicId, "Signer publicId");
        if (requireUuid(signedPass.estatePublicId, "Pass estatePublicId") !== estateId) {
            return { valid: false, reason: "This pass is for a different estate." };
        }
        const pass = validatePass(signedPass.pass, estateId);
        if (pass.residentPublicId !== residentId) return { valid: false, reason: "Signer and resident do not match." };
        const validFrom = Date.parse(pass.validFrom);
        const expiresAt = Date.parse(pass.expiresAt);
        if (now < validFrom) return { valid: false, reason: "This pass is not valid yet." };
        if (now >= expiresAt) return { valid: false, reason: "This pass has expired." };

        const trusted = await db.trustedKeys.get(signedPass.keyId);
        if (!trusted || trusted.revokedAt || trusted.expiresAt <= now) {
            return { valid: false, reason: "The signing key is missing, expired, or revoked on this device." };
        }
        if (trusted.estatePublicId !== estateId || trusted.residentPublicId !== residentId) {
            return { valid: false, reason: "The signing key is not trusted for this resident and estate." };
        }

        const { signature, ...envelope } = signedPass;
        const valid = await crypto.subtle.verify(
            SIGN_ALGORITHM,
            trusted.publicKey,
            fromBase64Url(signature),
            canonicalBytes(envelope),
        );
        return valid
            ? { valid: true, reason: null, pass }
            : { valid: false, reason: "The pass signature is invalid." };
    } catch (error) {
        return { valid: false, reason: error.message || "The pass could not be verified." };
    }
}

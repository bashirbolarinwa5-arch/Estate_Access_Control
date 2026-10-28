/*
 * Gate codes generated on the device so an offline visit can be shared
 * immediately. Same alphabet and length as the server generator
 * (6 characters, A-Z and 0-9). The server keeps the proposed code when
 * it is still free and falls back to its own code on a collision.
 */

const ACCESS_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateOfflineAccessCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length]).join("");
}

export function isValidAccessCode(value) {
    return typeof value === "string" && /^[A-Z0-9]{6}$/.test(value);
}

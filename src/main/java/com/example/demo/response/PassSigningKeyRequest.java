package com.example.demo.response;

import tools.jackson.databind.JsonNode;

/** Public half of a resident's offline signing key; never contains private key material. */
public record PassSigningKeyRequest(String keyId, String algorithm, JsonNode publicJwk) {
}

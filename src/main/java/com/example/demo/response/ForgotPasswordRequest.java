package com.example.demo.response;

import lombok.Data;

@Data
public class ForgotPasswordRequest {

    /*
     * Email address OR phone number belonging to the resident. The
     * backend resolves it inside the estate given by estateCode, so the
     * caller never needs to know which one the record holds.
     */
    private String identifier;

    /* Legacy field: treated as the identifier when it is not supplied. */
    private String email;

    /*
     * The estate code the account belongs to (e.g. "DEMO01"). The
     * lookup is scoped to (estate, email/phone), so the same address in
     * two estates can never reach the wrong account.
     */
    private String estateCode;

    /* ACTIVATION for a first-time resident, RESET for a forgotten password. */
    private String purpose;

    /* Optional explicit estate id (kept for internal callers). */
    private Long estateId;

}

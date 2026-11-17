package com.example.demo.response;

import lombok.Data;

@Data
public class ForgotPasswordRequest {

    private String email;

    /*
     * The estate code the account belongs to (e.g. "EST001").
     * The reset is scoped to (estate, email), so the same
     * email in two estates can never reset the wrong account.
     */
    private String estateCode;

    /* Optional explicit estate id (kept for internal callers). */
    private Long estateId;

}

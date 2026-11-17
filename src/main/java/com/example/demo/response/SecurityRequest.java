package com.example.demo.response;

import lombok.Data;

@Data
public class SecurityRequest {

    private String name;

    private String phoneNumber;

    private String email;

    /* Optional gate / shift assignment, e.g. "Main Gate - Night". */
    private String shift;

    /* Optional: derived from the name when left blank. */
    private String username;

    /*
     * Legacy field. It is ignored outright — administrators never create
     * a security password; the officer sets one through the activation
     * link.
     */
    private String password;

}

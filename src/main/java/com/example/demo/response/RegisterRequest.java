package com.example.demo.response;

import com.example.demo.entity.Role;
import lombok.Data;

@Data
public class RegisterRequest {

    private String username;
    private String password;
    private Role role;

    /*
     * Multi-estate: a public resident sign-up must say
     * which estate it belongs to (the estate's public
     * code). Not used by the current UI, which has no
     * public signup page — admin-created residents
     * inherit the admin's estate automatically.
     */
    private String estateCode;
}
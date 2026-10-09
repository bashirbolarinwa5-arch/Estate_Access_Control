package com.example.demo.response;

import lombok.Data;

@Data
public class SecurityRequest {

    private String name;

    private String phoneNumber;

    private String email;

    private String username;

    private String password;

}
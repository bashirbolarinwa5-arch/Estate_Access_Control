package com.example.demo.response;

import lombok.Data;

@Data
public class LoginRequest {

    private String username;
    private String password;

}
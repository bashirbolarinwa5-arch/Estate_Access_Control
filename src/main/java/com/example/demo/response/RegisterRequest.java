package com.example.demo.response;

import com.example.demo.entity.Role;
import lombok.Data;

@Data
public class RegisterRequest {

    private String username;
    private String password;
    private Role role;
}
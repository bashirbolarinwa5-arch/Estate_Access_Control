package com.example.demo.response;

import com.example.demo.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RegisterResponse {

    private Long id;
    private String username;
    private Role role;
}
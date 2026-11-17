package com.example.demo.response;

import lombok.Data;

@Data
public class ResetPasswordRequest {

    private String token;

    private String newPassword;

}

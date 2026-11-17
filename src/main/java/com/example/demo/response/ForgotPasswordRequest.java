package com.example.demo.response;

import lombok.Data;

@Data
public class ForgotPasswordRequest {

    private String email;

    private Long estateId;

}

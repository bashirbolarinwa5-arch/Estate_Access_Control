package com.example.demo.response;

import com.example.demo.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {

    private String token;
    private String username;
    private Role role;

    /*
     * True when the account is still using a temporary
     * password. The client must send the user to the
     * change-password screen before anything else.
     */
    private Boolean mustChangePassword;

}

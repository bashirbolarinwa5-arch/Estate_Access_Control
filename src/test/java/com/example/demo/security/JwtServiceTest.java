package com.example.demo.security;

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class JwtServiceTest {

    @Autowired
    private JwtService jwtService;

    @Test
    void shouldGenerateAndValidateToken() {

        User user = new User(
                "admin1",
                "password",
                Role.ROLE_ADMIN
        );

        String token = jwtService.generateToken(user);

        assertTrue(jwtService.isTokenValid(token));

        assertEquals(
                "admin1",
                jwtService.extractUsername(token)
        );
    }
    @Test
    void shouldRejectTamperedToken() {

        User user = new User(
                "admin1",
                "password",
                Role.ROLE_ADMIN
        );

        String token = jwtService.generateToken(user);

        String tamperedToken = token + "tampered";

        assertFalse(jwtService.isTokenValid(tamperedToken));
    }
}
package com.example.demo.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;


import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins:http://localhost:5173}")
            String allowedOrigins) {

        CorsConfiguration configuration = new CorsConfiguration();

        /*
         * Vercel deployments (including per-commit preview
         * URLs like estateflow-git-xxx.vercel.app) are matched
         * with origin PATTERNS. Exact origins also work as
         * patterns, so comma-separated values like
         *   https://app.example.com,https://*.vercel.app
         * all work. Unlike "*", patterns stay credential-safe.
         */
        configuration.setAllowedOriginPatterns(
                Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isEmpty())
                        .toList()
        );

        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "DELETE", "OPTIONS")
        );

        configuration.setAllowedHeaders(
                List.of("*")
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
                .cors(cors -> {})

                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        // Authentication
                        .requestMatchers("/api/auth/**").permitAll()

                        // Resident management
                        .requestMatchers(HttpMethod.POST, "/resident")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/resident/bulk"
                        )
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/resident/*/reset-password"
                        )
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/resident")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(HttpMethod.GET, "/resident/me")
                        .hasRole("RESIDENT")
                        .requestMatchers(HttpMethod.GET, "/resident/{id}")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(HttpMethod.PUT, "/resident/update/{id}")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.DELETE, "/resident/{id}")
                        .hasRole("ADMIN")


                        .requestMatchers(HttpMethod.GET, "/visitor/me")
                        .hasRole("RESIDENT")

                        // Visitor management
                        .requestMatchers(HttpMethod.GET, "/visitor")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(HttpMethod.GET, "/visitor/{id}")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/visitor/resident/{residentId}"
                        )
                        .hasAnyRole("ADMIN", "SECURITY", "RESIDENT")

                        .requestMatchers(HttpMethod.PUT, "/visitor/{id}")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(HttpMethod.DELETE, "/visitor/{id}")
                        .hasRole("ADMIN")

                        // Visit management

                        .requestMatchers(
                                HttpMethod.GET,
                                "/visit/me"
                        )
                        .hasRole("RESIDENT")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/visit/me/approve/{id}",
                                "/visit/me/reject/{id}"
                        )
                        .hasRole("RESIDENT")

                        .requestMatchers(HttpMethod.POST, "/visit/planned")
                        .hasRole("RESIDENT")

                        .requestMatchers(HttpMethod.GET, "/visit")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/visit/pending",
                                "/visit/approved",
                                "/visit/checked-in"
                        )
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(HttpMethod.GET, "/visit/{id}")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(HttpMethod.POST, "/visit")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(HttpMethod.PUT, "/visit/{id}")
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(HttpMethod.DELETE, "/visit/{id}")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/visit/check-In/{accessCode}"
                        )
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/visit/check-Out/{accessCode}"
                        )
                        .hasAnyRole("ADMIN", "SECURITY")

                        // Security management
                        .requestMatchers(HttpMethod.POST, "/security")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/security/bulk"
                        )
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/security/*/reset-password"
                        )
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/security")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/security/{id}")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/security/{id}")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.DELETE, "/security/{id}")
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/security/check-in/{accessCode}"
                        )
                        .hasAnyRole("ADMIN", "SECURITY")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/security/check-out/{accessCode}"
                        )
                        .hasAnyRole("ADMIN", "SECURITY")

                        // Super Admin (platform owner) routes.
                        //
                        // Every other matcher above names specific estate
                        // roles, so a SUPER_ADMIN is automatically locked
                        // out of estate operations (residents, visitors,
                        // visits, security) and may only use these routes.
                        .requestMatchers("/super-admin/**")
                        .hasRole("SUPER_ADMIN")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/visit/approve/{id}",
                                "/visit/reject/{id}"
                        )
                        .hasRole("ADMIN")

                        .anyRequest().authenticated()
                )

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}
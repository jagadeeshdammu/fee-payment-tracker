package com.jagadeesh.feetracker.controller;

import com.jagadeesh.feetracker.dto.LoginRequest;
import com.jagadeesh.feetracker.dto.LoginResponse;
import com.jagadeesh.feetracker.model.User;
import com.jagadeesh.feetracker.repository.UserRepository;
import com.jagadeesh.feetracker.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthenticationManager authManager;
    private final UserRepository users;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authManager, UserRepository users, JwtService jwtService) {
        this.authManager = authManager;
        this.users = users;
        this.jwtService = jwtService;
    }

    @PostMapping("/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        // Throws BadCredentialsException (-> 401) if the password doesn't match the BCrypt hash.
        authManager.authenticate(new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        User user = users.findByUsername(req.username()).orElseThrow(() -> new BadCredentialsException("Invalid"));
        String token = jwtService.generateToken(user.getUsername(), user.getRole().name());
        return new LoginResponse(token, user.getUsername(), user.getFullName(), user.getRole().name());
    }

    @GetMapping("/auth/me")
    public Map<String, Object> me(Authentication auth) {
        User user = users.findByUsername(auth.getName()).orElseThrow(() -> new BadCredentialsException("Invalid"));
        return Map.of("username", user.getUsername(), "fullName", user.getFullName(), "role", user.getRole().name());
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}

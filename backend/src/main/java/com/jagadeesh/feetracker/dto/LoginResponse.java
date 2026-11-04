package com.jagadeesh.feetracker.dto;

public record LoginResponse(String token, String username, String fullName, String role) {
}

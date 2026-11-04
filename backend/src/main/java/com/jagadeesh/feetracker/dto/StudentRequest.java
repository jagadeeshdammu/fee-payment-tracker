package com.jagadeesh.feetracker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StudentRequest(
        @NotBlank @Size(max = 30) String admissionNo,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 20) String className,
        @Size(max = 100) String parentName,
        @Pattern(regexp = "^$|^[6-9][0-9]{9}$", message = "must be a 10-digit Indian mobile number") String parentPhone) {
}

package com.jagadeesh.feetracker.dto;

import java.math.BigDecimal;

public record StudentResponse(
        Long id,
        String admissionNo,
        String name,
        String className,
        String parentName,
        String parentPhone,
        BigDecimal totalFees,
        BigDecimal paid,
        BigDecimal balance) {
}

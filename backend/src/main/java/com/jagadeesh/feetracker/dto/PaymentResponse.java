package com.jagadeesh.feetracker.dto;

import com.jagadeesh.feetracker.model.PaymentMode;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentResponse(
        Long id,
        Long feeId,
        String feeTitle,
        Long studentId,
        String studentName,
        BigDecimal amount,
        PaymentMode mode,
        String reference,
        LocalDate paidOn,
        String recordedBy) {
}

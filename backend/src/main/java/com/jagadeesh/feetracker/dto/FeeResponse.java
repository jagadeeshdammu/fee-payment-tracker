package com.jagadeesh.feetracker.dto;

import com.jagadeesh.feetracker.model.FeeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FeeResponse(
        Long id,
        Long studentId,
        String studentName,
        String className,
        String title,
        BigDecimal amount,
        BigDecimal paidAmount,
        BigDecimal balance,
        LocalDate dueDate,
        FeeStatus status) {
}

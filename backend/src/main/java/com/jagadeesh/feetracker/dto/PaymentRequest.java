package com.jagadeesh.feetracker.dto;

import com.jagadeesh.feetracker.model.PaymentMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentRequest(
        @NotNull @DecimalMin("1.00") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotNull PaymentMode mode,
        @NotBlank @Size(max = 60) String reference,
        @PastOrPresent LocalDate paidOn) {
}

package com.jagadeesh.feetracker.dto;

import com.jagadeesh.feetracker.model.PaymentMode;

import java.math.BigDecimal;

public record ModeSummary(PaymentMode mode, BigDecimal amount, long count) {
}

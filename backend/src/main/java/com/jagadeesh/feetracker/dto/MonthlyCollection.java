package com.jagadeesh.feetracker.dto;

import java.math.BigDecimal;

/** month = "2026-06" */
public record MonthlyCollection(String month, BigDecimal amount) {
}

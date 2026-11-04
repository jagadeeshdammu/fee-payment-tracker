package com.jagadeesh.feetracker.dto;

import java.math.BigDecimal;

public record StudentBalance(Long studentId, BigDecimal total, BigDecimal paid) {
}

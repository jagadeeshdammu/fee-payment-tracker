package com.jagadeesh.feetracker.dto;

import java.math.BigDecimal;

public record ClassSummary(String className, BigDecimal billed, BigDecimal collected) {
}

package com.jagadeesh.feetracker.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(
        long studentCount,
        BigDecimal totalBilled,
        BigDecimal totalCollected,
        BigDecimal totalOutstanding,
        BigDecimal collectedThisMonth,
        long overdueCount,
        List<ClassSummary> byClass,
        List<PaymentResponse> recentPayments) {
}

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
        BigDecimal overdueAmount,
        List<ClassSummary> byClass,
        List<MonthlyCollection> monthly,
        List<ModeSummary> byMode,
        List<PaymentResponse> recentPayments) {
}

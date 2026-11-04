package com.jagadeesh.feetracker.service;

import com.jagadeesh.feetracker.dto.DashboardResponse;
import com.jagadeesh.feetracker.dto.ModeSummary;
import com.jagadeesh.feetracker.dto.MonthlyCollection;
import com.jagadeesh.feetracker.model.PaymentMode;
import com.jagadeesh.feetracker.repository.FeeRepository;
import com.jagadeesh.feetracker.repository.PaymentRepository;
import com.jagadeesh.feetracker.repository.StudentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final int TREND_MONTHS = 6;

    private final StudentRepository students;
    private final FeeRepository fees;
    private final PaymentRepository payments;
    private final Clock clock;

    public DashboardService(StudentRepository students, FeeRepository fees, PaymentRepository payments, Clock clock) {
        this.students = students;
        this.fees = fees;
        this.payments = payments;
        this.clock = clock;
    }

    public DashboardResponse summary() {
        LocalDate today = LocalDate.now(clock);
        BigDecimal billed = fees.totalBilled();
        BigDecimal collected = fees.totalCollected();
        return new DashboardResponse(
                students.count(),
                billed,
                collected,
                billed.subtract(collected),
                payments.collectedSince(today.withDayOfMonth(1)),
                fees.countOverdue(today),
                fees.overdueAmount(today),
                fees.summaryByClass(),
                monthlyTrend(today),
                byMode(),
                payments.findRecent(PageRequest.of(0, 6)).stream().map(Mappers::toResponse).toList());
    }

    /** Last 6 months, oldest first. Months with no payments are returned as 0 so the chart has no gaps. */
    private List<MonthlyCollection> monthlyTrend(LocalDate today) {
        YearMonth current = YearMonth.from(today);
        YearMonth first = current.minusMonths(TREND_MONTHS - 1L);
        Map<YearMonth, BigDecimal> totals = new HashMap<>();
        for (Object[] row : payments.monthlyTotals(first.atDay(1))) {
            YearMonth ym = YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            totals.put(ym, (BigDecimal) row[2]);
        }
        List<MonthlyCollection> result = new ArrayList<>();
        for (YearMonth ym = first; !ym.isAfter(current); ym = ym.plusMonths(1)) {
            result.add(new MonthlyCollection(ym.toString(), totals.getOrDefault(ym, BigDecimal.ZERO)));
        }
        return result;
    }

    private List<ModeSummary> byMode() {
        return payments.totalsByMode().stream()
                .map(r -> new ModeSummary((PaymentMode) r[0], (BigDecimal) r[1], ((Number) r[2]).longValue()))
                .sorted(Comparator.comparing(ModeSummary::amount).reversed())
                .toList();
    }
}

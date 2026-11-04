package com.jagadeesh.feetracker.service;

import com.jagadeesh.feetracker.dto.DashboardResponse;
import com.jagadeesh.feetracker.repository.FeeRepository;
import com.jagadeesh.feetracker.repository.PaymentRepository;
import com.jagadeesh.feetracker.repository.StudentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;

@Service
@Transactional(readOnly = true)
public class DashboardService {

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
                fees.summaryByClass(),
                payments.findRecent(PageRequest.of(0, 6)).stream().map(Mappers::toResponse).toList());
    }
}

package com.jagadeesh.feetracker.service;

import com.jagadeesh.feetracker.dto.FeeRequest;
import com.jagadeesh.feetracker.dto.FeeResponse;
import com.jagadeesh.feetracker.dto.PaymentRequest;
import com.jagadeesh.feetracker.dto.PaymentResponse;
import com.jagadeesh.feetracker.exception.ConflictException;
import com.jagadeesh.feetracker.exception.NotFoundException;
import com.jagadeesh.feetracker.model.Fee;
import com.jagadeesh.feetracker.model.Payment;
import com.jagadeesh.feetracker.model.Student;
import com.jagadeesh.feetracker.repository.FeeRepository;
import com.jagadeesh.feetracker.repository.PaymentRepository;
import com.jagadeesh.feetracker.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class FeeService {

    private final FeeRepository fees;
    private final PaymentRepository payments;
    private final StudentRepository students;
    private final Clock clock;

    public FeeService(FeeRepository fees, PaymentRepository payments, StudentRepository students, Clock clock) {
        this.fees = fees;
        this.payments = payments;
        this.students = students;
        this.clock = clock;
    }

    @Transactional
    public FeeResponse addFee(Long studentId, FeeRequest req) {
        Student student = students.findById(studentId).orElseThrow(() -> new NotFoundException("Student", studentId));
        Fee fee = fees.save(new Fee(student, req.title().trim(), req.amount(), req.dueDate()));
        return Mappers.toResponse(fee, today());
    }

    @Transactional
    public void deleteFee(Long feeId) {
        Fee fee = find(feeId);
        if (fee.getPaidAmount().signum() > 0) {
            throw new ConflictException("Fee has payments recorded and cannot be deleted");
        }
        fees.delete(fee);
    }

    /**
     * Records a payment in ONE transaction: insert payment + update fee.paidAmount.
     * - Duplicate reference      -> 409 (same UPI/bank transaction can't be counted twice)
     * - Amount more than balance -> 422 (rule enforced in Fee.applyPayment)
     * - Concurrent update        -> 409 via @Version optimistic locking on Fee
     */
    @Transactional
    public PaymentResponse recordPayment(Long feeId, PaymentRequest req, String recordedBy) {
        String reference = req.reference().trim();
        if (payments.existsByReference(reference)) {
            throw new ConflictException("Payment with reference " + reference + " is already recorded");
        }
        Fee fee = find(feeId);
        fee.applyPayment(req.amount());
        LocalDate paidOn = req.paidOn() != null ? req.paidOn() : today();
        Payment payment = payments.save(new Payment(fee, req.amount(), req.mode(), reference, paidOn, recordedBy));
        return Mappers.toResponse(payment);
    }

    public List<PaymentResponse> paymentsForFee(Long feeId) {
        find(feeId);
        return payments.findByFee(feeId).stream().map(Mappers::toResponse).toList();
    }

    public List<FeeResponse> overdue() {
        LocalDate today = today();
        return fees.findOverdue(today).stream().map(f -> Mappers.toResponse(f, today)).toList();
    }

    private Fee find(Long id) {
        return fees.findById(id).orElseThrow(() -> new NotFoundException("Fee", id));
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }
}

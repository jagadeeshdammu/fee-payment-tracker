package com.jagadeesh.feetracker.service;

import com.jagadeesh.feetracker.dto.FeeResponse;
import com.jagadeesh.feetracker.dto.PaymentResponse;
import com.jagadeesh.feetracker.dto.StudentResponse;
import com.jagadeesh.feetracker.model.Fee;
import com.jagadeesh.feetracker.model.Payment;
import com.jagadeesh.feetracker.model.Student;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Entity -> DTO mapping. Entities never leave the service layer. */
final class Mappers {

    private Mappers() {
    }

    static StudentResponse toResponse(Student s, BigDecimal total, BigDecimal paid) {
        return new StudentResponse(s.getId(), s.getAdmissionNo(), s.getName(), s.getClassName(),
                s.getParentName(), s.getParentPhone(), total, paid, total.subtract(paid));
    }

    static FeeResponse toResponse(Fee f, LocalDate today) {
        Student s = f.getStudent();
        return new FeeResponse(f.getId(), s.getId(), s.getName(), s.getClassName(), s.getParentName(), s.getParentPhone(), f.getTitle(),
                f.getAmount(), f.getPaidAmount(), f.getBalance(), f.getDueDate(), f.statusOn(today));
    }

    static PaymentResponse toResponse(Payment p) {
        Fee f = p.getFee();
        Student s = f.getStudent();
        return new PaymentResponse(p.getId(), receiptNo(p.getId()), f.getId(), f.getTitle(), s.getId(), s.getName(),
                s.getAdmissionNo(), s.getClassName(), p.getAmount(), p.getMode(), p.getReference(), p.getPaidOn(),
                p.getRecordedBy());
    }

    static String receiptNo(Long paymentId) {
        return String.format("RCPT-%06d", paymentId);
    }
}

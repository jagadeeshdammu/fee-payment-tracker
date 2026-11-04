package com.jagadeesh.feetracker.service;

import com.jagadeesh.feetracker.dto.FeeResponse;
import com.jagadeesh.feetracker.dto.StudentBalance;
import com.jagadeesh.feetracker.dto.StudentDetail;
import com.jagadeesh.feetracker.dto.StudentRequest;
import com.jagadeesh.feetracker.dto.StudentResponse;
import com.jagadeesh.feetracker.exception.ConflictException;
import com.jagadeesh.feetracker.exception.NotFoundException;
import com.jagadeesh.feetracker.model.Fee;
import com.jagadeesh.feetracker.model.Student;
import com.jagadeesh.feetracker.repository.FeeRepository;
import com.jagadeesh.feetracker.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StudentService {

    private final StudentRepository students;
    private final FeeRepository fees;
    private final Clock clock;

    public StudentService(StudentRepository students, FeeRepository fees, Clock clock) {
        this.students = students;
        this.fees = fees;
        this.clock = clock;
    }

    public List<StudentResponse> search(String q, String className) {
        // One grouped query for all balances instead of one query per student (avoids N+1).
        Map<Long, StudentBalance> balances = fees.balancesByStudent().stream()
                .collect(Collectors.toMap(StudentBalance::studentId, Function.identity()));
        return students.search(clean(q), clean(className)).stream()
                .map(s -> {
                    StudentBalance b = balances.get(s.getId());
                    return b == null
                            ? Mappers.toResponse(s, BigDecimal.ZERO, BigDecimal.ZERO)
                            : Mappers.toResponse(s, b.total(), b.paid());
                })
                .toList();
    }

    public StudentDetail get(Long id) {
        Student s = find(id);
        LocalDate today = LocalDate.now(clock);
        List<Fee> list = fees.findByStudentIdOrderByDueDateAsc(id);
        BigDecimal total = list.stream().map(Fee::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = list.stream().map(Fee::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<FeeResponse> feeResponses = list.stream().map(f -> Mappers.toResponse(f, today)).toList();
        return new StudentDetail(Mappers.toResponse(s, total, paid), feeResponses);
    }

    @Transactional
    public StudentResponse create(StudentRequest req) {
        String admissionNo = req.admissionNo().trim();
        if (students.existsByAdmissionNo(admissionNo)) {
            throw new ConflictException("Admission number " + admissionNo + " already exists");
        }
        Student saved = students.save(new Student(admissionNo, req.name().trim(), req.className().trim(),
                blankToNull(req.parentName()), blankToNull(req.parentPhone())));
        return Mappers.toResponse(saved, BigDecimal.ZERO, BigDecimal.ZERO);
    }

    @Transactional
    public StudentResponse update(Long id, StudentRequest req) {
        Student s = find(id);
        s.update(req.name().trim(), req.className().trim(), blankToNull(req.parentName()), blankToNull(req.parentPhone()));
        StudentDetail detail = get(id);
        return detail.student();
    }

    @Transactional
    public void delete(Long id) {
        students.delete(find(id));
    }

    private Student find(Long id) {
        return students.findById(id).orElseThrow(() -> new NotFoundException("Student", id));
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

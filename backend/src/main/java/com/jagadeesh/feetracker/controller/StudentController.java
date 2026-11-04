package com.jagadeesh.feetracker.controller;

import com.jagadeesh.feetracker.dto.FeeRequest;
import com.jagadeesh.feetracker.dto.FeeResponse;
import com.jagadeesh.feetracker.dto.StudentDetail;
import com.jagadeesh.feetracker.dto.StudentRequest;
import com.jagadeesh.feetracker.dto.StudentResponse;
import com.jagadeesh.feetracker.service.FeeService;
import com.jagadeesh.feetracker.service.StudentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService studentService;
    private final FeeService feeService;

    public StudentController(StudentService studentService, FeeService feeService) {
        this.studentService = studentService;
        this.feeService = feeService;
    }

    @GetMapping
    public List<StudentResponse> list(@RequestParam(defaultValue = "") String q,
                                      @RequestParam(defaultValue = "") String className) {
        return studentService.search(q, className);
    }

    @GetMapping("/{id}")
    public StudentDetail get(@PathVariable Long id) {
        return studentService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public StudentResponse create(@Valid @RequestBody StudentRequest req) {
        return studentService.create(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public StudentResponse update(@PathVariable Long id, @Valid @RequestBody StudentRequest req) {
        return studentService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        studentService.delete(id);
    }

    @PostMapping("/{id}/fees")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public FeeResponse addFee(@PathVariable Long id, @Valid @RequestBody FeeRequest req) {
        return feeService.addFee(id, req);
    }
}

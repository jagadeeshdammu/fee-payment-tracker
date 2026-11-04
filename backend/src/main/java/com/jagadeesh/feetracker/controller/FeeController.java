package com.jagadeesh.feetracker.controller;

import com.jagadeesh.feetracker.dto.FeeResponse;
import com.jagadeesh.feetracker.dto.PaymentRequest;
import com.jagadeesh.feetracker.dto.PaymentResponse;
import com.jagadeesh.feetracker.service.FeeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/fees")
public class FeeController {

    private final FeeService feeService;

    public FeeController(FeeService feeService) {
        this.feeService = feeService;
    }

    @GetMapping("/overdue")
    public List<FeeResponse> overdue() {
        return feeService.overdue();
    }

    @GetMapping("/{id}/payments")
    public List<PaymentResponse> payments(@PathVariable Long id) {
        return feeService.paymentsForFee(id);
    }

    /** Both ADMIN and ACCOUNTANT can record payments; the logged-in username is stored as recordedBy. */
    @PostMapping("/{id}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse recordPayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest req,
                                         Authentication auth) {
        return feeService.recordPayment(id, req, auth.getName());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        feeService.deleteFee(id);
    }
}

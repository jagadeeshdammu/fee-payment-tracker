package com.jagadeesh.feetracker.controller;

import com.jagadeesh.feetracker.dto.PaymentResponse;
import com.jagadeesh.feetracker.model.PaymentMode;
import com.jagadeesh.feetracker.service.FeeService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final FeeService feeService;

    public PaymentController(FeeService feeService) {
        this.feeService = feeService;
    }

    /** GET /api/payments?q=aarav&mode=UPI&from=2026-06-01&to=2026-11-04 */
    @GetMapping
    public List<PaymentResponse> search(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) PaymentMode mode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return feeService.searchPayments(q, mode, from, to);
    }
}

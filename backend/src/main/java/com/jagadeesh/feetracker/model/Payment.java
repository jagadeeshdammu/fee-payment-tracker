package com.jagadeesh.feetracker.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fee_id", nullable = false)
    private Fee fee;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_mode", nullable = false, length = 20)
    private PaymentMode mode;

    /** UPI/bank transaction id. Unique, so the same payment can never be recorded twice. */
    @Column(nullable = false, unique = true, length = 60)
    private String reference;

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Column(name = "recorded_by", nullable = false, length = 50)
    private String recordedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Payment() {
    }

    public Payment(Fee fee, BigDecimal amount, PaymentMode mode, String reference, LocalDate paidOn, String recordedBy) {
        this.fee = fee;
        this.amount = amount;
        this.mode = mode;
        this.reference = reference;
        this.paidOn = paidOn;
        this.recordedBy = recordedBy;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Fee getFee() { return fee; }
    public BigDecimal getAmount() { return amount; }
    public PaymentMode getMode() { return mode; }
    public String getReference() { return reference; }
    public LocalDate getPaidOn() { return paidOn; }
    public String getRecordedBy() { return recordedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}

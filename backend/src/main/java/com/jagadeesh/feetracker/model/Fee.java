package com.jagadeesh.feetracker.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One fee line for a student, e.g. "Term 1 Tuition".
 * paidAmount is kept on the row so lists and dashboards don't need to sum payments every time.
 * @Version gives optimistic locking: two clerks recording a payment on the same fee at the same
 * moment cannot both succeed with stale data - the second one gets a conflict and retries.
 */
@Entity
@Table(name = "fees")
public class Fee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "paid_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Fee() {
    }

    public Fee(Student student, String title, BigDecimal amount, LocalDate dueDate) {
        this.student = student;
        this.title = title;
        this.amount = amount;
        this.dueDate = dueDate;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public BigDecimal getBalance() {
        return amount.subtract(paidAmount);
    }

    public FeeStatus statusOn(LocalDate today) {
        if (paidAmount.compareTo(amount) >= 0) {
            return FeeStatus.PAID;
        }
        if (dueDate.isBefore(today)) {
            return FeeStatus.OVERDUE;
        }
        return paidAmount.signum() > 0 ? FeeStatus.PARTIAL : FeeStatus.PENDING;
    }

    /** Business rule lives on the entity: a payment can never exceed what is still owed. */
    public void applyPayment(BigDecimal payment) {
        if (payment.signum() <= 0) {
            throw new IllegalArgumentException("Payment amount must be positive");
        }
        if (payment.compareTo(getBalance()) > 0) {
            throw new IllegalArgumentException("Payment of " + payment + " is more than the balance of " + getBalance());
        }
        this.paidAmount = this.paidAmount.add(payment);
    }

    public Long getId() { return id; }
    public Student getStudent() { return student; }
    public String getTitle() { return title; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getPaidAmount() { return paidAmount; }
    public LocalDate getDueDate() { return dueDate; }
    public Long getVersion() { return version; }
}

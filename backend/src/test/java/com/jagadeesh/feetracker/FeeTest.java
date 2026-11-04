package com.jagadeesh.feetracker;

import com.jagadeesh.feetracker.model.Fee;
import com.jagadeesh.feetracker.model.FeeStatus;
import com.jagadeesh.feetracker.model.Student;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Plain unit tests for the business rules on the Fee entity - no Spring needed. */
class FeeTest {

    private final LocalDate today = LocalDate.of(2026, 11, 4);
    private final Student student = new Student("ADM-1", "Test Student", "Grade 5", null, null);

    @Test
    void statusMovesFromPendingToPartialToPaid() {
        Fee fee = new Fee(student, "Term 1", new BigDecimal("10000"), today.plusDays(10));
        assertThat(fee.statusOn(today)).isEqualTo(FeeStatus.PENDING);

        fee.applyPayment(new BigDecimal("4000"));
        assertThat(fee.statusOn(today)).isEqualTo(FeeStatus.PARTIAL);
        assertThat(fee.getBalance()).isEqualByComparingTo("6000");

        fee.applyPayment(new BigDecimal("6000"));
        assertThat(fee.statusOn(today)).isEqualTo(FeeStatus.PAID);
    }

    @Test
    void unpaidFeePastDueDateIsOverdue() {
        Fee fee = new Fee(student, "Transport", new BigDecimal("18000"), today.minusDays(1));
        assertThat(fee.statusOn(today)).isEqualTo(FeeStatus.OVERDUE);
    }

    @Test
    void paymentCannotExceedBalance() {
        Fee fee = new Fee(student, "Term 1", new BigDecimal("10000"), today);
        fee.applyPayment(new BigDecimal("9000"));

        assertThatThrownBy(() -> fee.applyPayment(new BigDecimal("1500")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("more than the balance");
        assertThat(fee.getPaidAmount()).isEqualByComparingTo("9000");
    }
}

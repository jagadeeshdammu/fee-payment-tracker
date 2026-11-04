package com.jagadeesh.feetracker.repository;

import com.jagadeesh.feetracker.model.Payment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    boolean existsByReference(String reference);

    @Query("select p from Payment p join fetch p.fee f join fetch f.student where f.id = :feeId order by p.paidOn desc, p.id desc")
    List<Payment> findByFee(@Param("feeId") Long feeId);

    @Query("select p from Payment p join fetch p.fee f join fetch f.student order by p.paidOn desc, p.id desc")
    List<Payment> findRecent(Pageable pageable);

    @Query("select coalesce(sum(p.amount), cast(0 as BigDecimal)) from Payment p where p.paidOn >= :from")
    BigDecimal collectedSince(@Param("from") LocalDate from);
}

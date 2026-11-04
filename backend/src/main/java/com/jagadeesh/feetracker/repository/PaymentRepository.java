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

    @Query("""
            select p from Payment p join fetch p.fee f join fetch f.student s
            where p.paidOn between :from and :to
              and (:q = '' or lower(s.name) like lower(concat('%', :q, '%'))
                   or lower(p.reference) like lower(concat('%', :q, '%'))
                   or lower(s.admissionNo) like lower(concat('%', :q, '%')))
            order by p.paidOn desc, p.id desc
            """)
    List<Payment> search(@Param("from") LocalDate from, @Param("to") LocalDate to, @Param("q") String q);

    /** Rows of [year, month, sum] - one per month that has payments. */
    @Query("select year(p.paidOn), month(p.paidOn), sum(p.amount) from Payment p where p.paidOn >= :from group by year(p.paidOn), month(p.paidOn)")
    List<Object[]> monthlyTotals(@Param("from") LocalDate from);

    /** Rows of [mode, sum, count]. */
    @Query("select p.mode, sum(p.amount), count(p) from Payment p group by p.mode")
    List<Object[]> totalsByMode();

    @Query("select coalesce(sum(p.amount), cast(0 as BigDecimal)) from Payment p where p.paidOn >= :from")
    BigDecimal collectedSince(@Param("from") LocalDate from);
}

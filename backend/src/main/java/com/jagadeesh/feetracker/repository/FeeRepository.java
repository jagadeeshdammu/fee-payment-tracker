package com.jagadeesh.feetracker.repository;

import com.jagadeesh.feetracker.dto.ClassSummary;
import com.jagadeesh.feetracker.dto.StudentBalance;
import com.jagadeesh.feetracker.model.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface FeeRepository extends JpaRepository<Fee, Long> {

    List<Fee> findByStudentIdOrderByDueDateAsc(Long studentId);

    /** join fetch avoids the N+1 problem: student is loaded in the same SQL query. */
    @Query("""
            select f from Fee f join fetch f.student
            where f.dueDate < :today and f.paidAmount < f.amount
            order by f.dueDate
            """)
    List<Fee> findOverdue(@Param("today") LocalDate today);

    @Query("select count(f) from Fee f where f.dueDate < :today and f.paidAmount < f.amount")
    long countOverdue(@Param("today") LocalDate today);

    @Query("select coalesce(sum(f.amount - f.paidAmount), cast(0 as BigDecimal)) from Fee f where f.dueDate < :today and f.paidAmount < f.amount")
    BigDecimal overdueAmount(@Param("today") LocalDate today);

    @Query("select coalesce(sum(f.amount), cast(0 as BigDecimal)) from Fee f")
    BigDecimal totalBilled();

    @Query("select coalesce(sum(f.paidAmount), cast(0 as BigDecimal)) from Fee f")
    BigDecimal totalCollected();

    @Query("""
            select new com.jagadeesh.feetracker.dto.ClassSummary(s.className, sum(f.amount), sum(f.paidAmount))
            from Fee f join f.student s
            group by s.className
            order by s.className
            """)
    List<ClassSummary> summaryByClass();

    @Query("""
            select new com.jagadeesh.feetracker.dto.StudentBalance(f.student.id, sum(f.amount), sum(f.paidAmount))
            from Fee f
            group by f.student.id
            """)
    List<StudentBalance> balancesByStudent();
}

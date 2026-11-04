package com.jagadeesh.feetracker.repository;

import com.jagadeesh.feetracker.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {

    boolean existsByAdmissionNo(String admissionNo);

    @Query("""
            select s from Student s
            where (:q = '' or lower(s.name) like lower(concat('%', :q, '%'))
                   or lower(s.admissionNo) like lower(concat('%', :q, '%')))
              and (:className = '' or s.className = :className)
            order by s.className, s.name
            """)
    List<Student> search(@Param("q") String q, @Param("className") String className);
}

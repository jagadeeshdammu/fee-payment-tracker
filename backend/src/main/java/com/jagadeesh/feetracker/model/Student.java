package com.jagadeesh.feetracker.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "students")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admission_no", nullable = false, unique = true, length = 30)
    private String admissionNo;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "class_name", nullable = false, length = 20)
    private String className;

    @Column(name = "parent_name", length = 100)
    private String parentName;

    @Column(name = "parent_phone", length = 15)
    private String parentPhone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Student() {
    }

    public Student(String admissionNo, String name, String className, String parentName, String parentPhone) {
        this.admissionNo = admissionNo;
        this.name = name;
        this.className = className;
        this.parentName = parentName;
        this.parentPhone = parentPhone;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void update(String name, String className, String parentName, String parentPhone) {
        this.name = name;
        this.className = className;
        this.parentName = parentName;
        this.parentPhone = parentPhone;
    }

    public Long getId() { return id; }
    public String getAdmissionNo() { return admissionNo; }
    public String getName() { return name; }
    public String getClassName() { return className; }
    public String getParentName() { return parentName; }
    public String getParentPhone() { return parentPhone; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}

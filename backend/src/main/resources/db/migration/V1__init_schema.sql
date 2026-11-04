-- V1: initial schema. Never edit an applied migration; add V2, V3... instead.

CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL
);

CREATE TABLE students (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    admission_no VARCHAR(30)  NOT NULL UNIQUE,
    name         VARCHAR(100) NOT NULL,
    class_name   VARCHAR(20)  NOT NULL,
    parent_name  VARCHAR(100),
    parent_phone VARCHAR(15),
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_students_class ON students (class_name);

CREATE TABLE fees (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id  BIGINT        NOT NULL,
    title       VARCHAR(100)  NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    due_date    DATE          NOT NULL,
    version     BIGINT        NOT NULL DEFAULT 0,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fees_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
);
CREATE INDEX idx_fees_student ON fees (student_id);
CREATE INDEX idx_fees_due_date ON fees (due_date);

CREATE TABLE payments (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    fee_id       BIGINT        NOT NULL,
    amount       DECIMAL(12,2) NOT NULL,
    payment_mode VARCHAR(20)   NOT NULL,
    reference    VARCHAR(60)   NOT NULL UNIQUE,
    paid_on      DATE          NOT NULL,
    recorded_by  VARCHAR(50)   NOT NULL,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_fee FOREIGN KEY (fee_id) REFERENCES fees (id) ON DELETE CASCADE
);
CREATE INDEX idx_payments_paid_on ON payments (paid_on);

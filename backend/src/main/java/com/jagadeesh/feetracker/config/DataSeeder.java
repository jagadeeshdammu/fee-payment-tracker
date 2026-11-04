package com.jagadeesh.feetracker.config;

import com.jagadeesh.feetracker.model.Fee;
import com.jagadeesh.feetracker.model.Payment;
import com.jagadeesh.feetracker.model.PaymentMode;
import com.jagadeesh.feetracker.model.Role;
import com.jagadeesh.feetracker.model.Student;
import com.jagadeesh.feetracker.model.User;
import com.jagadeesh.feetracker.repository.FeeRepository;
import com.jagadeesh.feetracker.repository.PaymentRepository;
import com.jagadeesh.feetracker.repository.StudentRepository;
import com.jagadeesh.feetracker.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;

/** Fills an empty database with demo users, students, fees and payments (dates relative to today). */
@Component
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final StudentRepository students;
    private final FeeRepository fees;
    private final PaymentRepository payments;
    private final PasswordEncoder encoder;
    private final Clock clock;

    public DataSeeder(UserRepository users, StudentRepository students, FeeRepository fees,
                      PaymentRepository payments, PasswordEncoder encoder, Clock clock) {
        this.users = users;
        this.students = students;
        this.fees = fees;
        this.payments = payments;
        this.encoder = encoder;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) {
            return;
        }
        users.save(new User("admin", encoder.encode("admin123"), "Priya Sharma", Role.ADMIN));
        users.save(new User("accountant", encoder.encode("accountant123"), "Ravi Kumar", Role.ACCOUNTANT));

        LocalDate today = LocalDate.now(clock);
        String[][] data = {
                {"ADM-1001", "Aarav Reddy", "Grade 5", "Suresh Reddy", "9876543210"},
                {"ADM-1002", "Diya Nair", "Grade 5", "Meera Nair", "9845012345"},
                {"ADM-1003", "Ishaan Gupta", "Grade 6", "Anil Gupta", "9901234567"},
                {"ADM-1004", "Ananya Iyer", "Grade 6", "Lakshmi Iyer", "9886001122"},
                {"ADM-1005", "Kabir Singh", "Grade 7", "Harpreet Singh", "9739988776"},
                {"ADM-1006", "Saanvi Rao", "Grade 7", "Venkat Rao", "9611223344"},
                {"ADM-1007", "Vihaan Das", "Grade 8", "Arjun Das", "9008765432"},
                {"ADM-1008", "Myra Kulkarni", "Grade 8", "Neha Kulkarni", "9535123456"},
        };
        int ref = 1;
        for (int i = 0; i < data.length; i++) {
            String[] d = data[i];
            Student s = students.save(new Student(d[0], d[1], d[2], d[3], d[4]));
            BigDecimal tuition = new BigDecimal(d[2].endsWith("5") || d[2].endsWith("6") ? "42000" : "48000");

            Fee admission = fees.save(new Fee(s, "Admission & Annual Charges", new BigDecimal("15000"), today.minusDays(150)));
            Fee books = fees.save(new Fee(s, "Books & Uniform", new BigDecimal("8500"), today.minusDays(100)));
            Fee term1 = fees.save(new Fee(s, "Term 1 Tuition", tuition, today.minusDays(60)));
            Fee exam = fees.save(new Fee(s, "Mid-term Exam Fee", new BigDecimal("2500"), today.minusDays(30)));
            Fee transport = fees.save(new Fee(s, "Transport (Annual)", new BigDecimal("18000"), today.minusDays(10)));
            Fee term2 = fees.save(new Fee(s, "Term 2 Tuition", tuition, today.plusDays(25)));

            // Spread over ~6 months so the trend chart has history
            pay(admission, new BigDecimal("15000"), PaymentMode.NET_BANKING, ref++, today.minusDays(165 - i * 3));
            pay(books, i % 5 == 4 ? new BigDecimal("4000") : new BigDecimal("8500"), PaymentMode.UPI, ref++, today.minusDays(110 - i));
            // Term 1: most paid in full, two families paid half (-> overdue balance)
            BigDecimal t1 = i % 4 == 3 ? tuition.divide(BigDecimal.valueOf(2)) : tuition;
            pay(term1, t1, i % 2 == 0 ? PaymentMode.UPI : PaymentMode.CARD, ref++, today.minusDays(62 - i));
            if (i % 3 != 2) {
                pay(exam, new BigDecimal("2500"), i % 2 == 0 ? PaymentMode.UPI : PaymentMode.CASH, ref++, today.minusDays(34 - i));
            }
            // Transport: some paid, some partial, some nothing (overdue)
            if (i % 3 == 0) {
                pay(transport, new BigDecimal("18000"), PaymentMode.UPI, ref++, today.minusDays(12 - i % 5));
            } else if (i % 3 == 1) {
                pay(transport, new BigDecimal("9000"), PaymentMode.CASH, ref++, today.minusDays(5));
            }
            // Term 2: a few early payers this month
            if (i % 4 == 0) {
                pay(term2, tuition.divide(BigDecimal.valueOf(2)), PaymentMode.CHEQUE, ref++, today.minusDays(i % 3));
            }
        }
        log.info("Seeded demo data: login admin/admin123 or accountant/accountant123");
    }

    private void pay(Fee fee, BigDecimal amount, PaymentMode mode, int ref, LocalDate paidOn) {
        fee.applyPayment(amount);
        payments.save(new Payment(fee, amount, mode, String.format("TXN%06d", ref), paidOn, "admin"));
    }
}

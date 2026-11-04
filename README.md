# FeeTrack · School Fee Payment Tracker

[![CI](https://github.com/jagadeeshdammu/fee-payment-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/jagadeeshdammu/fee-payment-tracker/actions/workflows/ci.yml)

A full-stack app for schools to manage student fees: add fees, record payments (UPI, card, net banking, cash, cheque), follow up on overdue balances and see collections by class.

**Live demo:** https://jagadeeshdammu.github.io/fee-payment-tracker/
Log in as `admin / admin123` or `accountant / accountant123`.
(The demo runs without a server: an Angular HTTP interceptor plays the API in the browser. Run Docker Compose for the real Spring Boot + MySQL backend.)

## Stack

| Layer | Tech |
|---|---|
| Frontend | Angular 19 · standalone components · Signals · Reactive Forms · RxJS · functional HTTP interceptors and route guards · lazy-loaded routes |
| Backend | Java 17 · Spring Boot 3.3 · Spring Security 6 · JWT (jjwt) · Spring Data JPA / Hibernate · Bean Validation |
| Database | MySQL 8 · Flyway versioned migrations · H2 for tests |
| DevOps | Docker multi-stage builds · Docker Compose · nginx · GitHub Actions CI (Maven tests + Angular build) · GitHub Pages |

## Features

- **JWT login** with two roles: `ADMIN` manages students and fees; `ACCOUNTANT` records payments and views reports.
- **Dashboard:** billed vs collected vs outstanding, money collected this month, overdue count, collection by class, recent payments.
- **Students:** debounced search (RxJS `debounceTime` + `switchMap`), class filter, add student with validation.
- **Fees and payments:** status per fee (`PENDING`, `PARTIAL`, `PAID`, `OVERDUE`), record payment, payment history.
- **Overdue list:** oldest first, with days late, for parent follow-up.

## Design decisions (the interesting parts)

| Problem | How it's handled |
|---|---|
| Overpaying a fee | `Fee.applyPayment()` rejects any amount above the balance → **422**. The rule lives in the entity, not the controller. |
| Same UPI/bank transaction recorded twice | `payments.reference` is `UNIQUE` and checked before insert → **409**. Idempotent, like webhook handling. |
| Two clerks updating the same fee at once | `@Version` on `Fee` (optimistic locking). The second, stale update fails with **409** instead of silently overwriting. |
| Payment + balance must change together | `recordPayment()` is one `@Transactional` method: insert payment + update `paid_amount`, all or nothing. |
| N+1 queries | `join fetch` for overdue/recent lists; student balances come from one `GROUP BY` query. |
| Schema changes | Flyway migrations (`V1__init_schema.sql`). Hibernate `ddl-auto` is off; the schema is versioned in Git. |
| Consistent errors | `@RestControllerAdvice` returns one JSON shape: `status`, `message`, `fieldErrors`. |
| Testable "today" | A `Clock` bean is injected instead of calling `LocalDate.now()` everywhere. |
| Stateless security | No server session: `JwtAuthFilter` validates the Bearer token on each request; CSRF is off because no cookies are used. |

## API

| Method | Endpoint | Role |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | any |
| GET | `/api/dashboard` | any |
| GET | `/api/students?q=&className=` | any |
| GET | `/api/students/{id}` | any |
| POST / PUT / DELETE | `/api/students` / `/api/students/{id}` | ADMIN |
| POST | `/api/students/{id}/fees` | ADMIN |
| DELETE | `/api/fees/{id}` (only if unpaid) | ADMIN |
| GET | `/api/fees/overdue` | any |
| GET / POST | `/api/fees/{id}/payments` | any |

Example:

```bash
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

curl -s localhost:8080/api/fees/overdue -H "Authorization: Bearer $TOKEN"

curl -s -X POST localhost:8080/api/fees/3/payments -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"amount":9000,"mode":"UPI","reference":"UPI-123456","paidOn":"2026-11-04"}'
```

## Run it

**Everything with Docker** (MySQL + API + Angular on nginx):

```bash
docker compose up --build
# App  http://localhost:8081
# API  http://localhost:8080/api/health
```

**Backend only, no MySQL needed** (in-memory H2):

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

**Frontend dev server** (proxies `/api` to `localhost:8080`):

```bash
cd frontend
npm install
npm start          # http://localhost:4200
```

**Tests:**

```bash
cd backend && mvn verify
```

`FeeTest` covers the fee rules as plain unit tests. `ApiIntegrationTest` boots the whole app on H2 with Flyway, then checks login, 401/403, validation errors, the balance rule and duplicate-reference handling through MockMvc.

## Project structure

```
backend/
  src/main/java/com/jagadeesh/feetracker/
    config/        SecurityConfig, AppConfig (Clock), DataSeeder
    security/      JwtService, JwtAuthFilter, AppUserDetailsService
    model/         User, Student, Fee, Payment + enums
    repository/    Spring Data JPA repositories (JPQL, join fetch, projections)
    service/       StudentService, FeeService, DashboardService
    controller/    REST controllers
    dto/           Java records for requests/responses
    exception/     GlobalExceptionHandler
  src/main/resources/db/migration/   Flyway SQL
frontend/
  src/app/core/    AuthService (signals), interceptors, guards, ApiService, models
  src/app/pages/   login, dashboard, students, student-detail, overdue
docker-compose.yml
.github/workflows/ci.yml
```

---
Built by [Dammu Jagadeesh](https://www.linkedin.com/in/jagadeesh-dammu-254260252/), Full Stack Developer (Angular · Java · Spring Boot).

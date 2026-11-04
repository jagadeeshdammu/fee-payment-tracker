import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  ClassSummary, Dashboard, Fee, FeeRequest, FeeStatus, Payment, PaymentMode, PaymentRequest, Role, Student,
  StudentRequest,
} from './models';

/**
 * DEMO MODE ONLY (GitHub Pages has no server).
 * Answers /api/* requests in the browser with the same rules as the Spring Boot API:
 * JWT-style auth, role checks, validation, balance check, unique payment reference.
 * The real build talks to Spring Boot instead - see environment.ts.
 */

interface DbStudent { id: number; admissionNo: string; name: string; className: string; parentName: string | null; parentPhone: string | null; }
interface DbFee { id: number; studentId: number; title: string; amount: number; paidAmount: number; dueDate: string; }
interface DbPayment { id: number; feeId: number; amount: number; mode: PaymentMode; reference: string; paidOn: string; recordedBy: string; }
interface DbUser { username: string; password: string; fullName: string; role: Role; }

const USERS: DbUser[] = [
  { username: 'admin', password: 'admin123', fullName: 'Priya Sharma', role: 'ADMIN' },
  { username: 'accountant', password: 'accountant123', fullName: 'Ravi Kumar', role: 'ACCOUNTANT' },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysFromToday = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const today = () => iso(new Date());

const db = seed();

function seed() {
  const students: DbStudent[] = [];
  const fees: DbFee[] = [];
  const payments: DbPayment[] = [];
  const data: [string, string, string, string, string][] = [
    ['ADM-1001', 'Aarav Reddy', 'Grade 5', 'Suresh Reddy', '9876543210'],
    ['ADM-1002', 'Diya Nair', 'Grade 5', 'Meera Nair', '9845012345'],
    ['ADM-1003', 'Ishaan Gupta', 'Grade 6', 'Anil Gupta', '9901234567'],
    ['ADM-1004', 'Ananya Iyer', 'Grade 6', 'Lakshmi Iyer', '9886001122'],
    ['ADM-1005', 'Kabir Singh', 'Grade 7', 'Harpreet Singh', '9739988776'],
    ['ADM-1006', 'Saanvi Rao', 'Grade 7', 'Venkat Rao', '9611223344'],
    ['ADM-1007', 'Vihaan Das', 'Grade 8', 'Arjun Das', '9008765432'],
    ['ADM-1008', 'Myra Kulkarni', 'Grade 8', 'Neha Kulkarni', '9535123456'],
  ];
  let feeId = 1, payId = 1, ref = 1;
  const pay = (fee: DbFee, amount: number, mode: PaymentMode, paidOn: string) => {
    fee.paidAmount += amount;
    payments.push({ id: payId++, feeId: fee.id, amount, mode, reference: `TXN${String(ref++).padStart(6, '0')}`, paidOn, recordedBy: 'admin' });
  };
  data.forEach((d, i) => {
    const s: DbStudent = { id: i + 1, admissionNo: d[0], name: d[1], className: d[2], parentName: d[3], parentPhone: d[4] };
    students.push(s);
    const tuition = d[2].endsWith('5') || d[2].endsWith('6') ? 42000 : 48000;
    const term1: DbFee = { id: feeId++, studentId: s.id, title: 'Term 1 Tuition', amount: tuition, paidAmount: 0, dueDate: daysFromToday(-60) };
    const term2: DbFee = { id: feeId++, studentId: s.id, title: 'Term 2 Tuition', amount: tuition, paidAmount: 0, dueDate: daysFromToday(25) };
    const transport: DbFee = { id: feeId++, studentId: s.id, title: 'Transport (Annual)', amount: 18000, paidAmount: 0, dueDate: daysFromToday(-10) };
    fees.push(term1, term2, transport);
    pay(term1, i % 4 === 3 ? tuition / 2 : tuition, i % 2 === 0 ? 'UPI' : 'NET_BANKING', daysFromToday(-(62 - i)));
    if (i % 3 === 0) pay(transport, 18000, 'UPI', daysFromToday(-(12 - (i % 5))));
    else if (i % 3 === 1) pay(transport, 9000, 'CASH', daysFromToday(-5));
    if (i % 4 === 0) pay(term2, tuition / 2, 'CARD', daysFromToday(-(i % 3)));
  });
  return { students, fees, payments, nextStudent: students.length + 1, nextFee: feeId, nextPayment: payId };
}

// ---------- helpers ----------
function statusOf(f: DbFee): FeeStatus {
  if (f.paidAmount >= f.amount) return 'PAID';
  if (f.dueDate < today()) return 'OVERDUE';
  return f.paidAmount > 0 ? 'PARTIAL' : 'PENDING';
}

function toFee(f: DbFee): Fee {
  const s = db.students.find((x) => x.id === f.studentId)!;
  return { id: f.id, studentId: s.id, studentName: s.name, className: s.className, title: f.title, amount: f.amount,
    paidAmount: f.paidAmount, balance: f.amount - f.paidAmount, dueDate: f.dueDate, status: statusOf(f) };
}

function toStudent(s: DbStudent): Student {
  const list = db.fees.filter((f) => f.studentId === s.id);
  const totalFees = list.reduce((a, f) => a + f.amount, 0);
  const paid = list.reduce((a, f) => a + f.paidAmount, 0);
  return { ...s, totalFees, paid, balance: totalFees - paid };
}

function toPayment(p: DbPayment): Payment {
  const f = db.fees.find((x) => x.id === p.feeId)!;
  const s = db.students.find((x) => x.id === f.studentId)!;
  return { ...p, feeTitle: f.title, studentId: s.id, studentName: s.name };
}

const byRecent = (a: DbPayment, b: DbPayment) => (b.paidOn.localeCompare(a.paidOn)) || b.id - a.id;

function ok<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status, body })).pipe(delay(220));
}

function fail(status: number, message: string, fieldErrors: Record<string, string> = {}): Observable<never> {
  return throwError(() => new HttpErrorResponse({
    status, statusText: message, error: { status, message, fieldErrors },
  }));
}

function currentUser(req: HttpRequest<unknown>): DbUser | null {
  const header = req.headers.get('Authorization') ?? '';
  const username = header.startsWith('Bearer demo.') ? header.slice('Bearer demo.'.length) : '';
  return USERS.find((u) => u.username === username) ?? null;
}

// ---------- the interceptor ----------
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  const path = req.url.replace(/^.*\/api/, '');
  if (!req.url.includes('/api')) return next(req);
  const method = req.method;
  const body = req.body as Record<string, unknown> | null;

  // POST /auth/login
  if (path === '/auth/login' && method === 'POST') {
    const u = USERS.find((x) => x.username === body?.['username'] && x.password === body?.['password']);
    if (!u) return fail(401, 'Invalid username or password');
    return ok({ token: `demo.${u.username}`, username: u.username, fullName: u.fullName, role: u.role });
  }

  const user = currentUser(req);
  if (!user) return fail(401, 'Login required');
  const adminOnly = () => (user.role !== 'ADMIN' ? fail(403, "You don't have permission to do this") : null);

  // GET /dashboard
  if (path === '/dashboard' && method === 'GET') {
    const billed = db.fees.reduce((a, f) => a + f.amount, 0);
    const collected = db.fees.reduce((a, f) => a + f.paidAmount, 0);
    const monthStart = today().slice(0, 8) + '01';
    const classes = [...new Set(db.students.map((s) => s.className))].sort();
    const byClass: ClassSummary[] = classes.map((c) => {
      const ids = db.students.filter((s) => s.className === c).map((s) => s.id);
      const list = db.fees.filter((f) => ids.includes(f.studentId));
      return { className: c, billed: list.reduce((a, f) => a + f.amount, 0), collected: list.reduce((a, f) => a + f.paidAmount, 0) };
    });
    const dash: Dashboard = {
      studentCount: db.students.length,
      totalBilled: billed,
      totalCollected: collected,
      totalOutstanding: billed - collected,
      collectedThisMonth: db.payments.filter((p) => p.paidOn >= monthStart).reduce((a, p) => a + p.amount, 0),
      overdueCount: db.fees.filter((f) => statusOf(f) === 'OVERDUE').length,
      byClass,
      recentPayments: [...db.payments].sort(byRecent).slice(0, 6).map(toPayment),
    };
    return ok(dash);
  }

  // GET /students?q=&className=
  if (path.startsWith('/students') && !/\/students\/\d+/.test(path) && method === 'GET') {
    const q = (req.params.get('q') ?? '').toLowerCase().trim();
    const cls = req.params.get('className') ?? '';
    const list = db.students
      .filter((s) => (!q || s.name.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)) && (!cls || s.className === cls))
      .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name))
      .map(toStudent);
    return ok(list);
  }

  // POST /students
  if (path === '/students' && method === 'POST') {
    const denied = adminOnly(); if (denied) return denied;
    const r = body as unknown as StudentRequest;
    const errors: Record<string, string> = {};
    if (!r.admissionNo?.trim()) errors['admissionNo'] = 'must not be blank';
    if (!r.name?.trim()) errors['name'] = 'must not be blank';
    if (!r.className?.trim()) errors['className'] = 'must not be blank';
    if (r.parentPhone && !/^[6-9][0-9]{9}$/.test(r.parentPhone)) errors['parentPhone'] = 'must be a 10-digit Indian mobile number';
    if (Object.keys(errors).length) return fail(400, 'Validation failed', errors);
    if (db.students.some((s) => s.admissionNo === r.admissionNo.trim())) return fail(409, `Admission number ${r.admissionNo} already exists`);
    const s: DbStudent = { id: db.nextStudent++, admissionNo: r.admissionNo.trim(), name: r.name.trim(), className: r.className.trim(),
      parentName: r.parentName?.trim() || null, parentPhone: r.parentPhone?.trim() || null };
    db.students.push(s);
    return ok(toStudent(s), 201);
  }

  // GET / DELETE /students/:id
  let m = path.match(/^\/students\/(\d+)$/);
  if (m) {
    const s = db.students.find((x) => x.id === +m![1]);
    if (!s) return fail(404, `Student ${m[1]} not found`);
    if (method === 'GET') {
      const fees = db.fees.filter((f) => f.studentId === s.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(toFee);
      return ok({ student: toStudent(s), fees });
    }
    if (method === 'DELETE') {
      const denied = adminOnly(); if (denied) return denied;
      const feeIds = db.fees.filter((f) => f.studentId === s.id).map((f) => f.id);
      db.payments = db.payments.filter((p) => !feeIds.includes(p.feeId));
      db.fees = db.fees.filter((f) => f.studentId !== s.id);
      db.students = db.students.filter((x) => x.id !== s.id);
      return ok(null, 204);
    }
  }

  // POST /students/:id/fees
  m = path.match(/^\/students\/(\d+)\/fees$/);
  if (m && method === 'POST') {
    const denied = adminOnly(); if (denied) return denied;
    const s = db.students.find((x) => x.id === +m![1]);
    if (!s) return fail(404, `Student ${m[1]} not found`);
    const r = body as unknown as FeeRequest;
    const errors: Record<string, string> = {};
    if (!r.title?.trim()) errors['title'] = 'must not be blank';
    if (!(Number(r.amount) >= 1)) errors['amount'] = 'must be greater than or equal to 1.00';
    if (!r.dueDate) errors['dueDate'] = 'must not be null';
    if (Object.keys(errors).length) return fail(400, 'Validation failed', errors);
    const f: DbFee = { id: db.nextFee++, studentId: s.id, title: r.title.trim(), amount: Number(r.amount), paidAmount: 0, dueDate: r.dueDate };
    db.fees.push(f);
    return ok(toFee(f), 201);
  }

  // GET /fees/overdue
  if (path === '/fees/overdue' && method === 'GET') {
    return ok(db.fees.filter((f) => statusOf(f) === 'OVERDUE').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(toFee));
  }

  // DELETE /fees/:id
  m = path.match(/^\/fees\/(\d+)$/);
  if (m && method === 'DELETE') {
    const denied = adminOnly(); if (denied) return denied;
    const f = db.fees.find((x) => x.id === +m![1]);
    if (!f) return fail(404, `Fee ${m[1]} not found`);
    if (f.paidAmount > 0) return fail(409, 'Fee has payments recorded and cannot be deleted');
    db.fees = db.fees.filter((x) => x.id !== f.id);
    return ok(null, 204);
  }

  // GET / POST /fees/:id/payments
  m = path.match(/^\/fees\/(\d+)\/payments$/);
  if (m) {
    const f = db.fees.find((x) => x.id === +m![1]);
    if (!f) return fail(404, `Fee ${m[1]} not found`);
    if (method === 'GET') {
      return ok(db.payments.filter((p) => p.feeId === f.id).sort(byRecent).map(toPayment));
    }
    if (method === 'POST') {
      const r = body as unknown as PaymentRequest;
      const amount = Number(r.amount);
      const errors: Record<string, string> = {};
      if (!(amount >= 1)) errors['amount'] = 'must be greater than or equal to 1.00';
      if (!r.reference?.trim()) errors['reference'] = 'must not be blank';
      if (r.paidOn && r.paidOn > today()) errors['paidOn'] = 'must be a date in the past or in the present';
      if (Object.keys(errors).length) return fail(400, 'Validation failed', errors);
      const reference = r.reference.trim();
      if (db.payments.some((p) => p.reference === reference)) return fail(409, `Payment with reference ${reference} is already recorded`);
      const balance = f.amount - f.paidAmount;
      if (amount > balance) return fail(422, `Payment of ${amount} is more than the balance of ${balance}`);
      f.paidAmount += amount;
      const p: DbPayment = { id: db.nextPayment++, feeId: f.id, amount, mode: r.mode, reference, paidOn: r.paidOn || today(), recordedBy: user.username };
      db.payments.push(p);
      return ok(toPayment(p), 201);
    }
  }

  return fail(404, 'No such endpoint');
};

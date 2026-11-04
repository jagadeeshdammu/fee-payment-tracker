import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  BulkFeeRequest, ClassSummary, Dashboard, Fee, FeeRequest, FeeStatus, ModeSummary, MonthlyCollection, Payment,
  PaymentMode, PaymentRequest, Role, Student, StudentRequest,
} from './models';

/**
 * DEMO MODE ONLY (GitHub Pages has no server).
 * Answers /api/* calls in the browser with the same rules as the Spring Boot API:
 * login + roles, validation, balance check, unique payment reference, bulk billing, ledger filters.
 * The normal build talks to Spring Boot instead - see environment.ts.
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
const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
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
  const fee = (studentId: number, title: string, amount: number, due: number): DbFee => {
    const f = { id: feeId++, studentId, title, amount, paidAmount: 0, dueDate: day(due) };
    fees.push(f);
    return f;
  };
  const pay = (f: DbFee, amount: number, mode: PaymentMode, on: number) => {
    f.paidAmount += amount;
    payments.push({ id: payId++, feeId: f.id, amount, mode, reference: `TXN${String(ref++).padStart(6, '0')}`, paidOn: day(on), recordedBy: 'admin' });
  };
  data.forEach((d, i) => {
    const s: DbStudent = { id: i + 1, admissionNo: d[0], name: d[1], className: d[2], parentName: d[3], parentPhone: d[4] };
    students.push(s);
    const tuition = d[2].endsWith('5') || d[2].endsWith('6') ? 42000 : 48000;
    const admission = fee(s.id, 'Admission & Annual Charges', 15000, -150);
    const books = fee(s.id, 'Books & Uniform', 8500, -100);
    const term1 = fee(s.id, 'Term 1 Tuition', tuition, -60);
    const exam = fee(s.id, 'Mid-term Exam Fee', 2500, -30);
    const transport = fee(s.id, 'Transport (Annual)', 18000, -10);
    const term2 = fee(s.id, 'Term 2 Tuition', tuition, 25);
    pay(admission, 15000, 'NET_BANKING', -(165 - i * 3));
    pay(books, i % 5 === 4 ? 4000 : 8500, 'UPI', -(110 - i));
    pay(term1, i % 4 === 3 ? tuition / 2 : tuition, i % 2 === 0 ? 'UPI' : 'CARD', -(62 - i));
    if (i % 3 !== 2) pay(exam, 2500, i % 2 === 0 ? 'UPI' : 'CASH', -(34 - i));
    if (i % 3 === 0) pay(transport, 18000, 'UPI', -(12 - (i % 5)));
    else if (i % 3 === 1) pay(transport, 9000, 'CASH', -5);
    if (i % 4 === 0) pay(term2, tuition / 2, 'CHEQUE', -(i % 3));
  });
  return { students, fees, payments, nextStudent: students.length + 1, nextFee: feeId, nextPayment: payId };
}

// ---------- mapping ----------
function statusOf(f: DbFee): FeeStatus {
  if (f.paidAmount >= f.amount) return 'PAID';
  if (f.dueDate < today()) return 'OVERDUE';
  return f.paidAmount > 0 ? 'PARTIAL' : 'PENDING';
}
const studentOf = (id: number) => db.students.find((x) => x.id === id)!;

function toFee(f: DbFee): Fee {
  const s = studentOf(f.studentId);
  return { id: f.id, studentId: s.id, studentName: s.name, className: s.className, parentName: s.parentName, parentPhone: s.parentPhone,
    title: f.title, amount: f.amount, paidAmount: f.paidAmount, balance: f.amount - f.paidAmount, dueDate: f.dueDate, status: statusOf(f) };
}

function toStudent(s: DbStudent): Student {
  const list = db.fees.filter((f) => f.studentId === s.id);
  const totalFees = list.reduce((a, f) => a + f.amount, 0);
  const paid = list.reduce((a, f) => a + f.paidAmount, 0);
  return { ...s, totalFees, paid, balance: totalFees - paid };
}

function toPayment(p: DbPayment): Payment {
  const f = db.fees.find((x) => x.id === p.feeId)!;
  const s = studentOf(f.studentId);
  return { ...p, receiptNo: `RCPT-${String(p.id).padStart(6, '0')}`, feeTitle: f.title, studentId: s.id, studentName: s.name,
    admissionNo: s.admissionNo, className: s.className };
}

const byRecent = (a: DbPayment, b: DbPayment) => b.paidOn.localeCompare(a.paidOn) || b.id - a.id;

function ok<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ status, body })).pipe(delay(260));
}

function fail(status: number, message: string, fieldErrors: Record<string, string> = {}): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, statusText: message, error: { status, message, fieldErrors } }));
}

function currentUser(req: HttpRequest<unknown>): DbUser | null {
  const header = req.headers.get('Authorization') ?? '';
  const username = header.startsWith('Bearer demo.') ? header.slice('Bearer demo.'.length) : '';
  return USERS.find((u) => u.username === username) ?? null;
}

// ---------- the fake server ----------
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api')) return next(req);
  const path = req.url.replace(/^.*\/api/, '').split('?')[0];
  const method = req.method;
  const body = req.body as Record<string, unknown> | null;

  if (path === '/auth/login' && method === 'POST') {
    const u = USERS.find((x) => x.username === body?.['username'] && x.password === body?.['password']);
    if (!u) return fail(401, 'Invalid username or password');
    return ok({ token: `demo.${u.username}`, username: u.username, fullName: u.fullName, role: u.role });
  }

  const user = currentUser(req);
  if (!user) return fail(401, 'Login required');
  const adminOnly = () => (user.role !== 'ADMIN' ? fail(403, "You don't have permission to do this") : null);

  // ---- dashboard ----
  if (path === '/dashboard' && method === 'GET') {
    const billed = db.fees.reduce((a, f) => a + f.amount, 0);
    const collected = db.fees.reduce((a, f) => a + f.paidAmount, 0);
    const monthStart = today().slice(0, 8) + '01';
    const classes = [...new Set(db.students.map((s) => s.className))].sort();
    const byClass: ClassSummary[] = classes.map((c) => {
      const list = db.fees.filter((f) => studentOf(f.studentId).className === c);
      return { className: c, billed: list.reduce((a, f) => a + f.amount, 0), collected: list.reduce((a, f) => a + f.paidAmount, 0) };
    });
    const monthly: MonthlyCollection[] = [];
    const now = new Date();
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly.push({ month: key, amount: db.payments.filter((p) => p.paidOn.startsWith(key)).reduce((a, p) => a + p.amount, 0) });
    }
    const modes = new Map<PaymentMode, ModeSummary>();
    for (const p of db.payments) {
      const m = modes.get(p.mode) ?? { mode: p.mode, amount: 0, count: 0 };
      m.amount += p.amount; m.count++;
      modes.set(p.mode, m);
    }
    const overdue = db.fees.filter((f) => statusOf(f) === 'OVERDUE');
    const dash: Dashboard = {
      studentCount: db.students.length,
      totalBilled: billed,
      totalCollected: collected,
      totalOutstanding: billed - collected,
      collectedThisMonth: db.payments.filter((p) => p.paidOn >= monthStart).reduce((a, p) => a + p.amount, 0),
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((a, f) => a + f.amount - f.paidAmount, 0),
      byClass,
      monthly,
      byMode: [...modes.values()].sort((a, b) => b.amount - a.amount),
      recentPayments: [...db.payments].sort(byRecent).slice(0, 6).map(toPayment),
    };
    return ok(dash);
  }

  // ---- students ----
  if (path === '/students' && method === 'GET') {
    const q = (req.params.get('q') ?? '').toLowerCase().trim();
    const cls = req.params.get('className') ?? '';
    return ok(db.students
      .filter((s) => (!q || s.name.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q)) && (!cls || s.className === cls))
      .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name))
      .map(toStudent));
  }

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

  let m = path.match(/^\/students\/(\d+)$/);
  if (m) {
    const s = db.students.find((x) => x.id === +m![1]);
    if (!s) return fail(404, `Student ${m[1]} not found`);
    if (method === 'GET') {
      return ok({ student: toStudent(s), fees: db.fees.filter((f) => f.studentId === s.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(toFee) });
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

  m = path.match(/^\/students\/(\d+)\/fees$/);
  if (m && method === 'POST') {
    const denied = adminOnly(); if (denied) return denied;
    const s = db.students.find((x) => x.id === +m![1]);
    if (!s) return fail(404, `Student ${m[1]} not found`);
    const r = body as unknown as FeeRequest;
    const errors = validateFee(r.title, r.amount, r.dueDate);
    if (Object.keys(errors).length) return fail(400, 'Validation failed', errors);
    const f: DbFee = { id: db.nextFee++, studentId: s.id, title: r.title.trim(), amount: Number(r.amount), paidAmount: 0, dueDate: r.dueDate };
    db.fees.push(f);
    return ok(toFee(f), 201);
  }

  // ---- fees ----
  if (path === '/fees/bulk' && method === 'POST') {
    const denied = adminOnly(); if (denied) return denied;
    const r = body as unknown as BulkFeeRequest;
    const errors = validateFee(r.title, r.amount, r.dueDate);
    if (!r.className?.trim()) errors['className'] = 'must not be blank';
    if (Object.keys(errors).length) return fail(400, 'Validation failed', errors);
    const list = db.students.filter((s) => s.className === r.className.trim());
    if (!list.length) return fail(422, `No students found in ${r.className}`);
    for (const s of list) {
      db.fees.push({ id: db.nextFee++, studentId: s.id, title: r.title.trim(), amount: Number(r.amount), paidAmount: 0, dueDate: r.dueDate });
    }
    return ok({ className: r.className.trim(), title: r.title.trim(), studentsBilled: list.length }, 201);
  }

  if (path === '/fees/overdue' && method === 'GET') {
    return ok(db.fees.filter((f) => statusOf(f) === 'OVERDUE').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(toFee));
  }

  m = path.match(/^\/fees\/(\d+)$/);
  if (m && method === 'DELETE') {
    const denied = adminOnly(); if (denied) return denied;
    const f = db.fees.find((x) => x.id === +m![1]);
    if (!f) return fail(404, `Fee ${m[1]} not found`);
    if (f.paidAmount > 0) return fail(409, 'Fee has payments recorded and cannot be deleted');
    db.fees = db.fees.filter((x) => x.id !== f.id);
    return ok(null, 204);
  }

  m = path.match(/^\/fees\/(\d+)\/payments$/);
  if (m) {
    const f = db.fees.find((x) => x.id === +m![1]);
    if (!f) return fail(404, `Fee ${m[1]} not found`);
    if (method === 'GET') return ok(db.payments.filter((p) => p.feeId === f.id).sort(byRecent).map(toPayment));
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

  // ---- payments ledger ----
  if (path === '/payments' && method === 'GET') {
    const q = (req.params.get('q') ?? '').toLowerCase().trim();
    const mode = req.params.get('mode') ?? '';
    const to = req.params.get('to') || today();
    const fromDefault = new Date(to + 'T00:00:00'); fromDefault.setMonth(fromDefault.getMonth() - 12);
    const from = req.params.get('from') || iso(fromDefault);
    if (from > to) return fail(422, "'from' must be on or before 'to'");
    return ok(db.payments
      .filter((p) => p.paidOn >= from && p.paidOn <= to && (!mode || p.mode === mode))
      .map(toPayment)
      .filter((p) => !q || p.studentName.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) || p.admissionNo.toLowerCase().includes(q))
      .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id - a.id));
  }

  return fail(404, 'No such endpoint');
};

function validateFee(title: string, amount: number, dueDate: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!title?.trim()) errors['title'] = 'must not be blank';
  if (!(Number(amount) >= 1)) errors['amount'] = 'must be greater than or equal to 1.00';
  if (!dueDate) errors['dueDate'] = 'must not be null';
  return errors;
}

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { InrPipe } from '../core/inr.pipe';
import { Fee, PAYMENT_MODES, Payment, StudentDetail } from '../core/models';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [InrPipe, DatePipe, RouterLink, ReactiveFormsModule],
  template: `
    <a routerLink="/students" class="back">← Students</a>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    @if (notice()) { <div class="alert alert-ok">{{ notice() }}</div> }

    @if (detail(); as d) {
      <div class="page-head">
        <div>
          <h1>{{ d.student.name }}</h1>
          <p>{{ d.student.admissionNo }} · {{ d.student.className }}
            @if (d.student.parentName) { · Parent: {{ d.student.parentName }} } @if (d.student.parentPhone) { ({{ d.student.parentPhone }}) }</p>
        </div>
        <div class="head-actions">
          @if (auth.isAdmin()) {
            <button class="btn btn-ghost" type="button" (click)="showFeeForm.set(!showFeeForm())">+ Add fee</button>
            <button class="btn btn-danger" type="button" (click)="removeStudent()">Delete</button>
          }
        </div>
      </div>

      <div class="summary">
        <div class="card s"><span>Total fees</span><b>{{ d.student.totalFees | inr }}</b></div>
        <div class="card s"><span>Paid</span><b class="ok">{{ d.student.paid | inr }}</b></div>
        <div class="card s"><span>Balance</span><b [class.due]="d.student.balance > 0">{{ d.student.balance | inr }}</b></div>
        <div class="card s progress"><span>Progress</span>
          <div class="bar"><i [style.width.%]="progress()"></i></div><small>{{ progress() }}% paid</small></div>
      </div>

      @if (showFeeForm()) {
        <form class="card form" [formGroup]="feeForm" (ngSubmit)="addFee()">
          <h2>Add fee</h2>
          <div class="cols">
            <div class="field"><label for="ft">Title</label><input id="ft" formControlName="title" placeholder="Term 3 Tuition"></div>
            <div class="field"><label for="fa">Amount (₹)</label><input id="fa" type="number" min="1" formControlName="amount"></div>
            <div class="field"><label for="fd">Due date</label><input id="fd" type="date" formControlName="dueDate"></div>
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="feeForm.invalid || busy()">Save fee</button>
        </form>
      }

      <div class="card table-wrap">
        <table>
          <thead><tr><th>Fee</th><th>Due</th><th>Status</th><th class="num">Amount</th><th class="num">Paid</th><th class="num">Balance</th><th></th></tr></thead>
          <tbody>
            @for (f of d.fees; track f.id) {
              <tr>
                <td><b>{{ f.title }}</b></td>
                <td>{{ f.dueDate | date: 'd MMM y' }}</td>
                <td><span class="badge" [class]="f.status">{{ f.status }}</span></td>
                <td class="num">{{ f.amount | inr }}</td>
                <td class="num">{{ f.paidAmount | inr }}</td>
                <td class="num"><b>{{ f.balance | inr }}</b></td>
                <td class="actions">
                  @if (f.balance > 0) { <button class="btn btn-primary btn-sm" type="button" (click)="startPayment(f)">Record payment</button> }
                  <button class="btn btn-ghost btn-sm" type="button" (click)="toggleHistory(f)">{{ historyFor() === f.id ? 'Hide' : 'History' }}</button>
                </td>
              </tr>
              @if (historyFor() === f.id) {
                <tr class="history"><td colspan="7">
                  @for (p of history(); track p.id) {
                    <div class="pay"><span class="pill">{{ p.mode }}</span><span>{{ p.paidOn | date: 'd MMM y' }}</span><code>{{ p.reference }}</code><span class="muted">by {{ p.recordedBy }}</span><b class="num">{{ p.amount | inr }}</b></div>
                  } @empty { <span class="muted">No payments yet.</span> }
                </td></tr>
              }
            } @empty {
              <tr><td colspan="7" class="muted">No fees added yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!error()) {
      <div class="card" style="padding:24px"><div class="skeleton" style="width:40%"></div></div>
    }

    @if (paying(); as f) {
      <div class="overlay" (click)="paying.set(null)">
        <form class="card dialog" [formGroup]="payForm" (ngSubmit)="pay(f)" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="pay-title">
          <h2 id="pay-title">Record payment</h2>
          <p class="muted">{{ f.title }} · balance {{ f.balance | inr }}</p>
          @if (payError()) { <div class="alert alert-error">{{ payError() }}</div> }
          <div class="field"><label for="pa">Amount (₹)</label><input id="pa" type="number" min="1" [max]="f.balance" formControlName="amount"></div>
          <div class="field"><label for="pm">Mode</label>
            <select id="pm" formControlName="mode">@for (m of modes; track m) { <option [value]="m">{{ m.replace('_', ' ') }}</option> }</select></div>
          <div class="field"><label for="pr">Transaction reference</label><input id="pr" formControlName="reference" placeholder="UPI / bank reference"></div>
          <div class="field"><label for="pd">Paid on</label><input id="pd" type="date" [max]="today" formControlName="paidOn"></div>
          <div class="dialog-actions">
            <button class="btn btn-ghost" type="button" (click)="paying.set(null)">Cancel</button>
            <button class="btn btn-primary" type="submit" [disabled]="payForm.invalid || busy()">{{ busy() ? 'Saving…' : 'Save payment' }}</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-weight: 500; }
    .head-actions { display: flex; gap: 8px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
    .s { padding: 16px 18px; display: grid; gap: 4px; }
    .s span { font-size: 13px; color: var(--muted); }
    .s b { font-size: 22px; }
    .ok { color: var(--green); }
    .due { color: var(--red); }
    .bar { height: 8px; background: #eef2f7; border-radius: 999px; overflow: hidden; margin-top: 8px; }
    .bar i { display: block; height: 100%; background: var(--green); }
    .s small { color: var(--muted); }
    .form { padding: 20px; margin-bottom: 16px; }
    .form h2 { margin-bottom: 12px; }
    .cols { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0 14px; }
    .actions { text-align: right; white-space: nowrap; }
    .actions .btn + .btn { margin-left: 6px; }
    .history td { background: #f8fafc; }
    .pay { display: grid; grid-template-columns: 110px 110px 1fr 140px 110px; gap: 10px; align-items: center; padding: 6px 0; font-size: 14px; }
    .pill { font-size: 11px; font-weight: 700; color: var(--brand); background: var(--brand-soft); padding: 3px 8px; border-radius: 6px; justify-self: start; }
    code { font-size: 12px; color: #334155; }
    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); display: grid; place-items: center; padding: 16px; z-index: 50; }
    .dialog { width: min(420px, 100%); padding: 22px; }
    .dialog > p { margin: 2px 0 16px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
    @media (max-width: 900px) {
      .summary { grid-template-columns: repeat(2, 1fr); }
      .cols { grid-template-columns: 1fr; }
      .pay { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class StudentDetailComponent {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly modes = PAYMENT_MODES;
  protected readonly today = todayIso();
  protected readonly detail = signal<StudentDetail | null>(null);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly showFeeForm = signal(false);
  protected readonly paying = signal<Fee | null>(null);
  protected readonly payError = signal('');
  protected readonly historyFor = signal<number | null>(null);
  protected readonly history = signal<Payment[]>([]);
  protected readonly progress = computed(() => {
    const s = this.detail()?.student;
    return s && s.totalFees ? Math.round((s.paid / s.totalFees) * 100) : 0;
  });

  protected readonly feeForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    dueDate: [todayIso(), Validators.required],
  });

  protected readonly payForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    mode: this.fb.nonNullable.control<'UPI' | 'CARD' | 'NET_BANKING' | 'CASH' | 'CHEQUE'>('UPI'),
    reference: ['', [Validators.required, Validators.maxLength(60)]],
    paidOn: [todayIso(), Validators.required],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.api.student(this.id).subscribe({
      next: (d) => this.detail.set(d),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  startPayment(f: Fee): void {
    this.payError.set('');
    this.payForm.reset({ amount: f.balance, mode: 'UPI', reference: '', paidOn: todayIso() });
    this.paying.set(f);
  }

  pay(f: Fee): void {
    if (this.payForm.invalid) return;
    this.busy.set(true);
    this.payError.set('');
    this.api.recordPayment(f.id, this.payForm.getRawValue()).subscribe({
      next: (p) => {
        this.busy.set(false);
        this.paying.set(null);
        this.flash(`Payment of ₹${p.amount.toLocaleString('en-IN')} recorded for ${f.title}.`);
        if (this.historyFor() === f.id) this.loadHistory(f.id);
        this.load();
      },
      error: (e) => { this.payError.set(errorMessage(e)); this.busy.set(false); },
    });
  }

  addFee(): void {
    if (this.feeForm.invalid) return;
    this.busy.set(true);
    this.api.addFee(this.id, this.feeForm.getRawValue()).subscribe({
      next: () => {
        this.busy.set(false);
        this.showFeeForm.set(false);
        this.feeForm.reset({ title: '', amount: 0, dueDate: todayIso() });
        this.flash('Fee added.');
        this.load();
      },
      error: (e) => { this.error.set(errorMessage(e)); this.busy.set(false); },
    });
  }

  toggleHistory(f: Fee): void {
    if (this.historyFor() === f.id) {
      this.historyFor.set(null);
      return;
    }
    this.historyFor.set(f.id);
    this.loadHistory(f.id);
  }

  removeStudent(): void {
    const s = this.detail()?.student;
    if (!s || !confirm(`Delete ${s.name} and all their fee records?`)) return;
    this.api.deleteStudent(s.id).subscribe({
      next: () => this.router.navigate(['/students']),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private loadHistory(feeId: number): void {
    this.history.set([]);
    this.api.payments(feeId).subscribe({ next: (list) => this.history.set(list) });
  }

  private flash(msg: string): void {
    this.notice.set(msg);
    setTimeout(() => this.notice.set(''), 3500);
  }
}

import { Component, HostListener, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { forkJoin } from 'rxjs';
import { countUp, drawerIn, reduceMotion, staggerIn } from '../core/anim';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { InrPipe } from '../core/inr.pipe';
import { Fee, MODE_LABEL, PAYMENT_MODES, Payment, PaymentMode, StudentDetail } from '../core/models';
import { avatarColor, formatInr, initials, todayIso, whatsappReminder } from '../core/util';
import { ReceiptComponent } from '../ui/receipt.component';

type Drawer = { kind: 'pay'; fee: Fee } | { kind: 'fee' } | null;

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [InrPipe, DatePipe, RouterLink, ReactiveFormsModule, ReceiptComponent],
  template: `
    <a routerLink="/students" class="back">← All students</a>
    @if (error()) { <div class="note note-err">{{ error() }}</div> }
    @if (notice()) { <div class="note note-ok">{{ notice() }}</div> }

    @if (detail(); as d) {
      <div class="layout">
        <!-- profile -->
        <section class="tile profile">
          <div class="p-top">
            <span class="avatar xl" [style.background]="color(d.student.name)">{{ init(d.student.name) }}</span>
            @if (auth.isAdmin()) {
              <div class="p-actions">
                <button class="btn btn-sm btn-ghost" type="button" (click)="open({ kind: 'fee' })">+ Fee</button>
                <button class="btn btn-sm btn-danger" type="button" (click)="removeStudent()">Delete</button>
              </div>
            }
          </div>
          <h1>{{ d.student.name }}</h1>
          <div class="tags"><span class="chip">{{ d.student.className }}</span><span class="chip">{{ d.student.admissionNo }}</span></div>
          <dl>
            <div><dt>Parent</dt><dd>{{ d.student.parentName || '-' }}</dd></div>
            <div><dt>WhatsApp</dt><dd>{{ d.student.parentPhone || '-' }}</dd></div>
          </dl>

          <div class="progress">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" class="trk" />
              <circle #ring cx="60" cy="60" r="50" class="fill" [attr.stroke-dasharray]="ringDash()" />
            </svg>
            <div class="p-mid"><b class="num">{{ paidPct() }}%</b><small>paid</small></div>
          </div>
          <div class="sums">
            <div><small>Total</small><b class="num">{{ d.student.totalFees | inr }}</b></div>
            <div><small>Paid</small><b class="num ok">{{ d.student.paid | inr }}</b></div>
            <div><small>Balance</small><b #bal class="num" [class.due]="d.student.balance > 0">{{ d.student.balance | inr }}</b></div>
          </div>
        </section>

        <!-- fees -->
        <section class="fees">
          <div class="sec-head"><h2>Fees</h2><span class="muted">{{ d.fees.length }} items</span></div>
          <div class="fee-list" #feeList>
            @for (f of d.fees; track f.id) {
              <article class="tile fee" [class.paid]="f.status === 'PAID'">
                <div class="f-top">
                  <div><h3>{{ f.title }}</h3><span class="muted small">Due {{ f.dueDate | date: 'd MMM y' }}</span></div>
                  <span class="chip" [class]="'chip ' + f.status"><i></i>{{ f.status }}</span>
                </div>
                <div class="f-bar"><span [style.width.%]="feePct(f)"></span></div>
                <div class="f-foot">
                  <span class="num"><b>{{ f.paidAmount | inr }}</b> <span class="muted">of {{ f.amount | inr }}</span></span>
                  <div class="f-actions">
                    @if (f.balance > 0) {
                      @if (remind(f, d); as link) {
                        <a class="btn btn-sm btn-ghost" [href]="link" target="_blank" rel="noopener" title="Send WhatsApp reminder">💬 Remind</a>
                      }
                      <button class="btn btn-sm btn-ink" type="button" (click)="open({ kind: 'pay', fee: f })">Collect {{ f.balance | inr }}</button>
                    } @else {
                      <span class="done">✓ Settled</span>
                    }
                  </div>
                </div>
              </article>
            } @empty {
              <div class="tile empty">No fees yet.</div>
            }
          </div>

          <div class="sec-head"><h2>Payment history</h2><span class="muted">{{ history().length }} payments</span></div>
          <div class="tile timeline">
            @for (p of history(); track p.id) {
              <div class="t-row">
                <span class="t-dot" [style.background]="p.mode === 'CASH' ? 'var(--coral)' : 'var(--lime)'"></span>
                <div class="t-main"><b>{{ p.feeTitle }}</b><small>{{ p.paidOn | date: 'd MMM y' }} · {{ modeLabel[p.mode] }} · <span class="mono">{{ p.reference }}</span></small></div>
                <b class="num amt">+{{ p.amount | inr }}</b>
                <button class="btn btn-sm btn-soft" type="button" (click)="receipt.set(p)">Receipt</button>
              </div>
            } @empty {
              <p class="muted pad">No payments yet.</p>
            }
          </div>
        </section>
      </div>
    } @else if (!error()) {
      <div class="layout"><div class="tile profile skeleton" style="min-height:520px"></div><div class="tile skeleton" style="min-height:400px"></div></div>
    }

    @if (drawer(); as dr) {
      <div class="backdrop" #backdrop (click)="close()"></div>
      <aside class="drawer" #panel role="dialog" aria-modal="true">
        <button type="button" class="btn btn-icon btn-soft x" (click)="close()" aria-label="Close">✕</button>
        @if (dr.kind === 'pay') {
          <p class="eyebrow">Collect payment</p>
          <h2 class="dh">{{ dr.fee.title }}</h2>
          <div class="bal-card"><small>Balance due</small><b class="num">{{ dr.fee.balance | inr }}</b></div>
          @if (formError()) { <div class="note note-err">{{ formError() }}</div> }
          <form [formGroup]="payForm" (ngSubmit)="pay(dr.fee)">
            <div class="field"><label for="pa">Amount (₹)</label><input id="pa" type="number" min="1" [max]="dr.fee.balance" formControlName="amount">
              <div class="quick">
                <button type="button" (click)="setAmount(dr.fee.balance)">Full</button>
                <button type="button" (click)="setAmount(half(dr.fee.balance))">Half</button>
              </div></div>
            <div class="field"><label>Mode</label>
              <div class="modes">
                @for (m of modes; track m) {
                  <button type="button" [class.on]="payForm.value.mode === m" (click)="payForm.controls.mode.setValue(m)">{{ modeLabel[m] }}</button>
                }
              </div></div>
            <div class="field"><label for="pr">Transaction reference</label><input id="pr" formControlName="reference" placeholder="UPI / bank / cheque no."></div>
            <div class="field"><label for="pd">Paid on</label><input id="pd" type="date" [max]="today" formControlName="paidOn"></div>
            <button class="btn btn-lime full" type="submit" [disabled]="payForm.invalid || busy()">{{ busy() ? 'Saving…' : 'Record ' + money(payForm.value.amount ?? 0) }}</button>
          </form>
        } @else {
          <p class="eyebrow">New fee</p>
          <h2 class="dh">Add a fee</h2>
          @if (formError()) { <div class="note note-err">{{ formError() }}</div> }
          <form [formGroup]="feeForm" (ngSubmit)="addFee()">
            <div class="field"><label for="ft">Title</label><input id="ft" formControlName="title" placeholder="Term 3 Tuition"></div>
            <div class="field"><label for="fa">Amount (₹)</label><input id="fa" type="number" min="1" formControlName="amount"></div>
            <div class="field"><label for="fd">Due date</label><input id="fd" type="date" formControlName="dueDate"></div>
            <button class="btn btn-ink full" type="submit" [disabled]="feeForm.invalid || busy()">Save fee</button>
          </form>
        }
      </aside>
    }

    @if (receipt(); as r) { <ui-receipt [payment]="r" (close)="receipt.set(null)" /> }
  `,
  styles: [`
    .back { display: inline-block; font-weight: 700; text-decoration: none; color: var(--muted); margin-bottom: 14px; }
    .back:hover { color: var(--ink); }
    .layout { display: grid; grid-template-columns: 360px 1fr; gap: 18px; align-items: start; }
    .profile { padding: 24px; position: sticky; top: 100px; }
    .p-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .avatar.xl { width: 72px; height: 72px; border-radius: 24px; font-size: 24px; }
    .p-actions { display: flex; gap: 6px; }
    .profile h1 { font-size: 32px; margin: 16px 0 10px; }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; }
    dl { margin: 18px 0 0; display: grid; gap: 8px; }
    dl div { display: flex; justify-content: space-between; font-size: 14px; }
    dt { color: var(--muted); font-weight: 600; } dd { margin: 0; font-weight: 700; }
    .progress { position: relative; width: 150px; margin: 22px auto 8px; }
    .progress svg { width: 100%; transform: rotate(-90deg); }
    .trk { fill: none; stroke: var(--surface-2); stroke-width: 12; }
    .fill { fill: none; stroke: var(--ink); stroke-width: 12; stroke-linecap: round; }
    .p-mid { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
    .p-mid b { font-size: 32px; } .p-mid small { color: var(--muted); font-weight: 700; }
    .sums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; text-align: center; }
    .sums small { display: block; color: var(--muted); font-size: 12px; font-weight: 600; }
    .sums b { font-size: 16px; }
    .ok { color: #0e8a59; } :host-context([data-theme='dark']) .ok { color: var(--mint); }
    .due { color: var(--coral); }
    .sec-head { display: flex; align-items: baseline; gap: 10px; margin: 0 0 12px; }
    .sec-head:not(:first-child) { margin-top: 26px; }
    .sec-head .muted { font-weight: 600; font-size: 13px; }
    .fee-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .fee { padding: 18px 20px; }
    .fee.paid { background: var(--surface-2); box-shadow: none; }
    .f-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
    .f-top h3 { font-size: 17px; }
    .small { font-size: 13px; font-weight: 600; }
    .f-bar { height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; margin: 16px 0 12px; }
    .fee.paid .f-bar { background: var(--line); }
    .f-bar span { display: block; height: 100%; background: var(--violet); border-radius: 999px; }
    .fee.paid .f-bar span { background: var(--mint); }
    .f-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .f-actions { display: flex; gap: 6px; }
    .done { font-weight: 800; color: #0e8a59; font-size: 14px; }
    :host-context([data-theme='dark']) .done { color: var(--mint); }
    .timeline { padding: 6px 0; }
    .t-row { display: grid; grid-template-columns: 14px 1fr auto auto; align-items: center; gap: 14px; padding: 12px 20px; border-bottom: 1px solid var(--line); }
    .t-row:last-child { border-bottom: 0; }
    .t-dot { width: 12px; height: 12px; border-radius: 50%; }
    .t-main { display: grid; line-height: 1.35; min-width: 0; }
    .t-main small { color: var(--muted); font-size: 12px; font-weight: 600; }
    .mono { font-family: ui-monospace, monospace; }
    .amt { color: #0e8a59; } :host-context([data-theme='dark']) .amt { color: var(--mint); }
    .pad { padding: 16px 20px; margin: 0; }
    .empty { padding: 24px; color: var(--muted); }
    .backdrop { position: fixed; inset: 0; background: rgba(10,10,12,.45); backdrop-filter: blur(4px); z-index: 60; }
    .drawer { position: fixed; top: 10px; right: 10px; bottom: 10px; width: min(440px, calc(100% - 20px)); z-index: 61; background: var(--surface);
      border-radius: 28px; padding: 28px; overflow-y: auto; box-shadow: -20px 0 60px -20px rgba(0,0,0,.4); }
    .x { position: absolute; top: 18px; right: 18px; }
    .dh { font-size: 28px; margin: 4px 0 18px; padding-right: 40px; }
    .bal-card { background: var(--lime); color: var(--lime-ink); border-radius: 20px; padding: 16px 18px; margin-bottom: 18px; }
    .bal-card small { display: block; font-weight: 700; opacity: .7; }
    .bal-card b { font-size: 34px; }
    .quick { display: flex; gap: 6px; }
    .quick button, .modes button { font: 700 13px var(--body); border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 999px; padding: 8px 12px; cursor: pointer; }
    .modes { display: flex; flex-wrap: wrap; gap: 6px; }
    .modes button.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
    .full { width: 100%; padding: 15px; }
    @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } .profile { position: static; } }
    @media (max-width: 520px) { .t-row { grid-template-columns: 12px 1fr auto; } .t-row .btn { grid-column: 2 / -1; justify-self: start; } }
  `],
})
export class StudentDetailComponent {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly backdrop = viewChild<ElementRef<HTMLElement>>('backdrop');
  private readonly ring = viewChild<ElementRef<SVGCircleElement>>('ring');
  private readonly bal = viewChild<ElementRef<HTMLElement>>('bal');

  protected readonly modes = PAYMENT_MODES;
  protected readonly modeLabel = MODE_LABEL;
  protected readonly today = todayIso();
  protected readonly detail = signal<StudentDetail | null>(null);
  protected readonly history = signal<Payment[]>([]);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly formError = signal('');
  protected readonly busy = signal(false);
  protected readonly drawer = signal<Drawer>(null);
  protected readonly receipt = signal<Payment | null>(null);
  private firstLoad = true;

  protected readonly paidPct = computed(() => {
    const s = this.detail()?.student;
    return s && s.totalFees ? Math.round((s.paid / s.totalFees) * 100) : 0;
  });
  protected readonly ringDash = computed(() => { const c = 2 * Math.PI * 50; return `${(this.paidPct() / 100) * c} ${c}`; });

  protected readonly feeForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    dueDate: [todayIso(), Validators.required],
  });

  protected readonly payForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    mode: this.fb.nonNullable.control<PaymentMode>('UPI'),
    reference: ['', [Validators.required, Validators.maxLength(60)]],
    paidOn: [todayIso(), Validators.required],
  });

  constructor() { this.load(); }

  /** Student + every fee's payments, loaded in parallel with forkJoin. */
  load(): void {
    this.api.student(this.id).subscribe({
      next: (d) => {
        this.detail.set(d);
        const calls = d.fees.map((f) => this.api.payments(f.id));
        (calls.length ? forkJoin(calls) : forkJoin([])).subscribe((lists) => {
          this.history.set((lists as Payment[][]).flat().sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id - a.id));
        });
        if (this.firstLoad) {
          this.firstLoad = false;
          requestAnimationFrame(() => this.intro());
        }
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private intro(): void {
    const root = this.host.nativeElement as HTMLElement;
    staggerIn(root.querySelectorAll('.profile, .fee'));
    const ring = this.ring()?.nativeElement;
    if (ring && !reduceMotion()) gsap.from(ring, { attr: { 'stroke-dasharray': `0 ${2 * Math.PI * 50}` }, duration: 1.4, ease: 'power3.out', delay: 0.2 });
    if (!reduceMotion()) gsap.from(root.querySelectorAll('.f-bar span'), { width: 0, duration: 1.1, stagger: 0.06, ease: 'power3.out', delay: 0.3 });
  }

  open(d: Exclude<Drawer, null>): void {
    this.formError.set('');
    if (d.kind === 'pay') this.payForm.reset({ amount: d.fee.balance, mode: 'UPI', reference: '', paidOn: todayIso() });
    this.drawer.set(d);
    requestAnimationFrame(() => {
      const p = this.panel()?.nativeElement, b = this.backdrop()?.nativeElement;
      if (p && b) drawerIn(p, b);
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.drawer()) this.close(); }

  close(): void {
    const p = this.panel()?.nativeElement;
    if (!p || reduceMotion()) { this.drawer.set(null); return; }
    gsap.to(p, { xPercent: 105, duration: 0.35, ease: 'power3.in', onComplete: () => this.drawer.set(null) });
  }

  setAmount(v: number): void { this.payForm.controls.amount.setValue(v); }
  half(v: number): number { return Math.round(v / 2); }
  money(v: number): string { return formatInr(Number(v) || 0); }

  pay(f: Fee): void {
    if (this.payForm.invalid) return;
    this.busy.set(true);
    this.formError.set('');
    this.api.recordPayment(f.id, this.payForm.getRawValue()).subscribe({
      next: (p) => {
        this.busy.set(false);
        this.close();
        this.say(`${formatInr(p.amount)} received for ${f.title}. Receipt ${p.receiptNo}.`);
        this.load();
        setTimeout(() => {
          this.receipt.set(p);
          const el = this.bal()?.nativeElement;
          if (el) countUp(el, this.detail()?.student.balance ?? 0, formatInr, 0.9);
        }, 420);
      },
      error: (e) => {
        this.formError.set(errorMessage(e));
        this.busy.set(false);
        const p = this.panel()?.nativeElement;
        if (p && !reduceMotion()) gsap.fromTo(p, { x: -12 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      },
    });
  }

  addFee(): void {
    if (this.feeForm.invalid) return;
    this.busy.set(true);
    this.api.addFee(this.id, this.feeForm.getRawValue()).subscribe({
      next: () => {
        this.busy.set(false);
        this.close();
        this.feeForm.reset({ title: '', amount: 0, dueDate: todayIso() });
        this.say('Fee added.');
        this.load();
      },
      error: (e) => { this.formError.set(errorMessage(e)); this.busy.set(false); },
    });
  }

  removeStudent(): void {
    const s = this.detail()?.student;
    if (!s || !confirm(`Delete ${s.name} and all their fee records?`)) return;
    this.api.deleteStudent(s.id).subscribe({
      next: () => this.router.navigate(['/students']),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  remind(f: Fee, d: StudentDetail): string | null {
    return whatsappReminder(d.student.parentPhone, d.student.parentName, d.student.name, f.title, f.balance, f.dueDate);
  }

  feePct(f: Fee): number { return f.amount ? Math.round((f.paidAmount / f.amount) * 100) : 0; }
  color(n: string): string { return avatarColor(n); }
  init(n: string): string { return initials(n); }

  private say(msg: string): void {
    this.notice.set(msg);
    setTimeout(() => this.notice.set(''), 4500);
  }
}

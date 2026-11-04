import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Subject, debounceTime, switchMap, catchError, of } from 'rxjs';
import { staggerIn } from '../core/anim';
import { ApiService, errorMessage } from '../core/api.service';
import { InrPipe } from '../core/inr.pipe';
import { MODE_COLOR, MODE_LABEL, PAYMENT_MODES, Payment, PaymentMode } from '../core/models';
import { avatarColor, downloadCsv, initials, todayIso } from '../core/util';
import { ReceiptComponent } from '../ui/receipt.component';

interface Filters { q: string; mode: PaymentMode | ''; from: string; to: string; }

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [InrPipe, DatePipe, ReceiptComponent],
  template: `
    <div class="page-top">
      <div>
        <p class="eyebrow">Ledger</p>
        <h1>Every rupee, in one place</h1>
        <p>Search, filter and export all payments. Click a row for its receipt.</p>
      </div>
      <button class="btn btn-ink" type="button" (click)="export()" [disabled]="!rows().length">↓ Export CSV</button>
    </div>

    <section class="tile filters">
      <label class="lsearch">
        <span aria-hidden="true">⌕</span>
        <input placeholder="Student, admission no. or reference…" [value]="f().q" (input)="setQ($any($event.target).value)">
      </label>
      <div class="pills">
        <button type="button" [class.on]="!f().mode" (click)="patch({ mode: '' })">All</button>
        @for (m of modes; track m) {
          <button type="button" [class.on]="f().mode === m" (click)="patch({ mode: m })"><i [style.background]="modeColor[m]"></i>{{ modeLabel[m] }}</button>
        }
      </div>
      <div class="dates">
        <div class="ranges">
          @for (r of ranges; track r.label) {
            <button type="button" [class.on]="f().from === r.from && f().to === today" (click)="patch({ from: r.from, to: today })">{{ r.label }}</button>
          }
        </div>
        <input type="date" aria-label="From" [value]="f().from" [max]="f().to" (change)="patch({ from: $any($event.target).value })">
        <span class="muted">→</span>
        <input type="date" aria-label="To" [value]="f().to" [max]="today" (change)="patch({ to: $any($event.target).value })">
      </div>
    </section>

    @if (error()) { <div class="note note-err">{{ error() }}</div> }

    <div class="totals">
      <div class="tile t lime"><small>Collected</small><b class="num">{{ total() | inr }}</b></div>
      <div class="tile t"><small>Payments</small><b class="num">{{ rows().length }}</b></div>
      <div class="tile t"><small>Average</small><b class="num">{{ avg() | inr }}</b></div>
      <div class="tile t"><small>Top mode</small><b>{{ topMode() }}</b></div>
    </div>

    <section class="tile ledger">
      <div class="lhead row-g"><span>Receipt</span><span>Student</span><span>Fee</span><span>Mode</span><span>Date</span><span class="r">Amount</span></div>
      @for (p of rows(); track p.id) {
        <button type="button" class="lrow row-g" (click)="receipt.set(p)">
          <span class="mono rc">{{ p.receiptNo }}</span>
          <span class="who">
            <span class="avatar sm" [style.background]="color(p.studentName)">{{ init(p.studentName) }}</span>
            <span><b>{{ p.studentName }}</b><small>{{ p.className }} · {{ p.admissionNo }}</small></span>
          </span>
          <span class="fee">{{ p.feeTitle }}<small class="mono">{{ p.reference }}</small></span>
          <span><span class="mode" [style.--c]="modeColor[p.mode]">{{ modeLabel[p.mode] }}</span></span>
          <span class="date">{{ p.paidOn | date: 'd MMM y' }}</span>
          <b class="num r amt">{{ p.amount | inr }}</b>
        </button>
      } @empty {
        <div class="empty">
          @if (loading()) { <div class="skeleton" style="height:180px;border-radius:18px"></div> }
          @else { <b>No payments match.</b><span class="muted">Try a wider date range or clear the search.</span> }
        </div>
      }
    </section>

    @if (receipt(); as r) { <ui-receipt [payment]="r" (close)="receipt.set(null)" /> }
  `,
  styles: [`
    .filters { padding: 16px; display: grid; gap: 12px; }
    .lsearch { display: flex; align-items: center; gap: 10px; background: var(--surface-2); border-radius: 16px; padding: 0 14px; }
    .lsearch span { font-size: 20px; color: var(--muted); }
    .lsearch input { width: auto; min-width: 0; border: 0; background: transparent; padding: 13px 0; flex: 1; font: 600 15px var(--body); color: var(--ink); outline: none; }
    .pills, .ranges { display: flex; flex-wrap: wrap; gap: 6px; }
    .pills button, .ranges button { display: inline-flex; align-items: center; gap: 7px; font: 700 13px var(--body); color: var(--ink);
      background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 8px 13px; cursor: pointer; transition: all .15s; }
    .pills button i { width: 9px; height: 9px; border-radius: 50%; }
    .pills button.on, .ranges button.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
    .dates { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .ranges { margin-right: auto; }
    .dates input { width: auto; flex: 0 0 auto; font: 600 14px var(--body); color: var(--ink); background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; padding: 8px 10px; }
    .totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 16px 0; }
    .t { padding: 16px 18px; display: grid; gap: 4px; }
    .t small { color: var(--muted); font-weight: 700; font-size: 12px; }
    .t b { font: 800 24px var(--display); }
    .t.lime { background: var(--lime); color: var(--lime-ink); border: 0; }
    .t.lime small { color: inherit; opacity: .7; }
    .ledger { padding: 6px 0; overflow: hidden; }
    .row-g { display: grid; grid-template-columns: 120px 1.5fr 1.4fr 110px 110px 110px; gap: 12px; align-items: center; padding: 12px 20px; }
    .lhead { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); border-bottom: 1px solid var(--line); }
    .lrow { width: 100%; text-align: left; font: inherit; color: inherit; background: none; border: 0; border-bottom: 1px solid var(--line); cursor: pointer; transition: background .15s; }
    .lrow:last-child { border-bottom: 0; }
    .lrow:hover { background: var(--surface-2); }
    .r { text-align: right; }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; }
    .rc { color: var(--muted); }
    .who { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .who > span:last-child, .fee { display: grid; line-height: 1.3; min-width: 0; }
    .who small, .fee small { color: var(--muted); font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .avatar.sm { width: 34px; height: 34px; border-radius: 12px; font-size: 12px; flex: 0 0 auto; }
    .mode { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; }
    .mode::before { content: ''; width: 9px; height: 9px; border-radius: 3px; background: var(--c); }
    .date { font-size: 14px; font-weight: 600; color: var(--muted); }
    .amt { color: #0e8a59; } :host-context([data-theme='dark']) .amt { color: var(--mint); }
    .empty { padding: 30px 20px; display: grid; gap: 4px; text-align: center; }
    @media (max-width: 900px) {
      .totals { grid-template-columns: repeat(2, 1fr); }
      .lhead { display: none; }
      .row-g { grid-template-columns: 1fr auto; row-gap: 4px; }
      .lrow .rc, .lrow .fee, .lrow .date { display: none; }
      .lrow > span:nth-child(4) { grid-column: 1; grid-row: 2; padding-left: 44px; }
      .lrow .amt { grid-row: 1; grid-column: 2; }
    }
  `],
})
export class PaymentsComponent {
  private readonly api = inject(ApiService);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly modes = PAYMENT_MODES;
  protected readonly modeLabel = MODE_LABEL;
  protected readonly modeColor = MODE_COLOR;
  protected readonly today = todayIso();
  protected readonly ranges = [
    { label: '30 days', from: isoDaysAgo(30) },
    { label: '90 days', from: isoDaysAgo(90) },
    { label: '12 months', from: isoDaysAgo(365) },
  ];

  protected readonly f = signal<Filters>({ q: '', mode: '', from: isoDaysAgo(365), to: todayIso() });
  protected readonly rows = signal<Payment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly receipt = signal<Payment | null>(null);
  private readonly changes = new Subject<Filters>();
  private first = true;

  protected readonly total = computed(() => this.rows().reduce((a, p) => a + p.amount, 0));
  protected readonly avg = computed(() => (this.rows().length ? this.total() / this.rows().length : 0));
  protected readonly topMode = computed(() => {
    const sums = new Map<PaymentMode, number>();
    for (const p of this.rows()) sums.set(p.mode, (sums.get(p.mode) ?? 0) + p.amount);
    let best: PaymentMode | null = null;
    for (const [m, v] of sums) if (!best || v > (sums.get(best) ?? 0)) best = m;
    return best ? MODE_LABEL[best] : '-';
  });

  constructor() {
    // typing waits 300 ms; switchMap drops stale responses when filters change quickly
    this.changes.pipe(
      debounceTime(300),
      switchMap((f) => this.api.ledger(f.q, f.mode, f.from, f.to).pipe(
        catchError((e) => { this.error.set(errorMessage(e)); return of([] as Payment[]); }),
      )),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe((list) => {
      this.rows.set(list);
      this.loading.set(false);
      requestAnimationFrame(() => {
        const els = (this.host.nativeElement as HTMLElement).querySelectorAll(this.first ? '.tile, .lrow' : '.lrow');
        staggerIn(Array.from(els).slice(0, 24));
        this.first = false;
      });
    });
    this.changes.next(this.f());
  }

  patch(p: Partial<Filters>): void {
    this.error.set('');
    this.f.update((cur) => ({ ...cur, ...p }));
    this.changes.next(this.f());
  }

  setQ(q: string): void { this.patch({ q }); }

  export(): void {
    const { from, to } = this.f();
    downloadCsv(`payments_${from}_to_${to}.csv`,
      ['Receipt', 'Date', 'Student', 'Admission no', 'Class', 'Fee', 'Mode', 'Reference', 'Amount', 'Recorded by'],
      this.rows().map((p) => [p.receiptNo, p.paidOn, p.studentName, p.admissionNo, p.className, p.feeTitle, MODE_LABEL[p.mode], p.reference, p.amount, p.recordedBy]));
  }

  color(n: string): string { return avatarColor(n); }
  init(n: string): string { return initials(n); }
}

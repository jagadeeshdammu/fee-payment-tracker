import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { InrPipe } from '../core/inr.pipe';
import { Dashboard } from '../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [InrPipe, DatePipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p>Collections across all classes for this academic year.</p>
      </div>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    @if (data(); as d) {
      <div class="stats">
        <div class="card stat">
          <span>Total billed</span><b>{{ d.totalBilled | inr }}</b><small>{{ d.studentCount }} students</small>
        </div>
        <div class="card stat good">
          <span>Collected</span><b>{{ d.totalCollected | inr }}</b><small>{{ percent(d.totalCollected, d.totalBilled) }}% of billed</small>
        </div>
        <div class="card stat warn">
          <span>Outstanding</span><b>{{ d.totalOutstanding | inr }}</b><small>{{ d.collectedThisMonth | inr }} collected this month</small>
        </div>
        <a class="card stat bad" routerLink="/overdue">
          <span>Overdue fees</span><b>{{ d.overdueCount }}</b><small>View follow-up list →</small>
        </a>
      </div>

      <div class="grid">
        <section class="card pad">
          <h2>Collection by class</h2>
          <div class="bars">
            @for (c of d.byClass; track c.className) {
              <div class="bar-row">
                <div class="bar-label"><b>{{ c.className }}</b><span>{{ c.collected | inr }} / {{ c.billed | inr }}</span></div>
                <div class="bar"><span [style.width.%]="percent(c.collected, c.billed)"></span></div>
                <div class="pct">{{ percent(c.collected, c.billed) }}%</div>
              </div>
            }
          </div>
        </section>

        <section class="card">
          <h2 class="pad-h">Recent payments</h2>
          <ul class="recent">
            @for (p of d.recentPayments; track p.id) {
              <li>
                <div class="mode">{{ p.mode === 'NET_BANKING' ? 'NB' : p.mode }}</div>
                <div class="who"><a [routerLink]="['/students', p.studentId]">{{ p.studentName }}</a><span>{{ p.feeTitle }} · {{ p.paidOn | date: 'd MMM' }}</span></div>
                <b class="num">{{ p.amount | inr }}</b>
              </li>
            } @empty {
              <li class="muted">No payments yet.</li>
            }
          </ul>
        </section>
      </div>
    } @else if (!error()) {
      <div class="stats">
        @for (i of [1, 2, 3, 4]; track i) { <div class="card stat"><div class="skeleton" style="width:60%"></div><div class="skeleton" style="height:26px;margin-top:10px"></div></div> }
      </div>
    }
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .stat { padding: 18px 20px; display: grid; gap: 4px; color: inherit; border-top: 4px solid var(--brand); }
    .stat span { font-size: 13px; color: var(--muted); font-weight: 500; }
    .stat b { font-size: 26px; letter-spacing: -.02em; }
    .stat small { color: var(--muted); }
    .stat.good { border-top-color: var(--green); }
    .stat.warn { border-top-color: var(--amber); }
    .stat.bad { border-top-color: var(--red); }
    .stat.bad b { color: var(--red); }
    a.stat:hover { box-shadow: 0 8px 28px rgba(15,23,42,.1); }
    .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
    .pad { padding: 20px; }
    .pad-h { padding: 20px 20px 8px; }
    .bars { display: grid; gap: 16px; margin-top: 18px; }
    .bar-row { display: grid; grid-template-columns: 1fr 44px; gap: 6px 12px; align-items: center; }
    .bar-label { grid-column: 1 / -1; display: flex; justify-content: space-between; font-size: 14px; }
    .bar-label span { color: var(--muted); font-variant-numeric: tabular-nums; }
    .bar { height: 10px; background: #eef2f7; border-radius: 999px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--brand), var(--brand-2)); border-radius: 999px; transition: width .6s ease; }
    .pct { font-size: 13px; font-weight: 600; text-align: right; }
    .recent { list-style: none; margin: 0; padding: 0 8px 8px; }
    .recent li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; }
    .recent li:hover { background: #f8fafc; }
    .mode { width: 42px; height: 42px; border-radius: 10px; background: var(--brand-soft); color: var(--brand); font-size: 11px; font-weight: 700; display: grid; place-items: center; flex: 0 0 auto; }
    .who { display: grid; flex: 1; min-width: 0; }
    .who a { font-weight: 600; color: var(--ink); }
    .who span { font-size: 13px; color: var(--muted); }
    @media (max-width: 1000px) { .stats { grid-template-columns: repeat(2, 1fr); } .grid { grid-template-columns: 1fr; } }
    @media (max-width: 480px) { .stat b { font-size: 21px; } .stats { gap: 10px; } }
  `],
})
export class DashboardComponent {
  protected readonly data = signal<Dashboard | null>(null);
  protected readonly error = signal('');

  constructor() {
    inject(ApiService).dashboard().subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  percent(part: number, whole: number): number {
    return whole ? Math.round((part / whole) * 100) : 0;
  }
}

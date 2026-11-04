import { Component, ElementRef, OnDestroy, computed, inject, signal, viewChildren } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { countUp, reduceMotion, staggerIn } from '../core/anim';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { InrPipe } from '../core/inr.pipe';
import { Dashboard, MODE_LABEL } from '../core/models';
import { avatarColor, formatCompactInr, formatInr, initials } from '../core/util';
import { AreaChartComponent } from '../ui/area-chart.component';
import { DonutComponent } from '../ui/donut.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [InrPipe, DatePipe, RouterLink, AreaChartComponent, DonutComponent],
  template: `
    <div class="page-top">
      <div>
        <p class="eyebrow">{{ today | date: 'EEEE, d MMMM' }}</p>
        <h1>{{ greeting() }}, {{ firstName() }}</h1>
        <p>Here's how fee collection is going this academic year.</p>
      </div>
      <a class="btn btn-ink" routerLink="/overdue">Follow up overdue →</a>
    </div>

    @if (error()) { <div class="note note-err">{{ error() }}</div> }

    @if (data(); as d) {
      <div class="bento">
        <!-- hero -->
        <section class="tile hero">
          <div class="hero-top">
            <span class="eyebrow dark">Collected so far</span>
            <span class="pct">{{ pct(d.totalCollected, d.totalBilled) }}% of billed</span>
          </div>
          <div #counter class="big num" data-kind="inr" [attr.data-value]="d.totalCollected">₹0</div>
          <div class="meter"><span #meter [style.width.%]="pct(d.totalCollected, d.totalBilled)"></span></div>
          <div class="hero-foot">
            <div><small>Billed</small><b class="num">{{ d.totalBilled | inr }}</b></div>
            <div><small>Outstanding</small><b class="num">{{ d.totalOutstanding | inr }}</b></div>
            <div><small>This month</small><b class="num">{{ d.collectedThisMonth | inr }}</b></div>
          </div>
        </section>

        <!-- stats -->
        <section class="tile stat">
          <span class="eyebrow">Students</span>
          <div #counter class="mid num" data-kind="int" [attr.data-value]="d.studentCount">0</div>
          <a routerLink="/students" class="link">View all →</a>
        </section>
        <section class="tile stat danger">
          <span class="eyebrow">Overdue</span>
          <div class="mid num"><span #counter data-kind="int" [attr.data-value]="d.overdueCount">0</span><small> fees</small></div>
          <span class="sub">{{ d.overdueAmount | inr }} pending</span>
        </section>

        <!-- trend -->
        <section class="tile trend tile-pad">
          <div class="head">
            <div><h2>Collections</h2><span class="muted">Last 6 months</span></div>
            <span class="chip"><i style="color:var(--mint)"></i>{{ trendDelta() }}</span>
          </div>
          <ui-area-chart [data]="d.monthly" />
        </section>

        <!-- modes -->
        <section class="tile modes tile-pad">
          <div class="head"><div><h2>How parents pay</h2><span class="muted">By payment mode</span></div></div>
          <ui-donut [data]="d.byMode" />
        </section>

        <!-- classes -->
        <section class="tile classes tile-pad">
          <div class="head"><div><h2>By class</h2><span class="muted">Collected vs billed</span></div></div>
          <div class="rings">
            @for (c of d.byClass; track c.className) {
              <div class="ring">
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" class="ring-track" />
                  <circle #ring cx="40" cy="40" r="32" class="ring-fill" [attr.stroke-dasharray]="ringDash(pct(c.collected, c.billed))" />
                </svg>
                <b class="num">{{ pct(c.collected, c.billed) }}%</b>
                <span>{{ c.className }}</span>
                <small>{{ compact(c.collected) }} / {{ compact(c.billed) }}</small>
              </div>
            }
          </div>
        </section>

        <!-- recent -->
        <section class="tile recent">
          <div class="head tile-pad"><div><h2>Latest payments</h2><span class="muted">Across all classes</span></div>
            <a routerLink="/payments" class="link">Ledger →</a></div>
          <div class="rows">
            @for (p of d.recentPayments; track p.id) {
              <a class="row pay" [routerLink]="['/students', p.studentId]">
                <span class="avatar" [style.background]="color(p.studentName)">{{ init(p.studentName) }}</span>
                <span class="who"><b>{{ p.studentName }}</b><small>{{ p.feeTitle }} · {{ modeLabel[p.mode] }}</small></span>
                <span class="amt"><b class="num">+{{ p.amount | inr }}</b><small>{{ p.paidOn | date: 'd MMM' }}</small></span>
              </a>
            }
          </div>
        </section>
      </div>
    } @else if (!error()) {
      <div class="bento">
        <div class="tile hero skeleton" style="min-height:260px"></div>
        <div class="tile stat skeleton"></div><div class="tile stat skeleton"></div>
        <div class="tile trend skeleton" style="min-height:320px"></div>
      </div>
    }
  `,
  styles: [`
    .bento { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
    .hero { grid-column: span 6; grid-row: span 2; background: var(--lime); color: var(--lime-ink); border: 0; padding: 26px 28px; display: flex; flex-direction: column; }
    .hero-top { display: flex; justify-content: space-between; align-items: center; }
    .eyebrow.dark { color: color-mix(in srgb, var(--lime-ink) 70%, transparent); }
    .pct { font: 800 13px var(--display); background: var(--lime-ink); color: var(--lime); padding: 6px 10px; border-radius: 999px; }
    .big { font-size: clamp(48px, 6.5vw, 84px); font-weight: 800; margin: auto 0 14px; line-height: 1; }
    .meter { height: 12px; border-radius: 999px; background: color-mix(in srgb, var(--lime-ink) 15%, transparent); overflow: hidden; }
    .meter span { display: block; height: 100%; background: var(--lime-ink); border-radius: 999px; }
    .hero-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }
    .hero-foot small { display: block; font-weight: 700; font-size: 12px; opacity: .7; }
    .hero-foot b { font-size: 18px; }
    .stat { grid-column: span 3; padding: 22px; display: flex; flex-direction: column; gap: 6px; min-height: 140px; }
    .mid { font-size: 48px; font-weight: 800; line-height: 1; margin-top: auto; }
    .mid small { font-size: 18px; color: var(--muted); }
    .stat.danger { background: var(--ink); color: var(--bg); border: 0; }
    .stat.danger .eyebrow, .stat.danger .sub { color: color-mix(in srgb, var(--bg) 60%, transparent); }
    .stat.danger .mid { color: var(--coral); }
    .sub { font-weight: 700; font-size: 14px; }
    .link { font-weight: 800; font-size: 14px; text-decoration: none; color: var(--violet); }
    .trend { grid-column: span 8; }
    .modes { grid-column: span 4; }
    .classes { grid-column: span 5; }
    .recent { grid-column: span 7; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
    .head .muted { font-size: 13px; font-weight: 600; }
    .recent .head { margin: 0; padding-bottom: 8px; }
    .rings { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .ring { display: grid; justify-items: center; text-align: center; background: var(--surface-2); border-radius: 20px; padding: 14px 8px; position: relative; }
    .ring svg { width: 80px; transform: rotate(-90deg); }
    .ring-track { fill: none; stroke: var(--line); stroke-width: 8; }
    .ring-fill { fill: none; stroke: var(--violet); stroke-width: 8; stroke-linecap: round; }
    .ring > b { position: absolute; top: 40px; font-size: 17px; }
    .ring span { font-weight: 800; margin-top: 6px; }
    .ring small { color: var(--muted); font-size: 12px; font-weight: 600; }
    .pay { grid-template-columns: 40px 1fr auto; text-decoration: none; transition: background .15s; }
    .pay:hover { background: var(--surface-2); }
    .who { display: grid; line-height: 1.3; min-width: 0; }
    .who small, .amt small { color: var(--muted); font-size: 12px; font-weight: 600; }
    .amt { display: grid; text-align: right; }
    .amt b { color: #0e8a59; }
    :host-context([data-theme='dark']) .amt b { color: var(--mint); }
    @media (max-width: 1100px) {
      .hero { grid-column: span 12; grid-row: auto; min-height: 260px; }
      .stat { grid-column: span 6; }
      .trend, .modes, .classes, .recent { grid-column: span 12; }
    }
    @media (max-width: 520px) { .hero-foot b { font-size: 15px; } .bento { gap: 12px; } }
  `],
})
export class DashboardComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly data = signal<Dashboard | null>(null);
  protected readonly error = signal('');
  protected readonly today = new Date();
  protected readonly modeLabel = MODE_LABEL;
  private readonly counters = viewChildren<ElementRef<HTMLElement>>('counter');
  private readonly rings = viewChildren<ElementRef<SVGCircleElement>>('ring');
  private readonly meter = viewChildren<ElementRef<HTMLElement>>('meter');
  private ctx?: gsap.Context;

  protected readonly firstName = computed(() => (this.auth.user()?.fullName ?? '').split(' ')[0]);
  protected readonly greeting = computed(() => {
    const h = this.today.getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  });
  protected readonly trendDelta = computed(() => {
    const m = this.data()?.monthly ?? [];
    if (m.length < 2) return '';
    const best = m.reduce((a, b) => (b.amount > a.amount ? b : a));
    return 'Best: ' + new Date(best.month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long' });
  });

  constructor() {
    inject(ApiService).dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        requestAnimationFrame(() => this.animate());
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  private animate(): void {
    for (const ref of this.counters()) {
      const el = ref.nativeElement;
      const v = Number(el.dataset['value'] ?? 0);
      countUp(el, v, el.dataset['kind'] === 'inr' ? formatInr : (n) => String(Math.round(n)));
    }
    if (reduceMotion()) return;
    this.ctx = gsap.context(() => {
      staggerIn(this.host.nativeElement.querySelectorAll('.tile'));
      this.meter().forEach((m) => gsap.from(m.nativeElement, { width: 0, duration: 1.6, ease: 'power3.out', delay: 0.3 }));
      this.rings().forEach((r, i) => gsap.from(r.nativeElement, { attr: { 'stroke-dasharray': '0 201' }, duration: 1.3, delay: 0.5 + i * 0.1, ease: 'power3.out' }));
    }, this.host.nativeElement);
  }

  ngOnDestroy(): void { this.ctx?.revert(); }

  pct(part: number, whole: number): number { return whole ? Math.round((part / whole) * 100) : 0; }
  ringDash(p: number): string { const c = 2 * Math.PI * 32; return `${(p / 100) * c} ${c}`; }
  compact(n: number): string { return formatCompactInr(n); }
  color(n: string): string { return avatarColor(n); }
  init(n: string): string { return initials(n); }
}

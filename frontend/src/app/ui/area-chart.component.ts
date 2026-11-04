import { AfterViewInit, Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { gsap } from 'gsap';
import { drawPath, reduceMotion } from '../core/anim';
import { MonthlyCollection } from '../core/models';
import { formatCompactInr, formatInr } from '../core/util';

const W = 640;
const H = 240;
const PAD = { l: 8, r: 8, t: 26, b: 34 };

/** Smooth area chart drawn in SVG; GSAP draws the line and pops the points in. */
@Component({
  selector: 'ui-area-chart',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="chart" role="img" [attr.aria-label]="label()">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--lime)" stop-opacity=".55" />
          <stop offset="1" stop-color="var(--lime)" stop-opacity="0" />
        </linearGradient>
      </defs>
      @for (g of grid(); track g.y) {
        <line [attr.x1]="PAD.l" [attr.x2]="W - PAD.r" [attr.y1]="g.y" [attr.y2]="g.y" class="grid" />
        <text [attr.x]="W - PAD.r" [attr.y]="g.y - 6" text-anchor="end" class="axis">{{ g.label }}</text>
      }
      <path #area [attr.d]="areaPath()" fill="url(#areaFill)" />
      <path #line [attr.d]="linePath()" class="line" />
      @for (p of points(); track p.month; let i = $index) {
        <g class="pt" (mouseenter)="hover.set(i)" (mouseleave)="hover.set(-1)">
          <rect [attr.x]="p.x - 30" [attr.y]="PAD.t" width="60" [attr.height]="H - PAD.t - PAD.b" fill="transparent" />
          <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="hover() === i ? 7 : 4.5" class="dot" [class.on]="hover() === i" />
          <text [attr.x]="p.x" [attr.y]="H - 10" text-anchor="middle" class="axis month" [class.on]="i === points().length - 1">{{ p.label }}</text>
        </g>
      }
      @if (hover() >= 0) {
        @let p = points()[hover()];
        <g class="tip" [attr.transform]="'translate(' + tipX(p.x) + ' ' + (p.y - 46) + ')'">
          <rect width="112" height="34" rx="10" />
          <text x="56" y="22" text-anchor="middle">{{ fmt(p.amount) }}</text>
        </g>
      }
    </svg>
  `,
  styles: [`
    :host { display: block; }
    .chart { width: 100%; height: auto; display: block; overflow: visible; }
    .grid { stroke: var(--line); stroke-dasharray: 3 6; }
    .axis { fill: var(--muted); font: 600 11px var(--body); }
    .axis.month { font-size: 12px; }
    .axis.month.on { fill: var(--ink); font-weight: 800; }
    .line { fill: none; stroke: var(--ink); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .dot { fill: var(--surface); stroke: var(--ink); stroke-width: 3; transition: r .15s; }
    .dot.on { fill: var(--lime); }
    .pt { cursor: pointer; }
    .tip rect { fill: var(--ink); }
    .tip text { fill: var(--bg); font: 800 13px var(--display); }
  `],
})
export class AreaChartComponent implements AfterViewInit {
  readonly data = input.required<MonthlyCollection[]>();
  protected readonly W = W;
  protected readonly H = H;
  protected readonly PAD = PAD;
  protected readonly hover = signal(-1);
  private readonly lineRef = viewChild.required<ElementRef<SVGPathElement>>('line');
  private readonly areaRef = viewChild.required<ElementRef<SVGPathElement>>('area');

  private readonly max = computed(() => {
    const m = Math.max(...this.data().map((d) => d.amount), 1);
    const step = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil((m * 1.15) / step) * step;
  });

  protected readonly points = computed(() => {
    const d = this.data();
    const innerW = W - PAD.l - PAD.r - 40;
    const innerH = H - PAD.t - PAD.b;
    return d.map((m, i) => ({
      month: m.month,
      amount: m.amount,
      label: new Date(m.month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short' }),
      x: PAD.l + 20 + (d.length === 1 ? innerW / 2 : (innerW * i) / (d.length - 1)),
      y: PAD.t + innerH - (m.amount / this.max()) * innerH,
    }));
  });

  protected readonly grid = computed(() => {
    const innerH = H - PAD.t - PAD.b;
    return [0.25, 0.5, 0.75, 1].map((f) => ({ y: PAD.t + innerH - f * innerH, label: formatCompactInr(this.max() * f) }));
  });

  /** Catmull-Rom spline converted to cubic Bezier segments = smooth curve through every point. */
  protected readonly linePath = computed(() => {
    const p = this.points();
    if (!p.length) return '';
    let d = `M ${p[0].x} ${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] ?? p[i];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2] ?? p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  });

  protected readonly areaPath = computed(() => {
    const p = this.points();
    if (!p.length) return '';
    const base = H - PAD.b;
    return `${this.linePath()} L ${p[p.length - 1].x} ${base} L ${p[0].x} ${base} Z`;
  });

  protected readonly label = computed(() => 'Collections by month: ' + this.data().map((d) => `${d.month} ${formatInr(d.amount)}`).join(', '));

  ngAfterViewInit(): void {
    drawPath(this.lineRef().nativeElement, 1.6, 0.3);
    if (!reduceMotion()) {
      gsap.from(this.areaRef().nativeElement, { opacity: 0, duration: 1, delay: 0.9 });
    }
  }

  fmt(n: number): string { return formatInr(n); }
  tipX(x: number): number { return Math.min(Math.max(x - 56, 0), W - 112); }
}

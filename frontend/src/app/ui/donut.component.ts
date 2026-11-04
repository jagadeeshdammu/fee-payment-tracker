import { AfterViewInit, Component, ElementRef, computed, input, viewChildren } from '@angular/core';
import { gsap } from 'gsap';
import { reduceMotion } from '../core/anim';
import { MODE_COLOR, MODE_LABEL, ModeSummary } from '../core/models';
import { formatCompactInr } from '../core/util';

const R = 70;
const C = 2 * Math.PI * R;

/** Payment-mode split as an SVG donut. Each arc is a dashed circle; GSAP sweeps them in. */
@Component({
  selector: 'ui-donut',
  standalone: true,
  template: `
    <div class="wrap">
      <svg viewBox="0 0 200 200" class="donut" role="img" aria-label="Collections by payment mode">
        <circle cx="100" cy="100" [attr.r]="R" class="track" />
        @for (s of arcs(); track s.mode) {
          <circle #arc cx="100" cy="100" [attr.r]="R" class="arc" [attr.stroke]="s.color"
                  [attr.stroke-dasharray]="s.len + ' ' + C" [attr.stroke-dashoffset]="-s.offset" />
        }
        <text x="100" y="96" text-anchor="middle" class="big">{{ total() }}</text>
        <text x="100" y="118" text-anchor="middle" class="small">collected</text>
      </svg>
      <ul class="legend">
        @for (s of arcs(); track s.mode) {
          <li><i [style.background]="s.color"></i><span>{{ s.label }}</span><b>{{ s.pct }}%</b></li>
        }
      </ul>
    </div>
  `,
  styles: [`
    .wrap { display: grid; grid-template-columns: 170px 1fr; gap: 18px; align-items: center; }
    .donut { width: 100%; transform: rotate(-90deg); }
    .donut text { transform: rotate(90deg); transform-origin: 100px 100px; }
    .track { fill: none; stroke: var(--surface-2); stroke-width: 24; }
    .arc { fill: none; stroke-width: 24; }
    .big { font: 800 24px var(--display); fill: var(--ink); }
    .small { font: 600 11px var(--body); fill: var(--muted); }
    .legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .legend li { display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; }
    .legend i { width: 12px; height: 12px; border-radius: 4px; }
    .legend b { font-family: var(--display); }
    @media (max-width: 420px) { .wrap { grid-template-columns: 1fr; } .donut { max-width: 180px; margin: 0 auto; } }
  `],
})
export class DonutComponent implements AfterViewInit {
  readonly data = input.required<ModeSummary[]>();
  protected readonly R = R;
  protected readonly C = C;
  private readonly arcEls = viewChildren<ElementRef<SVGCircleElement>>('arc');

  protected readonly total = computed(() => formatCompactInr(this.data().reduce((a, d) => a + d.amount, 0)));

  protected readonly arcs = computed(() => {
    const sum = this.data().reduce((a, d) => a + d.amount, 0) || 1;
    let offset = 0;
    return this.data().map((d) => {
      const len = (d.amount / sum) * C;
      const arc = { mode: d.mode, label: MODE_LABEL[d.mode], color: MODE_COLOR[d.mode], len: Math.max(len - 3, 0), offset, pct: Math.round((d.amount / sum) * 100) };
      offset += len;
      return arc;
    });
  });

  ngAfterViewInit(): void {
    if (reduceMotion()) return;
    this.arcEls().forEach((ref, i) => {
      const el = ref.nativeElement;
      const target = el.getAttribute('stroke-dasharray') ?? '';
      gsap.fromTo(el, { attr: { 'stroke-dasharray': `0 ${C}` } }, { attr: { 'stroke-dasharray': target }, duration: 1.1, delay: 0.3 + i * 0.12, ease: 'power3.out' });
    });
  }
}

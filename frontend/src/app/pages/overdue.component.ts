import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { countUp, staggerIn } from '../core/anim';
import { ApiService, errorMessage } from '../core/api.service';
import { InrPipe } from '../core/inr.pipe';
import { Fee } from '../core/models';
import { avatarColor, daysBetween, downloadCsv, formatInr, initials, whatsappReminder } from '../core/util';

type Bucket = 'all' | 'week' | 'month' | 'older';

@Component({
  selector: 'app-overdue',
  standalone: true,
  imports: [InrPipe, DatePipe, RouterLink],
  template: `
    <div class="page-top">
      <div>
        <p class="eyebrow">Follow up</p>
        <h1>Overdue fees</h1>
        <p>Past due with a balance left, oldest first. One tap sends a polite WhatsApp reminder.</p>
      </div>
      <button class="btn btn-ink" type="button" (click)="export()" [disabled]="!fees().length">↓ Export CSV</button>
    </div>

    @if (error()) { <div class="note note-err">{{ error() }}</div> }

    <section class="tile banner">
      <div>
        <small>Total overdue</small>
        <b #total class="num">₹0</b>
      </div>
      <div class="stat"><small>Fees</small><b class="num">{{ fees().length }}</b></div>
      <div class="stat"><small>Families</small><b class="num">{{ families() }}</b></div>
      <div class="stat"><small>Oldest</small><b class="num">{{ oldest() }}d</b></div>
    </section>

    <div class="pills">
      @for (b of buckets; track b.key) {
        <button type="button" [class.on]="bucket() === b.key" (click)="bucket.set(b.key)">{{ b.label }} <span>{{ count(b.key) }}</span></button>
      }
    </div>

    <div class="grid">
      @for (f of shown(); track f.id) {
        <article class="tile card" [class.hot]="late(f) > 30">
          <div class="c-top">
            <span class="avatar" [style.background]="color(f.studentName)">{{ init(f.studentName) }}</span>
            <div class="who">
              <a [routerLink]="['/students', f.studentId]"><b>{{ f.studentName }}</b></a>
              <small>{{ f.className }} · {{ f.parentName || 'No parent on file' }}</small>
            </div>
            <span class="late">{{ late(f) }}d late</span>
          </div>
          <div class="c-mid">
            <div><small>{{ f.title }}</small><span class="muted">Due {{ f.dueDate | date: 'd MMM y' }}</span></div>
            <b class="num">{{ f.balance | inr }}</b>
          </div>
          <div class="heat"><span [style.width.%]="heat(f)"></span></div>
          <div class="c-actions">
            @if (remind(f); as link) {
              <a class="btn btn-sm btn-lime" [href]="link" target="_blank" rel="noopener">💬 WhatsApp reminder</a>
            } @else {
              <span class="muted small">No phone number</span>
            }
            <a class="btn btn-sm btn-ghost" [routerLink]="['/students', f.studentId]">Collect →</a>
          </div>
        </article>
      } @empty {
        @if (loaded()) {
          <div class="tile all-clear"><b>All clear 🎉</b><span class="muted">No overdue fees in this range.</span></div>
        } @else {
          @for (i of [1, 2, 3]; track i) { <div class="tile skeleton" style="min-height:190px"></div> }
        }
      }
    </div>
  `,
  styles: [`
    .banner { background: var(--ink); color: var(--bg); border: 0; padding: 22px 26px; display: grid; grid-template-columns: 2fr repeat(3, 1fr); gap: 16px; align-items: end; }
    .banner small { display: block; font-weight: 700; font-size: 12px; color: color-mix(in srgb, var(--bg) 60%, transparent); }
    .banner > div:first-child b { font: 800 clamp(36px, 5vw, 56px) var(--display); color: var(--coral); line-height: 1; }
    .stat b { font: 800 24px var(--display); }
    .pills { display: flex; flex-wrap: wrap; gap: 6px; margin: 18px 0 14px; }
    .pills button { font: 700 13px var(--body); color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 8px 13px; cursor: pointer; }
    .pills button span { opacity: .55; margin-left: 4px; }
    .pills button.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .card { padding: 18px 20px; display: grid; gap: 14px; }
    .c-top { display: grid; grid-template-columns: 42px 1fr auto; gap: 12px; align-items: center; }
    .who { display: grid; line-height: 1.3; min-width: 0; }
    .who a { color: inherit; text-decoration: none; }
    .who a:hover { text-decoration: underline; }
    .who small { color: var(--muted); font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .late { font: 800 12px var(--display); padding: 6px 10px; border-radius: 999px; background: color-mix(in srgb, var(--amber) 25%, transparent); }
    .hot .late { background: var(--coral); color: #fff; }
    .c-mid { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; }
    .c-mid small { display: block; font-weight: 800; font-size: 15px; }
    .c-mid .muted { font-size: 13px; font-weight: 600; }
    .c-mid b { font-size: 26px; }
    .heat { height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
    .heat span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--amber), var(--coral)); }
    .c-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    .small { font-size: 13px; font-weight: 600; }
    .all-clear { padding: 40px; display: grid; gap: 4px; text-align: center; grid-column: 1 / -1; }
    .all-clear b { font: 800 26px var(--display); }
    @media (max-width: 720px) { .banner { grid-template-columns: repeat(3, 1fr); } .banner > div:first-child { grid-column: 1 / -1; } }
  `],
})
export class OverdueComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly fees = signal<Fee[]>([]);
  protected readonly loaded = signal(false);
  protected readonly error = signal('');
  protected readonly bucket = signal<Bucket>('all');
  protected readonly buckets: { key: Bucket; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'week', label: '≤ 7 days' }, { key: 'month', label: '8–30 days' }, { key: 'older', label: '30+ days' },
  ];

  protected readonly families = computed(() => new Set(this.fees().map((f) => f.studentId)).size);
  protected readonly oldest = computed(() => this.fees().reduce((m, f) => Math.max(m, this.late(f)), 0));
  protected readonly shown = computed(() => this.fees().filter((f) => this.inBucket(f, this.bucket())));

  constructor() {
    inject(ApiService).overdue().subscribe({
      next: (list) => {
        this.fees.set(list);
        this.loaded.set(true);
        requestAnimationFrame(() => {
          const root = this.host.nativeElement as HTMLElement;
          const el = root.querySelector<HTMLElement>('.banner b');
          if (el) countUp(el, list.reduce((a, f) => a + f.balance, 0), formatInr);
          staggerIn(root.querySelectorAll('.banner, .card'));
        });
      },
      error: (e) => { this.error.set(errorMessage(e)); this.loaded.set(true); },
    });
  }

  late(f: Fee): number { return daysBetween(f.dueDate); }
  heat(f: Fee): number { return Math.min(100, Math.max(8, (this.late(f) / 60) * 100)); }

  private inBucket(f: Fee, b: Bucket): boolean {
    const d = this.late(f);
    return b === 'all' || (b === 'week' && d <= 7) || (b === 'month' && d > 7 && d <= 30) || (b === 'older' && d > 30);
  }
  count(b: Bucket): number { return this.fees().filter((f) => this.inBucket(f, b)).length; }

  remind(f: Fee): string | null {
    return whatsappReminder(f.parentPhone, f.parentName, f.studentName, f.title, f.balance, f.dueDate);
  }

  export(): void {
    downloadCsv('overdue_fees.csv', ['Student', 'Class', 'Parent', 'Phone', 'Fee', 'Due date', 'Days late', 'Balance'],
      this.fees().map((f) => [f.studentName, f.className, f.parentName ?? '', f.parentPhone ?? '', f.title, f.dueDate, this.late(f), f.balance]));
  }

  color(n: string): string { return avatarColor(n); }
  init(n: string): string { return initials(n); }
}

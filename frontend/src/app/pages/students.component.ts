import { Component, HostListener, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { Subject, debounceTime, startWith, switchMap } from 'rxjs';
import { drawerIn, reduceMotion } from '../core/anim';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { InrPipe } from '../core/inr.pipe';
import { CLASSES, Student } from '../core/models';
import { avatarColor, initials, todayIso } from '../core/util';

type Drawer = 'student' | 'bulk' | null;

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [InrPipe, RouterLink, ReactiveFormsModule],
  template: `
    <div class="page-top">
      <div>
        <p class="eyebrow">{{ students().length }} students</p>
        <h1>Students</h1>
        <p>Search by name or admission number. Tap a card for fees and payments.</p>
      </div>
      @if (auth.isAdmin()) {
        <div class="top-actions">
          <button class="btn btn-ghost" type="button" (click)="open('bulk')">Bill a class</button>
          <button class="btn btn-ink" type="button" (click)="open('student')">+ New student</button>
        </div>
      }
    </div>

    @if (flash()) { <div class="note note-ok">{{ flash() }}</div> }

    <div class="toolbar">
      <div class="search grow"><input type="search" placeholder="Search students…" (input)="search$.next($any($event.target).value)" aria-label="Search students"></div>
      <div class="pills" role="tablist" aria-label="Filter by class">
        <button type="button" [class.on]="cls() === ''" (click)="setClass('')">All</button>
        @for (c of usedClasses; track c) {
          <button type="button" [class.on]="cls() === c" (click)="setClass(c)">{{ c.replace('Grade ', 'G') }}</button>
        }
      </div>
      <div class="pills" aria-label="View">
        <button type="button" [class.on]="view() === 'grid'" (click)="view.set('grid')" aria-label="Card view">▦</button>
        <button type="button" [class.on]="view() === 'list'" (click)="view.set('list')" aria-label="List view">☰</button>
      </div>
    </div>

    @if (error()) { <div class="note note-err">{{ error() }}</div> }

    <div #list [class]="view() === 'grid' ? 'grid' : 'tile list'">
      @for (s of students(); track s.id) {
        @if (view() === 'grid') {
          <a class="tile card" [routerLink]="['/students', s.id]">
            <div class="card-top">
              <span class="avatar big" [style.background]="color(s.name)">{{ init(s.name) }}</span>
              <span class="chip">{{ s.className }}</span>
            </div>
            <h3>{{ s.name }}</h3>
            <span class="muted small">{{ s.admissionNo }} · {{ s.parentName || 'No parent on file' }}</span>
            <div class="bar"><span [style.width.%]="paidPct(s)"></span></div>
            <div class="card-foot">
              <div><small>Paid</small><b class="num">{{ s.paid | inr }}</b></div>
              <div class="r"><small>Balance</small><b class="num" [class.due]="s.balance > 0">{{ s.balance | inr }}</b></div>
            </div>
          </a>
        } @else {
          <a class="row line" [routerLink]="['/students', s.id]">
            <span class="avatar" [style.background]="color(s.name)">{{ init(s.name) }}</span>
            <span class="who"><b>{{ s.name }}</b><small>{{ s.admissionNo }} · {{ s.className }}</small></span>
            <span class="mini-bar"><span [style.width.%]="paidPct(s)"></span></span>
            <b class="num" [class.due]="s.balance > 0">{{ s.balance | inr }}</b>
          </a>
        }
      } @empty {
        <div class="tile empty">{{ loading() ? 'Loading students…' : 'No students match your search.' }}</div>
      }
    </div>

    @if (drawer()) {
      <div class="backdrop" #backdrop (click)="close()"></div>
      <aside class="drawer" #panel role="dialog" aria-modal="true">
        <button type="button" class="btn btn-icon btn-soft x" (click)="close()" aria-label="Close">✕</button>
        @if (drawer() === 'student') {
          <p class="eyebrow">New admission</p>
          <h2 class="dh">Add a student</h2>
          @if (formError()) { <div class="note note-err">{{ formError() }}</div> }
          <form [formGroup]="form" (ngSubmit)="create()">
            <div class="field"><label for="adm">Admission no.</label><input id="adm" formControlName="admissionNo" placeholder="ADM-1009" [class.invalid]="bad(form, 'admissionNo')"></div>
            <div class="field"><label for="nm">Full name</label><input id="nm" formControlName="name" [class.invalid]="bad(form, 'name')"></div>
            <div class="field"><label for="cl">Class</label>
              <select id="cl" formControlName="className">@for (c of classes; track c) { <option [value]="c">{{ c }}</option> }</select></div>
            <div class="field"><label for="pn">Parent name</label><input id="pn" formControlName="parentName"></div>
            <div class="field"><label for="pp">Parent WhatsApp number</label><input id="pp" formControlName="parentPhone" inputmode="numeric" maxlength="10" placeholder="98xxxxxxxx" [class.invalid]="bad(form, 'parentPhone')">
              @if (bad(form, 'parentPhone')) { <small>10-digit mobile number starting 6-9</small> }</div>
            <button class="btn btn-ink full" type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save student' }}</button>
          </form>
        } @else {
          <p class="eyebrow">Bulk billing</p>
          <h2 class="dh">Bill a whole class</h2>
          <p class="muted">Creates the same fee for every student in the class, in one transaction.</p>
          @if (formError()) { <div class="note note-err">{{ formError() }}</div> }
          <form [formGroup]="bulk" (ngSubmit)="bill()">
            <div class="field"><label for="bc">Class</label>
              <select id="bc" formControlName="className">@for (c of usedClasses; track c) { <option [value]="c">{{ c }}</option> }</select></div>
            <div class="field"><label for="bt">Fee title</label><input id="bt" formControlName="title" placeholder="Annual Day Contribution"></div>
            <div class="field"><label for="ba">Amount per student (₹)</label><input id="ba" type="number" min="1" formControlName="amount"></div>
            <div class="field"><label for="bd">Due date</label><input id="bd" type="date" formControlName="dueDate"></div>
            <button class="btn btn-lime full" type="submit" [disabled]="bulk.invalid || saving()">{{ saving() ? 'Billing…' : 'Bill ' + bulk.value.className }}</button>
          </form>
        }
      </aside>
    }
  `,
  styles: [`
    .top-actions { display: flex; gap: 8px; }
    .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; }
    .grow { flex: 1; min-width: 220px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
    .card { padding: 20px; text-decoration: none; display: flex; flex-direction: column; gap: 6px; transition: transform .25s ease, box-shadow .25s ease; }
    .card:hover { transform: translateY(-4px); box-shadow: 0 24px 50px -24px rgba(17,17,19,.35); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .avatar.big { width: 52px; height: 52px; border-radius: 18px; font-size: 17px; }
    .card h3 { font-size: 20px; }
    .small { font-size: 13px; font-weight: 600; }
    .bar { height: 8px; border-radius: 999px; background: var(--surface-2); overflow: hidden; margin: 14px 0 8px; }
    .bar span { display: block; height: 100%; background: var(--ink); border-radius: 999px; }
    .card-foot { display: flex; justify-content: space-between; }
    .card-foot small { display: block; font-size: 12px; color: var(--muted); font-weight: 600; }
    .card-foot b { font-size: 17px; }
    .r { text-align: right; }
    .due { color: var(--coral); }
    .list { overflow: hidden; }
    .line { grid-template-columns: 40px 1fr 140px 120px; text-decoration: none; }
    .line:hover { background: var(--surface-2); }
    .line > b { text-align: right; }
    .who { display: grid; line-height: 1.3; }
    .who small { color: var(--muted); font-size: 12px; font-weight: 600; }
    .mini-bar { height: 6px; border-radius: 999px; background: var(--surface-2); overflow: hidden; }
    .mini-bar span { display: block; height: 100%; background: var(--violet); }
    .empty { padding: 32px; text-align: center; color: var(--muted); font-weight: 600; grid-column: 1 / -1; }
    .backdrop { position: fixed; inset: 0; background: rgba(10,10,12,.45); backdrop-filter: blur(4px); z-index: 60; }
    .drawer { position: fixed; top: 10px; right: 10px; bottom: 10px; width: min(440px, calc(100% - 20px)); z-index: 61; background: var(--surface);
      border-radius: 28px; padding: 28px; overflow-y: auto; box-shadow: -20px 0 60px -20px rgba(0,0,0,.4); }
    .x { position: absolute; top: 18px; right: 18px; }
    .dh { font-size: 28px; margin: 4px 0 18px; }
    .drawer > .muted { margin: -8px 0 18px; }
    .full { width: 100%; padding: 15px; }
    @media (max-width: 640px) { .line { grid-template-columns: 40px 1fr auto; } .mini-bar { display: none; } .top-actions { width: 100%; } .top-actions .btn { flex: 1; } }
  `],
})
export class StudentsComponent {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly listRef = viewChild<ElementRef<HTMLElement>>('list');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly backdrop = viewChild<ElementRef<HTMLElement>>('backdrop');

  protected readonly classes = CLASSES;
  protected usedClasses: string[] = ['Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
  protected readonly students = signal<Student[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly cls = signal('');
  protected readonly view = signal<'grid' | 'list'>('grid');
  protected readonly drawer = signal<Drawer>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');
  protected readonly flash = signal('');

  /** Search box -> debounce 300ms -> switchMap cancels the previous request while typing. */
  protected readonly search$ = new Subject<string>();
  private lastQuery = '';

  protected readonly form = this.fb.nonNullable.group({
    admissionNo: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    className: ['Grade 5', Validators.required],
    parentName: [''],
    parentPhone: ['', Validators.pattern(/^([6-9][0-9]{9})?$/)],
  });

  protected readonly bulk = this.fb.nonNullable.group({
    className: ['Grade 5', Validators.required],
    title: ['', Validators.required],
    amount: [1500, [Validators.required, Validators.min(1)]],
    dueDate: [todayIso(), Validators.required],
  });

  constructor() {
    this.search$.pipe(
      startWith(''),
      debounceTime(300),
      switchMap((q) => {
        this.lastQuery = q;
        this.loading.set(true);
        return this.api.students(q, this.cls());
      }),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe({
      next: (list) => {
        this.students.set(list);
        this.loading.set(false);
        if (!this.cls() && !this.lastQuery) {
          const used = [...new Set(list.map((s) => s.className))].sort();
          if (used.length) this.usedClasses = used;
        }
        requestAnimationFrame(() => this.revealCards());
      },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }

  private revealCards(): void {
    const host = this.listRef()?.nativeElement;
    if (!host || reduceMotion()) return;
    gsap.fromTo(host.children, { opacity: 0, y: 20, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.035, ease: 'power3.out', clearProps: 'transform,opacity' });
  }

  setClass(c: string): void {
    this.cls.set(c);
    this.search$.next(this.lastQuery);
  }

  open(d: Drawer): void {
    this.formError.set('');
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

  bad(group: typeof this.form | typeof this.bulk, name: string): boolean {
    const c = (group.controls as Record<string, { invalid: boolean; dirty: boolean; touched: boolean }>)[name];
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  create(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.formError.set('');
    this.api.createStudent(this.form.getRawValue()).subscribe({
      next: (s) => this.router.navigate(['/students', s.id]),
      error: (e) => { this.formError.set(errorMessage(e)); this.saving.set(false); },
    });
  }

  bill(): void {
    if (this.bulk.invalid) return;
    this.saving.set(true);
    this.formError.set('');
    this.api.bulkFee(this.bulk.getRawValue()).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.close();
        this.flash.set(`Billed ${r.studentsBilled} students in ${r.className} for “${r.title}”.`);
        setTimeout(() => this.flash.set(''), 4000);
        this.search$.next(this.lastQuery);
      },
      error: (e) => { this.formError.set(errorMessage(e)); this.saving.set(false); },
    });
  }

  paidPct(s: Student): number { return s.totalFees ? Math.round((s.paid / s.totalFees) * 100) : 0; }
  color(n: string): string { return avatarColor(n); }
  init(n: string): string { return initials(n); }
}

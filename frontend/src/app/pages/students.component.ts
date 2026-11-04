import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, startWith, switchMap } from 'rxjs';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { InrPipe } from '../core/inr.pipe';
import { Student } from '../core/models';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [InrPipe, RouterLink, ReactiveFormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Students</h1>
        <p>{{ students().length }} students · search by name or admission number.</p>
      </div>
      @if (auth.isAdmin()) {
        <button class="btn btn-primary" type="button" (click)="showForm.set(!showForm())">
          {{ showForm() ? 'Close' : '+ Add student' }}
        </button>
      }
    </div>

    @if (showForm()) {
      <form class="card add" [formGroup]="form" (ngSubmit)="create()">
        <h2>New student</h2>
        @if (formError()) { <div class="alert alert-error">{{ formError() }}</div> }
        <div class="cols">
          <div class="field"><label for="adm">Admission no.</label><input id="adm" formControlName="admissionNo" placeholder="ADM-1009" [class.invalid]="bad('admissionNo')"></div>
          <div class="field"><label for="nm">Name</label><input id="nm" formControlName="name" [class.invalid]="bad('name')"></div>
          <div class="field"><label for="cl">Class</label>
            <select id="cl" formControlName="className">@for (c of classes; track c) { <option [value]="c">{{ c }}</option> }</select>
          </div>
          <div class="field"><label for="pn">Parent name</label><input id="pn" formControlName="parentName"></div>
          <div class="field"><label for="pp">Parent mobile</label><input id="pp" formControlName="parentPhone" inputmode="numeric" maxlength="10" [class.invalid]="bad('parentPhone')">
            @if (bad('parentPhone')) { <small>10-digit mobile number starting 6-9</small> }</div>
        </div>
        <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save student' }}</button>
      </form>
    }

    <div class="filters">
      <input type="search" placeholder="Search name or admission no…" (input)="search$.next($any($event.target).value)" aria-label="Search students">
      <select (change)="classFilter.set($any($event.target).value); search$.next(lastQuery)" aria-label="Filter by class">
        <option value="">All classes</option>
        @for (c of classes; track c) { <option [value]="c">{{ c }}</option> }
      </select>
    </div>

    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

    <div class="card table-wrap">
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Parent</th><th class="num">Total fees</th><th class="num">Paid</th><th class="num">Balance</th></tr></thead>
        <tbody>
          @for (s of students(); track s.id) {
            <tr class="row" (click)="open(s.id)">
              <td><a [routerLink]="['/students', s.id]" (click)="$event.stopPropagation()"><b>{{ s.name }}</b></a><div class="muted small">{{ s.admissionNo }}</div></td>
              <td>{{ s.className }}</td>
              <td>{{ s.parentName || '-' }}<div class="muted small">{{ s.parentPhone || '' }}</div></td>
              <td class="num">{{ s.totalFees | inr }}</td>
              <td class="num">{{ s.paid | inr }}</td>
              <td class="num"><b [class.due]="s.balance > 0">{{ s.balance | inr }}</b></td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="muted">{{ loading() ? 'Loading…' : 'No students match your search.' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .add { padding: 20px; margin-bottom: 16px; }
    .add h2 { margin-bottom: 14px; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0 14px; }
    .filters { display: flex; gap: 10px; margin-bottom: 14px; }
    .filters input { flex: 1; }
    .filters select { width: 180px; }
    .row { cursor: pointer; }
    .row:hover td { background: #f8fafc; }
    .small { font-size: 12px; }
    .due { color: var(--red); }
    @media (max-width: 600px) { .filters { flex-direction: column; } .filters select { width: 100%; } }
  `],
})
export class StudentsComponent {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  protected readonly students = signal<Student[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly classFilter = signal('');
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal('');

  /** Search box -> debounce 300ms -> switchMap cancels the previous request if the user keeps typing. */
  protected readonly search$ = new Subject<string>();
  protected lastQuery = '';

  protected readonly form = inject(FormBuilder).nonNullable.group({
    admissionNo: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    className: ['Grade 5', Validators.required],
    parentName: [''],
    parentPhone: ['', Validators.pattern(/^([6-9][0-9]{9})?$/)],
  });

  constructor() {
    this.search$.pipe(
      startWith(''),
      debounceTime(300),
      switchMap((q) => {
        this.lastQuery = q;
        this.loading.set(true);
        return this.api.students(q, this.classFilter());
      }),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe({
      next: (list) => { this.students.set(list); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }

  bad(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  open(id: number): void {
    this.router.navigate(['/students', id]);
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
}

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { InrPipe } from '../core/inr.pipe';
import { Fee } from '../core/models';

@Component({
  selector: 'app-overdue',
  standalone: true,
  imports: [InrPipe, DatePipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Overdue fees</h1>
        <p>Fees past their due date with a balance left. Oldest first.</p>
      </div>
      @if (fees().length) {
        <div class="total card">Total overdue <b>{{ total() | inr }}</b></div>
      }
    </div>
    @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Fee</th><th>Due date</th><th>Days late</th><th class="num">Balance</th></tr></thead>
        <tbody>
          @for (f of fees(); track f.id) {
            <tr>
              <td><a [routerLink]="['/students', f.studentId]"><b>{{ f.studentName }}</b></a></td>
              <td>{{ f.className }}</td>
              <td>{{ f.title }}</td>
              <td>{{ f.dueDate | date: 'd MMM y' }}</td>
              <td><span class="late" [class.very]="daysLate(f.dueDate) > 30">{{ daysLate(f.dueDate) }} days</span></td>
              <td class="num"><b>{{ f.balance | inr }}</b></td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="muted">{{ loaded() ? 'Nothing overdue. 🎉' : 'Loading…' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .total { padding: 10px 16px; color: var(--muted); }
    .total b { color: var(--red); margin-left: 6px; font-size: 18px; }
    .late { font-size: 13px; font-weight: 600; color: var(--amber); }
    .late.very { color: var(--red); }
  `],
})
export class OverdueComponent {
  protected readonly fees = signal<Fee[]>([]);
  protected readonly loaded = signal(false);
  protected readonly error = signal('');
  protected readonly total = computed(() => this.fees().reduce((a, f) => a + f.balance, 0));

  constructor() {
    inject(ApiService).overdue().subscribe({
      next: (list) => { this.fees.set(list); this.loaded.set(true); },
      error: (e) => { this.error.set(errorMessage(e)); this.loaded.set(true); },
    });
  }

  daysLate(due: string): number {
    const ms = Date.now() - new Date(due + 'T00:00:00').getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  }
}

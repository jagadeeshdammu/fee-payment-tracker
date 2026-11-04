import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="wrap">
      <section class="hero">
        <div class="logo"><span class="mark">₹</span> FeeTrack</div>
        <h1>School fees, tracked to the last rupee.</h1>
        <p>Record payments, follow up on overdue fees and see collections by class, in one place.</p>
        <ul>
          <li>Spring Boot 3 REST API with JWT security</li>
          <li>MySQL with Flyway migrations</li>
          <li>Angular 19: signals, interceptors, guards</li>
        </ul>
      </section>

      <section class="panel">
        <form class="card" [formGroup]="form" (ngSubmit)="submit()">
          <h2>Sign in</h2>
          <p class="muted">Use one of the demo accounts below.</p>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="field">
            <label for="u">Username</label>
            <input id="u" formControlName="username" autocomplete="username">
          </div>
          <div class="field">
            <label for="p">Password</label>
            <input id="p" type="password" formControlName="password" autocomplete="current-password">
          </div>
          <button class="btn btn-primary full" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
          <div class="demo-users">
            <button type="button" (click)="fill('admin', 'admin123')"><b>Admin</b><span>admin / admin123</span></button>
            <button type="button" (click)="fill('accountant', 'accountant123')"><b>Accountant</b><span>accountant / accountant123</span></button>
          </div>
          @if (demo) {
            <p class="note">Demo mode: this page runs without a server. Clone the repo and run Docker Compose for the real Spring Boot + MySQL backend.</p>
          }
        </form>
      </section>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 1fr; }
    .hero { background: radial-gradient(800px 400px at 0% 0%, #4f46e5 0%, #1e1b4b 55%, #0f172a 100%); color: #e0e7ff; padding: 56px; display: flex; flex-direction: column; justify-content: center; }
    .logo { color: #fff; font-weight: 700; font-size: 20px; display: flex; align-items: center; gap: 10px; margin-bottom: 40px; }
    .mark { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,.15); display: grid; place-items: center; }
    .hero h1 { color: #fff; font-size: 38px; line-height: 1.15; max-width: 480px; }
    .hero p { font-size: 17px; max-width: 440px; color: #c7d2fe; }
    .hero ul { margin: 18px 0 0; padding-left: 18px; color: #a5b4fc; display: grid; gap: 6px; }
    .panel { display: grid; place-items: center; padding: 24px; }
    form { width: min(400px, 100%); padding: 32px; }
    form h2 { font-size: 22px; }
    form > p { margin: 4px 0 20px; }
    .full { width: 100%; padding: 12px; margin-top: 4px; }
    .demo-users { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
    .demo-users button { font: inherit; text-align: left; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px 12px; cursor: pointer; display: grid; }
    .demo-users button:hover { border-color: var(--brand); background: var(--brand-soft); }
    .demo-users span { font-size: 12px; color: var(--muted); }
    .note { font-size: 12px; color: var(--muted); margin: 16px 0 0; }
    @media (max-width: 860px) {
      .wrap { grid-template-columns: 1fr; }
      .hero { padding: 32px 20px; }
      .hero h1 { font-size: 28px; }
      .logo { margin-bottom: 20px; }
    }
  `],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly demo = environment.demo;
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  fill(username: string, password: string): void {
    this.form.setValue({ username, password });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.isLoggedIn()) {
      <div class="shell" [class.nav-open]="navOpen()">
        <aside class="side">
          <div class="logo"><span class="mark">₹</span> FeeTrack</div>
          <nav>
            @for (l of links; track l.path) {
              <a [routerLink]="l.path" routerLinkActive="active" (click)="navOpen.set(false)">
                <span class="ic" aria-hidden="true">{{ l.icon }}</span>{{ l.label }}
              </a>
            }
          </nav>
          <div class="me">
            <div class="avatar">{{ initials() }}</div>
            <div class="who">
              <b>{{ auth.user()?.fullName }}</b>
              <span>{{ auth.user()?.role === 'ADMIN' ? 'Admin' : 'Accountant' }}</span>
            </div>
            <button type="button" class="out" (click)="auth.logout()" title="Sign out" aria-label="Sign out">⎋</button>
          </div>
        </aside>

        <div class="main">
          <header class="top">
            <button type="button" class="burger" (click)="navOpen.set(!navOpen())" aria-label="Menu">☰</button>
            @if (demo) {
              <span class="demo">Demo mode · data lives in your browser · <a href="https://github.com/jagadeeshdammu/fee-payment-tracker" target="_blank" rel="noopener">Spring Boot source</a></span>
            }
          </header>
          <main class="content"><router-outlet /></main>
        </div>
        <div class="scrim" (click)="navOpen.set(false)"></div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
    .side { background: #0f172a; color: #cbd5e1; display: flex; flex-direction: column; padding: 20px 14px; position: sticky; top: 0; height: 100vh; }
    .logo { color: #fff; font-weight: 700; font-size: 18px; display: flex; align-items: center; gap: 10px; padding: 4px 10px 22px; }
    .mark { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, #6366f1, #4f46e5); display: grid; place-items: center; font-size: 17px; }
    nav { display: grid; gap: 4px; }
    nav a { display: flex; align-items: center; gap: 12px; color: #cbd5e1; padding: 10px 12px; border-radius: 10px; font-weight: 500; }
    nav a:hover { background: rgba(255,255,255,.06); color: #fff; }
    nav a.active { background: rgba(99,102,241,.22); color: #fff; }
    .ic { width: 20px; text-align: center; }
    .me { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 12px 10px; border-top: 1px solid rgba(255,255,255,.08); }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: #334155; color: #fff; display: grid; place-items: center; font-weight: 600; font-size: 13px; }
    .who { display: grid; line-height: 1.25; flex: 1; min-width: 0; }
    .who b { color: #fff; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .who span { font-size: 12px; color: #94a3b8; }
    .out { background: none; border: 0; color: #94a3b8; font-size: 18px; cursor: pointer; }
    .out:hover { color: #fff; }
    .main { min-width: 0; }
    .top { display: flex; align-items: center; gap: 12px; padding: 14px 28px 0; min-height: 50px; }
    .burger { display: none; background: #fff; border: 1px solid var(--line); border-radius: 10px; width: 40px; height: 40px; font-size: 18px; cursor: pointer; }
    .demo { font-size: 13px; background: var(--amber-soft); color: #92400e; border: 1px solid #fde68a; padding: 6px 12px; border-radius: 999px; }
    .content { padding: 18px 28px 40px; max-width: 1200px; }
    .scrim { display: none; }
    @media (max-width: 860px) {
      .shell { grid-template-columns: 1fr; }
      .side { position: fixed; left: 0; top: 0; bottom: 0; width: 250px; z-index: 30; transform: translateX(-100%); transition: transform .25s ease; }
      .nav-open .side { transform: none; }
      .nav-open .scrim { display: block; position: fixed; inset: 0; background: rgba(15,23,42,.4); z-index: 20; }
      .burger { display: block; }
      .top { padding: 12px 16px 0; }
      .content { padding: 14px 16px 32px; }
      .demo { font-size: 12px; }
    }
  `],
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
  protected readonly demo = environment.demo;
  protected readonly navOpen = signal(false);
  protected readonly links = [
    { path: '/dashboard', label: 'Dashboard', icon: '▦' },
    { path: '/students', label: 'Students', icon: '◉' },
    { path: '/overdue', label: 'Overdue', icon: '⚑' },
  ];

  protected initials(): string {
    return (this.auth.user()?.fullName ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('');
  }
}

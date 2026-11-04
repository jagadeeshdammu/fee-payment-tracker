import { AfterViewInit, Component, DestroyRef, ElementRef, HostListener, inject, signal, viewChild, viewChildren } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { gsap } from 'gsap';
import { filter } from 'rxjs';
import { environment } from '../environments/environment';
import { reduceMotion } from './core/anim';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { avatarColor, initials } from './core/util';
import { CommandPaletteComponent } from './ui/command-palette.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommandPaletteComponent],
  template: `
    @if (auth.isLoggedIn()) {
      <header class="topbar">
        <a routerLink="/dashboard" class="logo"><span class="mark">L</span><span class="word">Ledgr</span></a>

        <nav class="nav" #nav aria-label="Main">
          <span class="indicator" #indicator></span>
          @for (l of links; track l.path) {
            <a #navLink [routerLink]="l.path" routerLinkActive="active" #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null">{{ l.label }}</a>
          }
        </nav>

        <div class="right">
          <button type="button" class="search-btn" (click)="palette.set(true)" aria-label="Search (Ctrl+K)">
            <span>Search</span><kbd>⌘K</kbd>
          </button>
          <button type="button" class="btn btn-icon btn-ghost" (click)="theme.toggle()" [attr.aria-label]="theme.theme() === 'dark' ? 'Light mode' : 'Dark mode'">
            {{ theme.theme() === 'dark' ? '☀' : '☾' }}
          </button>
          <div class="me">
            <button type="button" class="me-btn" (click)="menu.set(!menu())" [attr.aria-expanded]="menu()">
              <span class="avatar" [style.background]="color()">{{ init() }}</span>
              <span class="who"><b>{{ auth.user()?.fullName }}</b><small>{{ auth.isAdmin() ? 'Admin' : 'Accountant' }}</small></span>
            </button>
            @if (menu()) {
              <div class="menu">
                <button type="button" (click)="auth.logout(); menu.set(false)">Sign out</button>
              </div>
            }
          </div>
        </div>
      </header>

      @if (demo) {
        <div class="demo">Demo mode: data lives in your browser · <a href="https://github.com/jagadeeshdammu/fee-payment-tracker" target="_blank" rel="noopener">Spring Boot source ↗</a></div>
      }

      <main class="page" #page><router-outlet /></main>

      <nav class="tabbar" aria-label="Main">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" routerLinkActive="active"><span>{{ l.icon }}</span>{{ l.short }}</a>
        }
      </nav>

      @if (palette()) { <ui-command-palette (close)="palette.set(false)" /> }
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    .topbar { position: sticky; top: 14px; z-index: 40; margin: 14px auto 0; width: min(1240px, calc(100% - 28px));
      display: flex; align-items: center; gap: 16px; padding: 8px 8px 8px 16px; border-radius: 999px;
      background: color-mix(in srgb, var(--surface) 82%, transparent); backdrop-filter: blur(16px); border: 1px solid var(--line); box-shadow: var(--shadow); }
    .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .mark { width: 34px; height: 34px; border-radius: 12px; background: var(--ink); color: var(--lime); display: grid; place-items: center; font: 800 18px var(--display); transform: rotate(-6deg); }
    .word { font: 800 20px var(--display); letter-spacing: -.03em; }
    .nav { position: relative; display: flex; gap: 2px; margin: 0 auto; padding: 4px; border-radius: 999px; background: var(--surface-2); }
    .nav a { position: relative; z-index: 1; padding: 10px 18px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 14px; color: var(--muted); transition: color .25s; }
    .nav a.active { color: var(--bg); }
    .indicator { position: absolute; z-index: 0; top: 4px; bottom: 4px; left: 0; width: 0; border-radius: 999px; background: var(--ink); }
    .right { display: flex; align-items: center; gap: 8px; }
    .search-btn { display: flex; align-items: center; gap: 10px; font: 600 14px var(--body); color: var(--muted); background: var(--surface-2);
      border: 1px solid var(--line); border-radius: 999px; padding: 9px 10px 9px 16px; cursor: pointer; }
    kbd { font: 800 11px var(--display); background: var(--surface); border: 1px solid var(--line); border-radius: 7px; padding: 3px 6px; color: var(--ink); }
    .me { position: relative; }
    .me-btn { display: flex; align-items: center; gap: 10px; background: none; border: 0; cursor: pointer; padding: 3px 12px 3px 3px; border-radius: 999px; color: var(--ink); font: inherit; }
    .me-btn:hover { background: var(--surface-2); }
    .avatar { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font: 800 13px var(--display); color: #111; }
    .who { display: grid; text-align: left; line-height: 1.15; }
    .who b { font-size: 14px; }
    .who small { font-size: 12px; color: var(--muted); font-weight: 600; }
    .menu { position: absolute; right: 0; top: calc(100% + 8px); background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 6px; box-shadow: var(--shadow); min-width: 160px; }
    .menu button { width: 100%; text-align: left; font: 700 14px var(--body); background: none; border: 0; color: var(--coral); padding: 10px 12px; border-radius: 10px; cursor: pointer; }
    .menu button:hover { background: var(--coral-soft); }
    .demo { width: min(1240px, calc(100% - 28px)); margin: 12px auto 0; font-size: 13px; font-weight: 600; color: var(--muted); text-align: center; }
    .demo a { color: var(--violet); font-weight: 700; }
    .page { width: min(1240px, calc(100% - 28px)); margin: 0 auto; padding: 24px 0 60px; }
    .tabbar { display: none; }
    @media (max-width: 1020px) { .who { display: none; } .search-btn span { display: none; } }
    @media (max-width: 820px) {
      .nav, .search-btn { display: none; }
      .right { margin-left: auto; }
      .page { padding-bottom: 110px; }
      .tabbar { display: grid; grid-template-columns: repeat(4, 1fr); position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 40;
        padding: 6px; border-radius: 22px; background: var(--ink); box-shadow: 0 16px 40px -10px rgba(0,0,0,.5); }
      .tabbar a { display: grid; justify-items: center; gap: 2px; padding: 8px 0; border-radius: 16px; text-decoration: none; color: #9a9a9f; font-size: 11px; font-weight: 700; }
      .tabbar a span { font-size: 18px; line-height: 1; }
      .tabbar a.active { background: var(--lime); color: var(--lime-ink); }
    }
  `],
})
export class AppComponent implements AfterViewInit {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly demo = environment.demo;
  protected readonly palette = signal(false);
  protected readonly menu = signal(false);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navLinks = viewChildren<ElementRef<HTMLAnchorElement>>('navLink');
  private readonly indicator = viewChild<ElementRef<HTMLElement>>('indicator');
  private readonly page = viewChild<ElementRef<HTMLElement>>('page');

  protected readonly links = [
    { path: '/dashboard', label: 'Overview', short: 'Home', icon: '◐' },
    { path: '/students', label: 'Students', short: 'Students', icon: '◉' },
    { path: '/payments', label: 'Payments', short: 'Ledger', icon: '₹' },
    { path: '/overdue', label: 'Overdue', short: 'Overdue', icon: '!' },
  ];

  ngAfterViewInit(): void {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.menu.set(false);
      // wait one frame so routerLinkActive has updated the classes
      requestAnimationFrame(() => {
        this.moveIndicator();
        const page = this.page()?.nativeElement;
        if (page && !reduceMotion()) gsap.fromTo(page, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', clearProps: 'transform' });
      });
    });
    requestAnimationFrame(() => this.moveIndicator(true));
  }

  /** The black pill slides under the active nav link (GSAP). */
  private moveIndicator(instant = false): void {
    const ind = this.indicator()?.nativeElement;
    const active = this.navLinks().map((r) => r.nativeElement).find((a) => a.classList.contains('active'));
    if (!ind || !active) return;
    const props = { x: active.offsetLeft, width: active.offsetWidth };
    if (instant || reduceMotion()) gsap.set(ind, props);
    else gsap.to(ind, { ...props, duration: 0.5, ease: 'expo.out' });
  }

  @HostListener('window:resize')
  onResize(): void { this.moveIndicator(true); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && this.auth.isLoggedIn()) {
      e.preventDefault();
      this.palette.update((v) => !v);
    }
  }

  protected color(): string { return avatarColor(this.auth.user()?.fullName ?? '?'); }
  protected init(): string { return initials(this.auth.user()?.fullName ?? '?'); }
}

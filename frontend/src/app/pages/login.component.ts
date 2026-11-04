import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { environment } from '../../environments/environment';
import { reduceMotion } from '../core/anim';
import { errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="screen" #root>
      <section class="stage">
        <div class="logo"><span class="mark">L</span> Ledgr</div>
        <h1 class="headline">
          <span class="line">School fees,</span>
          <span class="line">finally <em>under</em></span>
          <span class="line">control.</span>
        </h1>
        <p class="lede">Record payments, chase overdue fees on WhatsApp and see every rupee by class, in one calm dashboard.</p>

        <div class="floaters" aria-hidden="true">
          <div class="float f1">
            <span class="dot"></span>
            <div><b>₹21,000 received</b><small>Term 2 · Aarav Reddy · UPI</small></div>
          </div>
          <div class="float f2">
            <small>Collected this term</small>
            <b class="num">₹4.4L</b>
            <div class="bars"><i style="height:40%"></i><i style="height:62%"></i><i style="height:48%"></i><i style="height:80%"></i><i style="height:66%"></i><i class="hi" style="height:96%"></i></div>
          </div>
          <div class="float f3">
            <span class="chip OVERDUE"><i></i>Overdue</span>
            <b>7 fees · ₹1.1L</b>
            <small>Send reminders →</small>
          </div>
        </div>
      </section>

      <section class="side">
        <button type="button" class="btn btn-icon btn-ghost theme" (click)="theme.toggle()" aria-label="Toggle dark mode">{{ theme.theme() === 'dark' ? '☀' : '☾' }}</button>
        <form class="card" [formGroup]="form" (ngSubmit)="submit()">
          <p class="eyebrow">Welcome back</p>
          <h2>Sign in to your school</h2>
          @if (error()) { <div class="note note-err">{{ error() }}</div> }
          <div class="field">
            <label for="u">Username</label>
            <input id="u" formControlName="username" autocomplete="username" placeholder="admin">
          </div>
          <div class="field">
            <label for="p">Password</label>
            <input id="p" type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••">
          </div>
          <button class="btn btn-ink full" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in…' : 'Sign in →' }}
          </button>

          <p class="or"><span>or try a demo account</span></p>
          <div class="demo-users">
            <button type="button" (click)="fill('admin', 'admin123')">
              <span class="badge lime">A</span><span><b>Admin</b><small>admin / admin123</small></span>
            </button>
            <button type="button" (click)="fill('accountant', 'accountant123')">
              <span class="badge violet">R</span><span><b>Accountant</b><small>accountant / accountant123</small></span>
            </button>
          </div>
          @if (demo) {
            <p class="fine">Demo runs fully in your browser. The real app uses Spring Boot 3 + MySQL. See the GitHub repo.</p>
          }
        </form>
      </section>
    </div>
  `,
  styles: [`
    .screen { min-height: 100vh; display: grid; grid-template-columns: 1.15fr 1fr; }
    .stage { position: relative; overflow: hidden; padding: 48px clamp(24px, 5vw, 72px); display: flex; flex-direction: column; justify-content: center;
      background: var(--ink); color: var(--bg); }
    :host-context([data-theme='dark']) .stage { background: #050506; color: #f3f2ee; }
    .logo { position: absolute; top: 36px; left: clamp(24px, 5vw, 72px); display: flex; align-items: center; gap: 10px; font: 800 22px var(--display); }
    .mark { width: 38px; height: 38px; border-radius: 13px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; transform: rotate(-6deg); }
    .headline { font-size: clamp(46px, 7vw, 96px); line-height: .95; letter-spacing: -.045em; font-weight: 800; }
    .headline .line { display: block; overflow: hidden; }
    .headline em { font-style: normal; color: var(--lime-ink); background: var(--lime); padding: 0 .12em; border-radius: .18em; }
    .lede { max-width: 440px; font-size: 18px; color: #b9b8b2; margin: 26px 0 0; }
    .floaters { position: absolute; inset: 0; pointer-events: none; }
    .float { position: absolute; background: #fff; color: #111; border-radius: 20px; padding: 14px 16px; box-shadow: 0 24px 50px -18px rgba(0,0,0,.6); display: grid; gap: 4px; }
    .float small { color: #6e6d72; font-weight: 600; font-size: 12px; }
    .float b { font-family: var(--display); font-size: 16px; }
    .f1 { top: 14%; right: 8%; display: flex; align-items: center; gap: 12px; }
    .f1 .dot { width: 34px; height: 34px; border-radius: 12px; background: var(--lime); }
    .f2 { bottom: 12%; right: 12%; width: 190px; }
    .f2 .num { font-size: 28px; }
    .bars { display: flex; align-items: flex-end; gap: 6px; height: 54px; margin-top: 6px; }
    .bars i { flex: 1; background: #e6e4dc; border-radius: 6px; }
    .bars i.hi { background: var(--lime); }
    .f3 { bottom: 8%; left: clamp(24px, 5vw, 72px); background: #1d1d22; color: #f3f2ee; }
    .f3 small { color: var(--lime); }
    .side { position: relative; display: grid; place-items: center; padding: 32px 20px; }
    .theme { position: absolute; top: 24px; right: 24px; }
    .card { width: min(420px, 100%); }
    .card h2 { font-size: 32px; margin: 6px 0 24px; }
    .full { width: 100%; padding: 15px; font-size: 15px; margin-top: 4px; }
    .or { text-align: center; color: var(--muted); font-size: 13px; font-weight: 600; margin: 22px 0 14px; display: flex; align-items: center; gap: 12px; }
    .or::before, .or::after { content: ''; flex: 1; height: 1px; background: var(--line); }
    .demo-users { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .demo-users button { display: flex; align-items: center; gap: 10px; text-align: left; font: inherit; color: var(--ink); background: var(--surface);
      border: 1px solid var(--line); border-radius: 18px; padding: 12px; cursor: pointer; transition: border-color .2s, transform .2s; }
    .demo-users button:hover { border-color: var(--ink); transform: translateY(-2px); }
    .demo-users span:last-child { display: grid; line-height: 1.25; min-width: 0; }
    .demo-users small { color: var(--muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .badge { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; font: 800 14px var(--display); color: #111; flex: 0 0 auto; }
    .badge.lime { background: var(--lime); }
    .badge.violet { background: #b8aef9; }
    .fine { font-size: 12px; color: var(--muted); margin-top: 18px; }
    @media (max-width: 900px) {
      .screen { grid-template-columns: 1fr; }
      .stage { min-height: 56vh; padding-top: 100px; }
      .floaters { display: none; }
      .headline { font-size: clamp(42px, 12vw, 64px); }
    }
  `],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);
  protected readonly demo = environment.demo;
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private ctx?: gsap.Context;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  ngAfterViewInit(): void {
    if (reduceMotion()) return;
    // gsap.context scopes selectors to this component and lets us revert everything on destroy
    this.ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('.headline .line', { yPercent: 110, duration: 1.1, stagger: 0.1 })
        .from('.lede, .logo', { opacity: 0, y: 16, duration: 0.8 }, '-=0.7')
        .from('.float', { opacity: 0, scale: 0.8, y: 40, duration: 0.9, stagger: 0.12, ease: 'back.out(1.7)' }, '-=0.6')
        .from('.card > *', { opacity: 0, y: 18, duration: 0.6, stagger: 0.05 }, 0.3);
      gsap.to('.f1', { y: -14, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to('.f2', { y: 12, rotation: 2, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to('.f3', { y: -10, rotation: -3, duration: 2.9, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.5 });
      gsap.from('.bars i', { scaleY: 0, transformOrigin: 'bottom', duration: 0.9, stagger: 0.08, delay: 1.1, ease: 'back.out(2)' });
    }, this.root().nativeElement);
  }

  ngOnDestroy(): void { this.ctx?.revert(); }

  fill(username: string, password: string): void {
    this.form.setValue({ username, password });
    if (!reduceMotion()) gsap.fromTo('.card input', { backgroundColor: 'var(--lime)' }, { backgroundColor: 'var(--surface-2)', duration: 0.8, clearProps: 'backgroundColor' });
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
        if (!reduceMotion()) gsap.fromTo('.card', { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
      },
    });
  }
}

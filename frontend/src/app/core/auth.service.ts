import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse } from './models';

const STORAGE_KEY = 'feetrack.session';

/** Holds the logged-in user as a signal; components read it reactively. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<LoginResponse | null>(this.restore());

  readonly user = this.session.asReadonly();
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.session()?.role === 'ADMIN');
  readonly token = computed(() => this.session()?.token ?? null);

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiBase}/auth/login`, { username, password })
      .pipe(tap((res) => this.store(res)));
  }

  logout(): void {
    this.store(null);
    this.router.navigate(['/login']);
  }

  private store(res: LoginResponse | null): void {
    this.session.set(res);
    try {
      if (res) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage blocked - session lives in memory only */
    }
  }

  private restore(): LoginResponse | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LoginResponse) : null;
    } catch {
      return null;
    }
  }
}

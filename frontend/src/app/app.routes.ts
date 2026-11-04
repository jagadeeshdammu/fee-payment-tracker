import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · Ledgr',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Ledgr',
        loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'students',
        title: 'Students · Ledgr',
        loadComponent: () => import('./pages/students.component').then((m) => m.StudentsComponent),
      },
      {
        path: 'students/:id',
        title: 'Student · Ledgr',
        loadComponent: () => import('./pages/student-detail.component').then((m) => m.StudentDetailComponent),
      },
      {
        path: 'payments',
        title: 'Payments · Ledgr',
        loadComponent: () => import('./pages/payments.component').then((m) => m.PaymentsComponent),
      },
      {
        path: 'overdue',
        title: 'Overdue · Ledgr',
        loadComponent: () => import('./pages/overdue.component').then((m) => m.OverdueComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · FeeTrack',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · FeeTrack',
        loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'students',
        title: 'Students · FeeTrack',
        loadComponent: () => import('./pages/students.component').then((m) => m.StudentsComponent),
      },
      {
        path: 'students/:id',
        title: 'Student · FeeTrack',
        loadComponent: () => import('./pages/student-detail.component').then((m) => m.StudentDetailComponent),
      },
      {
        path: 'overdue',
        title: 'Overdue · FeeTrack',
        loadComponent: () => import('./pages/overdue.component').then((m) => m.OverdueComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

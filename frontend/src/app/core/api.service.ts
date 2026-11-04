import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiError, Dashboard, Fee, FeeRequest, Payment, PaymentRequest, Student, StudentDetail, StudentRequest,
} from './models';

/** Typed wrapper around the REST API. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.base}/dashboard`);
  }

  students(q = '', className = ''): Observable<Student[]> {
    const params = new HttpParams().set('q', q).set('className', className);
    return this.http.get<Student[]>(`${this.base}/students`, { params });
  }

  student(id: number): Observable<StudentDetail> {
    return this.http.get<StudentDetail>(`${this.base}/students/${id}`);
  }

  createStudent(body: StudentRequest): Observable<Student> {
    return this.http.post<Student>(`${this.base}/students`, body);
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/students/${id}`);
  }

  addFee(studentId: number, body: FeeRequest): Observable<Fee> {
    return this.http.post<Fee>(`${this.base}/students/${studentId}/fees`, body);
  }

  deleteFee(feeId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/fees/${feeId}`);
  }

  overdue(): Observable<Fee[]> {
    return this.http.get<Fee[]>(`${this.base}/fees/overdue`);
  }

  payments(feeId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.base}/fees/${feeId}/payments`);
  }

  recordPayment(feeId: number, body: PaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/fees/${feeId}/payments`, body);
  }
}

/** Turns any HTTP error into a readable message for the UI. */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Partial<ApiError> | null;
    if (body?.fieldErrors && Object.keys(body.fieldErrors).length) {
      return Object.entries(body.fieldErrors).map(([f, m]) => `${f}: ${m}`).join(' · ');
    }
    if (body?.message) return body.message;
    if (err.status === 0) return 'Cannot reach the server. Is the backend running?';
    return `Request failed (${err.status})`;
  }
  return 'Something went wrong';
}

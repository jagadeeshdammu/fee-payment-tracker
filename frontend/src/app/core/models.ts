export type FeeStatus = 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING';
export type PaymentMode = 'UPI' | 'CARD' | 'NET_BANKING' | 'CASH' | 'CHEQUE';
export type Role = 'ADMIN' | 'ACCOUNTANT';

export interface LoginResponse {
  token: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface Student {
  id: number;
  admissionNo: string;
  name: string;
  className: string;
  parentName: string | null;
  parentPhone: string | null;
  totalFees: number;
  paid: number;
  balance: number;
}

export interface StudentRequest {
  admissionNo: string;
  name: string;
  className: string;
  parentName: string;
  parentPhone: string;
}

export interface Fee {
  id: number;
  studentId: number;
  studentName: string;
  className: string;
  title: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  status: FeeStatus;
}

export interface FeeRequest {
  title: string;
  amount: number;
  dueDate: string;
}

export interface StudentDetail {
  student: Student;
  fees: Fee[];
}

export interface Payment {
  id: number;
  feeId: number;
  feeTitle: string;
  studentId: number;
  studentName: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  paidOn: string;
  recordedBy: string;
}

export interface PaymentRequest {
  amount: number;
  mode: PaymentMode;
  reference: string;
  paidOn: string;
}

export interface ClassSummary {
  className: string;
  billed: number;
  collected: number;
}

export interface Dashboard {
  studentCount: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectedThisMonth: number;
  overdueCount: number;
  byClass: ClassSummary[];
  recentPayments: Payment[];
}

export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

export const PAYMENT_MODES: PaymentMode[] = ['UPI', 'CARD', 'NET_BANKING', 'CASH', 'CHEQUE'];

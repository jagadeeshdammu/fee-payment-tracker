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
  parentName: string | null;
  parentPhone: string | null;
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
  receiptNo: string;
  feeId: number;
  feeTitle: string;
  studentId: number;
  studentName: string;
  admissionNo: string;
  className: string;
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

export interface MonthlyCollection {
  month: string; // "2026-06"
  amount: number;
}

export interface ModeSummary {
  mode: PaymentMode;
  amount: number;
  count: number;
}

export interface Dashboard {
  studentCount: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  collectedThisMonth: number;
  overdueCount: number;
  overdueAmount: number;
  byClass: ClassSummary[];
  monthly: MonthlyCollection[];
  byMode: ModeSummary[];
  recentPayments: Payment[];
}

export interface BulkFeeRequest {
  className: string;
  title: string;
  amount: number;
  dueDate: string;
}

export interface BulkFeeResult {
  className: string;
  title: string;
  studentsBilled: number;
}

export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

export const PAYMENT_MODES: PaymentMode[] = ['UPI', 'CARD', 'NET_BANKING', 'CASH', 'CHEQUE'];

export const MODE_LABEL: Record<PaymentMode, string> = {
  UPI: 'UPI', CARD: 'Card', NET_BANKING: 'Net banking', CASH: 'Cash', CHEQUE: 'Cheque',
};

export const MODE_COLOR: Record<PaymentMode, string> = {
  UPI: '#c6f36b', CARD: '#7c6cf2', NET_BANKING: '#4fb3f6', CASH: '#ff6b4a', CHEQUE: '#f5a524',
};

export const CLASSES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];

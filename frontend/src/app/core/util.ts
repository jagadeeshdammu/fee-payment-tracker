const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

export const formatInr = (n: number): string => inr0.format(Math.round(n));
export const formatCompactInr = (n: number): string => '₹' + compact.format(n);

const AVATAR_COLORS = ['#c6f36b', '#b8aef9', '#8fd3fb', '#ffb39e', '#ffd88a', '#9de8c4'];

/** Same name -> same pastel colour, so avatars stay consistent everywhere. */
export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const initials = (name: string): string =>
  name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(fromIso: string, to = new Date()): number {
  return Math.max(0, Math.floor((to.getTime() - new Date(fromIso + 'T00:00:00').getTime()) / 86_400_000));
}

/** Download rows as a CSV file (opens in Excel / Google Sheets). */
export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]): void {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** wa.me link with a polite, pre-filled fee reminder for the parent. */
export function whatsappReminder(phone: string | null, parent: string | null, student: string, title: string, balance: number, dueIso: string): string | null {
  if (!phone) return null;
  const due = new Date(dueIso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const text = `Dear ${parent || 'Parent'}, this is a gentle reminder that ${formatInr(balance)} is pending for ${student}'s ${title} (due ${due}). Please pay at your earliest convenience. Thank you!`;
  return `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
}

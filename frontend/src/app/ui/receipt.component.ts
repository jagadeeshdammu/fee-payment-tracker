import { Component, ElementRef, HostListener, input, output, viewChild, AfterViewInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { popIn } from '../core/anim';
import { InrPipe } from '../core/inr.pipe';
import { MODE_LABEL, Payment } from '../core/models';

/** Printable payment receipt (Print -> "Save as PDF" gives a PDF receipt). */
@Component({
  selector: 'ui-receipt',
  standalone: true,
  imports: [InrPipe, DatePipe],
  template: `
    <div class="backdrop" (click)="close.emit()">
      <div #card class="receipt printable" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Payment receipt">
        <div class="head">
          <div class="brand"><span class="mark">L</span> Ledgr School</div>
          <div class="no">{{ payment().receiptNo }}</div>
        </div>
        <div class="stamp">PAID</div>
        <p class="eyebrow">Amount received</p>
        <div class="amount num">{{ payment().amount | inr }}</div>
        <dl>
          <div><dt>Student</dt><dd>{{ payment().studentName }}</dd></div>
          <div><dt>Admission no.</dt><dd>{{ payment().admissionNo }}</dd></div>
          <div><dt>Class</dt><dd>{{ payment().className }}</dd></div>
          <div><dt>Towards</dt><dd>{{ payment().feeTitle }}</dd></div>
          <div><dt>Paid on</dt><dd>{{ payment().paidOn | date: 'd MMM y' }}</dd></div>
          <div><dt>Mode</dt><dd>{{ modeLabel[payment().mode] }}</dd></div>
          <div><dt>Reference</dt><dd class="mono">{{ payment().reference }}</dd></div>
          <div><dt>Recorded by</dt><dd>{{ payment().recordedBy }}</dd></div>
        </dl>
        <div class="tear"></div>
        <p class="fine">This is a computer-generated receipt and does not need a signature.</p>
        <div class="actions no-print">
          <button type="button" class="btn btn-ghost" (click)="close.emit()">Close</button>
          <button type="button" class="btn btn-ink" (click)="print()">Print / Save PDF</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .backdrop { position: fixed; inset: 0; z-index: 90; background: rgba(10,10,12,.5); backdrop-filter: blur(6px); display: grid; place-items: center; padding: 16px; }
    .receipt { width: min(420px, 100%); background: #fffdf6; color: #111; border-radius: 26px; padding: 26px; position: relative; overflow: hidden;
      box-shadow: 0 40px 90px -30px rgba(0,0,0,.6); --muted: #6e6d72; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .brand { display: flex; align-items: center; gap: 8px; font: 800 16px var(--display); }
    .mark { width: 28px; height: 28px; border-radius: 9px; background: #111; color: #c6f36b; display: grid; place-items: center; }
    .no { font: 700 12px var(--body); color: #6e6d72; letter-spacing: .06em; }
    .stamp { position: absolute; right: 22px; top: 70px; transform: rotate(12deg); border: 3px solid #2fcf8f; color: #2fcf8f; font: 800 18px var(--display);
      padding: 4px 12px; border-radius: 10px; letter-spacing: .1em; }
    .eyebrow { margin: 26px 0 4px; color: #6e6d72; }
    .amount { font-size: 44px; font-weight: 800; }
    dl { margin: 20px 0 0; display: grid; gap: 10px; }
    dl div { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    dt { color: #6e6d72; font-weight: 600; }
    dd { margin: 0; font-weight: 700; text-align: right; }
    .mono { font-family: ui-monospace, monospace; font-size: 13px; }
    .tear { margin: 22px -26px 0; height: 14px; background: radial-gradient(circle at 7px -2px, transparent 8px, #ece9dc 9px) 0 0 / 14px 14px repeat-x; }
    .fine { font-size: 12px; color: #6e6d72; margin: 12px 0 0; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; }
    @media print { .no-print { display: none !important; } .backdrop { background: none; backdrop-filter: none; } }
  `],
})
export class ReceiptComponent implements AfterViewInit {
  readonly payment = input.required<Payment>();
  readonly close = output<void>();
  protected readonly modeLabel = MODE_LABEL;
  private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

  ngAfterViewInit(): void { popIn(this.card().nativeElement); }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.close.emit(); }

  print(): void { window.print(); }
}

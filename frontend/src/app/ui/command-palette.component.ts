import { Component, ElementRef, HostListener, computed, inject, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { popIn } from '../core/anim';
import { Student } from '../core/models';
import { ThemeService } from '../core/theme.service';
import { avatarColor, initials } from '../core/util';

interface Item { id: string; title: string; hint: string; color?: string; icon?: string; run: () => void; }

/** Ctrl/Cmd + K: jump to any student or page from the keyboard. */
@Component({
  selector: 'ui-command-palette',
  standalone: true,
  template: `
    <div class="backdrop" (click)="close.emit()">
      <div #panel class="panel" role="dialog" aria-modal="true" aria-label="Search" (click)="$event.stopPropagation()">
        <div class="input-row">
          <span class="k">⌘K</span>
          <input #box placeholder="Search students, pages, actions…" [value]="q()" (input)="q.set($any($event.target).value); active.set(0)"
                 (keydown)="onKey($event)" aria-label="Search">
          <button type="button" class="esc" (click)="close.emit()">Esc</button>
        </div>
        <ul class="results">
          @for (it of items(); track it.id; let i = $index) {
            <li [class.on]="i === active()" (mouseenter)="active.set(i)" (click)="pick(it)">
              @if (it.color) { <span class="av" [style.background]="it.color">{{ it.icon }}</span> }
              @else { <span class="av icon">{{ it.icon }}</span> }
              <span class="t">{{ it.title }}</span>
              <span class="h">{{ it.hint }}</span>
            </li>
          } @empty {
            <li class="empty">No matches for “{{ q() }}”</li>
          }
        </ul>
        <div class="foot"><span>↑↓ to move</span><span>↵ to open</span></div>
      </div>
    </div>
  `,
  styles: [`
    .backdrop { position: fixed; inset: 0; background: rgba(10,10,12,.45); backdrop-filter: blur(6px); z-index: 80; display: grid; place-items: start center; padding: 12vh 16px 16px; }
    .panel { width: min(620px, 100%); background: var(--surface); border-radius: 24px; border: 1px solid var(--line); box-shadow: 0 30px 80px -20px rgba(0,0,0,.5); overflow: hidden; }
    .input-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
    .input-row input { border: 0; background: transparent; padding: 8px 0; font-size: 18px; font-weight: 600; }
    .input-row input:focus { background: transparent; }
    .k { font: 800 12px var(--display); background: var(--lime); color: var(--lime-ink); padding: 6px 8px; border-radius: 8px; }
    .esc { font: 700 12px var(--body); border: 1px solid var(--line); background: var(--surface-2); color: var(--muted); border-radius: 8px; padding: 6px 8px; cursor: pointer; }
    .results { list-style: none; margin: 0; padding: 8px; max-height: 50vh; overflow-y: auto; }
    .results li { display: grid; grid-template-columns: 36px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; cursor: pointer; }
    .results li.on { background: var(--surface-2); }
    .results li.empty { display: block; color: var(--muted); cursor: default; }
    .av { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; font: 800 13px var(--display); color: #111; }
    .av.icon { background: var(--surface-2); color: var(--ink); font-size: 16px; }
    .t { font-weight: 700; }
    .h { font-size: 13px; color: var(--muted); }
    .foot { display: flex; gap: 16px; padding: 10px 18px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); font-weight: 600; }
  `],
})
export class CommandPaletteComponent {
  readonly close = output<void>();
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

  protected readonly q = signal('');
  protected readonly active = signal(0);
  private readonly students = signal<Student[]>([]);

  private readonly pages: Item[] = [
    { id: 'p-dash', title: 'Overview', hint: 'Page', icon: '◐', run: () => this.go('/dashboard') },
    { id: 'p-stu', title: 'Students', hint: 'Page', icon: '◉', run: () => this.go('/students') },
    { id: 'p-pay', title: 'Payments ledger', hint: 'Page', icon: '₹', run: () => this.go('/payments') },
    { id: 'p-od', title: 'Overdue follow-ups', hint: 'Page', icon: '!', run: () => this.go('/overdue') },
    { id: 'a-theme', title: 'Toggle dark mode', hint: 'Action', icon: '☾', run: () => { this.theme.toggle(); this.close.emit(); } },
  ];

  protected readonly items = computed<Item[]>(() => {
    const q = this.q().toLowerCase().trim();
    const people = this.students()
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q) || s.className.toLowerCase().includes(q))
      .slice(0, 6)
      .map<Item>((s) => ({ id: 's' + s.id, title: s.name, hint: `${s.className} · ${s.admissionNo}`, color: avatarColor(s.name), icon: initials(s.name),
        run: () => this.go('/students/' + s.id) }));
    const pages = this.pages.filter((p) => !q || p.title.toLowerCase().includes(q));
    return [...people, ...pages];
  });

  constructor() {
    inject(ApiService).students().subscribe((list) => this.students.set(list));
    queueMicrotask(() => {
      popIn(this.panel().nativeElement);
      this.box().nativeElement.focus();
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close.emit(); }

  onKey(e: KeyboardEvent): void {
    const n = this.items().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.active.set((this.active() + 1) % Math.max(n, 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.active.set((this.active() - 1 + n) % Math.max(n, 1)); }
    if (e.key === 'Enter') { const it = this.items()[this.active()]; if (it) this.pick(it); }
  }

  pick(it: Item): void { it.run(); }

  private go(url: string): void {
    this.router.navigateByUrl(url);
    this.close.emit();
  }
}

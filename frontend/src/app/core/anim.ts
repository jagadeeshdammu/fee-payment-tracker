import { gsap } from 'gsap';

/** Small GSAP helpers shared by pages. All of them respect "reduce motion". */
export const reduceMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Cards rise and fade in one after another. */
export function staggerIn(targets: gsap.TweenTarget, delay = 0): void {
  if (reduceMotion()) return;
  gsap.from(targets, { y: 28, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, delay, clearProps: 'transform,opacity' });
}

/** Animates the text of an element from 0 to value, formatted by fmt. */
export function countUp(el: HTMLElement, value: number, fmt: (n: number) => string, duration = 1.4): void {
  if (reduceMotion()) { el.textContent = fmt(value); return; }
  const state = { v: 0 };
  gsap.to(state, {
    v: value, duration, ease: 'power2.out',
    onUpdate: () => { el.textContent = fmt(state.v); },
  });
}

/** Draws an SVG stroke from start to end. */
export function drawPath(path: SVGPathElement | SVGCircleElement, duration = 1.4, delay = 0.2): void {
  const len = 'getTotalLength' in path ? path.getTotalLength() : 0;
  if (!len || reduceMotion()) return;
  gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, {
    strokeDashoffset: 0, duration, delay, ease: 'power2.inOut',
    onComplete: () => { path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; },
  });
}

/** Slide-in panel from the right (drawer). */
export function drawerIn(panel: Element, backdrop: Element): void {
  if (reduceMotion()) return;
  gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.25 });
  gsap.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.55, ease: 'expo.out' });
}

/** Springy pop for modals. */
export function popIn(el: Element): void {
  if (reduceMotion()) return;
  gsap.fromTo(el, { scale: 0.92, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' });
}

/** Magnetic hover: element leans toward the cursor. */
export function magnetic(el: HTMLElement, strength = 0.25): () => void {
  if (reduceMotion()) return () => {};
  const move = (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: 0.4, ease: 'power3.out' });
  };
  const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  el.addEventListener('mousemove', move);
  el.addEventListener('mouseleave', leave);
  return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); };
}

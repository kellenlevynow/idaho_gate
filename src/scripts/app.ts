/** Site-wide client behavior. Small on purpose: no framework. */
import { captureAttribution } from './attribution';
import { initTracking } from './tracking';

document.documentElement.classList.add('js');
captureAttribution();
initTracking();

/* ---------- reveal on scroll ---------- */
const revealEls = document.querySelectorAll<HTMLElement>('[data-reveal]');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

/* ---------- header ---------- */
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Desktop mega menu: click to toggle, Escape to close, closes on outside click.
  const triggers = header.querySelectorAll<HTMLButtonElement>('[data-menu-trigger]');
  const closeAll = (except?: HTMLButtonElement) => {
    triggers.forEach((t) => {
      if (t === except) return;
      t.setAttribute('aria-expanded', 'false');
      document.getElementById(t.getAttribute('aria-controls')!)?.setAttribute('hidden', '');
    });
    header.classList.toggle('menu-open', !!except);
  };
  triggers.forEach((t) => {
    const panel = document.getElementById(t.getAttribute('aria-controls')!);
    if (!panel) return;
    const open = () => {
      closeAll(t);
      t.setAttribute('aria-expanded', 'true');
      panel.removeAttribute('hidden');
    };
    t.addEventListener('click', () => (t.getAttribute('aria-expanded') === 'true' ? closeAll() : open()));
    // Hover intent for pointer users.
    let timer: number | undefined;
    const item = t.parentElement!;
    item.addEventListener('pointerenter', (e) => {
      if ((e as PointerEvent).pointerType !== 'mouse') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(open, 80);
    });
    item.addEventListener('pointerleave', (e) => {
      if ((e as PointerEvent).pointerType !== 'mouse') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (t.getAttribute('aria-expanded') === 'true') closeAll();
      }, 180);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openTrigger = header.querySelector<HTMLButtonElement>('[data-menu-trigger][aria-expanded="true"]');
      closeAll();
      openTrigger?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target as Node)) closeAll();
  });

  // Mobile drawer.
  const toggle = header.querySelector<HTMLButtonElement>('[data-drawer-toggle]');
  const drawer = document.getElementById('mobile-drawer');
  if (toggle && drawer) {
    const setOpen = (open: boolean) => {
      toggle.setAttribute('aria-expanded', String(open));
      drawer.toggleAttribute('hidden', !open);
      document.documentElement.classList.toggle('drawer-open', open);
      if (open) drawer.querySelector<HTMLElement>('a, button, summary')?.focus();
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }
}

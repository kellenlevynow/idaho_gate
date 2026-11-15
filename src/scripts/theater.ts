/**
 * Drives the homepage gate theater from scroll position.
 * Captions, rail and stills work without WebGL. The 3D scene is loaded
 * lazily and takes over from the stills once its first frame is drawn.
 */
import { track } from './tracking';
import type { HeroHandle } from '@/three/hero';

const STAGES = [
  [0, 0.105], [0.105, 0.3], [0.3, 0.56], [0.56, 0.745], [0.745, 0.86], [0.86, 1.001],
] as const;

const root = document.querySelector<HTMLElement>('[data-theater]');
const live = document.documentElement.classList.contains('theater-live');

if (root && live) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-gate-canvas]')!;
  const overlay = root.querySelector<HTMLElement>('[data-gate-overlay]')!;
  const stages = [...root.querySelectorAll<HTMLElement>('[data-stage]')];
  const rail = [...root.querySelectorAll<HTMLElement>('[data-rail]')];
  const flash = root.querySelector<HTMLElement>('[data-flash]')!;
  const finishName = root.querySelector<HTMLElement>('[data-finish-name]');
  const chips = [...root.querySelectorAll<HTMLElement>('[data-finish-chip]')];
  let handle: HeroHandle | null = null;
  let seen = -1;

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const ramp = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));

  const progress = () => {
    const r = root.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return total > 0 ? clamp01(-r.top / total) : 0;
  };

  const update = () => {
    const p = progress();
    handle?.setProgress(p);
    let active = 0;
    stages.forEach((el, i) => {
      const [from, to] = STAGES[i];
      const fade = 0.022;
      const o = i === 0 ? 1 - ramp(0.06, 0.1, p) : Math.min(ramp(from + 0.004, from + fade + 0.01, p), i === stages.length - 1 ? 1 : 1 - ramp(to - fade, to - 0.002, p));
      el.classList.add('is-set');
      el.style.setProperty('--o', o.toFixed(3));
      el.style.setProperty('--v', o > 0.01 ? 'visible' : 'hidden');
      if (p >= from && p < to) active = i;
    });
    rail.forEach((el, i) => el.classList.toggle('is-on', i === active));
    flash.style.opacity = String(ramp(0.955, 1, p) * 0.96);
    if (active > seen) {
      seen = active;
      if (active > 0) track('hero_stage', { stage: active });
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  const setFinish = (name: string) => {
    if (finishName) finishName.textContent = name;
    chips.forEach((c) => c.classList.toggle('is-on', c.dataset.finishChip === name));
  };
  setFinish(finishName?.textContent || '');

  const boot = async () => {
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
      const conn = (navigator as any).connection;
      if (conn?.saveData) return;
      const { initHero } = await import('@/three/hero');
      handle = initHero({
        canvas, overlay,
        preserve: new URLSearchParams(location.search).has('capture'),
        onFinish: setFinish,
        onReady: () => root.classList.add('is-3d'),
      });
      handle.setProgress(progress(), true);
      window.__gate = handle;
    } catch (err) {
      // The stills stay in place. The page keeps working.
      console.warn('3D gate unavailable, showing rendered stills instead.', err);
    }
  };
  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(boot, { timeout: 1200 });
  else setTimeout(boot, 300);
}

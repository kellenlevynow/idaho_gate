/** Wires the gate studio controls to the 3D viewer and the live drawings. */
import { track } from './tracking';
import { gateElevation, gatePlan, describeSpec } from '@/lib/drawing';
import { finishes } from '@/three/finish-data';
import type { GateSpec } from '@/lib/gate-model';
import type { StudioHandle, StudioState } from '@/three/studio';

const root = document.querySelector<HTMLElement>('[data-studio]');
if (root) {
  const form = root.querySelector<HTMLFormElement>('[data-studio-form]')!;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-studio-canvas]')!;
  const fallback = root.querySelector<HTMLElement>('[data-studio-fallback]')!;
  const loading = root.querySelector<HTMLElement>('[data-studio-loading]')!;
  const summary = root.querySelector<HTMLElement>('[data-studio-summary]')!;
  const quote = root.querySelector<HTMLAnchorElement>('[data-studio-quote]')!;
  const svgElev = root.querySelector<SVGElement>('[data-svg="elev"]')!;
  const svgPlan = root.querySelector<SVGElement>('[data-svg="plan"]')!;
  let handle: StudioHandle | null = null;
  const toggles = { exploded: false, drawing: false, open: false };
  let view = '3d';

  const read = (): { spec: GateSpec; finish: string } => {
    const d = new FormData(form);
    const top = String(d.get('top')) as GateSpec['top'];
    const operation = String(d.get('operation')) as GateSpec['operation'];
    const infill = String(d.get('infill')) as GateSpec['infill'];
    const width = Number(d.get('width'));
    return {
      spec: {
        operation, infill, top,
        width, height: Number(d.get('height')),
        archRise: top === 'arch' ? Math.min(1.5, 0.5 + width * 0.045) : 0,
        posts: String(d.get('posts')) as GateSpec['posts'],
        automation: d.get('automation') === 'yes',
      },
      finish: String(d.get('finish')),
    };
  };

  const typeFor = (spec: GateSpec) => (spec.operation === 'slide' ? 'sliding' : spec.infill === 'ranch' ? 'ranch' : spec.width <= 6 ? 'pedestrian' : 'driveway-swing');

  const setSvg = (el: SVGElement, d: { viewBox: string; body: string; description: string }) => {
    el.setAttribute('viewBox', d.viewBox);
    el.setAttribute('aria-label', d.description);
    el.innerHTML = d.body;
  };

  const apply = (changed?: string) => {
    const { spec, finish } = read();
    form.querySelector<HTMLOutputElement>('[data-out="width"]')!.textContent = `${spec.width} ft`;
    form.querySelector<HTMLOutputElement>('[data-out="height"]')!.textContent = `${spec.height} ft`;
    const finishName = finishes.find((f) => f.key === finish)?.name || '';
    const text = `${describeSpec(spec)}, ${finishName.toLowerCase()}`;
    summary.textContent = text.charAt(0).toUpperCase() + text.slice(1) + '.';
    quote.href = `/quote/?studio=${encodeURIComponent(text)}&type=${typeFor(spec)}`;
    handle?.update({ spec, finish, ...toggles });
    if (view === 'elev') setSvg(svgElev, gateElevation(spec, { theme: 'dark', title: 'Studio configuration', dwg: 'IG-STUDIO' }));
    if (view === 'plan') setSvg(svgPlan, gatePlan(spec, { theme: 'dark' }));
    if (changed) track('studio_configure', { option: changed, value: String(new FormData(form).get(changed) ?? '') });
  };

  form.addEventListener('input', (e) => apply((e.target as HTMLInputElement).name));

  root.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.toggle as keyof typeof toggles;
      toggles[key] = !toggles[key];
      btn.setAttribute('aria-pressed', String(toggles[key]));
      handle?.update({ ...toggles });
      track('studio_configure', { option: key, value: String(toggles[key]) });
    });
  });
  root.querySelector('[data-reset]')?.addEventListener('click', () => handle?.resetView());

  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const tools = root.querySelector<HTMLElement>('[data-tools]')!;
  const select = (v: string) => {
    view = v;
    tabs.forEach((t) => {
      const on = t.dataset.view === v;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
    });
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== v));
    tools.hidden = v !== '3d';
    apply();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.view!));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      select(next.dataset.view!);
    });
  });

  apply();

  const start3d = async () => {
    const { initStudio } = await import('@/three/studio');
    const { spec, finish } = read();
    const state: StudioState = { spec, finish, ...toggles };
    handle = initStudio(canvas, state, {
      preserve: new URLSearchParams(location.search).has('capture'),
      onReady: () => (fallback.hidden = true),
    });
    (window as any).__studio = handle;
  };

  (async () => {
    try {
      const params = new URLSearchParams(location.search);
      const probe = document.createElement('canvas');
      const gl = (probe.getContext('webgl2') || probe.getContext('webgl')) as WebGLRenderingContext | null;
      if (!gl) throw new Error('no webgl');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu);
      if (software && !params.has('capture') && !params.has('force3d')) {
        // No GPU acceleration: start on the drawing and let the visitor opt in to 3D.
        loading.innerHTML = '3D runs slowly without graphics acceleration. <button type="button" class="underline" data-load-3d>Load the 3D model anyway</button>';
        loading.querySelector('[data-load-3d]')!.addEventListener('click', async () => {
          loading.textContent = 'Loading 3D model';
          await start3d();
          select('3d');
        });
        select('elev');
        return;
      }
      await start3d();
    } catch {
      // No WebGL: the drawings still work, so switch to the elevation view.
      loading.textContent = '3D is not available on this device. Showing the elevation drawing instead.';
      select('elev');
    }
  })();
}

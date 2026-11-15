/**
 * Gate studio: an orbitable 3D viewer for any GateSpec.
 * Renders on demand (no idle loop) and exposes renderStill() so the same
 * scene produces the concept renders used across the site.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildGateModel, type GateSpec } from '@/lib/gate-model';
import { GateObject, applyEnvironment, createMaterials, createRenderer, createUniforms, finishByKey, INK } from './stage';

export interface StudioState {
  spec: GateSpec;
  finish: string;
  exploded: boolean;
  open: boolean;
  drawing: boolean;
}

export interface StudioHandle {
  update(next: Partial<StudioState>): void;
  resetView(): void;
  renderStill(state: Partial<StudioState> & { yaw?: number; pitch?: number; zoom?: number }, w: number, h: number): string;
  dispose(): void;
}

export function initStudio(canvas: HTMLCanvasElement, initial: StudioState, opts: { preserve?: boolean; onReady?: () => void } = {}): StudioHandle {
  const renderer = createRenderer(canvas, { preserve: opts.preserve });
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 600);
  const uniforms = createUniforms();
  const mats = createMaterials(uniforms);
  applyEnvironment(renderer, scene, 0.75);

  /* floor: shadows only, over a soft pool of light, so the backdrop stays seamless */
  const floor = new THREE.Mesh(new THREE.CircleGeometry(120, 48), new THREE.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.012;
  floor.receiveShadow = true;
  scene.add(floor);
  const poolTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
    g.addColorStop(0, 'rgba(96,100,108,0.55)');
    g.addColorStop(0.5, 'rgba(70,73,80,0.2)');
    g.addColorStop(1, 'rgba(60,62,68,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(46, 48),
    new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.006;
  scene.add(pool);
  const gridMat = new THREE.LineBasicMaterial({ color: '#e9e6dc', transparent: true, opacity: 0.07, depthWrite: false });
  {
    const pts: number[] = [];
    const ext = 60, step = 4;
    for (let v = -ext; v <= ext; v += step) pts.push(-ext, 0.01, v, ext, 0.01, v, v, 0.01, -ext, v, 0.01, ext);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(g, gridMat));
  }

  const hemi = new THREE.HemisphereLight('#aab6d0', '#3a2f26', 0.9);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffe2c2', 2.3);
  key.position.set(-18, 24, 22);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -34, right: 34, top: 26, bottom: -26, near: 1, far: 110 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#ffb98a', 1.6);
  rim.position.set(20, 10, -24);
  scene.add(rim);
  const lampLights: THREE.PointLight[] = [];

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = THREE.MathUtils.degToRad(40);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(89);

  let state: StudioState = { ...initial, spec: { ...initial.spec } };
  let gate: GateObject | null = null;
  let explode = 0, openT = 0, draw = 0;
  let baseDist = 40;

  const frameGate = (yaw = -24, pitch = 9, zoom = 1) => {
    if (!gate) return;
    const b = gate.model.bounds;
    const cx = (b.minX + b.maxX) / 2;
    const cy = b.maxY * 0.46;
    const span = b.maxX - b.minX + 5;
    const aspect = camera.aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    baseDist = Math.max(span / 2 / (tan * aspect), (b.maxY + 4) / 2 / tan) * 1.08;
    const d = baseDist / zoom;
    const y = THREE.MathUtils.degToRad(yaw), p = THREE.MathUtils.degToRad(pitch);
    controls.target.set(cx, cy, 0);
    camera.position.set(cx + d * Math.sin(y) * Math.cos(p), cy + d * Math.sin(p), d * Math.cos(y) * Math.cos(p));
    controls.minDistance = baseDist * 0.35;
    controls.maxDistance = baseDist * 1.9;
    controls.update();
  };

  const rebuild = () => {
    gate?.dispose();
    lampLights.splice(0).forEach((l) => l.removeFromParent());
    const model = buildGateModel(state.spec);
    gate = new GateObject(model, mats);
    scene.add(gate.root);
    gate.setUndergroundVisible(explode > 0.02);
    gate.setExplode(explode);
    gate.setOpen(openT);
    for (const l of model.lamps) {
      const pl = new THREE.PointLight('#ffb469', 70, 26, 2);
      pl.position.set(l[0], l[1], l[2] + 0.5);
      scene.add(pl);
      lampLights.push(pl);
    }
  };

  const applyVisual = () => {
    uniforms.uDraw.value = draw;
    uniforms.uEnv.value = Math.max(draw, explode * 0.0);
    mats.line.opacity = Math.max(draw, explode * 0.35);
    mats.line.visible = mats.line.opacity > 0.01;
    gridMat.opacity = 0.07 + draw * 0.05;
    // footings sit below the floor: hide it while exploded so they read
    floor.visible = explode < 0.02 && draw < 0.5;
    (pool.material as THREE.MeshBasicMaterial).opacity = (1 - draw) * (1 - explode * 0.6);
    mats.setFinish(finishByKey(state.finish));
    lampLights.forEach((l) => (l.intensity = 70 * (1 - draw)));
    mats.setLampGlow(1.8 * (1 - draw) + 0.1);
  };

  /* on-demand rendering with short tweens */
  let raf = 0;
  let needs = true;
  const tick = () => {
    raf = 0;
    const tExplode = state.exploded ? 1 : 0;
    const tOpen = state.open ? 1 : 0;
    const tDraw = state.drawing ? 1 : 0;
    const step = (cur: number, target: number) => (Math.abs(target - cur) < 0.004 ? target : cur + (target - cur) * 0.14);
    const moving = explode !== tExplode || openT !== tOpen || draw !== tDraw;
    explode = step(explode, tExplode);
    openT = step(openT, tOpen);
    draw = step(draw, tDraw);
    if (gate && moving) {
      gate.setExplode(explode);
      gate.setOpen(openT);
      gate.setUndergroundVisible(explode > 0.02);
    }
    applyVisual();
    const damping = controls.update();
    renderer.render(scene, camera);
    if (moving || damping || needs) {
      needs = false;
      raf = requestAnimationFrame(tick);
    }
  };
  const request = () => {
    needs = true;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  controls.addEventListener('change', () => { if (!raf) raf = requestAnimationFrame(tick); });

  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    mats.setResolution(w, h);
    request();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  rebuild();
  resize();
  frameGate();
  request();
  opts.onReady?.();

  return {
    update(next) {
      const specChanged = next.spec && JSON.stringify(next.spec) !== JSON.stringify(state.spec);
      state = { ...state, ...next, spec: next.spec ? { ...next.spec } : state.spec };
      if (specChanged) {
        rebuild();
        frameGate();
      }
      request();
    },
    resetView() {
      frameGate();
      request();
    },
    renderStill(s, w, h) {
      state = { ...state, ...s, spec: s.spec ? { ...s.spec } : state.spec };
      explode = state.exploded ? 1 : 0;
      openT = state.open ? 1 : 0;
      draw = state.drawing ? 1 : 0;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      mats.setResolution(w, h);
      rebuild();
      frameGate(s.yaw ?? -24, s.pitch ?? 9, s.zoom ?? 1);
      applyVisual();
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      resize();
      return url;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      gate?.dispose();
      mats.dispose();
      renderer.dispose();
    },
  };
}

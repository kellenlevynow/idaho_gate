/**
 * Homepage gate theater. One scroll-driven 3D sequence:
 *   reveal -> drawing -> exploded view -> materials -> reassembly -> opening
 * Scroll progress (0..1) is the only clock, so every frame is repeatable
 * and the same code renders the fallback stills (scripts/render-stills.mjs).
 */
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildGateModel, ftIn } from '@/lib/gate-model';
import {
  GateObject, applyEnvironment, createMaterials, createRenderer, createUniforms, finishByKey,
  patchMaterial, EMBER, INK, type PartObject,
} from './stage';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Scroll ranges of the six stages. Captions and the rail read these too. */
export const STAGES = [
  { key: 'reveal', from: 0, to: 0.105 },
  { key: 'drawing', from: 0.105, to: 0.3 },
  { key: 'exploded', from: 0.3, to: 0.56 },
  { key: 'materials', from: 0.56, to: 0.745 },
  { key: 'reassembly', from: 0.745, to: 0.86 },
  { key: 'opening', from: 0.86, to: 1.001 },
] as const;

interface CamKey {
  p: number;
  target: [number, number, number];
  yaw: number;
  pitch: number;
  /** world width the frame should fit horizontally, or an explicit distance */
  fit?: number;
  dist?: number;
  fov: number;
  /** principal point shift as a fraction of the frame, leaves room for copy */
  off: [number, number];
  /** overrides for portrait screens */
  port?: Partial<Omit<CamKey, 'p' | 'port'>>;
}

const CAM: CamKey[] = [
  { p: 0, target: [0, 4.0, 0], yaw: -15, pitch: 3.2, fit: 44, fov: 30, off: [0.17, 0.02], port: { yaw: -40, fit: 17.5, target: [0, 4.6, 0], off: [0, 0.035] } },
  { p: 0.1, target: [0, 4.0, 0], yaw: -8, pitch: 3, fit: 40, fov: 30, off: [0.15, 0.02], port: { yaw: -30, fit: 17, target: [0, 4.6, 0], off: [0, 0.035] } },
  { p: 0.2, target: [0, 3.4, 0], yaw: 0, pitch: 0, fit: 40, fov: 12, off: [0.08, -0.07], port: { fit: 30.5, target: [0, 3.0, 0], off: [0, -0.1] } },
  { p: 0.3, target: [0, 3.4, 0], yaw: 0, pitch: 0, fit: 40, fov: 12, off: [0.08, -0.07], port: { fit: 30.5, target: [0, 3.0, 0], off: [0, -0.1] } },
  { p: 0.42, target: [0, 3.9, 0.4], yaw: 30, pitch: 13, fit: 54, fov: 24, off: [-0.01, -0.06], port: { yaw: 52, pitch: 20, fit: 27, target: [0, 3.2, 0.4], off: [0, -0.1] } },
  { p: 0.54, target: [0, 3.9, 0.4], yaw: 39, pitch: 14, fit: 54, fov: 24, off: [-0.01, -0.06], port: { yaw: 60, pitch: 21, fit: 27, target: [0, 3.2, 0.4], off: [0, -0.1] } },
  { p: 0.61, target: [3.5, 2.1, 1.7], yaw: 24, pitch: 7, fit: 11, fov: 28, off: [0.14, -0.04], port: { fit: 5.2, target: [3.6, 1.6, 2.0], off: [0, -0.12] } },
  { p: 0.735, target: [3.0, 2.3, 1.5], yaw: 12, pitch: 5, fit: 11.5, fov: 28, off: [0.14, -0.04], port: { fit: 5.6, target: [3.4, 1.7, 1.9], off: [0, -0.12] } },
  { p: 0.845, target: [0, 4.0, 0], yaw: 0, pitch: 3, fit: 38, fov: 30, off: [0.1, -0.03], port: { yaw: -22, fit: 17, target: [0, 4.6, 0], off: [0, -0.06] } },
  { p: 0.9, target: [0, 4.0, -6], yaw: 0, pitch: 3, dist: 40, fov: 30, off: [0, 0], port: { yaw: 0, dist: 62, target: [0, 4.4, -6], off: [0, 0] } },
  { p: 1, target: [0, 4.2, -40], yaw: 0, pitch: 2, dist: 47, fov: 30, off: [0, 0], port: { yaw: 0, dist: 49, target: [0, 4.4, -40], off: [0, 0] } },
];

const FINISH_SEQ: [number, number, string, string][] = [
  [0.585, 0.62, 'matte-black', 'weathering'],
  [0.64, 0.67, 'weathering', 'galvanized'],
  [0.69, 0.72, 'galvanized', 'dark-bronze'],
  [0.745, 0.79, 'dark-bronze', 'matte-black'],
];

/** Parts called out on small screens, where a full label set would crowd the model. */
const MOBILE_LABELS = ['L-frame', 'L-infill', 'R-ridge-front', 'R-hinges', 'post-L', 'operators'];

export interface HeroHandle {
  setProgress(p: number, immediate?: boolean): void;
  renderStill(p: number, w: number, h: number): string;
  dispose(): void;
}

export interface HeroOptions {
  canvas: HTMLCanvasElement;
  overlay: HTMLElement;
  onStage?(index: number): void;
  onFinish?(name: string): void;
  onReady?(): void;
  /** called when the device cannot hold frame rate even at the lowest quality */
  onTooSlow?(): void;
  preserve?: boolean;
}

export function initHero(opts: HeroOptions): HeroHandle {
  const { canvas, overlay } = opts;
  const isSmall = () => canvas.clientWidth < 760;

  const renderer = createRenderer(canvas, { preserve: opts.preserve });
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  const hazeColor = new THREE.Color('#5a5560');
  const inkColor = new THREE.Color(INK);
  scene.fog = new THREE.FogExp2(hazeColor.getHex(), 0.0042);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 900);

  const uniforms = createUniforms();
  const mats = createMaterials(uniforms);
  applyEnvironment(renderer, scene, 0.5);

  /* ---------------- gate ---------------- */
  const model = buildGateModel();
  const gate = new GateObject(model, mats);
  scene.add(gate.root);
  gate.setUndergroundVisible(false);
  const W = model.dims.width;

  /* ---------------- environment ---------------- */
  const env = new THREE.Group();
  scene.add(env);
  const envMat = <T extends THREE.Material>(m: T) => patchMaterial(m, uniforms, 'env');

  // sky dome, authored directly in display space
  const sunDir = new THREE.Vector3(0.34, 0.035, -1).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(700, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
      uniforms: {
        uMixInk: uniforms.uEnv, uInk: uniforms.uInk, uSun: { value: sunDir },
        uTop: { value: new THREE.Color('#121722') }, uMid: { value: new THREE.Color('#4a4a60') },
        uLow: { value: new THREE.Color('#b9775a') }, uHorizon: { value: new THREE.Color('#f2b279') },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        varying vec3 vDir; uniform vec3 uTop, uMid, uLow, uHorizon, uInk, uSun; uniform float uMixInk;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(uHorizon, uLow, smoothstep(0.0, 0.045, h));
          c = mix(c, uMid, smoothstep(0.025, 0.15, h));
          c = mix(c, uTop, smoothstep(0.1, 0.42, h));
          float s = max(dot(d, uSun), 0.0);
          c += vec3(1.0, 0.56, 0.26) * pow(s, 46.0) * 0.4 + vec3(1.0, 0.78, 0.5) * pow(s, 300.0) * 0.9;
          // thin cloud bands near the horizon
          float band = sin(d.y * 95.0 + d.x * 5.0) * 0.5 + 0.5;
          c = mix(c, c * 0.86 + vec3(0.07, 0.03, 0.02), band * smoothstep(0.26, 0.05, h) * 0.3);
          gl_FragColor = vec4(mix(c, uInk, uMixInk), 1.0);
        }`,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  // layered ridgelines
  const ridge = (seed: number, z: number, base: number, amp: number, color: string) => {
    let s = seed;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const shape = new THREE.Shape();
    const half = 520;
    shape.moveTo(-half, -20);
    const n = 90;
    for (let i = 0; i <= n; i++) {
      const x = -half + (2 * half * i) / n;
      const y = base + amp * (0.55 * Math.sin(i * 0.21 + seed) + 0.3 * Math.sin(i * 0.53 + seed * 2) + 0.4 * (rand() - 0.5)) + amp * 0.6;
      shape.lineTo(x, Math.max(2, y));
    }
    shape.lineTo(half, -20);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), envMat(new THREE.MeshBasicMaterial({ color, fog: false })));
    mesh.position.z = z;
    env.add(mesh);
  };
  ridge(3, -560, 40, 30, '#8f7f84');
  ridge(11, -430, 26, 22, '#625c68');
  ridge(23, -320, 13, 16, '#3a3a45');

  // ground and driveway, with procedural speckle so large planes do not read as flat color
  const speckle = (base: string, dots: [string, number][], size = 512, repeat = 60) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    let s = 5;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const [color, count] of dots) {
      ctx.fillStyle = color;
      for (let i = 0; i < count; i++) {
        const r = 0.6 + rand() * 2.2;
        ctx.globalAlpha = 0.25 + rand() * 0.5;
        ctx.fillRect(rand() * size, rand() * size, r, r);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.anisotropy = 8;
    return tex;
  };
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    envMat(new THREE.MeshStandardMaterial({
      map: speckle('#23251c', [['#34331f', 5000], ['#181a13', 5000], ['#3f3922', 1200]], 512, 110), roughness: 1, metalness: 0,
    })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  env.add(ground);
  const drive = new THREE.Mesh(
    new THREE.PlaneGeometry(14.5, 520),
    envMat(new THREE.MeshStandardMaterial({
      map: speckle('#262626', [['#3a3836', 7000], ['#191919', 6000], ['#4c4843', 900]], 512, 1), roughness: 0.82, metalness: 0,
    })),
  );
  (drive.material as THREE.MeshStandardMaterial).map!.repeat.set(3, 108);
  drive.rotation.x = -Math.PI / 2;
  drive.position.set(0, 0.02, -160);
  drive.receiveShadow = true;
  env.add(drive);
  for (const d of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 520),
      envMat(new THREE.MeshStandardMaterial({ map: speckle('#3a372f', [['#555043', 6000], ['#252320', 5000]], 256, 1), roughness: 1 })),
    );
    (shoulder.material as THREE.MeshStandardMaterial).map!.repeat.set(1, 200);
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.position.set(d * 7.9, 0.015, -160);
    shoulder.receiveShadow = true;
    env.add(shoulder);
  }

  // rail fence wings running off both pillars
  {
    const geos: THREE.BufferGeometry[] = [];
    const startX = W / 2 + 0.25 + 1.42 + 1.0;
    for (const d of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const x = d * (startX + 8 + i * 8);
        const post = new THREE.BoxGeometry(0.42, 4.4, 0.42);
        post.translate(x, 2.2, 0.1);
        geos.push(post);
        for (const y of [1.3, 2.5, 3.7]) {
          const rail = new THREE.BoxGeometry(8, 0.42, 0.14);
          rail.translate(x - d * 4, y, 0.1);
          geos.push(rail);
        }
      }
    }
    const fence = new THREE.Mesh(mergeGeometries(geos)!, envMat(new THREE.MeshStandardMaterial({ color: '#231f1b', roughness: 0.9 })));
    geos.forEach((g) => g.dispose());
    fence.castShadow = fence.receiveShadow = true;
    env.add(fence);
  }

  // conifer tree line, two stacked cones per tree, kept back so the sky reads
  {
    const cone = new THREE.ConeGeometry(1, 1, 7, 1, true);
    cone.translate(0, 0.5, 0);
    const count = isSmall() ? 160 : 320;
    const trees = new THREE.InstancedMesh(cone, envMat(new THREE.MeshLambertMaterial({ color: '#141a16' })), count * 2);
    let s = 91;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const side = rand() > 0.5 ? 1 : -1;
      const near = i < 10;
      const z = near ? -50 - rand() * 60 : -170 - rand() ** 1.2 * 260;
      const x = side * (near ? 46 + rand() * 60 : 14 + rand() * (90 + Math.abs(z) * 1.2));
      const h = near ? 24 + rand() * 12 : 26 + rand() * 26;
      const r = h * (0.13 + rand() * 0.04);
      m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(r, h * 0.62, r));
      trees.setMatrixAt(i * 2, m);
      m.compose(new THREE.Vector3(x, h * 0.36, z), q, new THREE.Vector3(r * 0.68, h * 0.64, r * 0.68));
      trees.setMatrixAt(i * 2 + 1, m);
    }
    trees.instanceMatrix.needsUpdate = true;
    env.add(trees);
  }

  /* ---------------- lights ---------------- */
  const hemi = new THREE.HemisphereLight('#8f9dc0', '#3a2c20', 0.5);
  scene.add(hemi);
  // Low sun behind the gate: long shadows reach toward the viewer.
  const key = new THREE.DirectionalLight('#ffbc84', 2.3);
  key.position.set(22, 15, -58);
  key.castShadow = true;
  const sm = isSmall() ? 1024 : 2048;
  key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -30, right: 30, top: 26, bottom: -26, near: 1, far: 140 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 2.5;
  scene.add(key);
  // Cool fill from the camera side so the face of the gate still reads.
  const rim = new THREE.DirectionalLight('#9fb4dc', 0.75);
  rim.position.set(-16, 12, 30);
  scene.add(rim);
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,176,96,0.75)');
    g.addColorStop(0.3, 'rgba(255,140,60,0.22)');
    g.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const lampLights = model.lamps.map((l) => {
    const pl = new THREE.PointLight('#ffae5e', 120, 34, 1.8);
    pl.position.set(l[0], l[1], l[2] + 0.6);
    scene.add(pl);
    const glow = new THREE.Sprite(glowMat);
    glow.position.set(l[0], l[1], l[2]);
    glow.scale.setScalar(3.4);
    scene.add(glow);
    return pl;
  });

  /* ---------------- studio grid and dimension lines ---------------- */
  const gridMat = new THREE.LineBasicMaterial({ color: '#e9e6dc', transparent: true, opacity: 0, depthWrite: false });
  {
    const pts: number[] = [];
    const ext = 60, step = 4;
    for (let v = -ext; v <= ext; v += step) pts.push(-ext, 0, v, ext, 0, v, v, 0, -ext, v, 0, ext);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(g, gridMat));
  }

  const dimMat = new LineMaterial({ color: new THREE.Color(EMBER).getHex(), linewidth: 1.15, transparent: true, opacity: 0, depthTest: false });
  const dimPts: number[] = [];
  const dimLabels: { text: string; pos: THREE.Vector3; el?: HTMLElement; cls?: string }[] = [];
  const seg = (a: number[], b: number[]) => dimPts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const hDim = (x0: number, x1: number, y: number, fromY: number, text: string) => {
    seg([x0, y, 0], [x1, y, 0]);
    for (const x of [x0, x1]) {
      seg([x, fromY, 0], [x, y + (y > fromY ? 0.35 : -0.35), 0]);
      seg([x - 0.22, y - 0.22, 0], [x + 0.22, y + 0.22, 0]);
    }
    dimLabels.push({ text, pos: new THREE.Vector3((x0 + x1) / 2, y, 0) });
  };
  const vDim = (y0: number, y1: number, x: number, fromX: number, text: string) => {
    seg([x, y0, 0], [x, y1, 0]);
    for (const y of [y0, y1]) {
      seg([fromX, y, 0], [x + (x > fromX ? 0.35 : -0.35), y, 0]);
      seg([x - 0.22, y - 0.22, 0], [x + 0.22, y + 0.22, 0]);
    }
    dimLabels.push({ text, pos: new THREE.Vector3(x, (y0 + y1) / 2, 0), cls: 'is-vertical' });
  };
  const stileTop = model.dims.height + model.dims.clearance;
  const peak = model.dims.peak + model.dims.clearance;
  hDim(-W / 2, W / 2, -1.5, 0, `Clear opening ${ftIn(W)}`);
  hDim(-W / 2, 0, peak + 1.5, peak, `Leaf ${ftIn(W / 2)}`);
  hDim(0, W / 2, peak + 1.5, peak, `Leaf ${ftIn(W / 2)}`);
  vDim(0, stileTop, -(W / 2 + 4.1), -(W / 2 + 2.9), `${ftIn(stileTop)} at stile`);
  vDim(0, peak, W / 2 + 4.1, 0, `${ftIn(peak)} at crown`);
  seg([-(W / 2 + 6), 0, 0], [W / 2 + 6, 0, 0]);
  dimLabels.push({ text: 'Finished grade', pos: new THREE.Vector3(-(W / 2 + 5.6), -0.5, 0), cls: 'is-note' });
  dimLabels.push({ text: 'Footing below frost depth', pos: new THREE.Vector3(-(W / 2 + 0.25), -3.0, 0), cls: 'is-note is-right' });
  dimLabels.push({ text: 'Concept 01 · not for construction', pos: new THREE.Vector3(W / 2 + 4.6, -3.0, 0), cls: 'is-note' });
  const dimGeo = new LineSegmentsGeometry();
  dimGeo.setPositions(dimPts);
  const dimLines = new LineSegments2(dimGeo, dimMat);
  dimLines.renderOrder = 3;
  dimLines.frustumCulled = false;
  scene.add(dimLines);

  /* ---------------- HTML callouts ---------------- */
  const svgNS = 'http://www.w3.org/2000/svg';
  const leaderSvg = document.createElementNS(svgNS, 'svg');
  leaderSvg.setAttribute('class', 'theater-leaders');
  leaderSvg.setAttribute('aria-hidden', 'true');
  overlay.appendChild(leaderSvg);
  const dimLayer = document.createElement('div');
  dimLayer.className = 'theater-dims';
  dimLayer.setAttribute('aria-hidden', 'true');
  overlay.appendChild(dimLayer);
  for (const d of dimLabels) {
    const el = document.createElement('span');
    el.className = `dim-label ${d.cls || ''}`;
    el.textContent = d.text;
    dimLayer.appendChild(el);
    d.el = el;
  }
  const calloutLayer = document.createElement('div');
  calloutLayer.className = 'theater-callouts';
  calloutLayer.setAttribute('aria-hidden', 'true');
  overlay.appendChild(calloutLayer);

  interface Callout { po: PartObject; el: HTMLElement; line: SVGPolylineElement; dot: SVGCircleElement; n: number; sx: number; sy: number; y: number }
  const callouts: Callout[] = [];
  gate.parts.filter((p) => p.part.showLabel).forEach((po, i) => {
    const el = document.createElement('div');
    el.className = `callout is-${po.part.labelSide}`;
    el.dataset.part = po.part.id;
    el.innerHTML = `<span class="callout-n">${String(i + 1).padStart(2, '0')}</span><span class="callout-t">${po.part.label}</span><span class="callout-d">${po.part.note}</span>`;
    calloutLayer.appendChild(el);
    const line = document.createElementNS(svgNS, 'polyline');
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('r', '3');
    leaderSvg.append(line, dot);
    callouts.push({ po, el, line, dot, n: i + 1, sx: 0, sy: 0, y: 0 });
  });

  // small screens: numbered markers on the model, legend in the caption
  const legend = overlay.closest('[data-theater]')?.querySelector<HTMLElement>('[data-callout-legend]');
  if (legend) {
    legend.innerHTML = callouts
      .filter((c) => MOBILE_LABELS.includes(c.po.part.id))
      .map((c) => `<li><span class="legend-n">${String(c.n).padStart(2, '0')}</span> ${c.po.part.label}</li>`)
      .join('');
  }

  /* ---------------- sizing ---------------- */
  let width = 1, height = 1, dpr = 1;
  let forcedSize: [number, number] | null = null;
  const resize = () => {
    width = forcedSize ? forcedSize[0] : canvas.clientWidth || 1;
    height = forcedSize ? forcedSize[1] : canvas.clientHeight || 1;
    dpr = forcedSize ? 1 : Math.min(window.devicePixelRatio || 1, width < 760 ? 1.6 : 2) * quality;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    mats.setResolution(width, height);
    dimMat.resolution.set(width, height);
    leaderSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    dirty = true;
  };
  let quality = 1;
  let dirty = true;

  /* ---------------- timeline ---------------- */
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const pick = <K extends keyof Omit<CamKey, 'p' | 'port'>>(k: CamKey, key: K, portrait: number): any => {
    const base = k[key] as any;
    const alt = k.port?.[key] as any;
    if (alt === undefined || portrait === 0) return base;
    if (Array.isArray(base)) return base.map((v: number, i: number) => lerp(v, alt[i], portrait));
    if (base === undefined) return alt;
    return lerp(base, alt, portrait);
  };

  const applyCamera = (p: number, time: number) => {
    const aspect = width / height;
    const portrait = 1 - smooth(0.85, 1.25, aspect);
    let i = 0;
    while (i < CAM.length - 2 && p > CAM[i + 1].p) i++;
    const a = CAM[i], b = CAM[i + 1];
    const t = smooth(a.p, b.p, p);
    const fov = lerp(pick(a, 'fov', portrait), pick(b, 'fov', portrait), t);
    const yaw = THREE.MathUtils.degToRad(lerp(pick(a, 'yaw', portrait), pick(b, 'yaw', portrait), t));
    const pitch = THREE.MathUtils.degToRad(lerp(pick(a, 'pitch', portrait), pick(b, 'pitch', portrait), t));
    const ta = pick(a, 'target', portrait), tb = pick(b, 'target', portrait);
    camTarget.set(lerp(ta[0], tb[0], t), lerp(ta[1], tb[1], t), lerp(ta[2], tb[2], t));
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const distOf = (k: CamKey, f: number) => {
      const d = pick(k, 'dist', portrait);
      const fit = pick(k, 'fit', portrait);
      if (k.dist !== undefined && (k.port?.dist !== undefined || portrait === 0)) return d as number;
      return (fit as number) / 2 / (Math.tan(THREE.MathUtils.degToRad(f / 2)) * aspect);
    };
    const dist = lerp(distOf(a, pick(a, 'fov', portrait)), distOf(b, pick(b, 'fov', portrait)), t);
    void tanHalf;
    // slow idle drift during the reveal keeps the first screen alive
    const drift = (1 - smooth(0.04, 0.12, p)) * (reduceIdle ? 0 : 1);
    const yawD = yaw + Math.sin(time * 0.00022) * 0.035 * drift;
    camPos.set(
      camTarget.x + dist * Math.sin(yawD) * Math.cos(pitch),
      Math.max(1.2, camTarget.y + dist * Math.sin(pitch)),
      camTarget.z + dist * Math.cos(yawD) * Math.cos(pitch),
    );
    camera.fov = fov;
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
    const oa = pick(a, 'off', portrait), ob = pick(b, 'off', portrait);
    const ox = lerp(oa[0], ob[0], t), oy = lerp(oa[1], ob[1], t);
    if (Math.abs(ox) > 0.0005 || Math.abs(oy) > 0.0005) camera.setViewOffset(width, height, -ox * width, -oy * height, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  };

  let lastStage = -1;
  let lastFinish = '';
  let reduceIdle = false;

  const apply = (p: number, time: number) => {
    const draw = smooth(0.11, 0.185, p) * (1 - smooth(0.3, 0.37, p));
    const envFade = smooth(0.1, 0.175, p) * (1 - smooth(0.765, 0.845, p));
    const explode = smooth(0.305, 0.42, p) * (1 - smooth(0.75, 0.835, p));
    const open = smooth(0.865, 0.985, p);
    const closeUp = smooth(0.55, 0.6, p) * (1 - smooth(0.735, 0.78, p));

    uniforms.uDraw.value = draw;
    uniforms.uEnv.value = envFade;
    env.visible = envFade < 0.995;
    gate.setUndergroundVisible(envFade > 0.99);
    (scene.fog as THREE.FogExp2).color.copy(hazeColor).lerp(inkColor, envFade);
    (scene.fog as THREE.FogExp2).density = 0.0042 * (1 - envFade);
    gridMat.opacity = envFade * 0.085 * (1 - closeUp * 0.7);

    // line work: full in the drawing, light in the exploded view, off in close-ups
    const explodedLines = smooth(0.3, 0.38, p) * (1 - smooth(0.74, 0.8, p)) * 0.5 * (1 - closeUp);
    mats.line.opacity = Math.max(draw, explodedLines);
    mats.line.visible = mats.line.opacity > 0.01;
    dimMat.opacity = smooth(0.165, 0.2, p) * (1 - smooth(0.285, 0.31, p));
    dimLines.visible = dimMat.opacity > 0.01;

    gate.setExplode(explode);
    gate.setOpen(open);

    // lighting follows the mood of each stage
    const studio = envFade;
    hemi.intensity = lerp(0.5, 1.5, studio) * (1 - closeUp * 0.45);
    key.intensity = lerp(2.3, 0.9, studio);
    rim.intensity = lerp(0.75, 2.6, studio) * (1 - closeUp * 0.5);
    const lampK = lerp(1, 0.12, studio) + open * 0.5;
    lampLights.forEach((l) => (l.intensity = 120 * lampK));
    glowMat.opacity = lampK * (1 - draw);
    mats.setLampGlow(2.4 * lampK + 0.15);
    scene.environmentIntensity = lerp(0.42, 1.5, studio) * (1 - closeUp * 0.45);

    // finishes
    let fa = 'matte-black', fb = 'matte-black', ft = 0;
    for (const [a, b, from, to] of FINISH_SEQ) {
      if (p >= a) {
        fa = from; fb = to; ft = smooth(a, b, p);
      }
    }
    mats.setFinish(finishByKey(fa), finishByKey(fb), ft);
    const current = ft > 0.5 ? fb : fa;
    if (current !== lastFinish) {
      lastFinish = current;
      opts.onFinish?.(finishByKey(current).name);
    }

    applyCamera(p, time);

    /* callouts */
    const calloutAlpha = smooth(0.395, 0.43, p) * (1 - smooth(0.53, 0.56, p));
    calloutLayer.style.opacity = String(calloutAlpha);
    leaderSvg.style.opacity = String(calloutAlpha * 0.9);
    const showCallouts = calloutAlpha > 0.01;
    calloutLayer.style.visibility = showCallouts ? 'visible' : 'hidden';
    leaderSvg.style.visibility = showCallouts ? 'visible' : 'hidden';
    if (showCallouts) layoutCallouts();

    const dimAlpha = dimMat.opacity;
    dimLayer.style.opacity = String(dimAlpha);
    dimLayer.style.visibility = dimAlpha > 0.01 ? 'visible' : 'hidden';
    if (dimAlpha > 0.01) {
      for (const d of dimLabels) {
        tmp.copy(d.pos).project(camera);
        d.el!.style.transform = `translate(${((tmp.x + 1) / 2) * width}px, ${((1 - tmp.y) / 2) * height}px)`;
      }
    }

    const stage = STAGES.findIndex((s) => p >= s.from && p < s.to);
    if (stage !== lastStage) {
      lastStage = stage;
      opts.onStage?.(stage);
    }
  };

  const layoutCallouts = () => {
    const small = isSmall();
    for (const c of callouts) {
      gate.worldAnchor(c.po, tmp).project(camera);
      c.sx = ((tmp.x + 1) / 2) * width;
      c.sy = ((1 - tmp.y) / 2) * height;
      const hidden = small && !MOBILE_LABELS.includes(c.po.part.id);
      c.el.style.display = hidden ? 'none' : '';
      c.line.style.display = c.dot.style.display = hidden ? 'none' : '';
    }
    for (const side of ['left', 'right'] as const) {
      const col = callouts.filter((c) => c.po.part.labelSide === side && c.el.style.display !== 'none').sort((a, b) => a.sy - b.sy);
      if (!col.length) continue;
      if (small) {
        // numbered markers sit on the part itself
        for (const c of col) {
          c.el.style.transform = `translate(${c.sx}px, ${c.sy}px)`;
          c.line.setAttribute('points', '');
          c.dot.setAttribute('cx', String(c.sx));
          c.dot.setAttribute('cy', String(c.sy));
        }
        continue;
      }
      const top = height * (side === 'left' ? 0.16 : 0.22), bottom = height * (side === 'left' ? 0.58 : 0.82);
      const gap = Math.min(66, (bottom - top) / Math.max(1, col.length - 1));
      col.forEach((c, i) => (c.y = top + i * gap));
      const edge = Math.max(24, width * 0.035);
      const labelW = Math.min(250, width * 0.2);
      for (const c of col) {
        const lx = side === 'left' ? edge : width - edge;
        c.el.style.transform = `translate(${lx}px, ${c.y}px)`;
        const inner = side === 'left' ? lx + labelW + 10 : lx - labelW - 10;
        const elbow = side === 'left' ? inner + 26 : inner - 26;
        c.line.setAttribute('points', `${inner},${c.y} ${elbow},${c.y} ${c.sx},${c.sy}`);
        c.dot.setAttribute('cx', String(c.sx));
        c.dot.setAttribute('cy', String(c.sy));
      }
    }
  };

  /* ---------------- loop ---------------- */
  let target = 0, current = 0;
  let running = false;
  let raf = 0;
  let last = performance.now();
  let slowFrames = 0;
  let ready = false;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const prev = current;
    current += (target - current) * (1 - Math.exp(-dt * 8));
    if (Math.abs(target - current) < 0.00005) current = target;
    const moving = prev !== current;
    const idle = current < 0.12 && !reduceIdle;
    if (!moving && !idle && !dirty) return;
    dirty = false;
    apply(current, now);
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      opts.onReady?.();
    }
    // adaptive quality: drop resolution if the device cannot hold frame rate
    if (moving) {
      slowFrames = dt > 0.034 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 24 && quality > 0.55) {
        quality *= 0.8;
        slowFrames = 0;
        resize();
      } else if (slowFrames > 40 && quality <= 0.55) {
        slowFrames = 0;
        opts.onTooSlow?.();
      }
    }
  };
  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '10% 0px' });
  io.observe(canvas);
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    setProgress(p, immediate) {
      target = clamp01(p);
      if (immediate) {
        current = target;
        dirty = true;
      }
    },
    renderStill(p, w, h) {
      reduceIdle = true;
      forcedSize = [w, h];
      resize();
      // layout callouts against the still's size
      apply(clamp01(p), 0);
      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/png');
      forcedSize = null;
      reduceIdle = false;
      resize();
      return url;
    },
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      gate.dispose();
      mats.dispose();
      renderer.dispose();
    },
  };
}

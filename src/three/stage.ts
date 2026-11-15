/**
 * Shared 3D building blocks: materials, finishes, the "drawing" shader
 * patch and the GateObject that turns a GateModel into meshes.
 * Used by the homepage theater (hero.ts) and the gate studio (studio.ts).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { GateModel, Member, MaterialKey, Part, Vec3 } from '@/lib/gate-model';

export const INK = '#131415';
export const SOAPSTONE = '#e9e6dc';
export const EMBER = '#e0703a';

/* ------------------------------------------------------------------ */
/* Finishes                                                            */
/* ------------------------------------------------------------------ */

export interface Finish {
  key: string;
  name: string;
  note: string;
  color: string;
  metalness: number;
  roughness: number;
  /** color of the standoff layer behind feature panels */
  back: string;
  texture: 'plain' | 'patina' | 'spangle';
  swatch: string;
}

export const finishes: Finish[] = [
  {
    key: 'matte-black', name: 'Matte black powder coat', note: 'The standard. Zinc-rich primer under a satin black top coat.',
    color: '#151617', metalness: 0.35, roughness: 0.56, back: '#6b4a34', texture: 'plain', swatch: '#1b1c1e',
  },
  {
    key: 'dark-bronze', name: 'Dark bronze powder coat', note: 'Warmer than black. Sits well against timber and stone.',
    color: '#34271e', metalness: 0.5, roughness: 0.5, back: '#7a5a3e', texture: 'plain', swatch: '#3b2c21',
  },
  {
    key: 'weathering', name: 'Weathering steel patina', note: 'Left to form its own oxide skin. No coating to maintain.',
    color: '#9a5530', metalness: 0.12, roughness: 0.94, back: '#5c321d', texture: 'patina', swatch: '#8c4a28',
  },
  {
    key: 'galvanized', name: 'Hot-dip galvanized', note: 'Zinc inside and out. The long-life choice for hard service.',
    color: '#8d9399', metalness: 0.8, roughness: 0.5, back: '#5f656b', texture: 'spangle', swatch: '#9ba1a7',
  },
  {
    key: 'graphite', name: 'Graphite metallic powder coat', note: 'A fine metallic that reads as machined steel.',
    color: '#3b3f45', metalness: 0.72, roughness: 0.4, back: '#1f2124', texture: 'plain', swatch: '#40444a',
  },
];
export const finishByKey = (key: string) => finishes.find((f) => f.key === key) || finishes[0];

function noiseTexture(kind: 'plain' | 'patina' | 'spangle') {
  const size = kind === 'plain' ? 4 : 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  if (kind !== 'plain') {
    let s = kind === 'patina' ? 11 : 29;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    if (kind === 'patina') {
      // mottled oxide: soft dark blooms and a few bright streaks
      for (let i = 0; i < 900; i++) {
        const x = rand() * size, y = rand() * size, r = 4 + rand() * 26;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const dark = rand() > 0.35;
        g.addColorStop(0, dark ? `rgba(70,32,14,${0.1 + rand() * 0.22})` : `rgba(255,190,130,${0.05 + rand() * 0.12})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(50,22,10,${0.05 + rand() * 0.1})`;
        ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 20 + rand() * 90);
      }
    } else {
      // zinc spangle: angular crystalline patches
      for (let i = 0; i < 520; i++) {
        const x = rand() * size, y = rand() * size, r = 6 + rand() * 18;
        const v = 150 + Math.floor(rand() * 105);
        ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + rand() * 0.4})`;
        ctx.beginPath();
        const n = 5 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + rand() * 0.6;
          const rr = r * (0.55 + rand() * 0.6);
          ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1.5);
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Shared uniforms and the drawing patch                               */
/* ------------------------------------------------------------------ */

function srgbVec(hex: string) {
  const c = new THREE.Color(hex);
  const tmp = c.clone().convertLinearToSRGB();
  return new THREE.Vector3(tmp.r, tmp.g, tmp.b);
}

export interface SharedUniforms {
  /** 0 = rendered, 1 = flat ink (hidden-line drawing) for gate parts */
  uDraw: { value: number };
  /** 0 = environment visible, 1 = environment faded to ink (studio) */
  uEnv: { value: number };
  uInk: { value: THREE.Vector3 };
}

export function createUniforms(ink = INK): SharedUniforms {
  return { uDraw: { value: 0 }, uEnv: { value: 0 }, uInk: { value: srgbVec(ink) } };
}

/** Adds a final mix-to-ink stage to any built-in material. */
export function patchMaterial<T extends THREE.Material>(mat: T, uniforms: SharedUniforms, channel: 'gate' | 'env'): T {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMixInk = channel === 'gate' ? uniforms.uDraw : uniforms.uEnv;
    shader.uniforms.uInk = uniforms.uInk;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uMixInk;\nuniform vec3 uInk;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, uInk, uMixInk);');
  };
  mat.customProgramCacheKey = () => `ink-${channel}`;
  return mat;
}

/* ------------------------------------------------------------------ */
/* Material set                                                        */
/* ------------------------------------------------------------------ */

export interface MaterialSet {
  uniforms: SharedUniforms;
  mats: Record<MaterialKey, THREE.MeshStandardMaterial>;
  line: LineMaterial;
  textures: Record<'plain' | 'patina' | 'spangle', THREE.Texture>;
  setFinish(a: Finish, b?: Finish, t?: number): void;
  setLampGlow(v: number): void;
  setResolution(w: number, h: number): void;
  dispose(): void;
}

export function createMaterials(uniforms: SharedUniforms): MaterialSet {
  const textures = { plain: noiseTexture('plain'), patina: noiseTexture('patina'), spangle: noiseTexture('spangle') };
  const std = (params: THREE.MeshStandardMaterialParameters) =>
    patchMaterial(
      new THREE.MeshStandardMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...params }),
      uniforms, 'gate',
    );
  const mats: MaterialSet['mats'] = {
    steel: std({ color: '#151617', metalness: 0.35, roughness: 0.56, map: textures.plain }),
    panel: std({ color: '#151617', metalness: 0.35, roughness: 0.56, map: textures.plain }),
    panelBack: std({ color: '#6b4a34', metalness: 0.45, roughness: 0.6, map: textures.plain }),
    hardware: std({ color: '#2a2c2f', metalness: 0.8, roughness: 0.35 }),
    stone: std({ color: '#ffffff', metalness: 0, roughness: 0.96, vertexColors: true }),
    concrete: std({ color: '#6c6963', metalness: 0, roughness: 0.92 }),
    lamp: std({ color: '#3a3024', emissive: '#ffb869', emissiveIntensity: 1.6, roughness: 0.4 }),
    device: std({ color: '#3d4045', metalness: 0.5, roughness: 0.5 }),
  };
  const line = new LineMaterial({
    color: new THREE.Color(SOAPSTONE).getHex(), linewidth: 1.15, transparent: true, opacity: 0,
    depthWrite: false, worldUnits: false,
  });

  const ca = new THREE.Color();
  const cb = new THREE.Color();
  return {
    uniforms, mats, line, textures,
    setFinish(a, b, t = 0) {
      const to = b || a;
      const k = Math.min(1, Math.max(0, t));
      for (const key of ['steel', 'panel'] as const) {
        const m = mats[key];
        m.color.copy(ca.set(a.color)).lerp(cb.set(to.color), k);
        m.metalness = a.metalness + (to.metalness - a.metalness) * k;
        m.roughness = a.roughness + (to.roughness - a.roughness) * k;
        const tex = textures[(k < 0.5 ? a : to).texture];
        if (m.map !== tex) m.map = tex;
      }
      mats.panelBack.color.copy(ca.set(a.back)).lerp(cb.set(to.back), k);
      const backTex = textures[(k < 0.5 ? a : to).texture];
      if (mats.panelBack.map !== backTex) mats.panelBack.map = backTex;
    },
    setLampGlow(v) {
      mats.lamp.emissiveIntensity = v;
    },
    setResolution(w, h) {
      line.resolution.set(w, h);
    },
    dispose() {
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(textures).forEach((t) => t.dispose());
      line.dispose();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Geometry from members                                               */
/* ------------------------------------------------------------------ */

function memberGeometry(m: Member): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry;
  if (m.kind === 'box') {
    geo = new THREE.BoxGeometry(m.s[0], m.s[1], m.s[2]);
    if (m.rotZ) geo.rotateZ(m.rotZ);
    geo.translate(m.c[0], m.c[1], m.c[2]);
  } else if (m.kind === 'cyl') {
    geo = new THREE.CylinderGeometry(m.r, m.r, m.len, 18);
    if (m.axis === 'x') geo.rotateZ(Math.PI / 2);
    if (m.axis === 'z') geo.rotateX(Math.PI / 2);
    geo.translate(m.c[0], m.c[1], m.c[2]);
  } else {
    const shape = new THREE.Shape(m.outline.map(([x, y]) => new THREE.Vector2(x, y)));
    geo = new THREE.ExtrudeGeometry(shape, { depth: m.t, bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, m.z - m.t / 2);
  }
  return geo;
}

const stoneTones = ['#5f5953', '#544e49', '#665e56', '#57504a', '#6c645a', '#4f4a46', '#625950', '#4a4642', '#69615a'];

export interface PartObject {
  part: Part;
  group: THREE.Group;
  /** label anchor in the part group's local space */
  anchor: THREE.Vector3;
}

export class GateObject {
  root = new THREE.Group();
  parts: PartObject[] = [];
  private movers: Partial<Record<string, THREE.Group>> = {};
  private acts: { def: GateModel['actuators'][number]; group: THREE.Group; rod: THREE.Object3D; len0: number }[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private explodeT = 0;
  openT = 0;

  constructor(public model: GateModel, private set: MaterialSet, opts: { shadows?: boolean; lines?: boolean } = {}) {
    const { shadows = true, lines = true } = opts;
    let stoneI = 0;
    const tone = new THREE.Color();

    // Moving groups pivot about the hinge axis.
    const inner: Record<string, THREE.Group> = { static: this.root };
    for (const [key, piv] of Object.entries(model.pivots)) {
      const mover = new THREE.Group();
      mover.position.set(piv!.x, 0, piv!.z);
      const offset = new THREE.Group();
      offset.position.set(-piv!.x, 0, -piv!.z);
      mover.add(offset);
      this.root.add(mover);
      this.movers[key] = mover;
      inner[key] = offset;
    }

    for (const part of model.parts) {
      const group = new THREE.Group();
      group.name = part.id;
      const byMat = new Map<MaterialKey, THREE.BufferGeometry[]>();
      const edgePositions: number[] = [];
      const box = new THREE.Box3();

      for (const m of part.members) {
        let geo = memberGeometry(m);
        if (lines) {
          const edges = new THREE.EdgesGeometry(geo, 24);
          const arr = edges.attributes.position.array as Float32Array;
          for (let i = 0; i < arr.length; i++) edgePositions.push(arr[i]);
          edges.dispose();
          if (m.kind === 'cyl' && m.axis === 'y') {
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              edgePositions.push(m.c[0] + dx * m.r, m.c[1] - m.len / 2, m.c[2] + dz * m.r, m.c[0] + dx * m.r, m.c[1] + m.len / 2, m.c[2] + dz * m.r);
            }
          }
        }
        if (geo.index) {
          const non = geo.toNonIndexed();
          geo.dispose();
          geo = non;
        }
        if (m.mat === 'stone') {
          tone.set(stoneTones[stoneI++ % stoneTones.length]);
          tone.offsetHSL(0, 0, ((stoneI * 37) % 11) / 160 - 0.03);
          const n = geo.attributes.position.count;
          const colors = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) colors.set([tone.r, tone.g, tone.b], i * 3);
          geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }
        geo.computeBoundingBox();
        box.union(geo.boundingBox!);
        if (!byMat.has(m.mat)) byMat.set(m.mat, []);
        byMat.get(m.mat)!.push(geo);
      }

      for (const [mat, geos] of byMat) {
        const merged = geos.length > 1 ? mergeGeometries(geos, false)! : geos[0];
        if (geos.length > 1) geos.forEach((g) => g.dispose());
        this.geos.push(merged);
        const mesh = new THREE.Mesh(merged, this.set.mats[mat]);
        mesh.castShadow = shadows && mat !== 'lamp';
        mesh.receiveShadow = shadows && mat !== 'lamp';
        group.add(mesh);
      }

      if (lines && edgePositions.length) {
        const lg = new LineSegmentsGeometry();
        lg.setPositions(edgePositions);
        this.geos.push(lg);
        const ls = new LineSegments2(lg, this.set.line);
        ls.renderOrder = 2;
        ls.frustumCulled = false;
        group.add(ls);
      }

      inner[part.group].add(group);
      const anchor = new THREE.Vector3();
      box.getCenter(anchor);
      this.parts.push({ part, group, anchor });
    }

    // Swing operator arms follow the leaf as it opens.
    const opsGroup = this.parts.find((p) => p.part.id === 'operators')?.group || this.root;
    for (const def of model.actuators) {
      const g = new THREE.Group();
      g.position.set(...def.base);
      const len0 = new THREE.Vector3(...def.tip).distanceTo(new THREE.Vector3(...def.base));
      const body = this.edged(new THREE.BoxGeometry(0.2, 0.24, len0 * 0.58), this.set.mats.device, lines, shadows);
      body.position.z = len0 * 0.29;
      const rodGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 12);
      rodGeo.rotateX(Math.PI / 2);
      rodGeo.translate(0, 0, 0.5);
      const rod = this.edged(rodGeo, this.set.mats.hardware, false, shadows);
      g.add(body, rod);
      opsGroup.add(g);
      this.acts.push({ def, group: g, rod, len0 });
    }
    this.updateActuators();
  }

  private edged(geo: THREE.BufferGeometry, mat: THREE.Material, lines: boolean, shadows: boolean) {
    this.geos.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = shadows;
    if (lines) {
      const e = new THREE.EdgesGeometry(geo, 24);
      const lg = new LineSegmentsGeometry();
      lg.setPositions(e.attributes.position.array as Float32Array);
      e.dispose();
      this.geos.push(lg);
      const ls = new LineSegments2(lg, this.set.line);
      ls.renderOrder = 2;
      mesh.add(ls);
    }
    return mesh;
  }

  private tipV = new THREE.Vector3();
  private baseV = new THREE.Vector3();
  private updateActuators() {
    for (const a of this.acts) {
      const piv = this.model.pivots[a.def.group];
      const mover = this.movers[a.def.group];
      if (!piv || !mover) continue;
      const angle = mover.rotation.y;
      const dx = a.def.tip[0] - piv.x;
      const dz = a.def.tip[2] - piv.z;
      this.tipV.set(piv.x + dx * Math.cos(angle) + dz * Math.sin(angle), a.def.tip[1], piv.z - dx * Math.sin(angle) + dz * Math.cos(angle));
      this.baseV.set(...a.def.base);
      const len = this.tipV.distanceTo(this.baseV);
      a.group.lookAt(a.group.parent!.localToWorld(this.tipV.clone().sub(this.baseV).add(a.group.position)));
      a.rod.scale.z = len;
    }
  }

  /** 0 = assembled, 1 = fully exploded along each part's assembly axis. */
  setExplode(t: number) {
    this.explodeT = t;
    for (const p of this.parts) {
      const e = p.part.explode;
      p.group.position.set(e[0] * t, e[1] * t, e[2] * t);
    }
  }

  /** 0 = closed, 1 = open. Swing leaves rotate inward, slide gates travel. */
  setOpen(t: number) {
    this.openT = t;
    const angle = t * THREE.MathUtils.degToRad(98);
    for (const [key, mover] of Object.entries(this.movers)) {
      const piv = this.model.pivots[key as keyof GateModel['pivots']]!;
      if (this.model.slideTravel) mover!.position.x = piv.x + this.model.slideTravel * t;
      else mover!.rotation.y = angle * piv.dir;
    }
    this.root.updateMatrixWorld(true);
    this.updateActuators();
  }

  /** Show or hide parts that sit below finished grade. */
  setUndergroundVisible(v: boolean) {
    for (const p of this.parts) if (p.part.underground) p.group.visible = v;
  }

  worldAnchor(p: PartObject, target: THREE.Vector3) {
    return p.group.localToWorld(target.copy(p.anchor));
  }

  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.root.removeFromParent();
  }
}

/* ------------------------------------------------------------------ */
/* Renderer helpers                                                    */
/* ------------------------------------------------------------------ */

export function createRenderer(canvas: HTMLCanvasElement, opts: { preserve?: boolean; alpha?: boolean } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: !!opts.alpha, powerPreference: 'high-performance',
    preserveDrawingBuffer: !!opts.preserve,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

/** Image-based lighting from a procedural room. No HDR download. */
export function applyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, intensity = 0.55) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = intensity;
  pmrem.dispose();
  return env;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export const v3 = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);

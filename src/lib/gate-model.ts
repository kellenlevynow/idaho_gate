/**
 * Parametric gate model. Renderer-agnostic.
 *
 * One GateSpec produces a list of parts made of simple members (boxes,
 * cylinders, extruded plates). The same model drives:
 *   - the real-time 3D scenes (src/three/*)
 *   - the SVG engineering drawings (src/lib/drawing.ts)
 * so a gate looks the same whether it is rendered, exploded or drawn.
 *
 * Units are feet. X runs across the opening (0 at center), Y is up from
 * finished grade, Z points toward the street side.
 *
 * These are concept geometries for visualization. Member sizes are
 * representative, not engineered values for any specific project.
 */

export type Operation = 'double-swing' | 'single-swing' | 'slide';
export type Infill = 'pickets' | 'ridgeline' | 'slats' | 'ranch' | 'plate';
export type TopProfile = 'flat' | 'arch';
export type PostStyle = 'steel' | 'masonry';

export interface GateSpec {
  operation: Operation;
  /** clear opening between posts, ft */
  width: number;
  /** leaf height at the stiles, ft */
  height: number;
  top: TopProfile;
  /** extra height at the center of an arched top, ft */
  archRise: number;
  infill: Infill;
  posts: PostStyle;
  automation: boolean;
}

export type MaterialKey =
  | 'steel' // frame, pickets, posts: takes the selected finish
  | 'panel' // feature plate, front layer: takes the selected finish
  | 'panelBack' // feature plate, standoff layer
  | 'hardware' // hinges, rollers, brackets
  | 'stone'
  | 'concrete'
  | 'lamp'
  | 'device'; // operators, keypads, control boxes

export type Vec3 = [number, number, number];

export interface BoxMember {
  kind: 'box';
  c: Vec3;
  s: Vec3;
  rotZ?: number;
  mat: MaterialKey;
}
export interface CylMember {
  kind: 'cyl';
  c: Vec3;
  r: number;
  len: number;
  axis: 'x' | 'y' | 'z';
  mat: MaterialKey;
}
export interface PlateMember {
  kind: 'plate';
  outline: [number, number][];
  z: number;
  t: number;
  mat: MaterialKey;
}
export type Member = BoxMember | CylMember | PlateMember;

export type MoveGroup = 'static' | 'leafL' | 'leafR';

export interface Part {
  id: string;
  /** label shown in exploded views */
  label: string;
  /** one line of plain-language detail for overlays */
  note: string;
  group: MoveGroup;
  /** offset at full explode, ft */
  explode: Vec3;
  members: Member[];
  /** which side the label leader runs to */
  labelSide: 'left' | 'right';
  /** only one of a mirrored pair carries a label */
  showLabel: boolean;
  /** below finished grade, hidden in rendered views until exploded */
  underground?: boolean;
}

export interface Actuator {
  id: string;
  group: MoveGroup;
  /** fixed pivot on the post side */
  base: Vec3;
  /** attach point on the leaf, in closed position */
  tip: Vec3;
}

export interface GateModel {
  spec: GateSpec;
  parts: Part[];
  pivots: Partial<Record<MoveGroup, { x: number; z: number; dir: 1 | -1 }>>;
  /** slide gates: travel distance along +X when fully open */
  slideTravel: number;
  actuators: Actuator[];
  lamps: Vec3[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  dims: { width: number; height: number; peak: number; leaf: number; clearance: number };
}

/* ------------------------------------------------------------------ */

const CLEAR = 0.33; // ground clearance under the leaf
const TUBE = 0.167; // 2 in frame tube
const PICKET = 0.0625; // 3/4 in bar
const PICKET_PITCH = 0.36;

/** Deterministic pseudo-random, so builds and renders never change between runs. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Ridgeline profiles as (u, v) control points across the whole opening. */
const RIDGE_FRONT: [number, number][] = [
  [0, 0.26], [0.05, 0.4], [0.09, 0.34], [0.14, 0.6], [0.18, 0.48], [0.22, 0.56], [0.27, 0.84],
  [0.31, 0.68], [0.34, 0.74], [0.39, 0.5], [0.44, 0.58], [0.5, 0.92], [0.54, 0.76], [0.57, 0.82],
  [0.62, 0.54], [0.67, 0.68], [0.72, 0.46], [0.77, 0.64], [0.82, 0.88], [0.86, 0.66], [0.9, 0.72],
  [0.95, 0.38], [1, 0.28],
];
const RIDGE_BACK: [number, number][] = [
  [0, 0.62], [0.07, 0.8], [0.13, 0.7], [0.2, 0.9], [0.25, 0.99], [0.3, 0.86], [0.36, 0.93],
  [0.42, 0.8], [0.47, 0.88], [0.53, 0.74], [0.6, 0.97], [0.66, 0.84], [0.72, 0.9], [0.8, 1.0],
  [0.86, 0.82], [0.92, 0.72], [1, 0.64],
];

function sampleProfile(profile: [number, number][], u: number) {
  if (u <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    if (u <= profile[i][0]) {
      const [u0, v0] = profile[i - 1];
      const [u1, v1] = profile[i];
      return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0);
    }
  }
  return profile[profile.length - 1][1];
}

/** Outline of a ridge plate between x0 and x1, sitting on yBase, peak height h. */
function ridgeOutline(
  profile: [number, number][], x0: number, x1: number, spanX0: number, spanW: number, yBase: number, h: number,
): [number, number][] {
  const u0 = (x0 - spanX0) / spanW;
  const u1 = (x1 - spanX0) / spanW;
  const us = [u0, ...profile.map((p) => p[0]).filter((u) => u > u0 + 1e-4 && u < u1 - 1e-4), u1];
  const pts: [number, number][] = [[x0, yBase]];
  for (const u of us) pts.push([spanX0 + u * spanW, yBase + sampleProfile(profile, u) * h]);
  pts.push([x1, yBase]);
  return pts;
}

export const defaultSpec: GateSpec = {
  operation: 'double-swing',
  width: 16,
  height: 6,
  top: 'arch',
  archRise: 1.2,
  infill: 'ridgeline',
  posts: 'masonry',
  automation: true,
};

export function buildGateModel(input: Partial<GateSpec> = {}): GateModel {
  const spec: GateSpec = { ...defaultSpec, ...input };
  const { width: W, height: H, operation } = spec;
  const rise = spec.top === 'arch' ? spec.archRise : 0;
  const heavy = spec.infill === 'ranch';
  const fw = heavy ? 0.25 : TUBE; // frame face width
  const fd = heavy ? 0.21 : TUBE; // frame depth

  const parts: Part[] = [];
  const actuators: Actuator[] = [];
  const lamps: Vec3[] = [];
  const pivots: GateModel['pivots'] = {};
  let slideTravel = 0;

  const part = (p: Omit<Part, 'members' | 'showLabel' | 'labelSide'> & Partial<Pick<Part, 'showLabel' | 'labelSide'>>): Part => {
    const full: Part = { showLabel: true, labelSide: 'left', ...p, members: [] };
    parts.push(full);
    return full;
  };

  /* ---------- leaf builder ---------- */
  // archSpan: the x-range the arch is drawn across (whole opening for bi-parting leaves).
  const buildLeaf = (
    key: string, group: MoveGroup, x0: number, x1: number, archX0: number, archX1: number,
    hingeAt: 'left' | 'right' | 'none', spread: number, labels: string[], z = 0,
  ) => {
    const archMid = (archX0 + archX1) / 2;
    const archHalf = (archX1 - archX0) / 2;
    const topY = (x: number) => H + CLEAR + rise * (1 - ((x - archMid) / archHalf) ** 2);
    const side = spread < 0 ? 'left' : 'right';
    const inner0 = x0 + fw;
    const inner1 = x1 - fw;
    const yBot = CLEAR + fw; // top of bottom rail

    /* frame */
    const frame = part({
      id: `${key}-frame`, label: 'Leaf frame', note: 'Steel tube, mitered and fully welded',
      group, explode: [spread * 0.9, 0, 0], showLabel: labels.includes('frame'), labelSide: side,
    });
    for (const xs of [x0 + fw / 2, x1 - fw / 2]) {
      const h = topY(xs) - CLEAR - (rise ? 0.02 : 0);
      frame.members.push({ kind: 'box', c: [xs, CLEAR + h / 2, z], s: [fw, h, fd], mat: 'steel' });
    }
    frame.members.push({ kind: 'box', c: [(x0 + x1) / 2, CLEAR + fw / 2, z], s: [x1 - x0, fw, fd], mat: 'steel' });
    // fillet weld beads where the bottom rail meets each stile, both faces
    for (const xs of [x0 + fw, x1 - fw]) {
      for (const zs of [z + fd / 2, z - fd / 2]) {
        frame.members.push({ kind: 'cyl', c: [xs, CLEAR + fw / 2, zs], r: 0.017, len: fw * 0.96, axis: 'y', mat: 'steel' });
      }
    }

    /* top rail */
    const top = part({
      id: `${key}-top`, label: rise ? 'Arched top rail' : 'Top rail', note: rise ? 'Rolled to radius, then welded to the stiles' : 'Straight tube, coped to the stiles',
      group, explode: [spread * 0.9, 3.7, 0], showLabel: labels.includes('top'), labelSide: side,
    });
    if (rise) {
      const n = 14;
      const up: [number, number][] = [];
      const down: [number, number][] = [];
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        up.push([x, topY(x)]);
        down.unshift([x, topY(x) - fw]);
      }
      top.members.push({ kind: 'plate', outline: [...up, ...down], z, t: fd, mat: 'steel' });
    } else {
      top.members.push({ kind: 'box', c: [(x0 + x1) / 2, H + CLEAR - fw / 2, z], s: [x1 - x0, fw, fd], mat: 'steel' });
    }

    /* infill */
    const picketsBetween = (target: Part, yFrom: number, xa: number, xb: number, topInset = fw) => {
      const span = xb - xa;
      const n = Math.max(1, Math.round(span / PICKET_PITCH) - 1);
      for (let i = 1; i <= n; i++) {
        const x = xa + (span * i) / (n + 1);
        const yTo = topY(x) - topInset;
        target.members.push({ kind: 'box', c: [x, (yFrom + yTo) / 2, z], s: [PICKET, yTo - yFrom, PICKET], mat: 'steel' });
      }
    };

    if (spec.infill === 'pickets') {
      const inf = part({
        id: `${key}-infill`, label: 'Picket infill', note: 'Solid bar on even centers, welded top and bottom',
        group, explode: [spread * 0.9, 1.9, 0], showLabel: labels.includes('infill'), labelSide: side,
      });
      const railY = CLEAR + fw + 0.62;
      frame.members.push({ kind: 'box', c: [(inner0 + inner1) / 2, railY, z], s: [inner1 - inner0, 0.1, fd * 0.8], mat: 'steel' });
      picketsBetween(inf, yBot, inner0, inner1);
    } else if (spec.infill === 'ridgeline') {
      const panelH = Math.min(2.0, H * 0.36);
      const midY = yBot + panelH + 0.06;
      frame.members.push({ kind: 'box', c: [(inner0 + inner1) / 2, midY, z], s: [inner1 - inner0, 0.125, fd], mat: 'steel' });
      for (const xs of [inner0, inner1]) {
        for (const zs of [z + fd / 2, z - fd / 2]) {
          frame.members.push({ kind: 'cyl', c: [xs, midY, zs], r: 0.017, len: 0.125, axis: 'y', mat: 'steel' });
        }
      }
      const inf = part({
        id: `${key}-infill`, label: 'Picket infill', note: 'Solid bar on even centers, welded top and bottom',
        group, explode: [spread * 0.9, 1.9, 0], showLabel: labels.includes('infill'), labelSide: side,
      });
      picketsBetween(inf, midY + 0.0625, inner0, inner1);
      const front = part({
        id: `${key}-ridge-front`, label: 'Plasma-cut ridgeline panel', note: 'Cut from plate on the CNC table from your artwork',
        group, explode: [spread * 0.9, 0, 2.6], showLabel: labels.includes('ridge-front'), labelSide: side,
      });
      front.members.push({
        kind: 'plate', outline: ridgeOutline(RIDGE_FRONT, inner0, inner1, archX0, archX1 - archX0, yBot, panelH * 0.86),
        z: z + 0.045, t: 0.02, mat: 'panel',
      });
      const back = part({
        id: `${key}-ridge-back`, label: 'Standoff layer', note: 'Second plate set back for depth and shadow',
        group, explode: [spread * 0.9, 0, 1.3], showLabel: labels.includes('ridge-back'), labelSide: side,
      });
      back.members.push({
        kind: 'plate', outline: ridgeOutline(RIDGE_BACK, inner0, inner1, archX0, archX1 - archX0, yBot, panelH * 0.98),
        z: z - 0.03, t: 0.02, mat: 'panelBack',
      });
    } else if (spec.infill === 'slats') {
      const inf = part({
        id: `${key}-infill`, label: 'Horizontal slat infill', note: 'Flat bar slats on a consistent reveal',
        group, explode: [spread * 0.9, 0, 2.2], showLabel: labels.includes('infill'), labelSide: side,
      });
      const slatH = 0.29;
      const gap = 0.07;
      const yTop = H + CLEAR - fw;
      const n = Math.floor((yTop - yBot + gap) / (slatH + gap));
      const pitch = (yTop - yBot) / n;
      for (let i = 0; i < n; i++) {
        const y = yBot + pitch * (i + 0.5);
        inf.members.push({ kind: 'box', c: [(inner0 + inner1) / 2, y, z + 0.02], s: [inner1 - inner0, pitch - gap, 0.06], mat: 'panel' });
      }
      // intermediate stiffener behind the slats on long leaves
      if (inner1 - inner0 > 6) {
        frame.members.push({ kind: 'box', c: [(inner0 + inner1) / 2, (yBot + yTop) / 2, z - 0.04], s: [0.125, yTop - yBot, 0.1], mat: 'steel' });
      }
    } else if (spec.infill === 'ranch') {
      const inf = part({
        id: `${key}-infill`, label: 'Rails and brace', note: 'Diagonal brace carries the latch side back to the hinge',
        group, explode: [spread * 0.9, 0, 2.2], showLabel: labels.includes('infill'), labelSide: side,
      });
      const yTop = topY((x0 + x1) / 2) - fw;
      const n = 3;
      for (let i = 1; i <= n; i++) {
        const y = yBot + ((yTop - yBot) * i) / (n + 1);
        inf.members.push({ kind: 'box', c: [(inner0 + inner1) / 2, y, z], s: [inner1 - inner0, 0.21, fd * 0.8], mat: 'steel' });
      }
      // brace runs from the bottom hinge corner up to the top latch corner
      const hx = hingeAt === 'right' ? inner1 : inner0;
      const lx = hingeAt === 'right' ? inner0 : inner1;
      const dx = lx - hx;
      const dy = yTop - yBot;
      const len = Math.hypot(dx, dy);
      inf.members.push({
        kind: 'box', c: [(hx + lx) / 2, (yBot + yTop) / 2, z + 0.03], s: [len - 0.1, 0.21, fd * 0.7],
        rotZ: Math.atan2(dy, dx), mat: 'steel',
      });
    } else if (spec.infill === 'plate') {
      const yTop = H + CLEAR - fw;
      const split = yBot + (yTop - yBot) * 0.72;
      frame.members.push({ kind: 'box', c: [(inner0 + inner1) / 2, split, z], s: [inner1 - inner0, 0.125, fd], mat: 'steel' });
      const sheet = part({
        id: `${key}-infill`, label: 'Sheet panel', note: 'Formed sheet for privacy, stitched to the frame',
        group, explode: [spread * 0.9, 0, 2.2], showLabel: labels.includes('infill'), labelSide: side,
      });
      sheet.members.push({ kind: 'box', c: [(inner0 + inner1) / 2, (yBot + split - 0.0625) / 2, z], s: [inner1 - inner0, split - 0.0625 - yBot, 0.03], mat: 'panel' });
      const band = part({
        id: `${key}-band`, label: 'Open view band', note: 'Bar infill keeps a sight line at eye level',
        group, explode: [spread * 0.9, 1.9, 0], showLabel: labels.includes('band'), labelSide: side,
      });
      picketsBetween(band, split + 0.0625, inner0, inner1);
    }

    /* hinges */
    if (hingeAt !== 'none') {
      const hx = hingeAt === 'left' ? x0 - 0.07 : x1 + 0.07;
      const hinge = part({
        id: `${key}-hinges`, label: 'Barrel hinges', note: 'Sized for leaf weight, with grease fittings',
        group, explode: [spread * 0.45, 0, 0.9], showLabel: labels.includes('hinges'), labelSide: side,
      });
      for (const y of [CLEAR + 0.7, H + CLEAR - 0.75]) {
        hinge.members.push({ kind: 'cyl', c: [hx, y, z], r: 0.075, len: 0.36, axis: 'y', mat: 'hardware' });
        hinge.members.push({ kind: 'box', c: [hx + (hingeAt === 'left' ? 0.1 : -0.1), y, z], s: [0.16, 0.26, 0.04], mat: 'hardware' });
      }
    }
  };

  /* ---------- posts, footings, pillars ---------- */
  const steelPost = (id: string, x: number, z: number, h: number, label: string, note: string, side: 'left' | 'right', show: boolean, size = 0.5) => {
    const dir = side === 'left' ? -1 : 1;
    const p = part({ id, label, note, group: 'static', explode: [dir * 1.9, 0, 0], showLabel: show, labelSide: side });
    p.members.push({ kind: 'box', c: [x, h / 2, z], s: [size, h, size], mat: 'steel' });
    p.members.push({ kind: 'box', c: [x, h + 0.02, z], s: [size + 0.1, 0.04, size + 0.1], mat: 'steel' });
    const f = part({
      id: `${id}-footing`, label: 'Concrete footing', note: 'Poured below frost depth, sized to the gate load',
      group: 'static', explode: [dir * 1.9, -1.6, 0], showLabel: show, labelSide: side, underground: true,
    });
    f.members.push({ kind: 'cyl', c: [x, -1.75, z], r: size * 1.5, len: 3.5, axis: 'y', mat: 'concrete' });
    return p;
  };

  const masonryPillar = (id: string, x: number, z: number, h: number, side: 'left' | 'right', show: boolean) => {
    const dir = side === 'left' ? -1 : 1;
    const size = 2;
    const body = part({
      id, label: 'Stone pillar', note: 'Masonry veneer over a reinforced block core',
      group: 'static', explode: [dir * 3.6, 0, 0], showLabel: show, labelSide: side,
    });
    const rand = rng(side === 'left' ? 7 : 19);
    // core
    body.members.push({ kind: 'box', c: [x, h / 2, z], s: [size - 0.16, h, size - 0.16], mat: 'stone' });
    // ledgestone courses on all four faces
    let y = 0;
    while (y < h - 0.01) {
      const ch = Math.min(h - y, 0.24 + rand() * 0.26);
      for (let face = 0; face < 4; face++) {
        let u = -size / 2;
        while (u < size / 2 - 0.01) {
          let bw = Math.min(size / 2 - u, 0.45 + rand() * 0.75);
          if (size / 2 - (u + bw) < 0.3) bw = size / 2 - u; // no slivers at the corner
          const proud = 0.03 + rand() * 0.07;
          const cu = u + bw / 2;
          const off = size / 2 - 0.08 + proud / 2;
          const c: Vec3 = face === 0 ? [x + cu, y + ch / 2, z + off] : face === 1 ? [x + cu, y + ch / 2, z - off]
            : face === 2 ? [x + off, y + ch / 2, z + cu] : [x - off, y + ch / 2, z + cu];
          const s: Vec3 = face < 2 ? [bw - 0.025, ch - 0.025, 0.16 + proud] : [0.16 + proud, ch - 0.025, bw - 0.025];
          body.members.push({ kind: 'box', c, s, mat: 'stone' });
          u += bw;
        }
      }
      y += ch;
    }
    const cap = part({
      id: `${id}-cap`, label: 'Cap and lantern', note: 'Cast cap sheds water, wired for low-voltage lighting',
      group: 'static', explode: [dir * 3.6, 1.5, 0], showLabel: show, labelSide: side,
    });
    cap.members.push({ kind: 'box', c: [x, h + 0.12, z], s: [size + 0.34, 0.24, size + 0.34], mat: 'concrete' });
    cap.members.push({ kind: 'box', c: [x, h + 0.3, z], s: [0.5, 0.12, 0.5], mat: 'hardware' });
    cap.members.push({ kind: 'box', c: [x, h + 0.68, z], s: [0.4, 0.64, 0.4], mat: 'lamp' });
    cap.members.push({ kind: 'box', c: [x, h + 1.03, z], s: [0.6, 0.06, 0.6], mat: 'hardware' });
    for (const [ox, oz] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]]) {
      cap.members.push({ kind: 'box', c: [x + ox, h + 0.68, z + oz], s: [0.035, 0.64, 0.035], mat: 'hardware' });
    }
    lamps.push([x, h + 0.68, z]);
  };

  const postH = H + CLEAR + 0.45;
  const pillarH = H + CLEAR + 1.0;

  /* ---------- operations ---------- */
  if (operation === 'double-swing' || operation === 'single-swing') {
    const hingeGap = 0.14;
    const centerGap = 0.05;
    const postX = W / 2 + 0.25;

    if (operation === 'double-swing') {
      buildLeaf('L', 'leafL', -W / 2 + hingeGap, -centerGap, -W / 2, W / 2, 'left', -1, ['frame', 'top', 'infill', 'band']);
      buildLeaf('R', 'leafR', centerGap, W / 2 - hingeGap, -W / 2, W / 2, 'right', 1, ['ridge-front', 'ridge-back', 'hinges']);
      pivots.leafL = { x: -W / 2 + hingeGap - 0.07, z: 0, dir: 1 };
      pivots.leafR = { x: W / 2 - hingeGap + 0.07, z: 0, dir: -1 };
      // drop rod on the right leaf
      const latch = part({
        id: 'latch', label: 'Drop rod and stop', note: 'Holds the leaves closed against wind load',
        group: 'leafR', explode: [0.9, -0.2, 1.4], labelSide: 'right',
      });
      latch.members.push({ kind: 'cyl', c: [centerGap + 0.09, CLEAR + 0.75, 0.13], r: 0.03, len: 1.9, axis: 'y', mat: 'hardware' });
      latch.members.push({ kind: 'box', c: [centerGap + 0.09, CLEAR + 1.25, 0.11], s: [0.14, 0.1, 0.07], mat: 'hardware' });
      latch.members.push({ kind: 'box', c: [centerGap + 0.09, CLEAR + 0.4, 0.11], s: [0.14, 0.1, 0.07], mat: 'hardware' });
    } else {
      buildLeaf('L', 'leafL', -W / 2 + hingeGap, W / 2 - 0.08, -W / 2, W / 2, 'left', -1, ['frame', 'top', 'infill', 'ridge-front', 'ridge-back', 'band', 'hinges']);
      pivots.leafL = { x: -W / 2 + hingeGap - 0.07, z: 0, dir: 1 };
    }

    steelPost('post-L', -postX, 0, postH, 'Hinge post', 'Structural tube set in the footing, carries the whole leaf', 'left', true);
    steelPost('post-R', postX, 0, postH, operation === 'double-swing' ? 'Hinge post' : 'Latch post', 'Receives the latch and takes the closing load', 'right', operation === 'single-swing');

    if (spec.posts === 'masonry') {
      masonryPillar('pillar-L', -(postX + 1.42), 0.1, pillarH, 'left', false);
      masonryPillar('pillar-R', postX + 1.42, 0.1, pillarH, 'right', true);
    }

    if (spec.automation) {
      const armY = CLEAR + 1.35;
      const ops = part({
        id: 'operators', label: 'Swing operator', note: 'Linear actuator matched to leaf length and weight',
        group: 'static', explode: [0, 0, -2.6], labelSide: 'right',
      });
      const sides: [MoveGroup, number][] = operation === 'double-swing' ? [['leafL', -1], ['leafR', 1]] : [['leafL', -1]];
      for (const [g, d] of sides) {
        const base: Vec3 = [d * (W / 2 + 0.05), armY, -0.85];
        const tip: Vec3 = [d * (W / 2 - 2.7), armY, -0.16];
        actuators.push({ id: `act-${g}`, group: g, base, tip });
        ops.members.push({ kind: 'box', c: [d * (W / 2 + 0.2), armY, -0.55], s: [0.12, 0.2, 0.7], mat: 'hardware' });
      }
      const devices = part({
        id: 'access', label: 'Keypad and photo eyes', note: 'Entry device plus monitored safety sensors',
        group: 'static', explode: [0, 0, 2.4], labelSide: 'left',
      });
      const kx = -(W / 2 + (spec.posts === 'masonry' ? 0.6 : 1.2));
      const kz = 5.2;
      devices.members.push({ kind: 'cyl', c: [kx, 1.6, kz], r: 0.085, len: 3.2, axis: 'y', mat: 'steel' });
      devices.members.push({ kind: 'box', c: [kx + 0.3, 3.3, kz], s: [0.75, 0.13, 0.13], rotZ: 0.35, mat: 'steel' });
      devices.members.push({ kind: 'box', c: [kx + 0.72, 3.48, kz], s: [0.34, 0.5, 0.2], mat: 'device' });
      devices.members.push({ kind: 'box', c: [kx, 0.03, kz], s: [0.6, 0.06, 0.6], mat: 'concrete' });
      for (const d of [-1, 1]) {
        devices.members.push({ kind: 'box', c: [d * (W / 2 + 0.25), 1.75, 0.34], s: [0.16, 0.24, 0.16], mat: 'device' });
      }
      const ctl = part({
        id: 'control', label: 'Control enclosure', note: 'Board, battery backup and surge protection',
        group: 'static', explode: [-2.2, 0, -2.6], labelSide: 'left',
      });
      const cx = -(postX + (spec.posts === 'masonry' ? 1.42 : 0.9));
      ctl.members.push({ kind: 'box', c: [cx, 1.25, -1.75], s: [0.25, 2.5, 0.25], mat: 'steel' });
      ctl.members.push({ kind: 'box', c: [cx, 2.9, -1.75], s: [1.0, 1.25, 0.5], mat: 'device' });
    }
  } else {
    /* ---------- cantilever slide ---------- */
    const tail = Math.max(5, W * 0.45);
    const x0 = -W / 2 - 0.35;
    const x1 = W / 2 + 0.35;
    const zG = 0;
    buildLeaf('L', 'leafL', x0, x1, x0, x1, 'none', -1, ['frame', 'top', 'infill', 'ridge-front', 'ridge-back', 'band', 'hinges'], zG);
    pivots.leafL = { x: 0, z: 0, dir: 1 };
    slideTravel = W + 0.5;

    const tailPart = part({
      id: 'tail', label: 'Counterbalance tail', note: 'Extends past the opening so the gate carries with no ground track',
      group: 'leafL', explode: [1.6, 0, 0], labelSide: 'right',
    });
    const tx1 = x1 + tail;
    const topYf = H + CLEAR;
    tailPart.members.push({ kind: 'box', c: [(x1 + tx1) / 2, CLEAR + fw / 2, zG], s: [tail, fw, fd], mat: 'steel' });
    tailPart.members.push({ kind: 'box', c: [(x1 + tx1) / 2, topYf - fw / 2, zG], s: [tail, fw, fd], mat: 'steel' });
    tailPart.members.push({ kind: 'box', c: [tx1 - fw / 2, (CLEAR + topYf) / 2, zG], s: [fw, H, fd], mat: 'steel' });
    const bays = 2;
    for (let i = 0; i < bays; i++) {
      const bx0 = x1 + (tail * i) / bays;
      const bx1 = x1 + (tail * (i + 1)) / bays;
      if (i > 0) tailPart.members.push({ kind: 'box', c: [bx0, (CLEAR + topYf) / 2, zG], s: [fw * 0.8, H - 2 * fw, fd], mat: 'steel' });
      const dx = bx1 - bx0 - fw;
      const dy = H - 2 * fw;
      tailPart.members.push({
        kind: 'box', c: [(bx0 + bx1) / 2, (CLEAR + topYf) / 2, zG], s: [Math.hypot(dx, dy), 0.1, fd * 0.7],
        rotZ: (i % 2 ? 1 : -1) * Math.atan2(dy, dx), mat: 'steel',
      });
    }
    // rack along the bottom rail
    tailPart.members.push({ kind: 'box', c: [(x0 + tx1) / 2, CLEAR + 0.42, zG - fd / 2 - 0.04], s: [tx1 - x0, 0.09, 0.07], mat: 'hardware' });

    const pz = zG - 0.42;
    const s1 = x1 + 0.9;
    const s2 = x1 + tail - 0.6;
    steelPost('post-S1', s1, pz, postH, 'Support posts', 'Pair of posts carries the roller carriages and top guides', 'right', true);
    steelPost('post-S2', s2, pz, postH, 'Support post', '', 'right', false);
    steelPost('post-C', x0 - 0.42, zG, postH, 'Catch post', 'Receiver cradles the leading edge when closed', 'left', true);

    const rollers = part({
      id: 'rollers', label: 'Roller carriages and guides', note: 'Sealed bearings ride inside the bottom rail, clear of snow',
      group: 'static', explode: [1.9, -0.9, 1.2], labelSide: 'right',
    });
    for (const sx of [s1, s2]) {
      rollers.members.push({ kind: 'box', c: [sx, CLEAR - 0.02, zG], s: [0.9, 0.2, 0.3], mat: 'hardware' });
      rollers.members.push({ kind: 'cyl', c: [sx - 0.25, CLEAR + 0.02, zG], r: 0.12, len: 0.2, axis: 'z', mat: 'hardware' });
      rollers.members.push({ kind: 'cyl', c: [sx + 0.25, CLEAR + 0.02, zG], r: 0.12, len: 0.2, axis: 'z', mat: 'hardware' });
      rollers.members.push({ kind: 'box', c: [sx, CLEAR - 0.02, (zG + pz) / 2], s: [0.3, 0.12, 0.5], mat: 'hardware' });
      rollers.members.push({ kind: 'box', c: [sx, topYf + 0.12, (zG + pz) / 2 + 0.05], s: [0.3, 0.08, 0.75], mat: 'hardware' });
      rollers.members.push({ kind: 'cyl', c: [sx, topYf - 0.02, zG + 0.16], r: 0.07, len: 0.26, axis: 'y', mat: 'hardware' });
      rollers.members.push({ kind: 'cyl', c: [sx, topYf - 0.02, zG - 0.16], r: 0.07, len: 0.26, axis: 'y', mat: 'hardware' });
    }
    const catcher = part({
      id: 'catcher', label: 'Receiver', note: 'Guides and holds the nose of the gate',
      group: 'static', explode: [-1.9, 0, 1.2], showLabel: false,
    });
    catcher.members.push({ kind: 'box', c: [x0 - 0.12, topYf - 0.5, zG], s: [0.12, 0.5, 0.42], mat: 'hardware' });
    catcher.members.push({ kind: 'box', c: [x0 - 0.12, CLEAR + 0.5, zG], s: [0.12, 0.5, 0.42], mat: 'hardware' });

    if (spec.posts === 'masonry') {
      masonryPillar('pillar-L', x0 - 0.42 - 1.5, zG + 0.1, pillarH, 'left', false);
      masonryPillar('pillar-R', x1 + 1.1, zG + 1.6, pillarH, 'right', true);
    }

    if (spec.automation) {
      const ops = part({
        id: 'operators', label: 'Slide operator', note: 'Drives the rack, with battery backup for outages',
        group: 'static', explode: [1.9, 0, -2.6], labelSide: 'right',
      });
      const ox = (s1 + s2) / 2;
      ops.members.push({ kind: 'box', c: [ox, 0.08, pz - 0.75], s: [2.2, 0.16, 1.8], mat: 'concrete' });
      ops.members.push({ kind: 'box', c: [ox, 1.0, pz - 0.75], s: [1.2, 1.7, 1.1], mat: 'device' });
      ops.members.push({ kind: 'cyl', c: [ox, CLEAR + 0.42, zG - fd / 2 - 0.2], r: 0.16, len: 0.24, axis: 'z', mat: 'hardware' });
      const devices = part({
        id: 'access', label: 'Keypad and photo eyes', note: 'Entry device plus monitored safety sensors',
        group: 'static', explode: [0, 0, 2.4], labelSide: 'left',
      });
      const kx = x0 - 1.1;
      const kz = 5.2;
      devices.members.push({ kind: 'cyl', c: [kx, 1.6, kz], r: 0.085, len: 3.2, axis: 'y', mat: 'steel' });
      devices.members.push({ kind: 'box', c: [kx + 0.3, 3.3, kz], s: [0.75, 0.13, 0.13], rotZ: 0.35, mat: 'steel' });
      devices.members.push({ kind: 'box', c: [kx + 0.72, 3.48, kz], s: [0.34, 0.5, 0.2], mat: 'device' });
      devices.members.push({ kind: 'box', c: [kx, 0.03, kz], s: [0.6, 0.06, 0.6], mat: 'concrete' });
      devices.members.push({ kind: 'box', c: [x0 - 0.42, 1.75, zG + 0.34], s: [0.16, 0.24, 0.16], mat: 'device' });
      devices.members.push({ kind: 'box', c: [s1, 1.75, zG + 0.5], s: [0.16, 0.24, 0.16], mat: 'device' });
    }
  }

  /* ---------- bounds ---------- */
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of parts) {
    if (p.underground) continue;
    for (const m of p.members) {
      if (m.kind === 'plate') {
        for (const [x, y] of m.outline) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      } else if (m.kind === 'box') {
        // skip the approach pedestal when measuring the elevation
        if (m.c[2] > 2) continue;
        const cr = Math.abs(Math.cos(m.rotZ || 0)), sr = Math.abs(Math.sin(m.rotZ || 0));
        const hw = (m.s[0] * cr + m.s[1] * sr) / 2;
        const hh = (m.s[0] * sr + m.s[1] * cr) / 2;
        minX = Math.min(minX, m.c[0] - hw); maxX = Math.max(maxX, m.c[0] + hw);
        minY = Math.min(minY, m.c[1] - hh); maxY = Math.max(maxY, m.c[1] + hh);
      }
    }
  }

  return {
    spec, parts, pivots, slideTravel, actuators, lamps,
    bounds: { minX, maxX, minY: Math.min(0, minY), maxY },
    dims: {
      width: W, height: H, peak: H + rise, clearance: CLEAR,
      leaf: operation === 'double-swing' ? W / 2 : W,
    },
  };
}

/** Feet to a feet-and-inches label, e.g. 16 -> 16'-0". */
export function ftIn(ft: number) {
  const totalIn = Math.round(ft * 12);
  return `${Math.floor(totalIn / 12)}'-${totalIn % 12}"`;
}

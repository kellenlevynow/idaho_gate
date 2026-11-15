/**
 * SVG engineering drawings generated from the parametric gate model.
 * Runs at build time. Output is plain SVG markup with no client script.
 *
 * Two views:
 *   elevation  front view with hidden-line removal, dimensions, title block
 *   plan       top view showing swing arcs or slide travel and clearances
 *
 * Every drawing is a concept visual and is stamped "not for construction".
 */
import { buildGateModel, ftIn, type GateModel, type GateSpec, type Member } from './gate-model';

export type DrawingTheme = 'dark' | 'light';

interface Palette {
  bg: string;
  line: string;
  faint: string;
  dim: string;
  panel: string;
  panelBack: string;
  text: string;
  muted: string;
}

const palettes: Record<DrawingTheme, Palette> = {
  dark: {
    bg: '#131415', line: '#e9e6dc', faint: 'rgba(233,230,220,0.28)', dim: '#e0703a',
    panel: '#2f3135', panelBack: '#8f4a26', text: '#e9e6dc', muted: '#8d929a',
  },
  light: {
    bg: '#f6f3ec', line: '#131415', faint: 'rgba(19,20,21,0.3)', dim: '#a9481a',
    panel: '#1d1e20', panelBack: '#c9bfae', text: '#131415', muted: '#55595f',
  },
};

const S = 30; // px per foot
const n = (v: number) => Math.round(v * 100) / 100;

export interface DrawingResult {
  viewBox: string;
  width: number;
  height: number;
  body: string;
  /** plain-language description for the accessible name */
  description: string;
}

interface Options {
  theme?: DrawingTheme;
  title?: string;
  dwg?: string;
  /** show dimension lines */
  dims?: boolean;
  /** show title block */
  titleBlock?: boolean;
  /** draw footings below grade as hidden lines */
  footings?: boolean;
}

const opText: Record<string, string> = {
  'double-swing': 'double swing gate',
  'single-swing': 'single swing gate',
  slide: 'cantilever slide gate',
};
const infillText: Record<string, string> = {
  pickets: 'vertical picket infill',
  ridgeline: 'picket infill over plasma-cut ridgeline panels',
  slats: 'horizontal slat infill',
  ranch: 'horizontal rails and a diagonal brace',
  plate: 'sheet panels with an open view band',
};

export function describeSpec(spec: GateSpec) {
  return `${ftIn(spec.width)} ${opText[spec.operation]}, ${spec.top === 'arch' ? 'arched top' : 'flat top'}, ${infillText[spec.infill]}, ${spec.posts === 'masonry' ? 'stone pillars' : 'steel posts'}${spec.automation ? ', automated' : ''}`;
}

/* ------------------------------------------------------------------ */
/* Elevation                                                           */
/* ------------------------------------------------------------------ */

function memberSvg(m: Member, pal: Palette, X: (x: number) => number, Y: (y: number) => number, dashed: boolean): string {
  const fill = m.mat === 'panel' ? pal.panel : m.mat === 'panelBack' ? pal.panelBack : pal.bg;
  const sw = m.mat === 'stone' ? 0.6 : 1;
  const stroke = m.mat === 'stone' ? pal.faint : pal.line;
  const dash = dashed ? ' stroke-dasharray="5 4"' : '';
  const common = `fill="${dashed ? 'none' : fill}" stroke="${stroke}" stroke-width="${sw}"${dash}`;
  if (m.kind === 'plate') {
    return `<polygon points="${m.outline.map(([x, y]) => `${n(X(x))},${n(Y(y))}`).join(' ')}" ${common} stroke-linejoin="round"/>`;
  }
  if (m.kind === 'cyl') {
    if (m.axis === 'z') return `<circle cx="${n(X(m.c[0]))}" cy="${n(Y(m.c[1]))}" r="${n(m.r * S)}" ${common}/>`;
    const w = m.axis === 'y' ? m.r * 2 : m.len;
    const h = m.axis === 'y' ? m.len : m.r * 2;
    return `<rect x="${n(X(m.c[0] - w / 2))}" y="${n(Y(m.c[1] + h / 2))}" width="${n(w * S)}" height="${n(h * S)}" ${common}/>`;
  }
  if (m.rotZ) {
    const c = Math.cos(m.rotZ), s = Math.sin(m.rotZ);
    const hw = m.s[0] / 2, hh = m.s[1] / 2;
    const pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([px, py]) => `${n(X(m.c[0] + px * c - py * s))},${n(Y(m.c[1] + px * s + py * c))}`);
    return `<polygon points="${pts.join(' ')}" ${common}/>`;
  }
  return `<rect x="${n(X(m.c[0] - m.s[0] / 2))}" y="${n(Y(m.c[1] + m.s[1] / 2))}" width="${n(m.s[0] * S)}" height="${n(m.s[1] * S)}" ${common}/>`;
}

const memberZ = (m: Member) => (m.kind === 'plate' ? m.z : m.c[2]);

export function gateElevation(input: Partial<GateSpec> | GateModel, opts: Options = {}): DrawingResult {
  const model = 'parts' in input ? input : buildGateModel(input);
  const { theme = 'dark', dims = true, titleBlock = true, footings = true } = opts;
  const pal = palettes[theme];
  const { bounds, dims: d, spec } = model;

  // keep narrow gates on a sheet wide enough for the title block
  const padX = Math.max(dims ? 3.2 : 1.2, (17 - (bounds.maxX - bounds.minX)) / 2);
  const padTop = dims ? 2.6 : 1.0;
  const below = footings ? 4.3 : dims ? 2.4 : 0.9;
  const minX = bounds.minX - padX;
  const maxX = bounds.maxX + padX;
  const maxY = bounds.maxY + padTop;
  const minY = -below - (titleBlock ? 1.9 : 0);
  const width = (maxX - minX) * S;
  const height = (maxY - minY) * S;
  const X = (x: number) => (x - minX) * S;
  const Y = (y: number) => (maxY - y) * S;

  const out: string[] = [];
  out.push(`<rect x="0" y="0" width="${n(width)}" height="${n(height)}" fill="${pal.bg}"/>`);

  // footings as hidden lines
  if (footings) {
    for (const p of model.parts) if (p.underground) for (const m of p.members) out.push(memberSvg(m, pal, X, Y, true));
  }

  // visible members, painter's order by depth
  const visible: Member[] = [];
  for (const p of model.parts) {
    if (p.underground) continue;
    for (const m of p.members) {
      if (memberZ(m) > 2) continue; // approach pedestal sits well forward of the gate plane
      if (m.mat === 'stone' && m.kind === 'box' && m.s[0] < 1.5 && m.c[2] < 0.6) continue; // only the front stone face
      visible.push(m);
    }
  }
  visible.sort((a, b) => memberZ(a) - memberZ(b));
  for (const m of visible) out.push(memberSvg(m, pal, X, Y, false));

  // finished grade with earth ticks
  const gy = Y(0);
  out.push(`<line x1="${n(X(minX + 0.6))}" y1="${n(gy)}" x2="${n(X(maxX - 0.6))}" y2="${n(gy)}" stroke="${pal.line}" stroke-width="1.4"/>`);
  for (let x = minX + 1; x < maxX - 1; x += 0.6) {
    out.push(`<line x1="${n(X(x))}" y1="${n(gy)}" x2="${n(X(x - 0.28))}" y2="${n(gy + 7)}" stroke="${pal.faint}" stroke-width="0.8"/>`);
  }

  if (dims) {
    const t = (x: number, y: number, text: string, anchor = 'middle', rot = 0) =>
      `<text x="${n(x)}" y="${n(y)}" fill="${pal.dim}" font-family="'IBM Plex Mono',ui-monospace,monospace" font-size="11" letter-spacing="1.1" text-anchor="${anchor}"${rot ? ` transform="rotate(${rot} ${n(x)} ${n(y)})"` : ''}>${text}</text>`;
    const tick = (x: number, y: number) => `<line x1="${n(x - 4.5)}" y1="${n(y + 4.5)}" x2="${n(x + 4.5)}" y2="${n(y - 4.5)}" stroke="${pal.dim}" stroke-width="1.2"/>`;
    const hd = (x0: number, x1: number, y: number, from: number, label: string) => {
      const yy = Y(y);
      out.push(`<line x1="${n(X(x0))}" y1="${n(yy)}" x2="${n(X(x1))}" y2="${n(yy)}" stroke="${pal.dim}" stroke-width="0.9"/>`);
      for (const x of [x0, x1]) {
        out.push(`<line x1="${n(X(x))}" y1="${n(Y(from))}" x2="${n(X(x))}" y2="${n(yy + (y > from ? -7 : 7))}" stroke="${pal.dim}" stroke-width="0.6"/>`);
        out.push(tick(X(x), yy));
      }
      const tw = label.length * 7.4 + 14;
      out.push(`<rect x="${n(X((x0 + x1) / 2) - tw / 2)}" y="${n(yy - 8)}" width="${n(tw)}" height="16" fill="${pal.bg}"/>`);
      out.push(t(X((x0 + x1) / 2), yy + 4, label));
    };
    const vd = (y0: number, y1: number, x: number, from: number, label: string) => {
      const xx = X(x);
      out.push(`<line x1="${n(xx)}" y1="${n(Y(y0))}" x2="${n(xx)}" y2="${n(Y(y1))}" stroke="${pal.dim}" stroke-width="0.9"/>`);
      for (const y of [y0, y1]) {
        out.push(`<line x1="${n(X(from))}" y1="${n(Y(y))}" x2="${n(xx + (x > from ? 7 : -7))}" y2="${n(Y(y))}" stroke="${pal.dim}" stroke-width="0.6"/>`);
        out.push(tick(xx, Y(y)));
      }
      const tw = label.length * 7.4 + 14;
      const cy = Y((y0 + y1) / 2);
      out.push(`<rect x="${n(xx - 8)}" y="${n(cy - tw / 2)}" width="16" height="${n(tw)}" fill="${pal.bg}"/>`);
      out.push(t(xx + 4, cy, label, 'middle', -90));
    };
    const W = d.width;
    const stile = d.height + d.clearance;
    const peak = d.peak + d.clearance;
    const ox = spec.operation === 'slide' ? 0 : 0;
    hd(-W / 2 + ox, W / 2 + ox, -1.25, 0, `CLEAR OPENING ${ftIn(W)}`);
    if (spec.operation === 'double-swing') {
      hd(-W / 2, 0, bounds.maxY + 1.1, peak, `LEAF ${ftIn(W / 2)}`);
      hd(0, W / 2, bounds.maxY + 1.1, peak, `LEAF ${ftIn(W / 2)}`);
    } else if (spec.operation === 'slide') {
      hd(-W / 2 - 0.35, bounds.maxX - 0.4, bounds.maxY + 1.1, stile, `GATE PANEL WITH TAIL ${ftIn(bounds.maxX - 0.4 + W / 2 + 0.35)}`);
    } else {
      hd(-W / 2, W / 2, bounds.maxY + 1.1, peak, `LEAF ${ftIn(W)}`);
    }
    vd(0, stile, bounds.minX - 1.4, bounds.minX, `${ftIn(stile)}`);
    if (peak - stile > 0.05) vd(0, peak, bounds.maxX + 1.4, 0, `${ftIn(peak)} CROWN`);
    if (footings) {
      const fx = model.parts.find((p) => p.underground)?.members[0];
      if (fx && fx.kind === 'cyl') {
        out.push(`<text x="${n(X(fx.c[0] + fx.r + 0.35))}" y="${n(Y(-2.6))}" fill="${pal.muted}" font-family="'IBM Plex Mono',ui-monospace,monospace" font-size="10" letter-spacing="1">FOOTING BELOW FROST DEPTH</text>`);
      }
    }
  }

  if (titleBlock) {
    const bw = Math.min(width - 24, 470);
    const bx = width - bw - 12;
    const by = height - 46 - 12;
    const f = (x: number, y: number, text: string, size = 10, color = pal.muted, weight = 400) =>
      `<text x="${n(x)}" y="${n(y)}" fill="${color}" font-family="'IBM Plex Mono',ui-monospace,monospace" font-size="${size}" font-weight="${weight}" letter-spacing="1">${text}</text>`;
    out.push(`<rect x="${n(bx)}" y="${n(by)}" width="${n(bw)}" height="46" fill="${pal.bg}" stroke="${pal.faint}" stroke-width="1"/>`);
    out.push(`<line x1="${n(bx + bw * 0.52)}" y1="${n(by)}" x2="${n(bx + bw * 0.52)}" y2="${n(by + 46)}" stroke="${pal.faint}"/>`);
    out.push(`<line x1="${n(bx + bw * 0.78)}" y1="${n(by)}" x2="${n(bx + bw * 0.78)}" y2="${n(by + 46)}" stroke="${pal.faint}"/>`);
    out.push(f(bx + 10, by + 18, 'IDAHO GATE CO.', 11, pal.text, 500));
    out.push(f(bx + 10, by + 34, (opts.title || 'CONCEPT ELEVATION').toUpperCase().slice(0, 30), 9));
    out.push(f(bx + bw * 0.52 + 10, by + 18, `DWG ${opts.dwg || 'IG-C00'}`, 10, pal.text));
    out.push(f(bx + bw * 0.52 + 10, by + 34, 'SCALE NTS', 9));
    out.push(f(bx + bw * 0.78 + 10, by + 18, 'CONCEPT', 10, pal.dim, 500));
    out.push(f(bx + bw * 0.78 + 10, by + 34, 'NOT FOR CONSTR.', 8));
  }

  return {
    viewBox: `0 0 ${n(width)} ${n(height)}`, width: n(width), height: n(height), body: out.join(''),
    description: `Concept elevation drawing of a ${describeSpec(spec)}. Not for construction.`,
  };
}

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

export function gatePlan(input: Partial<GateSpec> | GateModel, opts: Options = {}): DrawingResult {
  const model = 'parts' in input ? input : buildGateModel(input);
  const { theme = 'dark' } = opts;
  const pal = palettes[theme];
  const { spec } = model;
  const W = spec.width;
  const isSlide = spec.operation === 'slide';

  // Plan coordinates: x across, z depth. Street side at the bottom of the sheet.
  const leafLen = spec.operation === 'double-swing' ? W / 2 : W;
  const reach = isSlide ? 3.2 : leafLen + 1.4;
  const tail = isSlide ? Math.max(5, W * 0.45) : 0;
  const minX = -W / 2 - 4.2;
  const maxX = W / 2 + (isSlide ? W + 2.5 : 4.2);
  const zProp = -reach - 1.4; // property side extent (negative z)
  const zStreet = 4.2;
  const width = (maxX - minX) * S;
  const height = (zStreet - zProp) * S;
  const X = (x: number) => (x - minX) * S;
  const Z = (z: number) => (z - zProp) * S; // street side at the bottom

  const out: string[] = [];
  const mono = `font-family="'IBM Plex Mono',ui-monospace,monospace"`;
  out.push(`<rect width="${n(width)}" height="${n(height)}" fill="${pal.bg}"/>`);
  // driveway edges
  for (const d of [-1, 1]) {
    out.push(`<line x1="${n(X((d * W) / 2))}" y1="0" x2="${n(X((d * W) / 2))}" y2="${n(height)}" stroke="${pal.faint}" stroke-width="1" stroke-dasharray="10 6"/>`);
  }
  out.push(`<text x="${n(X(0))}" y="${n(Z(zProp) + 20)}" fill="${pal.muted}" ${mono} font-size="10" letter-spacing="1.4" text-anchor="middle">PROPERTY SIDE</text>`);
  out.push(`<text x="${n(X(0))}" y="${n(Z(zStreet) - 10)}" fill="${pal.muted}" ${mono} font-size="10" letter-spacing="1.4" text-anchor="middle">STREET SIDE</text>`);
  out.push(`<text x="${n(X(0))}" y="${n(Z(2.2))}" fill="${pal.faint}" ${mono} font-size="10" letter-spacing="1.4" text-anchor="middle">DRIVEWAY</text>`);

  const sq = (x: number, z: number, s: number, fill = pal.bg, stroke = pal.line) =>
    `<rect x="${n(X(x - s / 2))}" y="${n(Z(z - s / 2))}" width="${n(s * S)}" height="${n(s * S)}" fill="${fill}" stroke="${stroke}" stroke-width="1.1"/>`;

  if (!isSlide) {
    const postX = W / 2 + 0.25;
    if (spec.posts === 'masonry') for (const d of [-1, 1]) out.push(sq(d * (postX + 1.42), 0.1, 2, pal.bg, pal.faint));
    for (const d of [-1, 1]) out.push(sq(d * postX, 0, 0.5, pal.line));
    const leaves: [number, number][] = spec.operation === 'double-swing' ? [[-W / 2, 1], [W / 2, -1]] : [[-W / 2, 1]];
    for (const [hx, dir] of leaves) {
      // closed leaf
      out.push(`<line x1="${n(X(hx))}" y1="${n(Z(0))}" x2="${n(X(hx + dir * leafLen))}" y2="${n(Z(0))}" stroke="${pal.line}" stroke-width="3"/>`);
      // open leaf (inward, toward the property side)
      out.push(`<line x1="${n(X(hx))}" y1="${n(Z(0))}" x2="${n(X(hx))}" y2="${n(Z(-leafLen))}" stroke="${pal.line}" stroke-width="1.4" stroke-dasharray="7 5"/>`);
      // swing arc
      const r = leafLen * S;
      const sweep = dir === 1 ? 0 : 1;
      out.push(`<path d="M ${n(X(hx + dir * leafLen))} ${n(Z(0))} A ${n(r)} ${n(r)} 0 0 ${sweep} ${n(X(hx))} ${n(Z(-leafLen))}" fill="none" stroke="${pal.dim}" stroke-width="1" stroke-dasharray="3 4"/>`);
    }
    // clear swing dimension
    const dx = X(W / 2 + 2.6);
    out.push(`<line x1="${n(dx)}" y1="${n(Z(0))}" x2="${n(dx)}" y2="${n(Z(-leafLen))}" stroke="${pal.dim}" stroke-width="0.9"/>`);
    for (const z of [0, -leafLen]) out.push(`<line x1="${n(dx - 5)}" y1="${n(Z(z) + 5)}" x2="${n(dx + 5)}" y2="${n(Z(z) - 5)}" stroke="${pal.dim}" stroke-width="1.2"/>`);
    out.push(`<text x="${n(dx + 5)}" y="${n(Z(-leafLen / 2))}" fill="${pal.dim}" ${mono} font-size="11" letter-spacing="1" text-anchor="middle" transform="rotate(-90 ${n(dx + 5)} ${n(Z(-leafLen / 2))})">SWING CLEARANCE ${ftIn(leafLen)}</text>`);
    out.push(`<text x="${n(X(-W / 2 + 0.4))}" y="${n(Z(-leafLen * 0.55))}" fill="${pal.muted}" ${mono} font-size="10" letter-spacing="1">KEEP CLEAR: SNOW, GRADE, VEHICLES</text>`);
    if (spec.automation) {
      for (const [hx, dir] of leaves) {
        out.push(`<line x1="${n(X(hx - dir * 0.2))}" y1="${n(Z(-0.85))}" x2="${n(X(hx + dir * 2.7))}" y2="${n(Z(-0.16))}" stroke="${pal.line}" stroke-width="2.2"/>`);
      }
      // photo-eye beam
      out.push(`<line x1="${n(X(-postX))}" y1="${n(Z(0.45))}" x2="${n(X(postX))}" y2="${n(Z(0.45))}" stroke="${pal.dim}" stroke-width="0.8" stroke-dasharray="2 5"/>`);
      out.push(`<text x="${n(X(0))}" y="${n(Z(0.45) + 14)}" fill="${pal.dim}" ${mono} font-size="9" letter-spacing="1" text-anchor="middle">PHOTO EYE BEAM</text>`);
    }
  } else {
    const x0 = -W / 2 - 0.35, x1 = W / 2 + 0.35;
    const travel = model.slideTravel;
    // closed panel
    out.push(`<rect x="${n(X(x0))}" y="${n(Z(-0.09))}" width="${n((x1 + tail - x0) * S)}" height="${n(0.18 * S)}" fill="${pal.line}" stroke="${pal.line}"/>`);
    // open position ghost
    out.push(`<rect x="${n(X(x0 + travel))}" y="${n(Z(-0.09))}" width="${n((x1 + tail - x0) * S)}" height="${n(0.18 * S)}" fill="none" stroke="${pal.dim}" stroke-width="1" stroke-dasharray="6 5"/>`);
    out.push(sq(x0 - 0.42, 0, 0.5, pal.line));
    out.push(sq(x1 + 0.9, -0.42, 0.5, pal.line));
    out.push(sq(x1 + tail - 0.6, -0.42, 0.5, pal.line));
    if (spec.automation) {
      const ox = (x1 + 0.9 + x1 + tail - 0.6) / 2;
      out.push(`<rect x="${n(X(ox - 0.6))}" y="${n(Z(-1.72))}" width="${n(1.2 * S)}" height="${n(1.1 * S)}" fill="${pal.bg}" stroke="${pal.line}" stroke-width="1.1"/>`);
      out.push(`<text x="${n(X(ox))}" y="${n(Z(-1.95))}" fill="${pal.muted}" ${mono} font-size="9" letter-spacing="1" text-anchor="middle">OPERATOR ON PAD</text>`);
      out.push(`<line x1="${n(X(x0 - 0.42))}" y1="${n(Z(0.5))}" x2="${n(X(x1 + 0.9))}" y2="${n(Z(0.5))}" stroke="${pal.dim}" stroke-width="0.8" stroke-dasharray="2 5"/>`);
    }
    // travel dimension
    const dz = Z(-2.6);
    out.push(`<line x1="${n(X(x1))}" y1="${n(dz)}" x2="${n(X(x1 + tail + travel))}" y2="${n(dz)}" stroke="${pal.dim}" stroke-width="0.9"/>`);
    for (const x of [x1, x1 + tail + travel]) out.push(`<line x1="${n(X(x) - 5)}" y1="${n(dz + 5)}" x2="${n(X(x) + 5)}" y2="${n(dz - 5)}" stroke="${pal.dim}" stroke-width="1.2"/>`);
    out.push(`<text x="${n(X(x1 + (tail + travel) / 2))}" y="${n(dz - 8)}" fill="${pal.dim}" ${mono} font-size="11" letter-spacing="1" text-anchor="middle">RUN-BACK ALONG FENCE LINE ${ftIn(tail + travel)}</text>`);
    out.push(`<text x="${n(X(0))}" y="${n(Z(-1.3))}" fill="${pal.muted}" ${mono} font-size="10" letter-spacing="1" text-anchor="middle">NO SWING CLEARANCE NEEDED</text>`);
  }

  // opening dimension on the street side
  const oy = Z(1.25);
  out.push(`<line x1="${n(X(-W / 2))}" y1="${n(oy)}" x2="${n(X(W / 2))}" y2="${n(oy)}" stroke="${pal.dim}" stroke-width="0.9"/>`);
  for (const x of [-W / 2, W / 2]) out.push(`<line x1="${n(X(x) - 5)}" y1="${n(oy + 5)}" x2="${n(X(x) + 5)}" y2="${n(oy - 5)}" stroke="${pal.dim}" stroke-width="1.2"/>`);
  out.push(`<rect x="${n(X(0) - 78)}" y="${n(oy - 8)}" width="156" height="16" fill="${pal.bg}"/>`);
  out.push(`<text x="${n(X(0))}" y="${n(oy + 4)}" fill="${pal.dim}" ${mono} font-size="11" letter-spacing="1.1" text-anchor="middle">CLEAR OPENING ${ftIn(W)}</text>`);

  return {
    viewBox: `0 0 ${n(width)} ${n(height)}`, width: n(width), height: n(height), body: out.join(''),
    description: `Concept plan view of a ${describeSpec(spec)} showing ${isSlide ? 'slide travel along the fence line' : 'the swing arc and clearance on the property side'}. Not for construction.`,
  };
}

/**
 * Concept drawings for fabrication pages. Same visual language as the
 * gate drawings: hidden-line elevations, ember dimension lines, a title
 * block and a "not for construction" stamp. Generated at build time.
 */
import type { DrawingResult, DrawingTheme } from './drawing';

const pals = {
  dark: { bg: '#131415', line: '#e9e6dc', faint: 'rgba(233,230,220,0.28)', dim: '#e0703a', solid: '#e9e6dc', tone: '#8f4a26', text: '#e9e6dc', muted: '#8d929a' },
  light: { bg: '#f6f3ec', line: '#131415', faint: 'rgba(19,20,21,0.3)', dim: '#a9481a', solid: '#1d1e20', tone: '#c9bfae', text: '#131415', muted: '#55595f' },
};
const r2 = (v: number) => Math.round(v * 100) / 100;
const MONO = `font-family="'IBM Plex Mono',ui-monospace,monospace"`;

class Sheet {
  out: string[] = [];
  p: (typeof pals)['dark'];
  h: number;
  constructor(public w: number, h: number, theme: DrawingTheme) {
    this.h = h + 62; // band for the title block below the drawing
    this.p = pals[theme];
    this.out.push(`<rect width="${w}" height="${this.h}" fill="${this.p.bg}"/>`);
  }
  rect(x: number, y: number, w: number, h: number, o: { fill?: string; stroke?: string; sw?: number; dash?: string } = {}) {
    this.out.push(`<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${o.fill ?? this.p.bg}" stroke="${o.stroke ?? this.p.line}" stroke-width="${o.sw ?? 1}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`);
  }
  line(x1: number, y1: number, x2: number, y2: number, o: { stroke?: string; sw?: number; dash?: string } = {}) {
    this.out.push(`<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${o.stroke ?? this.p.line}" stroke-width="${o.sw ?? 1}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`);
  }
  poly(pts: [number, number][], o: { fill?: string; stroke?: string; sw?: number } = {}) {
    this.out.push(`<polygon points="${pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' ')}" fill="${o.fill ?? this.p.bg}" stroke="${o.stroke ?? this.p.line}" stroke-width="${o.sw ?? 1}" stroke-linejoin="round"/>`);
  }
  circle(x: number, y: number, r: number, o: { fill?: string; stroke?: string; sw?: number } = {}) {
    this.out.push(`<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" fill="${o.fill ?? this.p.bg}" stroke="${o.stroke ?? this.p.line}" stroke-width="${o.sw ?? 1}"/>`);
  }
  path(d: string, o: { fill?: string; stroke?: string; sw?: number; dash?: string } = {}) {
    this.out.push(`<path d="${d}" fill="${o.fill ?? 'none'}" stroke="${o.stroke ?? this.p.line}" stroke-width="${o.sw ?? 1}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`);
  }
  text(x: number, y: number, s: string, o: { size?: number; fill?: string; anchor?: string; rot?: number; weight?: number } = {}) {
    this.out.push(`<text x="${r2(x)}" y="${r2(y)}" fill="${o.fill ?? this.p.muted}" ${MONO} font-size="${o.size ?? 10}" font-weight="${o.weight ?? 400}" letter-spacing="1.1" text-anchor="${o.anchor ?? 'start'}"${o.rot ? ` transform="rotate(${o.rot} ${r2(x)} ${r2(y)})"` : ''}>${s}</text>`);
  }
  dimH(x1: number, x2: number, y: number, label: string) {
    const d = this.p.dim;
    this.line(x1, y, x2, y, { stroke: d, sw: 0.9 });
    for (const x of [x1, x2]) {
      this.line(x, y - 9, x, y + 9, { stroke: d, sw: 0.6 });
      this.line(x - 4.5, y + 4.5, x + 4.5, y - 4.5, { stroke: d, sw: 1.2 });
    }
    const tw = label.length * 7.4 + 14;
    this.rect((x1 + x2) / 2 - tw / 2, y - 8, tw, 16, { stroke: 'none' });
    this.text((x1 + x2) / 2, y + 4, label, { fill: d, anchor: 'middle', size: 11 });
  }
  dimV(y1: number, y2: number, x: number, label: string) {
    const d = this.p.dim;
    this.line(x, y1, x, y2, { stroke: d, sw: 0.9 });
    for (const y of [y1, y2]) {
      this.line(x - 9, y, x + 9, y, { stroke: d, sw: 0.6 });
      this.line(x - 4.5, y + 4.5, x + 4.5, y - 4.5, { stroke: d, sw: 1.2 });
    }
    const tw = label.length * 7.4 + 14;
    const cy = (y1 + y2) / 2;
    this.rect(x - 8, cy - tw / 2, 16, tw, { stroke: 'none' });
    this.text(x + 4, cy, label, { fill: d, anchor: 'middle', size: 11, rot: -90 });
  }
  note(x: number, y: number, tx: number, ty: number, label: string, anchor: 'start' | 'end' = 'start') {
    this.line(x, y, tx, ty, { stroke: this.p.dim, sw: 0.7 });
    this.circle(x, y, 2.2, { fill: this.p.dim, stroke: 'none' });
    this.text(tx + (anchor === 'start' ? 6 : -6), ty + 4, label, { anchor, fill: this.p.text, size: 10 });
  }
  ground(y: number, x1 = 30, x2 = this.w - 30) {
    this.line(x1, y, x2, y, { sw: 1.4 });
    for (let x = x1 + 14; x < x2; x += 18) this.line(x, y, x - 8, y + 7, { stroke: this.p.faint, sw: 0.8 });
  }
  titleBlock(title: string, dwg: string) {
    const bw = Math.min(this.w - 24, 470);
    const bx = this.w - bw - 12;
    const by = this.h - 58;
    this.rect(bx, by, bw, 46, { stroke: this.p.faint });
    this.line(bx + bw * 0.52, by, bx + bw * 0.52, by + 46, { stroke: this.p.faint });
    this.line(bx + bw * 0.78, by, bx + bw * 0.78, by + 46, { stroke: this.p.faint });
    this.text(bx + 10, by + 18, 'IDAHO GATE CO.', { size: 11, fill: this.p.text, weight: 500 });
    this.text(bx + 10, by + 34, title.toUpperCase().slice(0, 30), { size: 9 });
    this.text(bx + bw * 0.52 + 10, by + 18, `DWG ${dwg}`, { fill: this.p.text });
    this.text(bx + bw * 0.52 + 10, by + 34, 'SCALE NTS', { size: 9 });
    this.text(bx + bw * 0.78 + 10, by + 18, 'CONCEPT', { fill: this.p.dim, weight: 500 });
    this.text(bx + bw * 0.78 + 10, by + 34, 'NOT FOR CONSTR.', { size: 8 });
  }
  done(description: string): DrawingResult {
    return { viewBox: `0 0 ${this.w} ${this.h}`, width: this.w, height: this.h, body: this.out.join(''), description: `${description} Concept drawing, not for construction.` };
  }
}

type Maker = (theme: DrawingTheme) => DrawingResult;

const railing: Maker = (theme) => {
  const s = new Sheet(900, 520, theme);
  const gy = 380, top = 200, x0 = 110, x1 = 790;
  // deck edge
  s.rect(70, gy, 760, 26, { stroke: s.p.faint });
  s.line(70, gy, 830, gy, { sw: 1.4 });
  // cable infill
  for (let i = 1; i <= 9; i++) s.line(x0, top + 14 + i * 15.5, x1, top + 14 + i * 15.5, { stroke: s.p.faint, sw: 0.9 });
  // posts and rails
  const posts = [x0, 280, 450, 620, x1];
  for (const x of posts) {
    s.rect(x - 7, top, 14, gy - top);
    s.rect(x - 18, gy - 8, 36, 8, { fill: s.p.solid });
  }
  s.rect(x0 - 12, top - 12, x1 - x0 + 24, 12, { fill: s.p.solid });
  s.rect(x0, gy - 34, x1 - x0, 7);
  s.dimH(280, 450, top - 52, 'POST SPACING');
  s.dimV(top - 12, gy, x1 + 58, 'GUARD HEIGHT PER CODE');
  s.note(365, top + 60, 520, 120, 'STAINLESS CABLE INFILL, TENSIONED AT END POSTS');
  s.note(450, gy - 4, 300, 450, 'BASE PLATE, ANCHORED TO STRUCTURE', 'end');
  s.note(620, top - 6, 700, 150, 'FLAT BAR TOP RAIL');
  s.titleBlock('Guard railing, cable infill', 'IG-F01');
  return s.done('Elevation of a steel guard railing with cable infill, base-plated posts and a flat bar top rail.');
};

const stairRail: Maker = (theme) => {
  const s = new Sheet(900, 560, theme);
  const steps = 7, run = 62, rise = 34, sx = 150, sy = 440;
  const pts: [number, number][] = [[sx, sy]];
  for (let i = 0; i < steps; i++) {
    pts.push([sx + i * run, sy - (i + 1) * rise]);
    pts.push([sx + (i + 1) * run, sy - (i + 1) * rise]);
  }
  const ex = sx + steps * run, ey = sy - steps * rise;
  pts.push([ex + 150, ey], [ex + 150, ey + 24], [ex, ey + 24], [sx + 40, sy + 24], [sx - 60, sy + 24], [sx - 60, sy]);
  s.poly(pts, { stroke: s.p.line });
  s.ground(sy + 24, 40, 420);
  // rail posts at nosings
  const h = 118;
  const railY = (x: number) => sy - ((x - sx) / run) * rise - h;
  for (let i = 0; i <= steps; i += 1) {
    const x = sx + i * run + 8;
    const base = sy - Math.min(steps, i + 1) * rise + (i === steps ? 0 : 0);
    if (i % 3 === 0 || i === steps) s.rect(x - 5, railY(x) + 4, 10, base - railY(x) - 4, { fill: s.p.solid });
    else for (const dx of [0, 21, 42]) s.line(x + dx, railY(x + dx) + 8, x + dx, base, { sw: 1.6 });
  }
  s.path(`M ${sx - 40} ${railY(sx - 40) + rise * 0.65} L ${sx} ${railY(sx)} L ${ex + 8} ${railY(ex + 8)} L ${ex + 150} ${railY(ex + 8)}`, { sw: 6, stroke: s.p.solid });
  s.path(`M ${sx} ${railY(sx) + 86} L ${ex + 8} ${railY(ex + 8) + 86}`, { sw: 2 });
  s.dimV(ey - h, ey, ex + 196, 'RAIL HEIGHT PER CODE');
  s.dimH(sx + 2 * run, sx + 3 * run, sy - 2 * rise + 70, 'RUN');
  s.note(sx + 3.5 * run, railY(sx + 3.5 * run), 330, 110, 'CONTINUOUS GRASPABLE HANDRAIL', 'end');
  s.note(sx - 30, railY(sx - 40) + 40, 60, 200, 'RAIL EXTENSION');
  s.note(sx + 4 * run + 30, sy - 5 * rise + 40, 600, 420, 'PICKETS FIELD-FIT TO STRINGER');
  s.titleBlock('Stair railing', 'IG-F02');
  return s.done('Elevation of a steel stair railing with a continuous graspable handrail following the stair pitch.');
};

const screen: Maker = (theme) => {
  const s = new Sheet(900, 540, theme);
  const gy = 430;
  s.ground(gy);
  const panels = [[120, 150, 200, 280], [340, 150, 200, 280], [560, 150, 200, 280]] as const;
  panels.forEach(([x, y, w, h], pi) => {
    s.rect(x, y, w, h, { sw: 1.3 });
    // cut pattern: staggered slots that thin out toward the top
    for (let row = 0; row < 11; row++) {
      const yy = y + 18 + row * 23;
      const cols = 6;
      for (let c = 0; c < cols; c++) {
        const len = 8 + ((row * 7 + c * 5 + pi * 3) % 5) * 4.5 * (1 - row / 16);
        const xx = x + 16 + c * 29 + (row % 2 ? 12 : 0);
        if (xx + len < x + w - 10) s.rect(xx, yy, len, 6, { fill: s.p.tone, stroke: s.p.line, sw: 0.7 });
      }
    }
    s.rect(x - 14, y - 10, 10, gy - y + 10, { fill: s.p.solid });
  });
  s.rect(766, 140, 10, gy - 140, { fill: s.p.solid });
  s.dimH(120, 320, 100, 'PANEL MODULE');
  s.dimV(150, gy, 830, 'SCREEN HEIGHT');
  s.note(230, 300, 60, 490, 'CNC-CUT PATTERN FROM YOUR ARTWORK');
  s.note(555, 250, 500, 512, 'TUBE POSTS, PANELS STAND OFF FOR SHADOW');
  s.titleBlock('Privacy screen, cut pattern', 'IG-F03');
  return s.done('Elevation of three CNC-cut steel privacy screen panels mounted between tube posts.');
};

const enclosure: Maker = (theme) => {
  const s = new Sheet(900, 540, theme);
  const gy = 420;
  s.ground(gy);
  // side wall
  s.rect(110, 190, 190, gy - 190);
  for (let i = 0; i < 9; i++) s.line(110, 206 + i * 24, 300, 206 + i * 24, { stroke: s.p.faint });
  // gate opening with two leaves
  for (const [x, w] of [[310, 180], [494, 180]] as const) {
    s.rect(x, 200, w, gy - 212, { sw: 1.3 });
    for (let i = 0; i < 9; i++) s.rect(x + 8, 210 + i * 22, w - 16, 15, { fill: s.p.tone, sw: 0.7 });
    s.line(x + 8, gy - 20, x + w - 8, 208, { sw: 1.1 });
  }
  for (const x of [300, 674]) s.rect(x, 180, 10, gy - 180, { fill: s.p.solid });
  s.rect(684, 190, 110, gy - 190);
  for (let i = 0; i < 9; i++) s.line(684, 206 + i * 24, 794, 206 + i * 24, { stroke: s.p.faint });
  // cane bolts and bollard
  s.line(486, gy - 80, 486, gy + 4, { sw: 3 });
  s.rect(820, 300, 22, gy - 300, { fill: s.p.solid });
  s.dimH(310, 674, 140, 'CLEAR OPENING FOR HAULER ACCESS');
  s.dimV(200, gy, 70, 'SCREEN HEIGHT');
  s.note(400, 300, 330, 480, 'SLAT INFILL HIDES CONTENTS, DRAINS FREELY', 'end');
  s.note(486, gy - 50, 560, 510, 'CANE BOLTS HOLD LEAVES OPEN');
  s.note(831, 310, 760, 110, 'IMPACT BOLLARD', 'end');
  s.titleBlock('Equipment enclosure with gates', 'IG-F04');
  return s.done('Elevation of a slatted steel equipment or refuse enclosure with a double gate and an impact bollard.');
};

const structural: Maker = (theme) => {
  const s = new Sheet(900, 540, theme);
  const gy = 430;
  s.ground(gy);
  const cols = [170, 730];
  // beam (wide flange in elevation)
  s.rect(140, 150, 620, 44);
  s.line(140, 158, 760, 158);
  s.line(140, 186, 760, 186);
  for (const x of cols) {
    s.rect(x - 17, 194, 34, gy - 204);
    s.line(x - 9, 194, x - 9, gy - 10, { stroke: s.p.faint });
    s.line(x + 9, 194, x + 9, gy - 10, { stroke: s.p.faint });
    s.rect(x - 38, gy - 10, 76, 10, { fill: s.p.solid });
    for (const dx of [-27, 27]) s.line(x + dx, gy - 16, x + dx, gy + 26, { sw: 2 });
    // knee braces
    const d = x < 400 ? 1 : -1;
    s.poly([[x + d * 17, 290], [x + d * 17, 306], [x + d * 110, 202], [x + d * 96, 194]]);
    // stiffeners and bolts
    s.line(x, 158, x, 186);
    for (const dy of [164, 180]) for (const dx of [-8, 8]) s.circle(x + dx, dy, 2, { fill: s.p.solid, stroke: 'none' });
  }
  s.rect(380, 140, 140, 10, { fill: s.p.tone });
  s.dimH(170, 730, 96, 'COLUMN SPACING PER PLAN');
  s.dimV(194, gy, 820, 'CLEAR HEIGHT');
  s.note(250, 230, 330, 330, 'KNEE BRACE, BOLTED CONNECTION');
  s.note(170, gy - 5, 300, 480, 'BASE PLATE ON ANCHOR RODS');
  s.note(450, 172, 480, 250, 'BEAM AND CONNECTIONS PER ENGINEER OF RECORD');
  s.titleBlock('Steel frame, shop fabricated', 'IG-F05');
  return s.done('Elevation of a shop-fabricated steel frame with wide flange beam, columns, knee braces and base plates.');
};

const bracket: Maker = (theme) => {
  const s = new Sheet(900, 520, theme);
  // front view
  s.rect(110, 150, 250, 250, { sw: 1.3 });
  for (const [x, y] of [[150, 190], [320, 190], [150, 360], [320, 360]]) {
    s.circle(x, y, 12);
    s.line(x - 18, y, x + 18, y, { stroke: s.p.faint, sw: 0.6 });
    s.line(x, y - 18, x, y + 18, { stroke: s.p.faint, sw: 0.6 });
  }
  s.rect(222, 150, 26, 250, { fill: s.p.tone });
  s.dimH(150, 320, 110, 'BOLT PATTERN');
  s.dimV(190, 360, 70, 'BOLT PATTERN');
  s.text(235, 432, 'FRONT', { anchor: 'middle' });
  // side view with gusset
  s.rect(520, 150, 22, 250, { fill: s.p.solid });
  s.poly([[542, 180], [742, 262], [742, 288], [542, 370]], { fill: s.p.tone });
  s.rect(742, 240, 22, 70, { fill: s.p.solid });
  s.circle(600, 275, 16);
  s.text(640, 432, 'SIDE', { anchor: 'middle' });
  s.dimH(542, 742, 110, 'REACH');
  // weld callouts
  s.note(542, 210, 610, 150, 'FILLET WELD BOTH SIDES');
  s.note(600, 275, 690, 360, 'LIGHTENING HOLE');
  s.note(235, 275, 420, 300, 'GUSSET PLATE');
  s.titleBlock('Custom bracket, plate and gusset', 'IG-F06');
  return s.done('Front and side views of a custom steel bracket with a drilled base plate and welded gusset.');
};

const gangway: Maker = (theme) => {
  const s = new Sheet(900, 520, theme);
  const y0 = 300, y1 = 360;
  // shore abutment and dock float
  s.rect(40, y0 + 10, 130, 120, { stroke: s.p.faint });
  s.rect(730, y1 + 22, 150, 34);
  s.path(`M 620 ${y1 + 44} q 20 -8 40 0 t 40 0 t 40 0`, { stroke: s.p.faint });
  s.path(`M 170 ${y1 + 64} q 25 -9 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0`, { stroke: s.p.faint });
  // deck stringer
  s.poly([[150, y0], [760, y1], [760, y1 + 16], [150, y0 + 16]], { sw: 1.3 });
  const deckY = (x: number) => y0 + ((x - 150) / 610) * (y1 - y0);
  // truss rail
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const x = 150 + (610 * i) / n;
    s.line(x, deckY(x), x, deckY(x) - 104, { sw: 1.6 });
    if (i < n) {
      const x2 = 150 + (610 * (i + 1)) / n;
      s.line(x, deckY(x) - (i % 2 ? 104 : 0), x2, deckY(x2) - (i % 2 ? 0 : 104), { stroke: s.p.line, sw: 0.9 });
    }
  }
  s.path(`M 150 ${y0 - 104} L 760 ${y1 - 104}`, { sw: 5, stroke: s.p.solid });
  s.path(`M 150 ${y0 - 52} L 760 ${y1 - 52}`, { sw: 1.4 });
  s.circle(150, y0 + 8, 9, { fill: s.p.solid });
  s.circle(752, y1 + 20, 7);
  s.dimH(150, 760, 150, 'SPAN TO SUIT WATER LEVEL RANGE');
  s.note(150, y0 + 8, 60, 172, 'HINGED SHORE CONNECTION');
  s.note(752, y1 + 20, 880, 462, 'ROLLERS RIDE THE FLOAT', 'end');
  s.note(460, deckY(460) - 60, 420, 440, 'WELDED ALUMINUM TRUSS, NON-SLIP DECK', 'end');
  s.titleBlock('Aluminum dock gangway', 'IG-F07');
  return s.done('Elevation of a welded aluminum dock gangway with truss handrails, hinged at shore and rolling on the float.');
};

const canopy: Maker = (theme) => {
  const s = new Sheet(900, 540, theme);
  const gy = 440;
  s.ground(gy);
  // wall
  s.rect(90, 90, 90, gy - 90, { stroke: s.p.faint });
  for (let i = 0; i < 7; i++) s.line(90, 130 + i * 48, 180, 130 + i * 48, { stroke: s.p.faint, sw: 0.6 });
  // door
  s.rect(230, 250, 150, gy - 250, { stroke: s.p.faint });
  // canopy frame
  s.rect(180, 196, 420, 22, { fill: s.p.solid });
  s.rect(180, 186, 420, 10, { fill: s.p.tone });
  for (const x of [240, 330, 420, 510]) s.line(x, 196, x, 218, { stroke: s.p.bg, sw: 1 });
  // tie rods
  s.line(180, 112, 560, 196, { sw: 1.8 });
  s.circle(180, 112, 6, { fill: s.p.solid });
  s.circle(560, 196, 5, { fill: s.p.solid });
  s.rect(180, 200, 14, 34, { fill: s.p.solid });
  // glazing ticks
  for (let x = 196; x < 596; x += 18) s.line(x, 186, x + 8, 178, { stroke: s.p.faint, sw: 0.7 });
  s.dimH(180, 600, 150, 'PROJECTION');
  s.dimV(218, gy, 660, 'CLEAR HEIGHT');
  s.note(370, 154, 520, 80, 'TIE RODS WITH CLEVIS ENDS');
  s.note(187, 217, 300, 500, 'WALL PLATE ANCHORED TO STRUCTURE');
  s.note(460, 207, 700, 300, 'STEEL FRAME, FINISH TO MATCH GATE');
  s.titleBlock('Entry canopy, tie-rod hung', 'IG-F08');
  return s.done('Side elevation of a steel entry canopy hung from the building wall on tie rods.');
};

const bollards: Maker = (theme) => {
  const s = new Sheet(900, 520, theme);
  const gy = 380;
  s.ground(gy);
  // rail guard
  for (const x of [110, 290, 470]) {
    s.rect(x - 9, 250, 18, gy - 250, { fill: s.p.solid });
    s.rect(x - 22, gy - 8, 44, 8);
  }
  s.rect(110, 262, 360, 16);
  s.rect(110, 320, 360, 16);
  // bollards with footings
  for (const x of [580, 680, 780]) {
    s.rect(x - 15, 240, 30, gy - 240);
    s.path(`M ${x - 15} 240 q 15 -18 30 0`, { fill: s.p.bg });
    s.rect(x - 15, 262, 30, 12, { fill: s.p.dim, stroke: 'none' });
    s.rect(x - 32, gy, 64, 86, { dash: '5 4', fill: 'none' });
  }
  s.dimH(580, 680, 200, 'SPACING PER SITE PLAN');
  s.dimV(240, gy, 840, 'EXPOSED HEIGHT');
  s.note(290, 270, 200, 190, 'TWO-RAIL GUARD PROTECTS EQUIPMENT');
  s.note(680, 420, 560, 490, 'EMBEDDED IN CONCRETE BELOW GRADE', 'end');
  s.titleBlock('Guard rail and bollards', 'IG-F09');
  return s.done('Elevation of a two-rail steel equipment guard and a row of embedded steel bollards.');
};

const entryArch: Maker = (theme) => {
  const s = new Sheet(900, 560, theme);
  const gy = 460;
  s.ground(gy);
  for (const x of [150, 750]) {
    s.rect(x - 16, 150, 32, gy - 150);
    s.rect(x - 34, gy, 68, 62, { dash: '5 4', fill: 'none' });
    s.rect(x - 30, gy - 10, 60, 10, { fill: s.p.solid });
  }
  // top beam and sign panel
  s.rect(110, 120, 680, 30, { fill: s.p.solid });
  s.rect(250, 168, 400, 76, { sw: 1.3 });
  // ridgeline cut in the sign
  s.poly([[262, 232], [300, 204], [326, 216], [372, 184], [408, 208], [450, 178], [492, 206], [530, 190], [574, 214], [606, 198], [638, 232]], { fill: s.p.tone });
  s.text(450, 262, 'YOUR RANCH NAME, CUT FROM PLATE', { anchor: 'middle', fill: s.p.text });
  for (const x of [270, 630]) s.line(x, 150, x, 168, { sw: 2 });
  // knee braces
  s.poly([[166, 230], [166, 246], [236, 150], [222, 150]]);
  s.poly([[734, 230], [734, 246], [664, 150], [678, 150]]);
  s.dimH(166, 734, 80, 'CLEAR WIDTH FOR TRUCKS AND TRAILERS');
  s.dimV(150, gy, 830, 'CLEAR HEIGHT');
  s.note(450, 206, 420, 330, 'PLASMA-CUT SIGN PANEL', 'end');
  s.note(150, gy + 30, 300, 520, 'POSTS SET IN CONCRETE BELOW FROST DEPTH');
  s.titleBlock('Ranch entry arch with sign', 'IG-F10');
  return s.done('Elevation of a steel ranch entry arch with a plasma-cut sign panel hung from the top beam.');
};

export const fabDrawings: Record<string, Maker> = {
  railing, 'stair-rail': stairRail, screen, enclosure, structural, bracket, gangway, canopy, bollards, 'entry-arch': entryArch,
};

export function fabDrawing(key: string, theme: DrawingTheme = 'dark'): DrawingResult {
  const make = fabDrawings[key];
  if (!make) throw new Error(`Unknown fabrication drawing "${key}"`);
  return make(theme);
}

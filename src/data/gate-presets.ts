/**
 * Named concept gates. Each preset is a GateSpec that the drawing
 * generator and the 3D studio both understand, so a page can show the
 * same design as an elevation, a plan and a rendered model.
 */
import type { GateSpec } from '@/lib/gate-model';

export interface GatePreset {
  title: string;
  dwg: string;
  spec: GateSpec;
}

export const gatePresets: Record<string, GatePreset> = {
  'estate-ridgeline': {
    title: 'Arched estate gate, ridgeline panels',
    dwg: 'IG-C01',
    spec: { operation: 'double-swing', width: 16, height: 6, top: 'arch', archRise: 1.2, infill: 'ridgeline', posts: 'masonry', automation: true },
  },
  'driveway-picket': {
    title: 'Arched driveway gate, picket infill',
    dwg: 'IG-C02',
    spec: { operation: 'double-swing', width: 14, height: 5.5, top: 'arch', archRise: 0.8, infill: 'pickets', posts: 'steel', automation: true },
  },
  'modern-slat': {
    title: 'Flat-top gate, horizontal slats',
    dwg: 'IG-C03',
    spec: { operation: 'double-swing', width: 16, height: 6, top: 'flat', archRise: 0, infill: 'slats', posts: 'steel', automation: true },
  },
  'slide-slat': {
    title: 'Cantilever slide gate, horizontal slats',
    dwg: 'IG-C04',
    spec: { operation: 'slide', width: 18, height: 6, top: 'flat', archRise: 0, infill: 'slats', posts: 'steel', automation: true },
  },
  'slide-commercial': {
    title: 'Commercial cantilever slide gate',
    dwg: 'IG-C05',
    spec: { operation: 'slide', width: 24, height: 7, top: 'flat', archRise: 0, infill: 'pickets', posts: 'steel', automation: true },
  },
  'swing-single': {
    title: 'Single swing gate, picket infill',
    dwg: 'IG-C06',
    spec: { operation: 'single-swing', width: 12, height: 5.5, top: 'flat', archRise: 0, infill: 'pickets', posts: 'steel', automation: true },
  },
  'ranch-double': {
    title: 'Ranch entry gate, rails and brace',
    dwg: 'IG-C07',
    spec: { operation: 'double-swing', width: 16, height: 4.6, top: 'flat', archRise: 0, infill: 'ranch', posts: 'masonry', automation: false },
  },
  pedestrian: {
    title: 'Pedestrian gate, arched top',
    dwg: 'IG-C08',
    spec: { operation: 'single-swing', width: 4, height: 5.6, top: 'arch', archRise: 0.45, infill: 'pickets', posts: 'steel', automation: false },
  },
  'privacy-plate': {
    title: 'Privacy gate, sheet panels with view band',
    dwg: 'IG-C09',
    spec: { operation: 'double-swing', width: 14, height: 6.5, top: 'flat', archRise: 0, infill: 'plate', posts: 'steel', automation: true },
  },
  'estate-pillars': {
    title: 'Estate gate between stone pillars',
    dwg: 'IG-C10',
    spec: { operation: 'double-swing', width: 18, height: 6.5, top: 'arch', archRise: 1.5, infill: 'pickets', posts: 'masonry', automation: true },
  },
  'automated-swing': {
    title: 'Automated swing gate, operator layout',
    dwg: 'IG-C11',
    spec: { operation: 'double-swing', width: 16, height: 6, top: 'flat', archRise: 0, infill: 'pickets', posts: 'steel', automation: true },
  },
  'ranch-single': {
    title: 'Single ranch gate',
    dwg: 'IG-C12',
    spec: { operation: 'single-swing', width: 14, height: 4.6, top: 'flat', archRise: 0, infill: 'ranch', posts: 'steel', automation: false },
  },
};

export const presetKeys = Object.keys(gatePresets);

import { getCollection, type CollectionEntry } from 'astro:content';
import { enabledDivisions } from '@/data/nav';

export type ServiceEntry = CollectionEntry<'services'>;

/** id is "<division>/<slug>" because files live in division folders. */
export const serviceSlug = (e: ServiceEntry) => e.id.split('/').pop()!;
export const servicePath = (e: ServiceEntry) => `/${e.data.division}/${serviceSlug(e)}/`;

export async function getServices() {
  const enabled = new Set(enabledDivisions.map((d) => d.slug));
  const all = await getCollection('services');
  return all
    .filter((e) => enabled.has(e.data.division))
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

export async function getServicesByDivision(division: string) {
  return (await getServices()).filter((e) => e.data.division === division);
}

/** Resolve an internal path to a display title, for related-link lists. */
export async function titleIndex(): Promise<Record<string, { title: string; summary: string; kind: string }>> {
  const idx: Record<string, { title: string; summary: string; kind: string }> = {};
  for (const e of await getServices()) {
    idx[servicePath(e)] = { title: e.data.navTitle || e.data.title, summary: e.data.summary, kind: 'Service' };
  }
  for (const e of await getCollection('industries')) {
    idx[`/industries/${e.id}/`] = { title: e.data.navTitle || e.data.title, summary: e.data.summary, kind: 'Industry' };
  }
  for (const e of await getCollection('guides')) {
    idx[`/resources/${e.id}/`] = { title: e.data.navTitle || e.data.title, summary: e.data.summary, kind: 'Guide' };
  }
  for (const e of await getCollection('areas')) {
    idx[`/service-area/${e.id}/`] = { title: e.data.navTitle || e.data.title, summary: e.data.summary, kind: 'Service area' };
  }
  for (const e of await getCollection('concepts')) {
    idx[`/projects/${e.id}/`] = { title: e.data.navTitle || e.data.title, summary: e.data.summary, kind: 'Concept study' };
  }
  const statics: [string, string, string][] = [
    ['/quote/', 'Request a quote', 'Tell us about the opening. Under a minute.'],
    ['/studio/', 'Gate studio', 'Configure a gate in 3D and send it with your quote request.'],
    ['/faq/', 'Frequently asked questions', 'Straight answers on design, automation, permits and upkeep.'],
    ['/service-area/', 'Service area', 'Where we design, build and install.'],
    ['/projects/', 'Projects and concept studies', 'Design studies that show how we think through an entrance.'],
    ['/company/about/', 'About us', 'Who builds your gate.'],
    ['/company/approach/', 'Our approach', 'How we run a project from first call to handover.'],
    ['/company/design-engineering/', 'Design and engineering', 'Drawings before steel.'],
    ['/company/fabrication-process/', 'Fabrication process', 'Cut, fit, weld, finish.'],
    ['/company/materials-finishes/', 'Materials and finishes', 'Steel, aluminum and the coatings that protect them.'],
    ['/company/capabilities/', 'Capabilities', 'What the shop can take on.'],
    ['/gates/', 'Custom gates', 'Every gate type we design and build.'],
    ['/automation/', 'Automation and access', 'Operators, access control and safety.'],
    ['/fabrication/', 'Metal fabrication', 'Steel and aluminum work beyond gates.'],
    ['/contact/', 'Contact', 'Call, write or send a quick note.'],
  ];
  for (const [p, title, summary] of statics) idx[p] = { title, summary, kind: 'Page' };
  return idx;
}

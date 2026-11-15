/**
 * Site navigation and division registry.
 *
 * Divisions are data. To add a business line: add an entry to `divisions`,
 * drop markdown files into src/content/services/<division-slug>/ and the
 * hub page, detail pages, navigation, footer and sitemap pick it up.
 * To retire one, set `enabled: false`.
 */

export type InquiryPath = 'gates' | 'fabrication' | 'commercial' | 'repairs';

export interface Division {
  slug: string;
  name: string;
  navLabel: string;
  enabled: boolean;
  inquiry: InquiryPath;
  kicker: string;
  summary: string;
  /** groups shown in the mega menu and hub page, in order */
  groups: { key: string; label: string }[];
}

export const divisions: Division[] = [
  {
    slug: 'gates',
    name: 'Custom gates',
    navLabel: 'Custom gates',
    enabled: true,
    inquiry: 'gates',
    kicker: 'Division 01',
    summary:
      'Driveway, estate, ranch and commercial gates designed around your opening, your grade and your winters, then fabricated and installed by the same crew.',
    groups: [
      { key: 'types', label: 'Gate types' },
      { key: 'finishing', label: 'Finishing the entrance' },
      { key: 'service', label: 'Service' },
    ],
  },
  {
    slug: 'automation',
    name: 'Automation and access',
    navLabel: 'Automation',
    enabled: true,
    inquiry: 'gates',
    kicker: 'Division 02',
    summary:
      'Operators, access control and safety devices specified for the gate they move. New systems, retrofits and troubleshooting.',
    groups: [{ key: 'systems', label: 'Systems' }],
  },
  {
    slug: 'fabrication',
    name: 'Metal fabrication',
    navLabel: 'Fabrication',
    enabled: true,
    inquiry: 'fabrication',
    kicker: 'Division 03',
    summary:
      'Steel and aluminum fabrication for builders, businesses and property owners. Railings, architectural metalwork, enclosures and one-off assemblies.',
    groups: [
      { key: 'core', label: 'Fabrication' },
      { key: 'architectural', label: 'Architectural' },
      { key: 'commercial', label: 'Commercial and industrial' },
    ],
  },
];

export const enabledDivisions = divisions.filter((d) => d.enabled);

export const companyLinks = [
  { href: '/company/about/', label: 'About us', note: 'Who builds your gate' },
  { href: '/company/approach/', label: 'Our approach', note: 'How we run a project' },
  { href: '/company/design-engineering/', label: 'Design and engineering', note: 'Drawings before steel' },
  { href: '/company/fabrication-process/', label: 'Fabrication process', note: 'Cut, fit, weld, finish' },
  { href: '/company/materials-finishes/', label: 'Materials and finishes', note: 'Steel, aluminum, coatings' },
  { href: '/company/capabilities/', label: 'Capabilities', note: 'What the shop can take on' },
];

export const industryLinks = [
  { href: '/industries/residential/', label: 'Residential' },
  { href: '/industries/commercial/', label: 'Commercial' },
  { href: '/industries/agricultural-and-ranch/', label: 'Agricultural and ranch' },
  { href: '/industries/industrial/', label: 'Industrial' },
  { href: '/industries/builders-and-developers/', label: 'Builders and developers' },
  { href: '/industries/hospitality-and-recreation/', label: 'Hospitality and recreation' },
];

export const resourceLinks = [
  { href: '/resources/gate-design-guide/', label: 'Gate design guide' },
  { href: '/resources/materials-guide/', label: 'Materials guide' },
  { href: '/resources/gate-automation-guide/', label: 'Gate automation guide' },
  { href: '/resources/custom-gate-cost/', label: 'What a custom gate costs' },
  { href: '/resources/swing-vs-sliding-gates/', label: 'Swing vs sliding gates' },
  { href: '/resources/gates-in-snow-and-ice/', label: 'Gates in snow and ice' },
  { href: '/faq/', label: 'Frequently asked questions' },
  { href: '/resources/', label: 'All articles and guides' },
];

export const contactLinks = [
  { href: '/quote/', label: 'Request a quote' },
  { href: '/contact/', label: 'Discuss a project' },
  { href: '/service-area/', label: 'Service area' },
  { href: '/studio/', label: 'Gate studio' },
];

export const inquiryPaths: Record<InquiryPath, { label: string; short: string; blurb: string }> = {
  gates: {
    label: 'A custom gate',
    short: 'Custom gate',
    blurb: 'New driveway, estate, ranch or pedestrian gate, with or without automation.',
  },
  fabrication: {
    label: 'Metal fabrication',
    short: 'Fabrication',
    blurb: 'Railings, screens, architectural metalwork, brackets and one-off steel or aluminum work.',
  },
  commercial: {
    label: 'A commercial project',
    short: 'Commercial',
    blurb: 'Site access, security gates, enclosures and bid work for builders and facilities.',
  },
  repairs: {
    label: 'Repair or upgrade',
    short: 'Repair or upgrade',
    blurb: 'An existing gate that sags, sticks, will not open, or needs an operator or access control.',
  },
};

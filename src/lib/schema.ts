/** JSON-LD builders. Only facts present in site.config.ts are emitted. */
import { site, serviceTowns } from '@/site.config';

const abs = (path: string) => new URL(path, site.url).toString();

export function businessSchema() {
  const sameAs = [site.social.facebook, site.social.instagram, site.social.googleBusinessProfile].filter(Boolean);
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${site.url}/#business`,
    name: site.name,
    alternateName: site.formerName,
    url: site.url,
    description: site.description,
    image: abs('/og/default.jpg'),
    logo: abs('/favicon.svg'),
    address: { '@type': 'PostalAddress', addressRegion: site.contact.state, addressCountry: site.contact.country },
    areaServed: serviceTowns
      .filter((t) => t.tier !== 'project')
      .map((t) => ({ '@type': 'City', name: `${t.name}, ${t.state}` })),
    knowsAbout: [
      'Custom driveway gates', 'Automated gate systems', 'Gate operators', 'Steel fabrication',
      'Aluminum fabrication', 'Architectural metalwork', 'Railings',
    ],
  };
  // Never publish a placeholder phone number or inbox in structured data.
  if (!site.contact.phonePlaceholder) data.telephone = site.contact.phoneTel;
  if (!site.contact.emailPlaceholder) data.email = site.contact.email;
  if (sameAs.length) data.sameAs = sameAs;
  return data;
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    url: site.url,
    name: site.name,
    publisher: { '@id': `${site.url}/#business` },
  };
}

export interface Crumb {
  name: string;
  path: string;
}
export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

export function serviceSchema(opts: { name: string; description: string; path: string; serviceType?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    serviceType: opts.serviceType || opts.name,
    description: opts.description,
    url: abs(opts.path),
    provider: { '@id': `${site.url}/#business` },
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'North Idaho' },
      { '@type': 'AdministrativeArea', name: 'Inland Northwest' },
    ],
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function articleSchema(opts: { title: string; description: string; path: string; updated: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    dateModified: opts.updated,
    datePublished: opts.updated,
    mainEntityOfPage: abs(opts.path),
    author: { '@id': `${site.url}/#business` },
    publisher: { '@id': `${site.url}/#business` },
  };
}

export function imageSchema(opts: { name: string; description: string; path: string; contentUrl: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: opts.name,
    description: opts.description,
    contentUrl: abs(opts.contentUrl),
    url: abs(opts.path),
    creator: { '@id': `${site.url}/#business` },
    creditText: `${site.name} concept rendering`,
  };
}

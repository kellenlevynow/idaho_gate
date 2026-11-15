/** Finish metadata without any three.js import, safe for server rendering. */
export const finishes = [
  { key: 'matte-black', name: 'Matte black powder coat', swatch: '#1b1c1e', note: 'The standard. Zinc-rich primer under a satin black top coat.' },
  { key: 'dark-bronze', name: 'Dark bronze powder coat', swatch: '#3b2c21', note: 'Warmer than black. Sits well against timber and stone.' },
  { key: 'weathering', name: 'Weathering steel patina', swatch: '#8c4a28', note: 'Left to form its own oxide skin. No coating to maintain.' },
  { key: 'galvanized', name: 'Hot-dip galvanized', swatch: '#9ba1a7', note: 'Zinc inside and out. The long-life choice for hard service.' },
  { key: 'graphite', name: 'Graphite metallic powder coat', swatch: '#40444a', note: 'A fine metallic that reads as machined steel.' },
] as const;

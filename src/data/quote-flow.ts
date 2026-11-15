/**
 * Quote wizard definition. One flow per inquiry path.
 * The page renders these, the browser script walks them, and the server
 * uses the same labels to write the lead email, so the three never drift.
 */
import type { InquiryPath } from './nav';

export interface Choice {
  value: string;
  label: string;
  hint?: string;
}

export interface Question {
  id: string;
  label: string;
  type: 'single' | 'multi' | 'text' | 'textarea' | 'city' | 'files';
  choices?: Choice[];
  required?: boolean;
  help?: string;
  placeholder?: string;
}

export interface Step {
  id: string;
  /** short name for the progress bar and analytics */
  name: string;
  title: string;
  sub?: string;
  questions: Question[];
}

const timeline: Question = {
  id: 'timeline', label: 'When do you want it done?', type: 'single', required: true,
  choices: [
    { value: 'asap', label: 'As soon as possible' },
    { value: '1-3-months', label: 'In 1 to 3 months' },
    { value: '3-6-months', label: 'In 3 to 6 months' },
    { value: 'researching', label: 'Just researching' },
  ],
};

const budget: Question = {
  id: 'budget', label: 'Budget range, if you have one', type: 'single',
  help: 'Optional. It helps us suggest the right materials and scope on the first call.',
  choices: [
    { value: 'under-5k', label: 'Under $5,000' },
    { value: '5-10k', label: '$5,000 to $10,000' },
    { value: '10-20k', label: '$10,000 to $20,000' },
    { value: '20-40k', label: '$20,000 to $40,000' },
    { value: '40k-plus', label: '$40,000 or more' },
    { value: 'unsure', label: 'Not sure yet' },
  ],
};

const location: Step = {
  id: 'location', name: 'Location', title: 'Where is the project?',
  sub: 'City or town is enough for now. Photos help us quote faster, but they are optional.',
  questions: [
    { id: 'city', label: 'Project city or town', type: 'city', required: true, placeholder: 'Start typing, for example Hayden' },
    { id: 'files', label: 'Photos or drawings', type: 'files', help: 'Up to 4 files. JPG, PNG or PDF. A phone photo of the opening is perfect.' },
  ],
};

export const flows: Record<InquiryPath, Step[]> = {
  gates: [
    {
      id: 'type', name: 'Gate type', title: 'What kind of gate are you planning?',
      questions: [{
        id: 'gateType', label: 'Gate type', type: 'single', required: true,
        choices: [
          { value: 'driveway-swing', label: 'Driveway swing gate', hint: 'One or two leaves on hinges' },
          { value: 'sliding', label: 'Sliding gate', hint: 'Runs along the fence line' },
          { value: 'bi-fold', label: 'Bi-fold gate', hint: 'Folds for tight spaces' },
          { value: 'pedestrian', label: 'Pedestrian or walk gate', hint: 'Garden, courtyard, side yard' },
          { value: 'ranch', label: 'Ranch or farm gate', hint: 'Wide openings, equipment access' },
          { value: 'not-sure', label: 'Not sure yet', hint: 'We will help you choose' },
        ],
      }],
    },
    {
      id: 'size', name: 'Opening', title: 'About how wide is the opening?',
      sub: 'A rough number is fine. We measure on site before anything is built.',
      questions: [{
        id: 'width', label: 'Opening width', type: 'single', required: true,
        choices: [
          { value: 'under-12', label: 'Under 12 ft' },
          { value: '12-16', label: '12 to 16 ft' },
          { value: '16-20', label: '16 to 20 ft' },
          { value: '20-plus', label: '20 ft or wider' },
          { value: 'not-sure', label: 'Not sure' },
        ],
      }],
    },
    {
      id: 'style', name: 'Style', title: 'What material or style do you have in mind?',
      questions: [{
        id: 'material', label: 'Material and style', type: 'single', required: true,
        choices: [
          { value: 'wrought-iron', label: 'Wrought iron look', hint: 'Pickets, scrolls, arched tops' },
          { value: 'steel', label: 'Steel', hint: 'Clean tube frames and bar' },
          { value: 'aluminum', label: 'Aluminum', hint: 'Light, no rust' },
          { value: 'wood-steel', label: 'Wood and steel', hint: 'Timber infill in a steel frame' },
          { value: 'plasma-cut', label: 'Decorative plasma-cut', hint: 'Custom silhouettes and panels' },
          { value: 'not-sure', label: 'Not sure yet' },
        ],
      }],
    },
    {
      id: 'automation', name: 'Automation', title: 'Do you want it automated?',
      questions: [
        {
          id: 'automation', label: 'Automation', type: 'single', required: true,
          choices: [
            { value: 'yes', label: 'Yes, automated' },
            { value: 'maybe', label: 'Maybe, price it both ways' },
            { value: 'no', label: 'No, manual is fine' },
          ],
        },
        {
          id: 'addons', label: 'Anything else at the entrance?', type: 'multi', help: 'Pick any that apply.',
          choices: [
            { value: 'keypad', label: 'Keypad' },
            { value: 'intercom-app', label: 'Intercom or app access' },
            { value: 'solar', label: 'Solar power' },
            { value: 'pillars', label: 'Stone or masonry pillars' },
            { value: 'address-plate', label: 'Address plate' },
            { value: 'lighting', label: 'Post lighting' },
          ],
        },
      ],
    },
    { id: 'timing', name: 'Timing', title: 'Timing and budget', questions: [timeline, budget] },
    location,
  ],

  fabrication: [
    {
      id: 'type', name: 'Project', title: 'What do you need built?',
      questions: [{
        id: 'fabType', label: 'Fabrication type', type: 'single', required: true,
        choices: [
          { value: 'railings', label: 'Railings or handrails' },
          { value: 'screens', label: 'Privacy screens or decorative panels' },
          { value: 'architectural', label: 'Architectural metalwork', hint: 'Canopies, entry arches, trellises' },
          { value: 'structural', label: 'Brackets or structural assemblies' },
          { value: 'enclosures', label: 'Enclosures, guards or bollards' },
          { value: 'modify', label: 'Repair or modify existing metalwork' },
          { value: 'other', label: 'Something else' },
        ],
      }],
    },
    {
      id: 'material', name: 'Material', title: 'Material and drawings',
      questions: [
        {
          id: 'fabMaterial', label: 'Material', type: 'single', required: true,
          choices: [
            { value: 'steel', label: 'Steel' },
            { value: 'aluminum', label: 'Aluminum' },
            { value: 'stainless', label: 'Stainless' },
            { value: 'not-sure', label: 'Not sure' },
          ],
        },
        {
          id: 'drawings', label: 'What do you have so far?', type: 'single', required: true,
          choices: [
            { value: 'drawings', label: 'Drawings or a spec' },
            { value: 'sketch', label: 'A sketch or photos' },
            { value: 'idea', label: 'Just an idea' },
          ],
        },
      ],
    },
    {
      id: 'scope', name: 'Scope', title: 'How much, and who installs it?',
      questions: [
        {
          id: 'quantity', label: 'Quantity', type: 'single', required: true,
          choices: [
            { value: 'one-off', label: 'One piece or one project' },
            { value: 'batch', label: 'A small batch' },
            { value: 'ongoing', label: 'Ongoing or repeat work' },
          ],
        },
        {
          id: 'install', label: 'Installation', type: 'single', required: true,
          choices: [
            { value: 'fab-install', label: 'Fabricate and install' },
            { value: 'fab-only', label: 'Fabricate only, we pick up' },
            { value: 'not-sure', label: 'Not sure' },
          ],
        },
      ],
    },
    { id: 'timing', name: 'Timing', title: 'Timing and budget', questions: [timeline, budget] },
    location,
  ],

  commercial: [
    {
      id: 'type', name: 'Project', title: 'What is the project?',
      questions: [{
        id: 'commercialType', label: 'Project type', type: 'single', required: true,
        choices: [
          { value: 'access-gate', label: 'Site access or security gate' },
          { value: 'perimeter', label: 'Perimeter gates or enclosures' },
          { value: 'railings', label: 'Railings and stairs' },
          { value: 'architectural', label: 'Architectural metalwork' },
          { value: 'guards', label: 'Equipment guards or bollards' },
          { value: 'other', label: 'Other fabrication' },
        ],
      }],
    },
    {
      id: 'role', name: 'Your role', title: 'Who are we working with?',
      questions: [
        {
          id: 'role', label: 'Your role', type: 'single', required: true,
          choices: [
            { value: 'owner', label: 'Owner or facility manager' },
            { value: 'gc', label: 'General contractor' },
            { value: 'architect', label: 'Architect or designer' },
            { value: 'property-manager', label: 'Property manager or HOA' },
            { value: 'developer', label: 'Developer' },
          ],
        },
        {
          id: 'stage', label: 'Where is the project?', type: 'single', required: true,
          choices: [
            { value: 'budgeting', label: 'Budgeting' },
            { value: 'design', label: 'In design' },
            { value: 'bidding', label: 'Bidding now' },
            { value: 'construction', label: 'Under construction' },
          ],
        },
      ],
    },
    {
      id: 'automation', name: 'Access', title: 'Automation and access control',
      questions: [
        {
          id: 'automation', label: 'Is automation or access control part of it?', type: 'single', required: true,
          choices: [
            { value: 'yes', label: 'Yes' },
            { value: 'maybe', label: 'Possibly' },
            { value: 'no', label: 'No' },
          ],
        },
        {
          id: 'width', label: 'Largest opening, if there is a gate', type: 'single',
          choices: [
            { value: 'under-12', label: 'Under 12 ft' },
            { value: '12-16', label: '12 to 16 ft' },
            { value: '16-20', label: '16 to 20 ft' },
            { value: '20-plus', label: '20 ft or wider' },
            { value: 'not-sure', label: 'Not sure or no gate' },
          ],
        },
      ],
    },
    { id: 'timing', name: 'Timing', title: 'Schedule and budget', questions: [timeline, budget] },
    {
      ...location,
      sub: 'City or town is enough for now. Attach plans, specs or a bid set if you have them.',
    },
  ],

  repairs: [
    {
      id: 'problem', name: 'Problem', title: 'What is going on with the gate?',
      questions: [{
        id: 'problem', label: 'Problem', type: 'single', required: true,
        choices: [
          { value: 'wont-move', label: 'Will not open or close' },
          { value: 'sagging', label: 'Sagging, dragging or out of line' },
          { value: 'operator', label: 'Operator faults, noise or slow travel' },
          { value: 'damage', label: 'Hit or damaged' },
          { value: 'add-automation', label: 'Add automation to a manual gate' },
          { value: 'access-upgrade', label: 'Upgrade keypad, intercom or app access' },
          { value: 'other', label: 'Something else' },
        ],
      }],
    },
    {
      id: 'urgency', name: 'Urgency', title: 'How urgent is it?',
      questions: [
        {
          id: 'urgency', label: 'Urgency', type: 'single', required: true,
          choices: [
            { value: 'stuck', label: 'Stuck or unsafe right now' },
            { value: 'worsening', label: 'Working, but getting worse' },
            { value: 'planned', label: 'Planning an upgrade' },
          ],
        },
        {
          id: 'operatorBrand', label: 'Operator brand, if you know it', type: 'single',
          choices: [
            { value: 'liftmaster', label: 'LiftMaster' },
            { value: 'doorking', label: 'DoorKing' },
            { value: 'other', label: 'Another brand' },
            { value: 'unknown', label: 'Not sure' },
            { value: 'none', label: 'No operator' },
          ],
        },
      ],
    },
    {
      id: 'gate', name: 'Gate', title: 'Tell us about the gate',
      questions: [{
        id: 'gateType', label: 'Gate type', type: 'single', required: true,
        choices: [
          { value: 'driveway-swing', label: 'Swing gate' },
          { value: 'sliding', label: 'Sliding gate' },
          { value: 'pedestrian', label: 'Pedestrian gate' },
          { value: 'ranch', label: 'Ranch or farm gate' },
          { value: 'not-sure', label: 'Not sure' },
        ],
      }],
    },
    {
      ...location,
      title: 'Where is the gate?',
      sub: 'A photo of the gate and the operator label saves a trip. Optional, but it helps.',
    },
  ],
};

/** Readable label for a stored answer value. */
export function answerLabel(path: InquiryPath, id: string, value: string): string {
  for (const step of flows[path]) {
    for (const q of step.questions) {
      if (q.id === id) return q.choices?.find((c) => c.value === value)?.label || value;
    }
  }
  return value;
}

export function questionLabel(path: InquiryPath, id: string): string {
  for (const step of flows[path]) for (const q of step.questions) if (q.id === id) return q.label;
  return id;
}

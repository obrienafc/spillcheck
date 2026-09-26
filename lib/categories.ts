// Category labels, weights and explanations. Shared by the scanner and the UI.

export type Category =
  | 'advertising'
  | 'session-replay'
  | 'analytics'
  | 'private-analytics'
  | 'tag-manager'
  | 'social'
  | 'embeds'
  | 'fonts'
  | 'private-fonts'
  | 'support'
  | 'consent'
  | 'security'
  | 'monitoring'
  | 'payments'
  | 'cdn'
  | 'hosting'
  | 'risk'
  | 'unknown';

export const CATEGORIES: Record<Category, { label: string; weight: number; why: string }> = {
  risk: {
    label: 'Known risk',
    weight: 35,
    why: 'This domain has been used to serve malicious code. Remove it.',
  },
  advertising: {
    label: 'Advertising',
    weight: 25,
    why: 'Ad and retargeting pixels follow visitors across sites to build profiles.',
  },
  'session-replay': {
    label: 'Session replay',
    weight: 25,
    why: 'Records clicks, scrolling and sometimes typing, then replays the visit.',
  },
  analytics: {
    label: 'Analytics',
    weight: 12,
    why: 'Collects visitor behaviour, usually with cookies or device identifiers.',
  },
  social: {
    label: 'Social',
    weight: 10,
    why: 'Social widgets let the network see who visits, even without clicks.',
  },
  'tag-manager': {
    label: 'Tag manager',
    weight: 8,
    why: 'Loads other scripts at runtime, so the real list may be longer than shown.',
  },
  embeds: {
    label: 'Embeds',
    weight: 8,
    why: 'Embedded players and maps load the provider’s own scripts and cookies.',
  },
  support: {
    label: 'Chat & support',
    weight: 6,
    why: 'Chat widgets load on every page and usually set identifying cookies.',
  },
  fonts: {
    label: 'Fonts',
    weight: 6,
    why: 'Every visitor’s IP address and browser go to the font provider.',
  },
  unknown: {
    label: 'Other',
    weight: 4,
    why: 'Not in Spillcheck’s list yet. Every request shares the visitor’s IP.',
  },
  monitoring: {
    label: 'Monitoring',
    weight: 4,
    why: 'Error and performance monitoring sends browser and session details.',
  },
  security: {
    label: 'Bot protection',
    weight: 4,
    why: 'CAPTCHAs fingerprint the browser to tell people from bots.',
  },
  consent: {
    label: 'Consent',
    weight: 3,
    why: 'Consent banners are loaded from the provider on every page view.',
  },
  'private-analytics': {
    label: 'Privacy-friendly analytics',
    weight: 3,
    why: 'Cookieless, aggregate analytics. Still a third-party request.',
  },
  cdn: {
    label: 'CDN',
    weight: 3,
    why: 'Public CDNs see each visitor’s IP address and which page they’re on.',
  },
  'private-fonts': {
    label: 'Privacy-friendly fonts',
    weight: 2,
    why: 'Fonts served by a privacy-preserving proxy or CDN, so visitors never contact Google.',
  },
  payments: {
    label: 'Payments',
    weight: 2,
    why: 'Payment providers load fraud-detection scripts. Usually expected.',
  },
  hosting: {
    label: 'Hosting & storage',
    weight: 2,
    why: 'Files served from cloud storage or a platform CDN.',
  },
};

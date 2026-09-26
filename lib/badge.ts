// Flat, shields-style SVG badges: a neutral label and the result in the accent colour.

const LABEL_BG = '#555';
const VALUE_BG = '#0066cc'; // Spillcheck's accent; severity is in the text, not the colour
const MUTED_BG = '#767676'; // 4.5:1 with white text
const FONT = 'Verdana,Geneva,DejaVu Sans,sans-serif';

// Approximate Verdana 11px advance widths. textLength below forces the exact
// width, so this only needs to be close.
function textWidth(text: string) {
  let w = 0;
  for (const ch of text) {
    if (/[ilj.,:;'|!]/.test(ch)) w += 3.5;
    else if (/[frt()\-\s]/.test(ch)) w += 4.6;
    else if (/[mwMW]/.test(ch)) w += 10.5;
    else if (/[A-Z+·]/.test(ch)) w += 8;
    else w += 6.9;
  }
  return Math.round(w);
}

function escape(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function badge(label: string, value: string, { muted = false } = {}) {
  const pad = 6;
  const lw = textWidth(label) + pad * 2;
  const vw = textWidth(value) + pad * 2;
  const w = lw + vw;
  const title = escape(`${label}: ${value}`);
  const l = escape(label);
  const v = escape(value);
  // Text is drawn at 10x scale for crisper hinting, as shields.io does.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${title}"><title>${title}</title><clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="${LABEL_BG}"/><rect x="${lw}" width="${vw}" height="20" fill="${muted ? MUTED_BG : VALUE_BG}"/></g><g fill="#fff" text-anchor="middle" font-family="${FONT}" font-size="110" text-rendering="geometricPrecision"><text x="${(lw / 2) * 10}" y="140" transform="scale(.1)" textLength="${(lw - pad * 2) * 10}">${l}</text><text x="${(lw + vw / 2) * 10}" y="140" transform="scale(.1)" textLength="${(vw - pad * 2) * 10}">${v}</text></g></svg>`;
}

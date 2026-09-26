import type { Page } from 'puppeteer-core';

// Runs inside each frame. Returns the consent tool it clicked, or null.
// Known consent tools are tried first by their documented "accept all"
// buttons; then any visible button whose label clearly means "accept".
// Kept as a string so bundler helpers can't leak into the page.
const ACCEPT_SCRIPT = `(() => {
  const KNOWN = [
    ['OneTrust', '#onetrust-accept-btn-handler, #accept-recommended-btn-handler'],
    ['Cookiebot', '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, #CybotCookiebotDialogBodyButtonAccept'],
    ['Didomi', '#didomi-notice-agree-button'],
    ['Quantcast Choice', '.qc-cmp2-summary-buttons button[mode="primary"]'],
    ['TrustArc', '#truste-consent-button'],
    ['Usercentrics', 'button[data-testid="uc-accept-all-button"]'],
    ['iubenda', '.iubenda-cs-accept-btn'],
    ['Complianz', '.cmplz-accept'],
    ['CookieYes', '.cky-btn-accept'],
    ['Osano', '.osano-cm-accept-all'],
    ['Klaro', '.cm-btn-accept-all'],
    ['Termly', '[data-tid="banner-accept"]'],
    ['Cookie Notice', '#cn-accept-cookie'],
    ['CookieFirst', '[data-cookiefirst-action="accept"]'],
    ['Axeptio', '#axeptio_btn_acceptAll'],
    ['Sourcepoint', 'button.sp_choice_type_11, button[title="Accept all"], button[title="Accept All"], button[title="Accept"]'],
  ];
  const STRONG = /^(accept( all)?( cookies)?|accept (and|&) (close|continue)|allow( all)?( cookies)?|i accept|agree( (and|&) (close|continue|proceed))?|i agree|yes,? i agree|alle akzeptieren|akzeptieren|tout accepter|accepter( et fermer)?|aceptar( todo| todas)?|accetta( tutti)?|accepteren|alles accepteren|godkänn alla|aceitar( todos)?)$/i;
  const WEAK = /^(ok(ay)?|got it|continue|understood)$/i;
  const CONSENTISH = /cookie|consent|gdpr|privacy|cmp|onetrust|didomi|banner|notice/i;

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  // Search the document and any open shadow roots (Usercentrics uses one).
  const roots = [document];
  for (const el of document.querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
  const all = (selector) => roots.flatMap((r) => [...r.querySelectorAll(selector)]);

  for (const [name, selector] of KNOWN) {
    const button = all(selector).find(visible);
    if (button) { button.click(); return name; }
  }
  const label = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ');
  const candidates = all('button, [role="button"], input[type="button"], input[type="submit"], a').filter(visible);
  const inConsent = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement || (n.getRootNode() && n.getRootNode().host)) {
      if (CONSENTISH.test((n.id || '') + ' ' + (typeof n.className === 'string' ? n.className : ''))) return true;
    }
    return false;
  };
  const strong = candidates.find((el) => STRONG.test(label(el)));
  if (strong) { strong.click(); return 'banner'; }
  const weak = candidates.find((el) => WEAK.test(label(el)) && inConsent(el));
  if (weak) { weak.click(); return 'banner'; }
  return null;
})()`;

/** Tries every frame, main frame first. Returns the tool's name, or null if nothing was clicked. */
export async function acceptConsent(page: Page): Promise<string | null> {
  const frames = [page.mainFrame(), ...page.frames().filter((f) => f !== page.mainFrame())];
  for (const frame of frames) {
    try {
      const clicked = (await frame.evaluate(ACCEPT_SCRIPT)) as string | null;
      if (clicked) return clicked === 'banner' ? genericName(frame.url()) : clicked;
    } catch {
      // Detached or inaccessible frames are skipped.
    }
  }
  return null;
}

/** A banner we recognised only by its button label; name it by frame when that helps. */
function genericName(frameUrl: string) {
  if (/privacy-mgmt\.com|sourcepoint/i.test(frameUrl)) return 'Sourcepoint';
  return 'a cookie banner';
}

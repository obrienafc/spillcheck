import { Parser } from 'htmlparser2';

export type Kind =
  | 'script'
  | 'stylesheet'
  | 'font'
  | 'image'
  | 'frame'
  | 'media'
  | 'connection'
  | 'form'
  | 'script-reference'
  | 'fetch'
  | 'beacon'
  | 'websocket'
  | 'other';

export type Resource = { url: string; kind: Kind; bytes?: number };

const URL_IN_TEXT = /(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/[^\s"'`<>()\\]*)?/gi;
const CSS_URL = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
const CSS_IMPORT = /@import\s+(?:url\(\s*)?(['"])([^'"]+)\1/gi;
const FONT_EXT = /\.(woff2?|ttf|otf|eot)(\?|#|$)/i;

function resolve(raw: string | undefined, base: URL): URL | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || /^(data|blob|javascript|mailto|tel|about):/i.test(value) || value.startsWith('#')) {
    return null;
  }
  try {
    const url = new URL(value, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function srcsetUrls(srcset: string | undefined) {
  return (srcset ?? '')
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/** URLs referenced from CSS: url() values and @import rules. */
export function extractCss(css: string, base: URL): { resources: Resource[]; imports: URL[] } {
  const resources: Resource[] = [];
  const imports: URL[] = [];
  for (const m of css.matchAll(CSS_IMPORT)) {
    const url = resolve(m[2], base);
    if (url) {
      imports.push(url);
      resources.push({ url: url.href, kind: 'stylesheet' });
    }
  }
  for (const m of css.matchAll(CSS_URL)) {
    const url = resolve(m[2], base);
    if (!url) continue;
    if (/\.css(\?|$)/i.test(url.pathname) && !imports.some((i) => i.href === url.href)) {
      imports.push(url);
      resources.push({ url: url.href, kind: 'stylesheet' });
    } else {
      resources.push({ url: url.href, kind: FONT_EXT.test(url.pathname) ? 'font' : 'image' });
    }
  }
  return { resources, imports };
}

/** Everything an HTML document loads or references. */
export function extractHtml(html: string, pageUrl: URL) {
  let base = pageUrl;
  const resources: Resource[] = [];
  const stylesheets: URL[] = [];
  const inlineCss: string[] = [];
  let scriptText = '';
  let styleText = '';
  let inScript = false;
  let inStyle = false;

  const add = (raw: string | undefined, kind: Kind) => {
    const url = resolve(raw, base);
    if (url) resources.push({ url: url.href, kind });
    return url;
  };

  const parser = new Parser(
    {
      onopentag(name, a) {
        switch (name) {
          case 'base': {
            const b = resolve(a.href, pageUrl);
            if (b) base = b;
            break;
          }
          case 'script':
            if (a.src) add(a.src, 'script');
            else if (!a.type || /javascript|module/i.test(a.type)) inScript = true;
            break;
          case 'style':
            inStyle = true;
            break;
          case 'link': {
            const rel = (a.rel ?? '').toLowerCase().split(/\s+/);
            const as = (a.as ?? '').toLowerCase();
            if (rel.includes('stylesheet')) {
              const url = add(a.href, 'stylesheet');
              if (url) stylesheets.push(url);
            } else if (rel.includes('preload') || rel.includes('prefetch')) {
              add(a.href, as === 'font' ? 'font' : as === 'script' ? 'script' : as === 'style' ? 'stylesheet' : as === 'image' ? 'image' : 'other');
            } else if (rel.includes('modulepreload')) {
              add(a.href, 'script');
            } else if (rel.includes('preconnect') || rel.includes('dns-prefetch')) {
              add(a.href, 'connection');
            } else if (rel.some((r) => r.includes('icon')) || rel.includes('manifest')) {
              add(a.href, rel.includes('manifest') ? 'other' : 'image');
            }
            break;
          }
          case 'img':
          case 'source':
          case 'input':
            if (name === 'input' && a.type !== 'image') break;
            add(a.src, name === 'source' && a.type?.startsWith('video') ? 'media' : 'image');
            for (const s of srcsetUrls(a.srcset)) add(s, 'image');
            break;
          case 'iframe':
          case 'frame':
            add(a.src, 'frame');
            break;
          case 'video':
          case 'audio':
          case 'track':
            add(a.src, 'media');
            if (a.poster) add(a.poster, 'image');
            break;
          case 'embed':
          case 'object':
            add(a.src ?? a.data, 'frame');
            break;
          case 'form':
            if (a.action) add(a.action, 'form');
            break;
        }
        if (a.style) inlineCss.push(a.style);
      },
      ontext(text) {
        if (inScript) scriptText += text;
        if (inStyle) styleText += text;
      },
      onclosetag(name) {
        if (name === 'script' && inScript) {
          inScript = false;
          // JSON inside scripts often escapes slashes: https:\/\/example.com
          for (const m of scriptText.replace(/\\\//g, '/').matchAll(URL_IN_TEXT)) {
            add(m[0], 'script-reference');
          }
          scriptText = '';
        }
        if (name === 'style') {
          inStyle = false;
          inlineCss.push(styleText);
          styleText = '';
        }
      },
    },
    { decodeEntities: true, lowerCaseAttributeNames: true },
  );
  parser.write(html);
  parser.end();

  for (const css of inlineCss) {
    const { resources: r, imports } = extractCss(css, base);
    resources.push(...r);
    stylesheets.push(...imports);
  }

  return { resources, stylesheets };
}

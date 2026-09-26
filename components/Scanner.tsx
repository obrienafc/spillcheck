'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Kind } from '@/lib/extract';
import { CATEGORIES, type Category } from '@/lib/categories';
import type { Party, Report } from '@/lib/scan';

const EXAMPLES = ['bbc.co.uk', 'cnn.com', 'wikipedia.org', 'getbootstrap.com'];

const KIND_LABELS: Record<Kind, string> = {
  script: 'script',
  stylesheet: 'stylesheet',
  font: 'font',
  image: 'image',
  frame: 'iframe',
  media: 'media',
  connection: 'preconnect',
  form: 'form target',
  'script-reference': 'in page script',
  other: 'other',
};

type State =
  | { status: 'idle' }
  | { status: 'loading'; url: string }
  | { status: 'error'; message: string }
  | { status: 'done'; report: Report };

export function Scanner() {
  const [input, setInput] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (raw: string, push = true) => {
    const url = raw.trim();
    if (!url) return inputRef.current?.focus();
    setInput(url);
    setState({ status: 'loading', url });
    if (push) {
      const next = new URL(window.location.href);
      next.searchParams.set('url', url);
      window.history.pushState(null, '', next);
    }
    try {
      const res = await fetch(`/api/scan?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) setState({ status: 'error', message: data.error ?? 'The scan failed.' });
      else setState({ status: 'done', report: data });
    } catch {
      setState({ status: 'error', message: 'Couldn’t reach Spillcheck. Check your connection.' });
    }
  }, []);

  // Shareable links: /?url=example.com runs the scan on load.
  useEffect(() => {
    const fromUrl = () => {
      const url = new URLSearchParams(window.location.search).get('url');
      if (url) run(url, false);
      else setState({ status: 'idle' });
    };
    fromUrl();
    window.addEventListener('popstate', fromUrl);
    return () => window.removeEventListener('popstate', fromUrl);
  }, [run]);

  return (
    <>
      <nav className="navbar">
        <div className="wrap navbar-inner">
          <a className="brand" href="/">
            <Logo />
            Spillcheck
          </a>
          <a className="nav-link" href="https://github.com/obrienafc/spillcheck" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </nav>

      <header className={`hero wrap${state.status === 'idle' ? '' : ' compact'}`}>
        <h1>
          What does your website spill?
          <br />
          <span className="hero-soft">See every third party it talks to.</span>
        </h1>
        {state.status === 'idle' && (
          <p className="hero-sub">
            Fonts, analytics, ad pixels, embeds. Every one of them receives your visitors’ IP
            addresses. Spillcheck lists them, explains what each one does, and grades the page.
          </p>
        )}

        <form
          className="scan-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(input);
          }}
        >
          <label className="visually-hidden" htmlFor="url">
            Website address
          </label>
          <input
            ref={inputRef}
            id="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="button primary" type="submit" disabled={state.status === 'loading'}>
            {state.status === 'loading' ? 'Scanning…' : 'Scan'}
          </button>
        </form>

        {state.status === 'idle' && (
          <p className="examples">
            Try{' '}
            {EXAMPLES.map((ex, i) => (
              <span key={ex}>
                <button type="button" className="link-button" onClick={() => run(ex)}>
                  {ex}
                </button>
                {i < EXAMPLES.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        )}
      </header>

      <main className="wrap results" aria-live="polite">
        {state.status === 'loading' && <Loading url={state.url} />}
        {state.status === 'error' && (
          <div className="panel error">
            <strong>Couldn’t scan that page.</strong>
            <p>{state.message}</p>
          </div>
        )}
        {state.status === 'done' && <ReportView report={state.report} />}
        {state.status === 'idle' && <HowItWorks />}
      </main>

      <footer className="footer wrap">
        <p>
          Spillcheck reads a page’s HTML and stylesheets. It doesn’t run JavaScript, so scripts can
          load more than shown. Open source on{' '}
          <a href="https://github.com/obrienafc/spillcheck" target="_blank" rel="noreferrer">
            GitHub
          </a>
          . Sister project:{' '}
          <a href="https://glyphyard.patrickob.tech" target="_blank" rel="noreferrer">
            Glyphyard
          </a>
          .
        </p>
      </footer>
    </>
  );
}

function Loading({ url }: { url: string }) {
  return (
    <div className="panel loading">
      <span className="spinner" aria-hidden />
      <div>
        <strong>Scanning {url}</strong>
        <p className="muted">Fetching the page and its stylesheets…</p>
      </div>
    </div>
  );
}

function gradeTone(grade: Report['grade']) {
  return { 'A+': 'great', A: 'great', B: 'good', C: 'fair', D: 'poor', F: 'bad' }[grade];
}

function ReportView({ report }: { report: Report }) {
  const [copied, setCopied] = useState(false);
  const host = new URL(report.finalUrl).hostname;
  const loaded = report.parties.filter((p) => !p.referencedOnly);

  const groups = new Map<Category, Party[]>();
  for (const p of report.parties) groups.set(p.category, [...(groups.get(p.category) ?? []), p]);

  return (
    <div className="report">
      <section className="panel summary">
        <div className={`grade ${gradeTone(report.grade)}`} aria-label={`Grade ${report.grade}`}>
          {report.grade}
        </div>
        <div className="summary-main">
          <h2>{host}</h2>
          <p className="muted">
            {report.parties.length === 0
              ? 'No third parties found. This page only talks to its own domain.'
              : `Talks to ${report.parties.length} third ${report.parties.length === 1 ? 'party' : 'parties'}${
                  report.companies.length ? ` from ${report.companies.length} known ${report.companies.length === 1 ? 'company' : 'companies'}` : ''
                }.`}
          </p>
          <dl className="stats">
            <div>
              <dt>Score</dt>
              <dd>{report.score}/100</dd>
            </div>
            <div>
              <dt>Loaded</dt>
              <dd>{loaded.length}</dd>
            </div>
            <div>
              <dt>Referenced</dt>
              <dd>{report.parties.length - loaded.length}</dd>
            </div>
            <div>
              <dt>Cookies set</dt>
              <dd>{report.cookies.length}</dd>
            </div>
          </dl>
        </div>
        <button
          className="button small share"
          onClick={() =>
            navigator.clipboard.writeText(window.location.href).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </section>

      {report.googleFonts && (
        <section className="panel callout">
          <div>
            <strong>This page uses Google Fonts.</strong>
            <p>
              {report.googleFonts.families.length
                ? `${report.googleFonts.families.join(', ')} ${report.googleFonts.families.length === 1 ? 'is' : 'are'} loaded from Google, so every visitor’s IP address goes to Google. `
                : 'It connects to Google’s font servers, which see every visitor’s IP address. '}
              You can serve the same fonts from your own domain by changing one hostname.
            </p>
          </div>
          <a className="button primary" href="https://glyphyard.patrickob.tech" target="_blank" rel="noreferrer">
            Self-host with Glyphyard
          </a>
        </section>
      )}

      {report.notes.map((n) => (
        <p key={n} className="note">
          {n}
        </p>
      ))}

      {[...groups.entries()].map(([category, parties]) => (
        <section key={category} className="group">
          <div className="group-head">
            <h3>
              {CATEGORIES[category].label}
              <span className="count">{parties.length}</span>
            </h3>
            <p className="muted">{CATEGORIES[category].why}</p>
          </div>
          <ul className="parties">
            {parties.map((p) => (
              <PartyRow key={p.id} party={p} />
            ))}
          </ul>
        </section>
      ))}

      {report.parties.length > 0 && (
        <p className="legend muted">
          <strong>Loaded</strong> means the page’s HTML or CSS requests it directly.{' '}
          <strong>Referenced</strong> means the domain appears in an inline script, a preconnect hint
          or a form target: it’s likely contacted, but Spillcheck can’t be sure without running the
          page. Referenced parties count half.
        </p>
      )}
    </div>
  );
}

function PartyRow({ party }: { party: Party }) {
  return (
    <li>
      <details className="party">
        <summary>
          <span className="party-main">
            <span className="party-name">
              {party.name}
              {party.company && party.company !== party.name && (
                <span className="party-company"> · {party.company}</span>
              )}
            </span>
            <span className="party-hosts">{party.hosts.join(', ')}</span>
          </span>
          <span className="party-kinds">
            {party.referencedOnly && <span className="badge ref">Referenced</span>}
            {party.kinds.map((k) => (
              <span key={k} className="badge">
                {KIND_LABELS[k]}
              </span>
            ))}
          </span>
        </summary>
        <ul className="samples">
          {party.samples.map((s) => (
            <li key={s}>
              <code>{s}</code>
            </li>
          ))}
          {party.requests > party.samples.length && (
            <li className="muted">and {party.requests - party.samples.length} more</li>
          )}
        </ul>
      </details>
    </li>
  );
}

function HowItWorks() {
  return (
    <section className="how">
      <div>
        <h3>Reads the page</h3>
        <p>Fetches the HTML and every stylesheet it imports, like a browser would, from Spillcheck’s server.</p>
      </div>
      <div>
        <h3>Names the parties</h3>
        <p>Matches each domain against a list of trackers, analytics, fonts, CDNs and embeds.</p>
      </div>
      <div>
        <h3>Grades the page</h3>
        <p>Ad pixels and session replay cost the most. Privacy-friendly tools cost the least.</p>
      </div>
    </section>
  );
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="7" fill="currentColor" />
      <circle cx="11" cy="12" r="4.5" fill="none" stroke="var(--bg)" strokeWidth="2" />
      <path d="m14.5 15.5 4 4" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="9" r="1.6" fill="var(--bg)" />
    </svg>
  );
}
